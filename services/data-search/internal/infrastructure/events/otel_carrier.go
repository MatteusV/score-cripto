package events

import (
	amqp "github.com/rabbitmq/amqp091-go"
)

// AMQPHeaderCarrier adapts an amqp.Table to the OTel TextMapCarrier interface,
// enabling W3C TraceContext propagation over RabbitMQ headers.
// amqp.Table values can be string or []byte depending on the publisher; Get handles both.
type AMQPHeaderCarrier amqp.Table

func (c AMQPHeaderCarrier) Get(key string) string {
	if c == nil {
		return ""
	}
	switch v := c[key].(type) {
	case string:
		return v
	case []byte:
		return string(v)
	}
	return ""
}

func (c AMQPHeaderCarrier) Set(key, val string) {
	c[key] = val
}

func (c AMQPHeaderCarrier) Keys() []string {
	keys := make([]string, 0, len(c))
	for k := range c {
		keys = append(keys, k)
	}
	return keys
}
