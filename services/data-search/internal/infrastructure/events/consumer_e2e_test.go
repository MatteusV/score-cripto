//go:build e2e

package events_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/redis/go-redis/v9"
	"github.com/score-cripto/data-search/internal/application/usecase"
	"github.com/score-cripto/data-search/internal/domain"
	infraCache "github.com/score-cripto/data-search/internal/infrastructure/cache"
	"github.com/score-cripto/data-search/internal/infrastructure/events"
	infraProvider "github.com/score-cripto/data-search/internal/infrastructure/provider"
)

const (
	testRabbitMQURL = "amqp://guest:guest@localhost:5673"
	testRedisURL    = "redis://localhost:6380/15"
)

func TestConsumerE2E_ProcessRequestedEvent_StoresCacheAndPublishesEvent(t *testing.T) {
	state := newProviderState()
	server := newMockEtherscanServer(t, state)
	env := newEventFlowTestEnv(t, testTopology(t), server.URL+"/api")

	address := strings.ToLower("0x0000000000000000000000000000000000000e2e")
	if err := env.publishRequestedEvent("req-e2e-1", "user-e2e-1", "ethereum", address); err != nil {
		t.Fatalf("publish requested event: %v", err)
	}

	evt := env.mustReadCachedEvent(t)

	if evt.Data.RequestID != "req-e2e-1" {
		t.Fatalf("expected request id req-e2e-1, got %s", evt.Data.RequestID)
	}
	if evt.Data.UserID != "user-e2e-1" {
		t.Fatalf("expected user id user-e2e-1, got %s", evt.Data.UserID)
	}
	if evt.Data.WalletContext.Address != address {
		t.Fatalf("expected address %s, got %s", address, evt.Data.WalletContext.Address)
	}
	if evt.Data.WalletContext.TxCount != 3 {
		t.Fatalf("expected tx_count 3, got %d", evt.Data.WalletContext.TxCount)
	}
	if !evt.Data.WalletContext.HasMixerInteraction {
		t.Fatal("expected mixer interaction to be true")
	}
	if evt.Data.WalletContext.DefiInteractions != 1 {
		t.Fatalf("expected defi interactions 1, got %d", evt.Data.WalletContext.DefiInteractions)
	}

	cached, err := env.cache.Get(context.Background(), "ethereum", address)
	if err != nil {
		t.Fatalf("cache get: %v", err)
	}
	if cached == nil {
		t.Fatal("expected wallet context to be cached")
	}
	if cached.TotalVolume != 3.5 {
		t.Fatalf("expected total volume 3.5, got %v", cached.TotalVolume)
	}

	if state.calls("txlist", address) != 1 {
		t.Fatalf("expected 1 txlist call, got %d", state.calls("txlist", address))
	}
	if state.calls("tokentx", address) != 1 {
		t.Fatalf("expected 1 tokentx call, got %d", state.calls("tokentx", address))
	}
	if state.calls("balance", address) != 1 {
		t.Fatalf("expected 1 balance call, got %d", state.calls("balance", address))
	}
}

func TestConsumerE2E_CacheHit_PublishesWithoutCallingProvider(t *testing.T) {
	state := newProviderState()
	server := newMockEtherscanServer(t, state)
	env := newEventFlowTestEnv(t, testTopology(t), server.URL+"/api")

	cachedWallet := &domain.WalletContext{
		Chain:                "ethereum",
		Address:              "0x0000000000000000000000000000000000000ca7",
		TxCount:              9,
		TotalVolume:          12.3,
		UniqueCounterparties: 4,
		WalletAgeDays:        120,
		LargestTxRatio:       0.4,
		AvgTxValue:           1.366667,
		TokenDiversity:       2,
		DefiInteractions:     1,
		RiskFlags:            []string{},
		FetchedAt:            time.Now().UTC().Format(time.RFC3339),
		DataSource:           "redis-seed",
	}
	if err := env.cache.Set(context.Background(), cachedWallet); err != nil {
		t.Fatalf("seed cache: %v", err)
	}

	if err := env.publishRequestedEvent("req-cache-hit", "user-cache", "ethereum", cachedWallet.Address); err != nil {
		t.Fatalf("publish requested event: %v", err)
	}

	evt := env.mustReadCachedEvent(t)
	if evt.Data.RequestID != "req-cache-hit" {
		t.Fatalf("expected request id req-cache-hit, got %s", evt.Data.RequestID)
	}
	if evt.Data.WalletContext.TxCount != cachedWallet.TxCount {
		t.Fatalf("expected tx_count %d, got %d", cachedWallet.TxCount, evt.Data.WalletContext.TxCount)
	}
	if state.totalCalls() != 0 {
		t.Fatalf("expected provider not to be called on cache hit, got %d calls", state.totalCalls())
	}
}

