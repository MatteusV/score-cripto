package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all service configuration loaded from environment variables.
type Config struct {
	RedisURL           string
	RabbitMQURL        string
	EtherscanAPIKey    string
	EtherscanBaseURL   string
	BlockstreamBaseURL string
	HeliusAPIKey       string
	CacheTTLMinutes    int
	HTTPPort           string
}

// Load reads configuration from environment variables, with sensible defaults.
// It attempts to load a .env file but does not fail if one is absent.
func Load() *Config {
	_ = godotenv.Load()

	ttl := 20
	if v := os.Getenv("CACHE_TTL_MINUTES"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			ttl = parsed
		}
	}

	return &Config{
		RedisURL:           getEnv("REDIS_URL", "redis://localhost:6379"),
		RabbitMQURL:        getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672"),
		EtherscanAPIKey:    os.Getenv("ETHERSCAN_API_KEY"),
		EtherscanBaseURL:   os.Getenv("ETHERSCAN_BASE_URL"),
		BlockstreamBaseURL: getEnv("BLOCKSTREAM_BASE_URL", "https://blockstream.info/api"),
		HeliusAPIKey:       os.Getenv("HELIUS_API_KEY"),
		CacheTTLMinutes:    ttl,
		HTTPPort:           getEnv("HTTP_PORT", "8080"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
