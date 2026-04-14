package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/score-cripto/data-search/internal/application/usecase"
	infraCache "github.com/score-cripto/data-search/internal/infrastructure/cache"
	infraConfig "github.com/score-cripto/data-search/internal/infrastructure/config"
	infraEvents "github.com/score-cripto/data-search/internal/infrastructure/events"
	infraProvider "github.com/score-cripto/data-search/internal/infrastructure/provider"
)

func main() {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	slog.SetDefault(slog.New(handler).With("service", "data-search"))

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
	var defaultProvider usecase.BlockchainProviderPort
	if cfg.EtherscanAPIKey == "" {
		slog.Warn("ETHERSCAN_API_KEY not set — using mock provider (dev only, synthetic data)")
		defaultProvider = infraProvider.NewMockProvider()
	} else {
		defaultProvider = infraProvider.NewEtherscanProvider(cfg.EtherscanAPIKey, cfg.EtherscanBaseURL)
	}

	// Wire providers map.
	providers := make(map[string]usecase.BlockchainProviderPort)
	for _, chain := range defaultProvider.SupportedChains() {
		providers[strings.ToLower(chain)] = defaultProvider
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

	// Graceful shutdown.
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		slog.Info("received shutdown signal")
		cancel()
	}()

	slog.Info("data-search worker starting")
	if err := consumer.Start(ctx); err != nil {
		slog.Error("consumer stopped with error", "error", err)
		os.Exit(1)
	}

	slog.Info("data-search worker stopped cleanly")
}