type eventFlowTestEnv struct {
	cache           *infraCache.RedisCache
	channel         *amqp.Channel
	publishTapQueue string
	topology        events.Topology
}

func newEventFlowTestEnv(t *testing.T, topology events.Topology, providerBaseURL string) *eventFlowTestEnv {
	t.Helper()

	cache, err := infraCache.New(testRedisURL, 20)
	if err != nil {
		t.Skipf("redis unavailable for e2e: %v", err)
	}
	t.Cleanup(func() {
		_ = cache.Close()
	})

	flushRedisDB(t)

	conn, err := amqp.Dial(testRabbitMQURL)
	if err != nil {
		t.Skipf("rabbitmq unavailable for e2e: %v", err)
	}
	t.Cleanup(func() {
		_ = conn.Close()
	})

	channel, err := conn.Channel()
	if err != nil {
		t.Fatalf("create amqp channel: %v", err)
	}
	t.Cleanup(func() {
		_ = channel.Close()
	})

	publishTapQueue := topology.ConsumeQueue + ".cached.tap"
	if err := channel.ExchangeDeclare(topology.ExchangeName, "topic", true, false, false, false, nil); err != nil {
		t.Fatalf("declare exchange: %v", err)
	}
	if _, err := channel.QueueDeclare(publishTapQueue, false, true, true, false, nil); err != nil {
		t.Fatalf("declare publish tap queue: %v", err)
	}
	if err := channel.QueueBind(publishTapQueue, topology.PublishKey, topology.ExchangeName, false, nil); err != nil {
		t.Fatalf("bind publish tap queue: %v", err)
	}
	t.Cleanup(func() {
		_, _ = channel.QueueDelete(publishTapQueue, false, false, false)
	})

	provider := infraProvider.NewEtherscanProvider("", providerBaseURL)
	publisher, err := events.NewPublisherWithTopology(testRabbitMQURL, topology)
	if err != nil {
		t.Fatalf("new publisher: %v", err)
	}
	t.Cleanup(func() {
		_ = publisher.Close()
	})

	consumer, err := events.NewConsumerWithTopology(
		testRabbitMQURL,
		usecase.NewProcessWalletDataRequested(
			cache,
			map[string]usecase.BlockchainProviderPort{
				"ethereum": provider,
				"polygon":  provider,
			},
			publisher,
			infraProvider.Normalize,
		),
		topology,
	)
	if err != nil {
		t.Fatalf("new consumer: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		done <- consumer.Start(ctx)
	}()
	t.Cleanup(func() {
		cancel()
		_ = consumer.Close()
		select {
		case err := <-done:
			if err != nil && !strings.Contains(err.Error(), "channel/connection is not open") {
				t.Fatalf("consumer stopped with error: %v", err)
			}
		case <-time.After(3 * time.Second):
			t.Fatal("timeout waiting consumer shutdown")
		}
	})

	pollUntil(t, 3*time.Second, func() error {
		_, err := channel.QueueInspect(topology.ConsumeQueue)
		return err
	})
	purgeQueue(t, channel, topology.ConsumeQueue)
	purgeQueue(t, channel, publishTapQueue)

	return &eventFlowTestEnv{
		cache:           cache,
		channel:         channel,
		publishTapQueue: publishTapQueue,
		topology:        topology,
	}
}

func (e *eventFlowTestEnv) publishRequestedEvent(requestID, userID, chain, address string) error {
	body, err := json.Marshal(map[string]any{
		"event":         "wallet.data.requested",
		"schemaVersion": "1",
		"timestamp":     time.Now().UTC().Format(time.RFC3339),
		"data": map[string]string{
			"requestId": requestID,
			"userId":    userID,
			"chain":     chain,
			"address":   address,
		},
	})
	if err != nil {
		return err
	}

	return e.channel.PublishWithContext(
		context.Background(),
		e.topology.ExchangeName,
		e.topology.ConsumeKey,
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Body:         body,
		},
	)
}

