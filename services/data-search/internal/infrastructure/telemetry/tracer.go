package telemetry

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

// Init configures the global OTel TracerProvider with an OTLP HTTP exporter and
// returns the shared OTel resource so it can be reused by InitMetrics.
// The endpoint is controlled via OTEL_EXPORTER_OTLP_ENDPOINT (default: localhost:4318).
func Init(ctx context.Context, serviceName string) (shutdown func(context.Context) error, res *resource.Resource, err error) {
	exporter, err := otlptracehttp.New(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("otlp trace exporter: %w", err)
	}

	res, err = resource.New(ctx,
		resource.WithAttributes(
			attribute.String("service.name", serviceName),
		),
		resource.WithProcess(),
		resource.WithHost(),
	)
	if err != nil {
		// Non-fatal: fall back to a minimal resource
		res = resource.NewWithAttributes(
			"https://opentelemetry.io/schemas/1.26.0",
			attribute.String("service.name", serviceName),
		)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return tp.Shutdown, res, nil
}
