package main

import (
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/score-cripto/data-search/internal/cache"
	"github.com/score-cripto/data-search/internal/config"
	"github.com/score-cripto/data-search/internal/events"
	"github.com/score-cripto/data-search/internal/handler"
	"github.com/score-cripto/data-search/internal/provider"
	"github.com/score-cripto/data-search/internal/service"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg := config.Load()

	// Redis cache.
	redisCache, err := cache.New(cfg.RedisURL, cfg.CacheTTLMinutes)
	if err != nil {
		slog.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer redisCache.Close()

	// RabbitMQ publisher (optional: warn and continue if unavailable).
	var pub *events.Publisher
	pub, err = events.NewPublisher(cfg.RabbitMQURL)
	if err != nil {
		slog.Warn("rabbitmq unavailable, events will not be published", "error", err)
	} else {
		defer pub.Close()
	}

	// Blockchain providers.
	ethProv := provider.NewEtherscanProvider(cfg.EtherscanAPIKey)

	// Service layer.
	svc := service.New(redisCache, pub, ethProv)

	// HTTP router.
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.SetHeader("Content-Type", "application/json"))

	h := handler.NewAnalyzeHandler(svc)
	h.Routes(r)

	addr := ":" + cfg.Port
	slog.Info("starting data-search service", "addr", addr)

	// Graceful shutdown.
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		slog.Info("shutting down")
		os.Exit(0)
	}()

	if err := http.ListenAndServe(addr, r); err != nil {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}
