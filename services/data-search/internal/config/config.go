package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all service configuration loaded from environment variables.
type Config struct {
	Port            string
	RedisURL        string
	RabbitMQURL     string
	EtherscanAPIKey string
	CacheTTLMinutes int
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
		Port:            getEnv("PORT", "8080"),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379"),
		RabbitMQURL:     getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672"),
		EtherscanAPIKey: os.Getenv("ETHERSCAN_API_KEY"),
		CacheTTLMinutes: ttl,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
