# AI_SDK Wrapper/Adapter Pattern Architecture

## Objetivo

Criar uma camada de abstração isolada para integração com **Vercel AI SDK** no serviço **process-data-ia** (Node.js), que usa PostgreSQL dedicado para persistir inferências. Isso permite:

1. **Provider agnosticism**: Trocar AI provider (OpenAI → Anthropic → custom) sem quebrar process-data-ia
2. **Structured output**: Garantir respostas padronizadas (score 0-100, confidence, risk_factors, etc)
3. **Versioning**: Rastrear versão de prompt, modelo e schema de resposta
4. **Observability**: Logging de custo, latência, tokens usados
5. **Fallback strategy**: Usar heurístico temporário se IA falhar

## Arquitetura

```
┌────────────────────────────────────────┐
│   process-data-ia (Node.js/Fastify)     │
└──────────────┬─────────────────────────┘
               │
               │ calls
               ↓
┌────────────────────────────────────────┐
│   AI Scoring Adapter                   │
│   (Wrapper Isolado)                    │
├────────────────────────────────────────┤
│  • scoreWallet(context) -> Promise     │
│  • parseStructuredOutput(response)     │
│  • handleErrors & fallbacks            │
│  • logMetrics & costs                  │
└──────────────┬────────────────────────┘
        │      │      │
        │      │      │
   ┌────┴──┬───┴──┬───┴────┐
   ↓       ↓      ↓        ↓
  v0:API  v1:API Fallback Error
  OpenAI Anthropic Heuristic Handler
   SDK   AI SDK   Score   (DLQ/Retry)
```

## Implementação

### 1. Interface do Adapter

```typescript
// src/adapters/ai-scorer/types.ts

export type WalletContext = {
  chain: 'ethereum' | 'bitcoin' | 'polygon' | 'solana'
  address: string
  txCount: number
  balance: string
  lastActivity: string
  ageInDays: number
  riskFlags: string[]  // ['mixer', 'sanctioned', 'honeypot', ...]
  transactionVelocity: number  // tx/day
  uniqueCounterparties: number
}

export type AIScore = {
  score: number  // 0-100
  confidence: number  // 0-1
  reasoning: string
  positiveFactors: string[]
  riskFactors: string[]
  metadata: {
    modelVersion: string
    promptVersion: string
    tokensUsed: number
    costEstimate: number
    latencyMs: number
    timestamp: string
  }
}

export interface AIScoringAdapter {
  scoreWallet(context: WalletContext): Promise<AIScore>
  getHealthStatus(): Promise<{ healthy: boolean; lastCheck: string }>
}
```

### 2. Vercel AI SDK Wrapper

```typescript
// src/adapters/ai-scorer/vercel-ai-adapter.ts

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const SCORE_SCHEMA = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  positiveFactors: z.array(z.string()),
  riskFactors: z.array(z.string()),
})

type ScoringResponse = z.infer<typeof SCORE_SCHEMA>

export class VercelAIScoringAdapter implements AIScoringAdapter {
  private model = openai('gpt-4-turbo')  // v1
  private promptVersion = 'v2.0'  // Rastreado

  async scoreWallet(context: WalletContext): Promise<AIScore> {
    const startTime = Date.now()

    try {
      const systemPrompt = this.buildSystemPrompt(context)

      const { object, usage } = await generateObject({
        model: this.model,
        system: systemPrompt,
        prompt: this.buildUserPrompt(context),
        schema: SCORE_SCHEMA,
        temperature: 0.2,  // Low temperature for consistency
        maxTokens: 1000,
      })

      const latencyMs = Date.now() - startTime
      const costEstimate = this.calculateCost(usage)

      // Validação pós-geração (sanidade)
      this.validateScore(object)

      const result: AIScore = {
        score: object.score,
        confidence: object.confidence,
        reasoning: object.reasoning,
        positiveFactors: object.positiveFactors,
        riskFactors: object.riskFactors,
        metadata: {
          modelVersion: 'gpt-4-turbo',
          promptVersion: this.promptVersion,
          tokensUsed: usage.totalTokens,
          costEstimate,
          latencyMs,
          timestamp: new Date().toISOString(),
        },
      }

      // Log sucesso
      this.logMetric('ai_score_success', {
        score: result.score,
        tokens: usage.totalTokens,
        latencyMs,
        chain: context.chain,
      })

      return result
    } catch (error) {
      this.logMetric('ai_score_failure', {
        error: error.message,
        chain: context.chain,
      })

      throw error  // Propagate to caller for fallback
    }
  }

  private buildSystemPrompt(context: WalletContext): string {
    return `You are a blockchain wallet risk assessor. Your job is to analyze wallet on-chain behavior and output a trustworthiness score (0-100).

