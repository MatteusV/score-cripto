package events

import (
	"context"

	amqp "github.com/rabbitmq/amqp091-go"
)

// CorrelationIDHeader is the AMQP header name for correlation propagation.
const CorrelationIDHeader = "x-correlation-id"

type correlationIDKey struct{}

// correlationIDFromContext retrieves the correlation ID stored in ctx.
func correlationIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(correlationIDKey{}).(string); ok && id != "" {
		return id
	}
	return ""
}

// contextWithCorrelationID returns a child context carrying the given correlation ID.
func contextWithCorrelationID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, correlationIDKey{}, id)
}

// extractCorrelationIDFromHeaders reads x-correlation-id from AMQP delivery headers.
// Returns empty string if not present.
func extractCorrelationIDFromHeaders(headers amqp.Table) string {
	if headers == nil {
		return ""
	}
	switch v := headers[CorrelationIDHeader].(type) {
	case string:
		return v
	case []byte:
		return string(v)
	}
	return ""
}