func (e *eventFlowTestEnv) mustReadCachedEvent(t *testing.T) domain.WalletDataCachedEvent {
	t.Helper()

	var event domain.WalletDataCachedEvent
	pollUntil(t, 10*time.Second, func() error {
		msg, ok, err := e.channel.Get(e.publishTapQueue, true)
		if err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("message not available yet")
		}
		return json.Unmarshal(msg.Body, &event)
	})

	return event
}

func flushRedisDB(t *testing.T) {
	t.Helper()

	opts, err := redis.ParseURL(testRedisURL)
	if err != nil {
		t.Fatalf("parse redis url: %v", err)
	}
	client := redis.NewClient(opts)
	defer client.Close()

	if err := client.FlushDB(context.Background()).Err(); err != nil {
		t.Fatalf("flush redis db: %v", err)
	}
}

func purgeQueue(t *testing.T, channel *amqp.Channel, queue string) {
	t.Helper()
	if _, err := channel.QueuePurge(queue, false); err != nil {
		t.Fatalf("purge queue %s: %v", queue, err)
	}
}

func pollUntil(t *testing.T, timeout time.Duration, fn func() error) {
	t.Helper()

	deadline := time.Now().Add(timeout)
	var lastErr error
	for time.Now().Before(deadline) {
		if err := fn(); err == nil {
			return
		} else {
			lastErr = err
		}
		time.Sleep(100 * time.Millisecond)
	}

	t.Fatalf("timeout waiting condition: %v", lastErr)
}

type providerState struct {
	mu     sync.Mutex
	counts map[string]int
}

func newProviderState() *providerState {
	return &providerState{counts: make(map[string]int)}
}

func (s *providerState) increment(action, address string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counts[action+":"+strings.ToLower(address)]++
}

func (s *providerState) calls(action, address string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.counts[action+":"+strings.ToLower(address)]
}

func (s *providerState) totalCalls() int {
	s.mu.Lock()
	defer s.mu.Unlock()

	total := 0
	for _, count := range s.counts {
		total += count
	}
	return total
}

func newMockEtherscanServer(t *testing.T, state *providerState) *httptest.Server {
	t.Helper()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		action := r.URL.Query().Get("action")
		address := strings.ToLower(r.URL.Query().Get("address"))
		state.increment(action, address)
		w.Header().Set("Content-Type", "application/json")

		switch action {
		case "txlist":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "1",
				"message": "OK",
				"result": []map[string]string{
					{
						"hash":      "0xhash1",
						"from":      address,
						"to":        "0x1111111111111111111111111111111111111111",
						"value":     "1000000000000000000",
						"timeStamp": "1704067200",
					},
					{
						"hash":      "0xhash2",
						"from":      "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
						"to":        address,
						"value":     "2000000000000000000",
						"timeStamp": "1711929600",
					},
				},
			})
		case "tokentx":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "1",
				"message": "OK",
				"result": []map[string]string{
					{
						"hash":            "0xhash3",
						"from":            address,
						"to":              "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
						"value":           "500000000000000000",
						"timeStamp":       "1714521600",
						"tokenSymbol":     "USDC",
						"tokenName":       "USD Coin",
						"contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
					},
				},
			})
		case "balance":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "1",
				"message": "OK",
				"result":  "3500000000000000000",
			})
		default:
			http.Error(w, "unsupported action", http.StatusBadRequest)
		}
	}))
	t.Cleanup(server.Close)
	return server
}

func testTopology(t *testing.T) events.Topology {
	t.Helper()
	name := strings.ToLower(strings.ReplaceAll(t.Name(), "/", "."))
	name = strings.ReplaceAll(name, " ", "-")
	return events.Topology{
		ExchangeName: fmt.Sprintf("score-cripto.events.%s", name),
		ConsumeQueue: fmt.Sprintf("data-search.wallet.data.requested.%s", name),
		ConsumeKey:   "wallet.data.requested",
		ConsumerTag:  fmt.Sprintf("data-search-worker-%s", name),
		PublishKey:   "wallet.data.cached",
	}
}
