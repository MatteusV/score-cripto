package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/score-cripto/data-search/internal/model"
)

const (
	exchangeName = "score-cripto"
	routingKey   = "wallet.data.cached"
)

// Publisher sends events to RabbitMQ.
type Publisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

// NewPublisher connects to RabbitMQ and prepares the exchange.
func NewPublisher(amqpURL string) (*Publisher, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, fmt.Errorf("amqp dial: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("amqp channel: %w", err)
	}

	// Declare a topic exchange; idempotent.
	if err := ch.ExchangeDeclare(
		exchangeName,
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

	slog.Info("rabbitmq publisher ready", "exchange", exchangeName)

	return &Publisher{
		conn:    conn,
		channel: ch,
	}, nil
}

// PublishWalletCached publishes a wallet.data.cached event.
func (p *Publisher) PublishWalletCached(ctx context.Context, wc *model.WalletContext) error {
	event := model.WalletDataCachedEvent{
		Chain:      wc.Chain,
		Address:    wc.Address,
		FetchedAt:  wc.FetchedAt,
		DataSource: wc.DataSource,
	}

	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := p.channel.PublishWithContext(
		ctx,
		exchangeName,
		routingKey,
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

	slog.Info("published event", "routing_key", routingKey, "chain", wc.Chain, "address", wc.Address)
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
