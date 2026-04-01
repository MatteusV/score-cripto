package events_test

import (
	"context"
	"errors"
	"testing"

	"github.com/score-cripto/data-search/internal/application/usecase"
	"github.com/score-cripto/data-search/internal/domain"
	"github.com/score-cripto/data-search/internal/infrastructure/events"
)

// mockProcessor implements events.WalletProcessor for testing.
type mockProcessor struct {
	executeFunc func(ctx context.Context, input usecase.ProcessWalletDataRequestedInput) (usecase.ProcessWalletDataRequestedOutput, error)
	lastInput   *usecase.ProcessWalletDataRequestedInput
}

func (m *mockProcessor) Execute(ctx context.Context, input usecase.ProcessWalletDataRequestedInput) (usecase.ProcessWalletDataRequestedOutput, error) {
	m.lastInput = &input
	if m.executeFunc != nil {
		return m.executeFunc(ctx, input)
	}
	return usecase.ProcessWalletDataRequestedOutput{
		WalletContext: &domain.WalletContext{Chain: input.Chain, Address: input.Address},
	}, nil
}

// newTestConsumer builds a Consumer with a mock processor (no real AMQP connection).
func newTestConsumer(proc events.WalletProcessor) *events.Consumer {
	return events.NewConsumerWithProcessor(proc)
}

func validPayload() []byte {
	return []byte(`{
		"event": "wallet.data.requested",
		"schemaVersion": "1",
		"timestamp": "2026-04-01T00:00:00Z",
		"data": {
			"requestId": "req-123",
			"userId": "user-456",
			"chain": "ethereum",
			"address": "0xabc123"
		}
	}`)
}

func TestConsumer_ProcessMessage_ValidPayload(t *testing.T) {
	proc := &mockProcessor{}
	c := newTestConsumer(proc)

	result, err := c.ProcessMessage(context.Background(), validPayload())
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if result != events.Processed {
		t.Errorf("expected Processed, got %v", result)
	}
	if proc.lastInput == nil {
		t.Fatal("expected use case to be called")
	}
	if proc.lastInput.RequestID != "req-123" {
		t.Errorf("expected requestId req-123, got %s", proc.lastInput.RequestID)
	}
	if proc.lastInput.Chain != "ethereum" {
		t.Errorf("expected chain ethereum, got %s", proc.lastInput.Chain)
	}
}

func TestConsumer_ProcessMessage_InvalidJSON(t *testing.T) {
	proc := &mockProcessor{}
	c := newTestConsumer(proc)

	result, err := c.ProcessMessage(context.Background(), []byte(`not json at all`))
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
	if result != events.InvalidPayload {
		t.Errorf("expected InvalidPayload, got %v", result)
	}
}

func TestConsumer_ProcessMessage_MissingFields(t *testing.T) {
	proc := &mockProcessor{}
	c := newTestConsumer(proc)

	payload := []byte(`{
		"event": "wallet.data.requested",
		"schemaVersion": "1",
		"timestamp": "2026-04-01T00:00:00Z",
		"data": {
			"chain": "ethereum",
			"address": "0xabc123"
		}
	}`)

	result, err := c.ProcessMessage(context.Background(), payload)
	if err == nil {
		t.Fatal("expected error for missing fields, got nil")
	}
	if result != events.InvalidPayload {
		t.Errorf("expected InvalidPayload, got %v", result)
	}
}

func TestConsumer_ProcessMessage_UseCaseError(t *testing.T) {
	proc := &mockProcessor{
		executeFunc: func(_ context.Context, _ usecase.ProcessWalletDataRequestedInput) (usecase.ProcessWalletDataRequestedOutput, error) {
			return usecase.ProcessWalletDataRequestedOutput{}, errors.New("provider down")
		},
	}
	c := newTestConsumer(proc)

	result, err := c.ProcessMessage(context.Background(), validPayload())
	if err == nil {
		t.Fatal("expected error from use case, got nil")
	}
	if result != events.TransientError {
		t.Errorf("expected TransientError, got %v", result)
	}
}
