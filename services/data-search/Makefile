.PHONY: test test-verbose test-coverage test-e2e test-e2e-verbose test-all test-all-verbose build run dev help clean

REDIS_URL ?= redis://localhost:6380
RABBITMQ_URL ?= amqp://guest:guest@localhost:5673
ETHERSCAN_API_KEY ?=
CACHE_TTL_MINUTES ?= 20

export REDIS_URL
export RABBITMQ_URL
export ETHERSCAN_API_KEY
export CACHE_TTL_MINUTES

help:
	@echo "Available commands:"
	@echo "  make test           - Run all tests"
	@echo "  make test-verbose   - Run tests with verbose output"
	@echo "  make test-coverage  - Run tests with coverage report"
	@echo "  make test-e2e       - Run end-to-end tests (requires Redis and RabbitMQ)"
	@echo "  make test-e2e-verbose - Run end-to-end tests with verbose output"
	@echo "  make test-all       - Run unit and end-to-end tests"
	@echo "  make test-all-verbose - Run unit and end-to-end tests with verbose output"
	@echo "  make build          - Build the worker binary"
	@echo "  make run            - Run the worker with local docker-compose defaults"
	@echo "  make dev            - Run with hot-reload using air and local docker-compose defaults"
	@echo "  env defaults        - REDIS_URL=$(REDIS_URL) RABBITMQ_URL=$(RABBITMQ_URL)"

test:
	go test ./...

test-verbose:
	go test -v ./...

test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

test-e2e:
	go test -tags=e2e ./internal/infrastructure/events

test-e2e-verbose:
	go test -v -tags=e2e ./internal/infrastructure/events

test-all: test test-e2e

test-all-verbose: test-verbose test-e2e-verbose

build:
	go build -o bin/worker ./cmd/worker

run:
	go run ./cmd/worker

dev:
	air

clean:
	rm -rf bin/ coverage.out coverage.html
