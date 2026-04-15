package telemetry

import (
	"context"
	"fmt"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/metric/noop"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	sdkresource "go.opentelemetry.io/otel/sdk/resource"
)

// CacheHits and CacheMisses are global OTel counters emitted by the cache use case.
// They are initialised to noop instruments by default and replaced with real counters
// when InitMetrics is called during service startup.
var (
	CacheHits   metric.Int64Counter
	CacheMisses metric.Int64Counter
)

func init() {
	noopMeter := noop.NewMeterProvider().Meter("data-search")
	CacheHits, _ = noopMeter.Int64Counter("cache.hits")
	CacheMisses, _ = noopMeter.Int64Counter("cache.misses")
}

// InitMetrics creates a MeterProvider that exports metrics via OTLP HTTP to the
// OpenTelemetry Collector. The endpoint is taken from OTEL_EXPORTER_OTLP_ENDPOINT
// (default: localhost:4318). Returns a shutdown func that must be deferred by the caller.
func InitMetrics(ctx context.Context, res *sdkresource.Resource) (func(context.Context) error, error) {
	exporter, err := otlpmetrichttp.New(ctx)
	if err != nil {
		return nil, fmt.Errorf("otlp metric exporter: %w", err)
	}

	mp := sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(res),
		sdkmetric.WithReader(
			sdkmetric.NewPeriodicReader(exporter,
				sdkmetric.WithInterval(15*time.Second),
			),
		),
	)
	otel.SetMeterProvider(mp)

	meter := mp.Meter("data-search")

	CacheHits, err = meter.Int64Counter("cache.hits",
		metric.WithDescription("Cache hits for wallet data lookups. Labels: chain"),
	)
	if err != nil {
		return mp.Shutdown, fmt.Errorf("create cache.hits counter: %w", err)
	}

	CacheMisses, err = meter.Int64Counter("cache.misses",
		metric.WithDescription("Cache misses for wallet data lookups. Labels: chain"),
	)
	if err != nil {
		return mp.Shutdown, fmt.Errorf("create cache.misses counter: %w", err)
	}

	return mp.Shutdown, nil
}