Score Guidelines:
- 80-100: Highly trusted wallet (established, clean history)
- 60-79: Generally safe (some minor red flags)
- 40-59: Moderate risk (mixed signals)
- 20-39: High risk (several red flags)
- 0-19: Extremely risky (major concerns)

Only make inferences based on the provided data. Do not hallucinate.`
  }

  private buildUserPrompt(context: WalletContext): string {
    return `
Analyze this wallet and provide a risk score:

Chain: ${context.chain}
Address: ${context.address}
Transaction Count: ${context.txCount}
Current Balance: ${context.balance}
Last Activity: ${context.lastActivity}
Age: ${context.ageInDays} days
Risk Flags: ${context.riskFlags.join(', ') || 'none'}
Transaction Velocity: ${context.transactionVelocity} tx/day
Unique Counterparties: ${context.uniqueCounterparties}

Provide structured assessment with score, confidence, and factors.`
  }

  private validateScore(object: ScoringResponse): void {
    if (object.score < 0 || object.score > 100) {
      throw new Error(`Invalid score: ${object.score}`)
    }
    if (object.confidence < 0 || object.confidence > 1) {
      throw new Error(`Invalid confidence: ${object.confidence}`)
    }
    if (object.reasoning.length < 10) {
      throw new Error('Reasoning too short')
    }
  }

  private calculateCost(usage: { completionTokens: number; promptTokens: number }): number {
    // GPT-4 Turbo pricing (as of 2026-03)
    const inputCost = usage.promptTokens * 0.01 / 1000
    const outputCost = usage.completionTokens * 0.03 / 1000
    return inputCost + outputCost
  }

  private logMetric(name: string, data: Record<string, any>): void {
    console.log(`[METRIC] ${name}:`, JSON.stringify(data))
  }

  async getHealthStatus(): Promise<{ healthy: boolean; lastCheck: string }> {
    try {
      // Quick health check
      await generateObject({
        model: this.model,
        system: 'Health check',
        prompt: 'Respond with OK',
        schema: z.object({ status: z.string() }),
      })

      return {
        healthy: true,
        lastCheck: new Date().toISOString(),
      }
    } catch (error) {
      return {
        healthy: false,
        lastCheck: new Date().toISOString(),
      }
    }
  }
}
```

### 3. Fallback Strategy (Heurístico)

```typescript
// src/adapters/ai-scorer/fallback-scorer.ts

export class FallbackScoringAdapter implements AIScoringAdapter {
  /**
   * Heurístico simples quando IA falha.
   * Baseado em sinais objetivos da carteira.
   */
  async scoreWallet(context: WalletContext): Promise<AIScore> {
    const baseScore = 50  // Neutro
    let adjustments = 0

    // Fatores positivos
    if (context.ageInDays > 365) adjustments += 15
    if (context.txCount > 100) adjustments += 10
    if (context.uniqueCounterparties > 20) adjustments += 10
    if (context.transactionVelocity < 1) adjustments += 5  // Baixa velocidade é mais confiável

    // Fatores negativos
    if (context.riskFlags.includes('mixer')) adjustments -= 30
    if (context.riskFlags.includes('sanctioned')) adjustments -= 40
    if (context.txCount < 5) adjustments -= 20
    if (context.transactionVelocity > 50) adjustments -= 15

    const finalScore = Math.max(0, Math.min(100, baseScore + adjustments))
    const confidence = 0.6  // Confiança reduzida em fallback

    return {
      score: Math.round(finalScore),
      confidence,
      reasoning: 'Heurístico temporário (IA indisponível)',
      positiveFactors: this.extractPositiveFactors(context),
      riskFactors: context.riskFlags,
      metadata: {
        modelVersion: 'fallback-v1',
        promptVersion: 'n/a',
        tokensUsed: 0,
        costEstimate: 0,
        latencyMs: 10,
        timestamp: new Date().toISOString(),
      },
    }
  }

  private extractPositiveFactors(context: WalletContext): string[] {
    const factors: string[] = []

    if (context.ageInDays > 365) factors.push('Wallet established (>1 year)')
    if (context.txCount > 100) factors.push('High transaction count')
    if (context.uniqueCounterparties > 20) factors.push('Diverse counterparties')
    if (context.transactionVelocity < 1) factors.push('Stable transaction rate')

    return factors
  }

  async getHealthStatus(): Promise<{ healthy: boolean; lastCheck: string }> {
    return {
      healthy: true,
      lastCheck: new Date().toISOString(),
    }
  }
}
```

