package http_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	infraHTTP "github.com/score-cripto/data-search/internal/infrastructure/http"
)

// fakeRedis implementa a interface mínima necessária para o health handler.
type fakeRedis struct {
	err error
}

func (f *fakeRedis) Ping(_ context.Context) error {
	return f.err
}

// fakePublisher simula Publisher.IsHealthy().
type fakePublisher struct {
	healthy bool
}

func (f *fakePublisher) IsHealthy() bool { return f.healthy }

// fakeConsumer simula Consumer.IsHealthy().
type fakeConsumer struct {
	healthy bool
}

func (f *fakeConsumer) IsHealthy() bool { return f.healthy }

func TestHealthHandler(t *testing.T) {
	tests := []struct {
		name           string
		redisPingErr   error
		pubHealthy     bool
		consHealthy    bool
		wantStatus     int
		wantServiceOK  bool
	}{
		{
			name:          "todos os checks ok → 200",
			redisPingErr:  nil,
			pubHealthy:    true,
			consHealthy:   true,
			wantStatus:    http.StatusOK,
			wantServiceOK: true,
		},
		{
			name:          "redis indisponível → 503",
			redisPingErr:  context.DeadlineExceeded,
			pubHealthy:    true,
			consHealthy:   true,
			wantStatus:    http.StatusServiceUnavailable,
			wantServiceOK: false,
		},
		{
			name:          "publisher indisponível → 503",
			redisPingErr:  nil,
			pubHealthy:    false,
			consHealthy:   true,
			wantStatus:    http.StatusServiceUnavailable,
			wantServiceOK: false,
		},
		{
			name:          "consumer indisponível → 503",
			redisPingErr:  nil,
			pubHealthy:    true,
			consHealthy:   false,
			wantStatus:    http.StatusServiceUnavailable,
			wantServiceOK: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			handler := infraHTTP.NewHealthHandlerFromDeps(
				&fakeRedis{err: tc.redisPingErr},
				&fakePublisher{healthy: tc.pubHealthy},
				&fakeConsumer{healthy: tc.consHealthy},
			)

			req := httptest.NewRequest(http.MethodGet, "/health", nil)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("status code: got %d, want %d", rec.Code, tc.wantStatus)
			}

			var body struct {
				Status string            `json:"status"`
				Checks map[string]string `json:"checks"`
			}
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decode body: %v", err)
			}

			wantBodyStatus := "ok"
			if !tc.wantServiceOK {
				wantBodyStatus = "degraded"
			}
			if body.Status != wantBodyStatus {
				t.Errorf("body.status: got %q, want %q", body.Status, wantBodyStatus)
			}

			if body.Checks["redis"] == "" {
				t.Error("body.checks.redis ausente")
			}
			if body.Checks["rabbitmq_publisher"] == "" {
				t.Error("body.checks.rabbitmq_publisher ausente")
			}
			if body.Checks["rabbitmq_consumer"] == "" {
				t.Error("body.checks.rabbitmq_consumer ausente")
			}
		})
	}
}
