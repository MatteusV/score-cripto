package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/score-cripto/data-search/internal/model"
	"github.com/score-cripto/data-search/internal/service"
)

// AnalyzeHandler provides HTTP endpoints for wallet analysis.
type AnalyzeHandler struct {
	svc *service.SearchService
}

// NewAnalyzeHandler creates a handler backed by the given service.
func NewAnalyzeHandler(svc *service.SearchService) *AnalyzeHandler {
	return &AnalyzeHandler{svc: svc}
}

// Routes registers handler routes on the given Chi router.
func (h *AnalyzeHandler) Routes(r chi.Router) {
	r.Post("/analyze", h.PostAnalyze)
	r.Get("/analyze/{chain}/{address}", h.GetAnalyze)
	r.Get("/health", h.Health)
}

// PostAnalyze handles POST /analyze with a JSON body { chain, address }.
func (h *AnalyzeHandler) PostAnalyze(w http.ResponseWriter, r *http.Request) {
	var req model.AnalysisRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := validateRequest(req.Chain, req.Address, h.svc.SupportedChains()); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	wc, err := h.svc.Analyze(r.Context(), req.Chain, req.Address)
	if err != nil {
		slog.Error("analysis failed", "error", err, "chain", req.Chain, "address", req.Address)
		if strings.Contains(err.Error(), "unsupported chain") {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "analysis failed")
		return
	}

	writeJSON(w, http.StatusOK, wc)
}

// GetAnalyze handles GET /analyze/{chain}/{address} and returns cached data.
func (h *AnalyzeHandler) GetAnalyze(w http.ResponseWriter, r *http.Request) {
	chain := chi.URLParam(r, "chain")
	address := chi.URLParam(r, "address")

	if err := validateRequest(chain, address, h.svc.SupportedChains()); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	wc, err := h.svc.GetCached(r.Context(), chain, address)
	if err != nil {
		slog.Error("cache lookup failed", "error", err)
		writeError(w, http.StatusInternalServerError, "cache lookup failed")
		return
	}

	if wc == nil {
		writeError(w, http.StatusNotFound, "no cached analysis found; use POST /analyze to request one")
		return
	}

	writeJSON(w, http.StatusOK, wc)
}

// Health is a simple liveness check.
func (h *AnalyzeHandler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- Validation ---

var ethAddressRegex = regexp.MustCompile(`^0x[0-9a-fA-F]{40}$`)
var btcAddressRegex = regexp.MustCompile(`^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$`)
var solAddressRegex = regexp.MustCompile(`^[1-9A-HJ-NP-Za-km-z]{32,44}$`)

func validateRequest(chain, address string, supportedChains []string) error {
	chain = strings.ToLower(strings.TrimSpace(chain))
	address = strings.TrimSpace(address)

	if chain == "" {
		return &validationError{"chain is required"}
	}
	if address == "" {
		return &validationError{"address is required"}
	}

	// Check chain is supported.
	supported := false
	for _, sc := range supportedChains {
		if sc == chain {
			supported = true
			break
		}
	}
	if !supported {
		return &validationError{"unsupported chain: " + chain}
	}

	// Validate address format per chain.
	switch chain {
	case "ethereum", "polygon", "arbitrum", "optimism", "avalanche", "bsc":
		if !ethAddressRegex.MatchString(address) {
			return &validationError{"invalid ethereum-compatible address format"}
		}
	case "bitcoin":
		if !btcAddressRegex.MatchString(address) {
			return &validationError{"invalid bitcoin address format"}
		}
	case "solana":
		if !solAddressRegex.MatchString(address) {
			return &validationError{"invalid solana address format"}
		}
	}

	return nil
}

type validationError struct {
	msg string
}

func (e *validationError) Error() string { return e.msg }

// --- JSON helpers ---

type errorResponse struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, errorResponse{Error: msg})
}