### 4. Adapter Factory (Provider selection)

```typescript
// src/adapters/ai-scorer/factory.ts

export class AIScorerFactory {
  static create(provider: 'vercel-ai' | 'fallback'): AIScoringAdapter {
    switch (provider) {
      case 'vercel-ai':
        return new VercelAIScoringAdapter()
      case 'fallback':
        return new FallbackScoringAdapter()
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  static createWithFallback(): AIScoringAdapter {
    // Decorator pattern: tenta Vercel AI, fallback para heurístico
    return new AdapterWithFallback(
      new VercelAIScoringAdapter(),
      new FallbackScoringAdapter()
    )
  }
}

/**
 * Wrapper que encadeia dois adapters:
 * 1. Tenta primary (Vercel AI)
 * 2. Se falhar, usa fallback (heurístico)
 */
export class AdapterWithFallback implements AIScoringAdapter {
  constructor(
    private primary: AIScoringAdapter,
    private fallback: AIScoringAdapter
  ) {}

  async scoreWallet(context: WalletContext): Promise<AIScore> {
    try {
      return await this.primary.scoreWallet(context)
    } catch (error) {
      console.warn(`[FALLBACK] Primary adapter failed: ${error.message}`)

      // Log para DLQ/alerting
      await this.logFailureEvent({
        context,
        error: error.message,
        timestamp: new Date().toISOString(),
      })

      // Retorna fallback
      return await this.fallback.scoreWallet(context)
    }
  }

  async getHealthStatus(): Promise<{ healthy: boolean; lastCheck: string }> {
    const primaryHealth = await this.primary.getHealthStatus()
    const fallbackHealth = await this.fallback.getHealthStatus()

    return {
      healthy: primaryHealth.healthy || fallbackHealth.healthy,
      lastCheck: new Date().toISOString(),
    }
  }

  private async logFailureEvent(data: Record<string, any>): Promise<void> {
    // Publica evento para alerting/monitoring
    console.error('[ALERT] AI Scoring Failure:', JSON.stringify(data))
  }
}
```

### 5. Uso no Scoring Engine

```typescript
// src/services/process-data-ia.ts

import { AIScorerFactory } from '@/adapters/ai-scorer/factory'

export class ScoringEngine {
  private aiScorer = AIScorerFactory.createWithFallback()

  async processWalletAnalysis(analysis: WalletAnalysis): Promise<ProcessedData> {
    // 1. Prepara contexto estruturado
    const walletContext: WalletContext = {
      chain: analysis.chain,
      address: analysis.address,
      txCount: analysis.transactionCount,
      balance: analysis.currentBalance,
      lastActivity: analysis.lastActivityDate,
      ageInDays: this.calculateAge(analysis.createdAt),
      riskFlags: analysis.flags,
      transactionVelocity: this.calculateVelocity(analysis),
      uniqueCounterparties: analysis.counterpartyCount,
    }

    // 2. Chama adapter (com fallback automático)
    const aiScore = await this.aiScorer.scoreWallet(walletContext)

    // 3. Persiste resultado
    const processedData = await this.persistScore({
      ...analysis,
      score: aiScore.score,
      confidence: aiScore.confidence,
      reasoning: aiScore.reasoning,
      positiveFactors: aiScore.positiveFactors,
      riskFactors: aiScore.riskFactors,
      metadata: aiScore.metadata,
    })

    // 4. Publica evento
    await this.eventBus.publish('wallet.score.calculated', {
      analysisId: analysis.id,
      score: aiScore.score,
      processedDataId: processedData.id,
      timestamp: new Date().toISOString(),
    })

    return processedData
  }

  private calculateAge(createdAt: Date): number {
    const now = new Date()
    return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  }

  private calculateVelocity(analysis: WalletAnalysis): number {
    const ageInDays = this.calculateAge(analysis.createdAt)
    return analysis.transactionCount / Math.max(1, ageInDays)
  }

  private async persistScore(data: Record<string, any>): Promise<ProcessedData> {
    return await ProcessedData.create({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}
```

