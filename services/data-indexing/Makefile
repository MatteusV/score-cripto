.PHONY: setup test test-watch test-coverage lint format check dev run build clean

PORT ?= 4000
MEILISEARCH_URL ?= http://localhost:7701
RABBITMQ_URL ?= amqp://guest:guest@localhost:5673

setup:
	mix deps.get

test:
	mix test

test-watch:
	mix test.watch

test-coverage:
	MIX_ENV=test mix coveralls.html

lint:
	mix credo --strict

format:
	mix format

check: format lint test

dev:
	PORT=$(PORT) MEILISEARCH_URL=$(MEILISEARCH_URL) RABBITMQ_URL=$(RABBITMQ_URL) iex -S mix

run:
	PORT=$(PORT) MEILISEARCH_URL=$(MEILISEARCH_URL) RABBITMQ_URL=$(RABBITMQ_URL) mix run --no-halt

build:
	MIX_ENV=prod mix release

clean:
	rm -rf _build cover erl_crash.dump
