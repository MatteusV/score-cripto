package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/score-cripto/data-search/internal/domain"
)

// Publisher sends events to RabbitMQ.
// It implements ports.EventPublisherPort.
type Publisher struct {
	conn     *amqp.Connection
	channel  *amqp.Channel
	topology Topology
}

// NewPublisher connects to RabbitMQ and prepares the exchange.
func NewPublisher(amqpURL string) (*Publisher, error) {
	return NewPublisherWithTopology(amqpURL, DefaultTopology())
}

// NewPublisherWithTopology connects to RabbitMQ using a custom topology.
func NewPublisherWithTopology(amqpURL string, topology Topology) (*Publisher, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, fmt.Errorf("amqp dial: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("amqp channel: %w", err)
	}

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

	slog.Info("rabbitmq publisher ready", "exchange", topology.ExchangeName)

	return &Publisher{
		conn:     conn,
		channel:  ch,
		topology: topology,
	}, nil
}

// PublishWalletCached publishes a wallet.data.cached event.
func (p *Publisher) PublishWalletCached(ctx context.Context, event domain.WalletDataCachedEvent) error {
	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := p.channel.PublishWithContext(
		ctx,
		p.topology.ExchangeName,
		p.topology.PublishKey,
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now().UTC(),
			Body:         body,
		},
	); err != nil {
		return fmt.Errorf("publish event: %w", err)
	}

	slog.Info("published event", "routing_key", p.topology.PublishKey,
		"requestId", event.Data.RequestID, "chain", event.Data.WalletContext.Chain)
	return nil
}

// Close gracefully shuts down the publisher.
func (p *Publisher) Close() error {
	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		return p.conn.Close()
	}
	return nil
}
