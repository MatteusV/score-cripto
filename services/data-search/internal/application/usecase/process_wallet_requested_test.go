package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/score-cripto/data-search/internal/application/usecase"
	"github.com/score-cripto/data-search/internal/domain"
)

// --- Mocks ---

type mockCache struct {
	getFunc func(ctx context.Context, chain, address string) (*domain.WalletContext, error)
	setFunc func(ctx context.Context, wc *domain.WalletContext) error
}

func (m *mockCache) Get(ctx context.Context, chain, address string) (*domain.WalletContext, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, chain, address)
	}
	return nil, nil
}

func (m *mockCache) Set(ctx context.Context, wc *domain.WalletContext) error {
	if m.setFunc != nil {
		return m.setFunc(ctx, wc)
	}
	return nil
}

type mockProvider struct {
	chains    []string
	fetchFunc func(ctx context.Context, chain, address string) (*domain.RawWalletData, error)
}

func (m *mockProvider) SupportedChains() []string { return m.chains }

func (m *mockProvider) FetchWalletData(ctx context.Context, chain, address string) (*domain.RawWalletData, error) {
	if m.fetchFunc != nil {
		return m.fetchFunc(ctx, chain, address)
	}
	return &domain.RawWalletData{Chain: chain, Address: address, DataSource: "mock"}, nil
}

type mockPublisher struct {
	publishFunc func(ctx context.Context, event domain.WalletDataCachedEvent) error
	called      bool
}

func (m *mockPublisher) PublishWalletCached(ctx context.Context, event domain.WalletDataCachedEvent) error {
	m.called = true
	if m.publishFunc != nil {
		return m.publishFunc(ctx, event)
	}
	return nil
}

func stubNormalizer(raw *domain.RawWalletData) *domain.WalletContext {
	return &domain.WalletContext{
		Chain:     raw.Chain,
		Address:   raw.Address,
		RiskFlags: []string{},
	}
}

// --- Tests ---

func TestProcessWalletDataRequested_CacheHit(t *testing.T) {
	cached := &domain.WalletContext{Chain: "ethereum", Address: "0xabc"}
	cache := &mockCache{
		getFunc: func(_ context.Context, chain, address string) (*domain.WalletContext, error) {
			return cached, nil
		},
	}
	provider := &mockProvider{chains: []string{"ethereum"}}
	pub := &mockPublisher{}

	uc := usecase.NewProcessWalletDataRequested(cache, map[string]usecase.BlockchainProviderPort{
		"ethereum": provider,
	}, pub, stubNormalizer, nil)

	out, err := uc.Execute(context.Background(), usecase.ProcessWalletDataRequestedInput{
		RequestID: "req-1",
		UserID:    "user-1",
		Chain:     "ethereum",
		Address:   "0xabc",
	})
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if !out.CacheHit {
		t.Error("expected CacheHit=true")
	}
	if out.WalletContext != cached {
		t.Error("expected cached WalletContext to be returned")
	}
	if !pub.called {
		t.Error("expected publisher.PublishWalletCached to be called on cache hit")
	}
	// Provider should NOT have been called.
	if provider.fetchFunc != nil {
		t.Error("provider fetch should not be called on cache hit")
	}
}

func TestProcessWalletDataRequested_CacheMiss_FetchAndPublish(t *testing.T) {
	fetchCalled := false
	setCalled := false

	cache := &mockCache{
		getFunc: func(_ context.Context, _, _ string) (*domain.WalletContext, error) { return nil, nil },
		setFunc: func(_ context.Context, _ *domain.WalletContext) error {
			setCalled = true
			return nil
		},
	}
	provider := &mockProvider{
		chains: []string{"ethereum"},
		fetchFunc: func(_ context.Context, chain, address string) (*domain.RawWalletData, error) {
			fetchCalled = true
			return &domain.RawWalletData{Chain: chain, Address: address, DataSource: "mock"}, nil
		},
	}
	pub := &mockPublisher{}

	uc := usecase.NewProcessWalletDataRequested(cache, map[string]usecase.BlockchainProviderPort{
		"ethereum": provider,
	}, pub, stubNormalizer, nil)

	out, err := uc.Execute(context.Background(), usecase.ProcessWalletDataRequestedInput{
		RequestID: "req-1",
		UserID:    "user-1",
		Chain:     "ethereum",
		Address:   "0xabc",
	})
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if out.CacheHit {
		t.Error("expected CacheHit=false")
	}
	if !fetchCalled {
		t.Error("expected provider.FetchWalletData to be called")
	}
	if !setCalled {
		t.Error("expected cache.Set to be called")
	}
	if !pub.called {
		t.Error("expected publisher.PublishWalletCached to be called")
	}
}

