package events

import (
	amqp "github.com/rabbitmq/amqp091-go"
)

const DLXName = "score-cripto.events.dlx"

// DLQName returns the dead-letter queue name for the given source queue.
func DLQName(sourceQueue string) string {
	return sourceQueue + ".dlq"
}

// DLQArguments returns the queue arguments needed to wire a source queue to the DLX.
func DLQArguments(sourceQueue string) amqp.Table {
	return amqp.Table{
		"x-dead-letter-exchange":    DLXName,
		"x-dead-letter-routing-key": DLQName(sourceQueue),
	}
}

// AssertDLQ declares the dead-letter exchange and the DLQ for the given source queue,
// then binds the DLQ to the DLX. This call is idempotent.
func AssertDLQ(ch *amqp.Channel, sourceQueue string) error {
	dlqName := DLQName(sourceQueue)

	if err := ch.ExchangeDeclare(DLXName, "direct", true, false, false, false, nil); err != nil {
		return err
	}

	if _, err := ch.QueueDeclare(dlqName, true, false, false, false, nil); err != nil {
		return err
	}

	return ch.QueueBind(dlqName, dlqName, DLXName, false, nil)
}