### 6. Testes

```typescript
// test/adapters/ai-scorer.test.ts

describe('AI Scoring Adapter', () => {
  describe('VercelAIScoringAdapter', () => {
    it('should return valid score (0-100) with confidence', async () => {
      const adapter = new VercelAIScoringAdapter()
      const context = createMockContext()

      const result = await adapter.scoreWallet(context)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(result.metadata.tokensUsed).toBeGreaterThan(0)
    })

    it('should track model and prompt versions', async () => {
      const adapter = new VercelAIScoringAdapter()
      const context = createMockContext()

      const result = await adapter.scoreWallet(context)

      expect(result.metadata.modelVersion).toBe('gpt-4-turbo')
      expect(result.metadata.promptVersion).toBe('v2.0')
      expect(result.metadata.timestamp).toBeDefined()
    })
  })

  describe('FallbackScoringAdapter', () => {
    it('should apply heuristic adjustments correctly', async () => {
      const adapter = new FallbackScoringAdapter()

      const youngWallet: WalletContext = {
        ...createMockContext(),
        ageInDays: 10,
        txCount: 2,
        riskFlags: ['mixer'],
      }

      const result = await adapter.scoreWallet(youngWallet)

      expect(result.score).toBeLessThan(50)  // Should be penalized
      expect(result.confidence).toBe(0.6)
    })
  })

  describe('AdapterWithFallback', () => {
    it('should use fallback when primary fails', async () => {
      const primaryMock = {
        scoreWallet: jest.fn().mockRejectedValue(new Error('API Error')),
        getHealthStatus: jest.fn().mockResolvedValue({ healthy: false }),
      }
      const fallback = new FallbackScoringAdapter()

      const adapter = new AdapterWithFallback(primaryMock, fallback)
      const context = createMockContext()

      const result = await adapter.scoreWallet(context)

      expect(result.metadata.modelVersion).toBe('fallback-v1')
      expect(primaryMock.scoreWallet).toHaveBeenCalled()
    })
  })
})
```

## Monitoramento

```typescript
// src/monitoring/ai-metrics.ts

export class AIMetricsCollector {
  trackScoring(result: AIScore, duration: number) {
    const metrics = {
      'ai.score': result.score,
      'ai.confidence': result.confidence,
      'ai.tokens_used': result.metadata.tokensUsed,
      'ai.cost': result.metadata.costEstimate,
      'ai.latency_ms': result.metadata.latencyMs,
      'ai.model_version': result.metadata.modelVersion,
    }

    // Enviar para Prometheus/DataDog/etc
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`[METRIC] ${key}: ${value}`)
    })
  }
}
```

## Sumário

✅ **Adapter Pattern**: Troca de provider sem quebrar process-data-ia
✅ **Structured Output**: Schema Zod garante respostas válidas
✅ **Fallback Strategy**: Heurístico em caso de falha
✅ **Observability**: Tokens, custo, latência rastreados
✅ **Versioning**: Model e prompt versionados
✅ **Testability**: Mocks e fallbacks permitem testes isolados

**Próximos passos:**
1. Implementar Vercel AI SDK wrapper (score-cripto-s1j)
2. Configurar alerting para AI failures
3. Monitorar cost de API e otimizar prompts
4. Implementar cache de respostas para wallets duplicadas
