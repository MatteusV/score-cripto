package events

import (
	"context"
	"fmt"
	"log/slog"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/score-cripto/data-search/internal/application/usecase"
	"github.com/score-cripto/data-search/internal/domain"
)

// MessageResult categorizes the outcome of processing a single message.
type MessageResult int

const (
	// Processed indicates successful processing.
	Processed MessageResult = iota
	// InvalidPayload indicates a non-retryable parse/validation error.
	InvalidPayload
	// TransientError indicates a retryable infrastructure or business error.
	TransientError
)

// WalletProcessor is the interface for the use case, enabling test injection.
type WalletProcessor interface {
	Execute(ctx context.Context, input usecase.ProcessWalletDataRequestedInput) (usecase.ProcessWalletDataRequestedOutput, error)
}

// Consumer consumes wallet.data.requested events from RabbitMQ.
type Consumer struct {
	conn     *amqp.Connection
	channel  *amqp.Channel
	useCase  WalletProcessor
	topology Topology
}

// NewConsumerWithProcessor creates a Consumer with a pre-built processor.
// Used in tests to avoid a live AMQP connection.
func NewConsumerWithProcessor(uc WalletProcessor) *Consumer {
	return &Consumer{useCase: uc, topology: DefaultTopology()}
}

// NewConsumer creates a Consumer and sets up the queue bindings.
func NewConsumer(amqpURL string, uc WalletProcessor) (*Consumer, error) {
	return NewConsumerWithTopology(amqpURL, uc, DefaultTopology())
}

// NewConsumerWithTopology creates a Consumer using a custom RabbitMQ topology.
func NewConsumerWithTopology(amqpURL string, uc WalletProcessor, topology Topology) (*Consumer, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, fmt.Errorf("amqp dial: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("amqp channel: %w", err)
	}

	// Declare exchange (idempotent).
	if err := ch.ExchangeDeclare(
		topology.ExchangeName,
		"topic",
		true,  // durable
		false, // auto-deleted
		false, // internal
		false, // no-wait
		nil,
	); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("exchange declare: %w", err)
	}

	// Declare queue.
	if _, err := ch.QueueDeclare(
		topology.ConsumeQueue,
		true,  // durable
		false, // auto-delete
		false, // exclusive
		false, // no-wait
		nil,
	); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("queue declare: %w", err)
	}

	// Bind queue to exchange.
	if err := ch.QueueBind(topology.ConsumeQueue, topology.ConsumeKey, topology.ExchangeName, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("queue bind: %w", err)
	}

	// Prefetch one message at a time.
	if err := ch.Qos(1, 0, false); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("qos: %w", err)
	}

	slog.Info("rabbitmq consumer ready", "queue", topology.ConsumeQueue, "exchange", topology.ExchangeName)

	return &Consumer{
		conn:     conn,
		channel:  ch,
		useCase:  uc,
		topology: topology,
	}, nil
}

// Start begins consuming messages. It blocks until ctx is cancelled.
func (c *Consumer) Start(ctx context.Context) error {
	msgs, err := c.channel.Consume(
		c.topology.ConsumeQueue,
		c.topology.ConsumerTag,
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,
	)
	if err != nil {
		return fmt.Errorf("consume: %w", err)
	}

	slog.Info("started consuming messages", "queue", c.topology.ConsumeQueue)

	for {
		select {
		case <-ctx.Done():
			slog.Info("consumer shutting down")
			return nil
		case msg, ok := <-msgs:
			if !ok {
				return fmt.Errorf("rabbitmq channel closed unexpectedly")
			}
			result, err := c.ProcessMessage(ctx, msg.Body)
			switch result {
			case Processed:
				msg.Ack(false)
			case InvalidPayload:
				slog.Warn("invalid payload, sending to dead letter", "error", err)
				msg.Nack(false, false) // no requeue
			case TransientError:
				slog.Warn("transient error, requeuing message", "error", err)
				msg.Nack(false, true) // requeue
			}
		}
	}
}

// ProcessMessage parses and processes a raw message body.
// Exported to facilitate unit testing without a live RabbitMQ connection.
func (c *Consumer) ProcessMessage(ctx context.Context, body []byte) (MessageResult, error) {
	evt, err := domain.ParseWalletDataRequestedEvent(body)
	if err != nil {
		return InvalidPayload, fmt.Errorf("parse event: %w", err)
	}

	input := usecase.ProcessWalletDataRequestedInput{
		RequestID: evt.Data.RequestID,
		UserID:    evt.Data.UserID,
		Chain:     evt.Data.Chain,
		Address:   evt.Data.Address,
	}

	_, err = c.useCase.Execute(ctx, input)
	if err != nil {
		return TransientError, fmt.Errorf("use case execute: %w", err)
	}

	return Processed, nil
}

// Close gracefully shuts down the consumer.
func (c *Consumer) Close() error {
	if c.channel != nil {
		c.channel.Cancel(c.topology.ConsumerTag, false)
		c.channel.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
