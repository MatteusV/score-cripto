package events

import (
	"context"
	"math/rand"
	"strconv"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	MaxRetries  = 3
	baseDelayMs = 1000
)

// RetryQueueName returns the retry queue name for a given source queue.
func RetryQueueName(sourceQueue string) string {
	return sourceQueue + ".retry"
}

// AssertRetryQueue declares the retry queue with a dead-letter back to the
// main exchange so expired messages are redelivered to the source queue.
func AssertRetryQueue(ch *amqp.Channel, sourceQueue, sourceExchange, sourceRoutingKey string) error {
	_, err := ch.QueueDeclare(
		RetryQueueName(sourceQueue),
		true,  // durable
		false, // auto-delete
		false, // exclusive
		false, // no-wait
		amqp.Table{
			"x-dead-letter-exchange":    sourceExchange,
			"x-dead-letter-routing-key": sourceRoutingKey,
		},
	)
	return err
}

func getRetryCount(msg amqp.Delivery) int {
	if v, ok := msg.Headers["x-retry-count"].(int32); ok {
		return int(v)
	}
	if v, ok := msg.Headers["x-retry-count"].(int64); ok {
		return int(v)
	}
	return 0
}

func computeBackoffMs(count int) int {
	base := baseDelayMs * (1 << count) // 2^count * 1000
	jitter := 0.9 + rand.New(rand.NewSource(time.Now().UnixNano())).Float64()*0.2
	return int(float64(base) * jitter)
}

// ScheduleRetry publishes the message to the retry queue with an exponential
// backoff TTL. Returns false if max retries are exhausted — caller must nack
// to route the message to DLQ.
func ScheduleRetry(ch *amqp.Channel, msg amqp.Delivery, sourceQueue string) (bool, error) {
	count := getRetryCount(msg)
	if count >= MaxRetries {
		return false, nil
	}

	delay := computeBackoffMs(count)

	headers := amqp.Table{}
	for k, v := range msg.Headers {
		headers[k] = v
	}
	headers["x-retry-count"] = int32(count + 1)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := ch.PublishWithContext(ctx, "", RetryQueueName(sourceQueue), false, false, amqp.Publishing{
		ContentType:  msg.ContentType,
		Body:         msg.Body,
		DeliveryMode: amqp.Persistent,
		Headers:      headers,
		Expiration:   strconv.Itoa(delay),
	})
	if err != nil {
		return false, err
	}

	return true, nil
}
