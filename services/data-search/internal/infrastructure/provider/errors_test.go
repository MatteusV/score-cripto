package provider

import (
	"errors"
	"net/url"
	"strings"
	"testing"
)

func TestSanitizeURLError_RedactsQueryString(t *testing.T) {
	urlErr := &url.Error{
		Op:  "Get",
		URL: "https://api.helius.xyz/v0/addresses/abc/transactions?api-key=secret-123&limit=50",
		Err: errors.New("dial tcp: i/o timeout"),
	}

	sanitized := SanitizeURLError(urlErr)
	msg := sanitized.Error()

	if strings.Contains(msg, "secret-123") {
		t.Fatalf("sanitized error leaks api key: %q", msg)
	}
	if !strings.Contains(msg, "REDACTED") {
		t.Fatalf("expected REDACTED placeholder in query, got: %q", msg)
	}
	if !strings.Contains(msg, "api.helius.xyz") {
		t.Fatalf("expected host to remain in message, got: %q", msg)
	}
}

func TestSanitizeURLError_PreservesNonURLError(t *testing.T) {
	err := errors.New("plain error")
	if got := SanitizeURLError(err); got != err {
		t.Fatalf("expected non-URL error to pass through unchanged, got: %v", got)
	}
}

func TestSanitizeURLError_NilPassthrough(t *testing.T) {
	if got := SanitizeURLError(nil); got != nil {
		t.Fatalf("expected nil to pass through, got: %v", got)
	}
}

func TestWrapHTTPError_RedactsAndPrefixes(t *testing.T) {
	urlErr := &url.Error{
		Op:  "Post",
		URL: "https://mainnet.helius-rpc.com/?api-key=topsecret",
		Err: errors.New("connection refused"),
	}
	wrapped := WrapHTTPError("http post", urlErr)
	msg := wrapped.Error()

	if strings.Contains(msg, "topsecret") {
		t.Fatalf("wrapped error leaks api key: %q", msg)
	}
	if !strings.HasPrefix(msg, "http post: ") {
		t.Fatalf("expected message to start with 'http post: ', got: %q", msg)
	}
}
