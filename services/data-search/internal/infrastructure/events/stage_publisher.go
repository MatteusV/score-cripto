package events

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

const (
	AnalysisStageChangedRoutingKey = "analysis.stage.changed"
	AnalysisStageEventName         = "analysis.stage.changed"
	AnalysisStageSchemaVersion     = "1"
	ServiceName                    = "data-search"
)

// StageState represents the state of a pipeline stage.
type StageState string

const (
	StageStateStarted   StageState = "started"
	StageStateCompleted StageState = "completed"
	StageStateFailed    StageState = "failed"
)

// Stage represents a pipeline stage emitted by data-search.
type Stage string

const (
	StageDetect    Stage = "detect"
	StageFetch     Stage = "fetch"
	StageNormalize Stage = "normalize"
	StageSanctions Stage = "sanctions"
	StageMixer     Stage = "mixer"
)

type analysisStageChangedData struct {
	RequestID    string `json:"requestId"`
	Stage        string `json:"stage"`
	State        string `json:"state"`
	Service      string `json:"service"`
	At           string `json:"at"`
	ErrorMessage string `json:"errorMessage,omitempty"`
}

type analysisStageChangedEnvelope struct {
	Event         string                   `json:"event"`
	SchemaVersion string                   `json:"schemaVersion"`
	Timestamp     string                   `json:"timestamp"`
	Data          analysisStageChangedData `json:"data"`
}

// PublishStageChanged emits an analysis.stage.changed event to the shared exchange.
// The call is best-effort: failures are logged but not propagated to the caller.
// stage / state are passed as strings to keep the usecase layer free of infra imports.
func (p *Publisher) PublishStageChanged(ctx context.Context, requestID string, stage string, state string, errorMessage string) {
	if p == nil || p.channel == nil || requestID == "" {
		return
	}

	ctx, span := otel.Tracer("data-search").Start(ctx, "analysis.stage.changed publish",
		trace.WithSpanKind(trace.SpanKindProducer),
	)
	defer span.End()

	now := time.Now().UTC().Format(time.RFC3339Nano)
	envelope := analysisStageChangedEnvelope{
		Event:         AnalysisStageEventName,
		SchemaVersion: AnalysisStageSchemaVersion,
		Timestamp:     now,
		Data: analysisStageChangedData{
			RequestID:    requestID,
			Stage:        stage,
			State:        state,
			Service:      ServiceName,
			At:           now,
			ErrorMessage: errorMessage,
		},
	}

	body, err := json.Marshal(envelope)
	if err != nil {
		slog.WarnContext(ctx, "failed to marshal analysis.stage.changed", "error", err)
		return
	}

	publishCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	headers := amqp.Table{}
	if correlationID := correlationIDFromContext(ctx); correlationID != "" {
		headers[CorrelationIDHeader] = correlationID
	}
	otel.GetTextMapPropagator().Inject(ctx, AMQPHeaderCarrier(headers))

	if err := p.channel.PublishWithContext(
		publishCtx,
		p.topology.ExchangeName,
		AnalysisStageChangedRoutingKey,
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now().UTC(),
			Headers:      headers,
			Body:         body,
		},
	); err != nil {
		slog.WarnContext(ctx, "failed to publish analysis.stage.changed",
			"error", err,
			"requestId", requestID,
			"stage", stage,
			"state", state,
		)
		return
	}

	slog.DebugContext(ctx, "EMITINDO: analysis.stage.changed",
		"correlationId", correlationIDFromContext(ctx),
		"requestId", requestID,
		"stage", stage,
		"state", state,
	)

}
