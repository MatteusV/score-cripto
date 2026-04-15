package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/score-cripto/data-search/internal/application/usecase"
	infraCache "github.com/score-cripto/data-search/internal/infrastructure/cache"
	infraConfig "github.com/score-cripto/data-search/internal/infrastructure/config"
	infraEvents "github.com/score-cripto/data-search/internal/infrastructure/events"
	infraHTTP "github.com/score-cripto/data-search/internal/infrastructure/http"
	infraProvider "github.com/score-cripto/data-search/internal/infrastructure/provider"
	"github.com/score-cripto/data-search/internal/infrastructure/telemetry"
)

func main() {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	slog.SetDefault(slog.New(telemetry.NewTraceHandler(handler)).With("service", "data-search"))

	shutdownTracer, otelRes, err := telemetry.Init(context.Background(), "data-search")
	if err != nil {
		slog.Warn("failed to init tracer provider, continuing without tracing", "error", err)
	} else {
		defer shutdownTracer(context.Background()) //nolint:errcheck
	}

	shutdownMetrics, err := telemetry.InitMetrics(context.Background(), otelRes)
	if err != nil {
		slog.Warn("failed to init metrics provider, continuing without metrics", "error", err)
	} else {
		defer shutdownMetrics(context.Background()) //nolint:errcheck
	}

	cfg := infraConfig.Load()

	// Redis cache.
	redisCache, err := infraCache.New(cfg.RedisURL, cfg.CacheTTLMinutes)
	if err != nil {
		slog.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer redisCache.Close()

	// RabbitMQ publisher.
	pub, err := infraEvents.NewPublisher(cfg.RabbitMQURL)
	if err != nil {
		slog.Error("failed to connect rabbitmq publisher", "error", err)
		os.Exit(1)
	}
	defer pub.Close()

	// Blockchain providers.
	var evmProvider usecase.BlockchainProviderPort
	if cfg.EtherscanAPIKey == "" {
		slog.Warn("ETHERSCAN_API_KEY not set — using mock provider (dev only, synthetic data)")
		evmProvider = infraProvider.NewMockProvider()
	} else {
		evmProvider = infraProvider.NewEtherscanProvider(cfg.EtherscanAPIKey, cfg.EtherscanBaseURL)
	}

	// Wire providers map: start with EVM chains.
	providers := make(map[string]usecase.BlockchainProviderPort)
	for _, chain := range evmProvider.SupportedChains() {
		providers[strings.ToLower(chain)] = evmProvider
	}

	// Bitcoin via Blockstream (no API key required).
	btcProvider := infraProvider.NewBlockstreamProvider(cfg.BlockstreamBaseURL)
	for _, chain := range btcProvider.SupportedChains() {
		providers[strings.ToLower(chain)] = btcProvider
	}
	slog.Info("blockstream bitcoin provider registered")

	// Solana via Helius (optional — disabled if HELIUS_API_KEY is not set).
	if cfg.HeliusAPIKey != "" {
		solProvider := infraProvider.NewHeliusProvider(cfg.HeliusAPIKey)
		for _, chain := range solProvider.SupportedChains() {
			providers[strings.ToLower(chain)] = solProvider
		}
		slog.Info("helius solana provider registered")
	} else {
		slog.Warn("HELIUS_API_KEY not set — solana chain is unavailable")
	}

	// Wire use case.
	uc := usecase.NewProcessWalletDataRequested(
		redisCache,
		providers,
		pub,
		infraProvider.Normalize,
	)

	// Create consumer.
	consumer, err := infraEvents.NewConsumer(cfg.RabbitMQURL, uc)
	if err != nil {
		slog.Error("failed to create rabbitmq consumer", "error", err)
		os.Exit(1)
	}
	defer consumer.Close()

	// HTTP health server.
	mux := http.NewServeMux()
	mux.Handle("/health", infraHTTP.NewHealthHandler(redisCache, pub, consumer))
	httpSrv := &http.Server{
		Addr:              ":" + cfg.HTTPPort,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		slog.Info("health server listening", "port", cfg.HTTPPort)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("health server error", "error", err)
		}
	}()

	// Graceful shutdown.
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		slog.Info("received shutdown signal")
		cancel()
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownCancel()
		_ = httpSrv.Shutdown(shutdownCtx)
	}()

	slog.Info("data-search worker starting")
	if err := consumer.Start(ctx); err != nil {
		slog.Error("consumer stopped with error", "error", err)
		os.Exit(1)
	}

	slog.Info("data-search worker stopped cleanly")
}
