package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/score-cripto/data-search/internal/model"
)

// Cache provides wallet data caching backed by Redis.
type Cache struct {
	client *redis.Client
	ttl    time.Duration
}

// New creates a Cache connected to the given Redis URL.
// The URL format is redis://[:password@]host:port[/db].
func New(redisURL string, ttlMinutes int) (*Cache, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}

	slog.Info("connected to redis", "url", redisURL, "ttl_minutes", ttlMinutes)

	return &Cache{
		client: client,
		ttl:    time.Duration(ttlMinutes) * time.Minute,
	}, nil
}

// Key builds a cache key for the given chain and address.
func Key(chain, address string) string {
	return fmt.Sprintf("wallet:%s:%s", strings.ToLower(chain), strings.ToLower(address))
}

// Get retrieves a cached WalletContext. Returns nil if not found.
func (c *Cache) Get(ctx context.Context, chain, address string) (*model.WalletContext, error) {
	key := Key(chain, address)
	data, err := c.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("cache get %s: %w", key, err)
	}

	var wc model.WalletContext
	if err := json.Unmarshal(data, &wc); err != nil {
		return nil, fmt.Errorf("cache unmarshal %s: %w", key, err)
	}

	slog.Debug("cache hit", "key", key)
	return &wc, nil
}

// Set stores a WalletContext with the configured TTL.
func (c *Cache) Set(ctx context.Context, wc *model.WalletContext) error {
	key := Key(wc.Chain, wc.Address)
	data, err := json.Marshal(wc)
	if err != nil {
		return fmt.Errorf("cache marshal: %w", err)
	}

	if err := c.client.Set(ctx, key, data, c.ttl).Err(); err != nil {
		return fmt.Errorf("cache set %s: %w", key, err)
	}

	slog.Debug("cache set", "key", key, "ttl", c.ttl)
	return nil
}

// Delete removes a cached entry.
func (c *Cache) Delete(ctx context.Context, chain, address string) error {
	key := Key(chain, address)
	return c.client.Del(ctx, key).Err()
}

// Close gracefully shuts down the Redis connection.
func (c *Cache) Close() error {
	return c.client.Close()
}
