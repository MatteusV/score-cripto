package provider

import (
	"errors"
	"fmt"
	"net/url"
)

// SanitizeURLError redacts query strings from *url.Error values so that
// secrets like ?api-key=... passed as URL parameters do not propagate into
// logs via fmt.Errorf("...: %w", err).
//
// If err is not a *url.Error (or wraps one), it is returned unchanged.
func SanitizeURLError(err error) error {
	if err == nil {
		return nil
	}
	var urlErr *url.Error
	if !errors.As(err, &urlErr) {
		return err
	}
	u, parseErr := url.Parse(urlErr.URL)
	if parseErr != nil {
		return err
	}
	if u.RawQuery == "" {
		return err
	}
	u.RawQuery = "REDACTED"
	return &url.Error{
		Op:  urlErr.Op,
		URL: u.String(),
		Err: urlErr.Err,
	}
}

// WrapHTTPError sanitizes err and returns a wrapped error with the given
// message prefix. Convenience for the common `fmt.Errorf("...: %w", err)` path.
func WrapHTTPError(prefix string, err error) error {
	return fmt.Errorf("%s: %w", prefix, SanitizeURLError(err))
}