func TestProcessWalletDataRequested_UnsupportedChain(t *testing.T) {
	cache := &mockCache{
		getFunc: func(_ context.Context, _, _ string) (*domain.WalletContext, error) { return nil, nil },
	}
	pub := &mockPublisher{}

	uc := usecase.NewProcessWalletDataRequested(cache, map[string]usecase.BlockchainProviderPort{
		"ethereum": &mockProvider{chains: []string{"ethereum"}},
	}, pub, stubNormalizer, nil)

	_, err := uc.Execute(context.Background(), usecase.ProcessWalletDataRequestedInput{
		RequestID: "req-1",
		UserID:    "user-1",
		Chain:     "solana",
		Address:   "someaddress",
	})
	if err == nil {
		t.Fatal("expected error for unsupported chain, got nil")
	}
	if !errors.Is(err, usecase.ErrUnsupportedChain) {
		t.Errorf("expected ErrUnsupportedChain, got: %v", err)
	}
}

func TestProcessWalletDataRequested_ProviderError(t *testing.T) {
	providerErr := errors.New("provider down")
	cache := &mockCache{
		getFunc: func(_ context.Context, _, _ string) (*domain.WalletContext, error) { return nil, nil },
	}
	provider := &mockProvider{
		chains: []string{"ethereum"},
		fetchFunc: func(_ context.Context, _, _ string) (*domain.RawWalletData, error) {
			return nil, providerErr
		},
	}
	pub := &mockPublisher{}

	uc := usecase.NewProcessWalletDataRequested(cache, map[string]usecase.BlockchainProviderPort{
		"ethereum": provider,
	}, pub, stubNormalizer, nil)

	_, err := uc.Execute(context.Background(), usecase.ProcessWalletDataRequestedInput{
		RequestID: "req-1",
		UserID:    "user-1",
		Chain:     "ethereum",
		Address:   "0xabc",
	})
	if err == nil {
		t.Fatal("expected error from provider, got nil")
	}
	if !errors.Is(err, providerErr) {
		t.Errorf("expected wrapped providerErr, got: %v", err)
	}
}

func TestProcessWalletDataRequested_CacheSetError_NonFatal(t *testing.T) {
	cache := &mockCache{
		getFunc: func(_ context.Context, _, _ string) (*domain.WalletContext, error) { return nil, nil },
		setFunc: func(_ context.Context, _ *domain.WalletContext) error {
			return errors.New("redis down")
		},
	}
	provider := &mockProvider{chains: []string{"ethereum"}}
	pub := &mockPublisher{}

	uc := usecase.NewProcessWalletDataRequested(cache, map[string]usecase.BlockchainProviderPort{
		"ethereum": provider,
	}, pub, stubNormalizer, nil)

	out, err := uc.Execute(context.Background(), usecase.ProcessWalletDataRequestedInput{
		RequestID: "req-1",
		UserID:    "user-1",
		Chain:     "ethereum",
		Address:   "0xabc",
	})
	if err != nil {
		t.Fatalf("cache.Set error should be non-fatal, got: %v", err)
	}
	if out.WalletContext == nil {
		t.Error("expected WalletContext to be returned even when cache.Set fails")
	}
}

func TestProcessWalletDataRequested_PublishError_NonFatal(t *testing.T) {
	cache := &mockCache{
		getFunc: func(_ context.Context, _, _ string) (*domain.WalletContext, error) { return nil, nil },
	}
	provider := &mockProvider{chains: []string{"ethereum"}}
	pub := &mockPublisher{
		publishFunc: func(_ context.Context, _ domain.WalletDataCachedEvent) error {
			return errors.New("rabbitmq down")
		},
	}

	uc := usecase.NewProcessWalletDataRequested(cache, map[string]usecase.BlockchainProviderPort{
		"ethereum": provider,
	}, pub, stubNormalizer, nil)

	out, err := uc.Execute(context.Background(), usecase.ProcessWalletDataRequestedInput{
		RequestID: "req-1",
		UserID:    "user-1",
		Chain:     "ethereum",
		Address:   "0xabc",
	})
	if err != nil {
		t.Fatalf("publish error should be non-fatal, got: %v", err)
	}
	if out.WalletContext == nil {
		t.Error("expected WalletContext to be returned even when publish fails")
	}
}
