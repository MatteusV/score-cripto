package ports

import (
	"context"

	"github.com/score-cripto/data-search/internal/domain"
)

// EventPublisherPort defines the interface for publishing domain events.
type EventPublisherPort interface {
	PublishWalletCached(ctx context.Context, event domain.WalletDataCachedEvent) error
}
