# Use Cases - Process Data IA

## AnalysisRequest Use Cases

### 1. CreateAnalysisRequest
**Responsabilidade**: Registrar que uma nova análise foi solicitada

**Entrada**:
- `userId`: string
- `chain`: string
- `address`: string
- `walletContextHash`: string

**Saída**:
- `AnalysisRequest` (id, userId, chain, address, status=PENDING, requestedAt, etc)

**Regras de Negócio**:
1. Todos os campos de entrada são obrigatórios e não-vazios
2. Verificar se existe request com status `PENDING` ou `PROCESSING` para `(userId, chain, address)`
   - Se existir → retornar request existente (evitar duplicata de clique)
   - Se não existir → criar novo
3. Status inicial sempre `PENDING`
4. `requestedAt = now()`
5. User pode fazer múltiplas análises da mesma wallet (sem restrição na tabela)

**Fluxo**:
```
Input validation → Check duplicate → Create or return existing
```

---

### 2. UpdateStatusToProcessing
**Responsabilidade**: Marcar que scoreWithAI começou

**Entrada**:
- `analysisRequestId`: string

**Saída**:
- `AnalysisRequest` (status=PROCESSING, processingAt=now)

**Regras de Negócio**:
1. Request deve existir
2. Request deve estar em status `PENDING`
3. Só pode fazer essa transição 1 vez
4. `processingAt = now()`

---

### 3. UpdateStatusToCompleted
**Responsabilidade**: Marcar que análise terminou com sucesso

**Entrada**:
- `analysisRequestId`: string

**Saída**:
- `AnalysisRequest` (status=COMPLETED, completedAt=now)

**Regras de Negócio**:
1. Request deve existir
2. Request deve estar em status `PROCESSING`
3. Só pode fazer essa transição 1 vez
4. `completedAt = now()`

---

### 4. UpdateStatusToFailed
**Responsabilidade**: Marcar que análise falhou (AI indisponível, etc)

**Entrada**:
- `analysisRequestId`: string
- `failureReason`: string (ex: "OpenAI API timeout")

**Saída**:
- `AnalysisRequest` (status=FAILED, failedAt=now, failureReason)

**Regras de Negócio**:
1. Request deve existir
2. Request deve estar em status `PROCESSING`
3. `failureReason` é obrigatório e não-vazio
4. `failedAt = now()`
5. Após marcar FAILED, o fluxo ainda tenta scoreWithHeuristic (não bloqueia)

---

### 5. GetAnalysisById
**Responsabilidade**: Recuperar uma análise por ID

**Entrada**:
- `analysisRequestId`: string

**Saída**:
- `AnalysisRequest` ou `null`

**Regras de Negócio**:
1. Retornar o registro exato, sem filtros
2. Incluir `ProcessedData` relacionado se existir

---

### 6. ListAnalysisByUser
**Responsabilidade**: Listar histórico de análises do user

**Entrada**:
- `userId`: string
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)

**Saída**:
- Array de `AnalysisRequest` com paginação
- Total count

**Regras de Negócio**:
1. Retornar em ordem DESC por `requestedAt`
2. Aceitar filtros opcionais: `status`, `chain`
3. Paginação obrigatória (evitar full table scan)
4. Max 100 por página
5. Soft delete: ignorar se `deletedAt` for implementado

---

### 7. CountUserAnalysisThisMonth
**Responsabilidade**: Contar análises do user no mês atual (para validar quota FREE_TIER/PRO)

**Entrada**:
- `userId`: string

**Saída**:
- `count`: number (de análises completadas neste mês)

**Regras de Negócio**:
1. Contar apenas `status IN ['COMPLETED', 'FAILED']` (análises que terminaram)
2. Filtrar por `requestedAt >= DATE_TRUNC('month', NOW())`
3. Query deve ser otimizada (< 100ms) com índice em `(userId, requestedAt)`
4. Usado pelo serviço `users` para validar entitlements (FREE: 5, PRO: 15)

---

## ProcessedData Use Cases

### 8. GetCachedScore
**Responsabilidade**: Buscar score válido já calculado

**Entrada**:
- `chain`: string
- `address`: string
- `walletContextHash`: string

**Saída**:
- `ProcessedData` ou `null`

**Regras de Negócio**:
1. Buscar `ProcessedData` com `validUntil > now()`
2. Filtrar por `(chain, address, walletContextHash)` (via AnalysisRequest join)
3. Retornar mais recente se houver múltiplos válidos
4. Cache hit = retornar imediatamente sem rodar IA

---

### 9. ScoreWalletWithAI
**Responsabilidade**: Chamar IA (OpenAI) e gerar score

**Entrada**:
- `WalletContextInput` (chain, address, tx_count, volumes, flags, etc)

**Saída**:
- `ScoreOutput` (score: 0-100, confidence: 0-1, reasoning, positiveFactors[], riskFactors[])
- + metadados (modelVersion, promptVersion, tokensUsed, cost, durationMs)

**Regras de Negócio**:
1. Construir prompt estruturado a partir de WalletContextInput
2. Chamar `generateObject()` com schema validado (Zod)
3. Score deve estar entre 0-100 (validado pelo schema)
4. Confidence deve estar entre 0-1 (validado pelo schema)
5. Registrar `modelVersion` (ex: gpt-4o-mini) e `promptVersion` (ex: v1.0)
6. Registrar tokens usados e custo da inferência
7. Se falhar → lançar exceção (será capturada pelo orquestrador)

---

