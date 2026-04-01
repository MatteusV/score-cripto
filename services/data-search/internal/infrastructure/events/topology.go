package events

// Topology defines the RabbitMQ resources used by the data-search service.
type Topology struct {
	ConsumeKey   string
	ConsumeQueue string
	ConsumerTag  string
	ExchangeName string
	PublishKey   string
}

// DefaultTopology returns the production routing topology for the service.
func DefaultTopology() Topology {
	return Topology{
		ConsumeQueue: "data-search.wallet.data.requested",
		ConsumeKey:   "wallet.data.requested",
		ConsumerTag:  "data-search-worker",
		ExchangeName: "score-cripto.events",
		PublishKey:   "wallet.data.cached",
	}
}
