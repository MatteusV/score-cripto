package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/score-cripto/data-search/internal/domain"
)

// RedisCache provides wallet data caching backed by Redis.
// It implements ports.WalletCachePort.
type RedisCache struct {
	client *redis.Client
	ttl    time.Duration
}

// New creates a RedisCache connected to the given Redis URL.
// The URL format is redis://[:password@]host:port[/db].
func New(redisURL string, ttlMinutes int) (*RedisCache, error) {
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

	return &RedisCache{
		client: client,
		ttl:    time.Duration(ttlMinutes) * time.Minute,
	}, nil
}

// cacheKey builds a cache key for the given chain and address.
func cacheKey(chain, address string) string {
	return fmt.Sprintf("wallet:%s:%s", strings.ToLower(chain), strings.ToLower(address))
}

// Get retrieves a cached WalletContext. Returns nil if not found.
func (c *RedisCache) Get(ctx context.Context, chain, address string) (*domain.WalletContext, error) {
	key := cacheKey(chain, address)
	data, err := c.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("cache get %s: %w", key, err)
	}

	var wc domain.WalletContext
	if err := json.Unmarshal(data, &wc); err != nil {
		return nil, fmt.Errorf("cache unmarshal %s: %w", key, err)
	}

	slog.Debug("cache hit", "key", key)
	return &wc, nil
}

// Set stores a WalletContext with the configured TTL.
func (c *RedisCache) Set(ctx context.Context, wc *domain.WalletContext) error {
	key := cacheKey(wc.Chain, wc.Address)
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

// Close gracefully shuts down the Redis connection.
func (c *RedisCache) Close() error {
	return c.client.Close()
}
