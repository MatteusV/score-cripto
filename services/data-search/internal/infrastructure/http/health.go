package http

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	infraCache "github.com/score-cripto/data-search/internal/infrastructure/cache"
	infraEvents "github.com/score-cripto/data-search/internal/infrastructure/events"
)

// Interfaces para injeção de dependência e testabilidade.

// CachePinger verifica conectividade com o cache.
type CachePinger interface {
	Ping(ctx context.Context) error
}

// ConnectionChecker verifica se uma conexão AMQP está ativa.
type ConnectionChecker interface {
	IsHealthy() bool
}

type healthStatus struct {
	Status string            `json:"status"`
	Checks map[string]string `json:"checks"`
}

// NewHealthHandler retorna um http.Handler para GET /health usando os tipos concretos da infraestrutura.
func NewHealthHandler(
	redisCache *infraCache.RedisCache,
	pub *infraEvents.Publisher,
	cons *infraEvents.Consumer,
) http.Handler {
	return NewHealthHandlerFromDeps(redisCache, pub, cons)
}

// NewHealthHandlerFromDeps aceita interfaces, facilitando testes com fakes.
func NewHealthHandlerFromDeps(
	cache CachePinger,
	pub ConnectionChecker,
	cons ConnectionChecker,
) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		checks := map[string]string{
			"redis":              "up",
			"rabbitmq_publisher": "up",
			"rabbitmq_consumer":  "up",
		}

		if err := cache.Ping(ctx); err != nil {
			checks["redis"] = "down"
		}

		if !pub.IsHealthy() {
			checks["rabbitmq_publisher"] = "down"
		}

		if !cons.IsHealthy() {
			checks["rabbitmq_consumer"] = "down"
		}

		allUp := checks["redis"] == "up" &&
			checks["rabbitmq_publisher"] == "up" &&
			checks["rabbitmq_consumer"] == "up"

		status := "ok"
		httpCode := http.StatusOK
		if !allUp {
			status = "degraded"
			httpCode = http.StatusServiceUnavailable
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(httpCode)
		_ = json.NewEncoder(w).Encode(healthStatus{Status: status, Checks: checks})
	})
}
