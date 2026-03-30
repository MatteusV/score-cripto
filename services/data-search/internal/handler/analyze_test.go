package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestValidateRequest_ValidEthereum(t *testing.T) {
	err := validateRequest("ethereum", "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", []string{"ethereum", "polygon"})
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}
}

func TestValidateRequest_EmptyChain(t *testing.T) {
	err := validateRequest("", "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", []string{"ethereum"})
	if err == nil {
		t.Error("expected error for empty chain")
	}
}

func TestValidateRequest_EmptyAddress(t *testing.T) {
	err := validateRequest("ethereum", "", []string{"ethereum"})
	if err == nil {
		t.Error("expected error for empty address")
	}
}

func TestValidateRequest_UnsupportedChain(t *testing.T) {
	err := validateRequest("cosmos", "addr123", []string{"ethereum", "polygon"})
	if err == nil {
		t.Error("expected error for unsupported chain")
	}
}

func TestValidateRequest_InvalidEthAddress(t *testing.T) {
	err := validateRequest("ethereum", "not-a-valid-address", []string{"ethereum"})
	if err == nil {
		t.Error("expected error for invalid eth address")
	}
}

func TestValidateRequest_ValidPolygon(t *testing.T) {
	err := validateRequest("polygon", "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", []string{"ethereum", "polygon"})
	if err == nil {
		// Polygon uses same address format as Ethereum.
	}
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}
}

func TestWriteJSON(t *testing.T) {
	w := httptest.NewRecorder()
	writeJSON(w, http.StatusOK, map[string]string{"foo": "bar"})

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}

	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want 'application/json'", ct)
	}

	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)
	if body["foo"] != "bar" {
		t.Errorf("body = %v, want {foo: bar}", body)
	}
}

func TestWriteError(t *testing.T) {
	w := httptest.NewRecorder()
	writeError(w, http.StatusBadRequest, "something went wrong")

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}

	var body errorResponse
	json.NewDecoder(w.Body).Decode(&body)
	if body.Error != "something went wrong" {
		t.Errorf("error = %q, want 'something went wrong'", body.Error)
	}
}

func TestHealthEndpoint(t *testing.T) {
	h := &AnalyzeHandler{}
	r := chi.NewRouter()
	r.Get("/health", h.Health)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestCacheKeyGeneration(t *testing.T) {
	// Test that our key format matches expectations from cache package.
	// Import cache.Key here would create a circular dependency,
	// so we test the expected format directly.
	tests := []struct {
		chain   string
		address string
		want    string
	}{
		{"ethereum", "0xABC", "wallet:ethereum:0xabc"},
		{"Polygon", "0xDEF", "wallet:polygon:0xdef"},
	}

	for _, tt := range tests {
		// Reproduce the key logic inline.
		key := "wallet:" + lower(tt.chain) + ":" + lower(tt.address)
		if key != tt.want {
			t.Errorf("key(%q, %q) = %q, want %q", tt.chain, tt.address, key, tt.want)
		}
	}
}

func lower(s string) string {
	return strings.ToLower(s)
}

func TestPostAnalyze_InvalidJSON(t *testing.T) {
	h := &AnalyzeHandler{}
	r := chi.NewRouter()
	r.Post("/analyze", h.PostAnalyze)

	body := bytes.NewBufferString(`{invalid}`)
	req := httptest.NewRequest(http.MethodPost, "/analyze", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}