### 10. ScoreWalletWithHeuristic
**Responsabilidade**: Fallback quando IA falha - usar regras determinísticas

**Entrada**:
- `WalletContextInput` (mesma entrada do AI)

**Saída**:
- `ScoreOutput` (score: 0-100, confidence: 0-1, reasoning, positiveFactors[], riskFactors[])

**Regras de Negócio**:
1. Nunca falha (sempre retorna um score)
2. Confidence max 0.8 (heurístico é menos confiável que IA)
3. Algoritmo determinístico baseado em 11 fatores:
   - Wallet age (dias)
   - Transaction count
   - Unique counterparties
   - Mixer interaction (red flag: -25)
   - Sanctioned interaction (red flag: -30)
   - Largest tx ratio
   - DeFi interactions
   - Token diversity
   - NFT activity
   - Risk flags count
   - Score inicial: 50, clamped: [0, 100]

---

### 11. PersistScore
**Responsabilidade**: Salvar score no banco de dados

**Entrada**:
- `analysisRequestId`: string
- `userId`: string
- `chain`: string
- `address`: string
- `scoreOutput`: ScoreOutput
- `modelVersion`: string
- `promptVersion`: string
- `tokensUsed`: number
- `cost`: number
- `durationMs`: number

**Saída**:
- `ProcessedData` (id, createdAt, validUntil, etc)

**Regras de Negócio**:
1. Criar `ProcessedData` com todos os campos
2. `validUntil = now() + config.scoreValidityHours` (ex: 24h)
3. Atualizar `AnalysisRequest.status = COMPLETED` e `completedAt = now()`
4. PositiveFactors e riskFactors devem ser salvos como JSON
5. Salvar metadata de inferência (modelVersion, promptVersion, tokens, cost)

---

### 12. PublishScoreEvent
**Responsabilidade**: Publicar evento de score calculado em RabbitMQ

**Entrada**:
- `processId`: string
- `chain`: string
- `address`: string
- `score`: number
- `confidence`: number
- `modelVersion`: string
- `promptVersion`: string

**Saída**:
- `boolean` (true = publicado, false = falhou)

**Regras de Negócio**:
1. Fire-and-forget: falha não bloqueia fluxo principal
2. Publicar em tópico `wallet.score.calculated`
3. Incluir timestamp no payload
4. Log de falha (mas não retornar erro)
5. Se RabbitMQ indisponível, apenas warn (não bloqueia)

---

### 13. GetScoreByProcessId
**Responsabilidade**: Recuperar score previamente calculado

**Entrada**:
- `processId`: string (analysisRequestId)

**Saída**:
- `ProcessedData` com AnalysisRequest relacionado ou `null`

**Regras de Negócio**:
1. Buscar por `analysisRequestId` (unique)
2. Retornar todos os campos de score
3. Incluir `validUntil` e `createdAt` para client saber se ainda é válido

---

## Orquestrador Use Case

### 14. CalculateScore (Main Flow)
**Responsabilidade**: Orquestrar fluxo completo de score

**Entrada**:
- `userId`: string
- `WalletContextInput`: chain, address, features...

**Saída**:
- `ScoreResponse` (processId, score, confidence, reasoning, positiveFactors[], riskFactors[], validUntil, etc)

**Regras de Negócio**:
1. **Validar input** → se inválido, retornar 400
2. **Gerar contextHash** → SHA256 do input
3. **Buscar cache** → GetCachedScore → se válido, retornar com `cachedResult: true`
4. **Criar analysis** → CreateAnalysisRequest → gera novo ID
5. **Marcar processing** → UpdateStatusToProcessing
6. **Score (com fallback)**:
   - Try: ScoreWalletWithAI
   - Catch: ScoreWalletWithHeuristic (marca como fallback internamente)
7. **Persistir** → PersistScore + UpdateStatusToCompleted
8. **Publicar evento** → PublishScoreEvent (async, não bloqueia)
9. **Retornar** → ScoreResponse com `cachedResult: false`

**Fluxo Visual**:
```
Input Validation
    ↓
Hash Context
    ↓
GetCachedScore → Válido? → Sim → Return cached
    ↓ Não
CreateAnalysisRequest
    ↓
UpdateStatusToProcessing
    ↓
Try ScoreWithAI
    ↓ Erro?
    Catch → ScoreWithHeuristic
    ↓
PersistScore
    ↓
UpdateStatusToCompleted
    ↓
PublishScoreEvent (async)
    ↓
Return response
```

---

## Resumo: 14 Use Cases

| # | Entidade | Use Case | Tipo |
|---|----------|----------|------|
| 1 | AnalysisRequest | CreateAnalysisRequest | Create |
| 2 | AnalysisRequest | UpdateStatusToProcessing | Update |
| 3 | AnalysisRequest | UpdateStatusToCompleted | Update |
| 4 | AnalysisRequest | UpdateStatusToFailed | Update |
| 5 | AnalysisRequest | GetAnalysisById | Read |
| 6 | AnalysisRequest | ListAnalysisByUser | Read |
| 7 | AnalysisRequest | CountUserAnalysisThisMonth | Read |
| 8 | ProcessedData | GetCachedScore | Read |
| 9 | ProcessedData | ScoreWalletWithAI | Calculate |
| 10 | ProcessedData | ScoreWalletWithHeuristic | Calculate |
| 11 | ProcessedData | PersistScore | Create |
| 12 | Event | PublishScoreEvent | Publish |
| 13 | ProcessedData | GetScoreByProcessId | Read |
| 14 | Orquestrador | CalculateScore | Orquestrate |
