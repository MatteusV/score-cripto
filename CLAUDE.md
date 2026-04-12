# Project Instructions for AI Agents

## Visão Geral do Projeto

**Score Cripto** é um SaaS que fornece análise de confiabilidade para carteiras de criptomoedas com apoio de IA.

**Problema**: Usuários precisam determinar se o proprietário de uma carteira é confiável antes de fazer transações. Como saber se aquele endereço é seguro?

**Solução**: Coletar dados on-chain da carteira, estruturar esses sinais e enviar o contexto para IA gerar um score de confiabilidade.

**Features principais:**
- 🔍 Consulta de score por carteira/endereço blockchain
- 📊 Análise de movimentações e padrões de transação
- ⚠️ Detecção de atividades suspeitas (mixers, addresses de risco)
- 🤖 Score gerado por IA a partir dos dados da carteira
- 📈 Score agregado (0-100) indicando confiabilidade
- 🧾 Explicação dos fatores que levaram ao score
- 📱 Dashboard de análise por usuário

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->

## Architecture Overview

**Score Cripto** é um monorepo com arquitetura de microserviços baseada em eventos.

### Microserviços Atuais

- **data-search**: Busca dados on-chain e metadados externos da carteira, normaliza a resposta e mantém cache temporário com TTL de 20 minutos
- **process-data-ia**: Consolida o contexto estruturado da carteira, chama a IA para gerar o score e persiste o resultado processado da inferência
- **users**: Gerencia usuários, carteiras vinculadas, autenticação, assinatura, limites de uso e integração com Stripe

### Infraestrutura por Serviço

- **data-search**
  - Infra dedicada: `data-search-redis`
  - Não depende de PostgreSQL
- **process-data-ia**
  - Infra dedicada: `process-data-ia-postgres`
  - Não depende de Redis
- **users**
  - Deve ter banco próprio quando for implementado, sem compartilhar Postgres com outros serviços
- **rabbitmq**
  - Continua compartilhado entre os serviços orientados a eventos

### Ambiente Docker Local

- O ambiente local é orquestrado pelo [docker-compose.yml](/home/matteus-varlesse/www/score-cripto/docker-compose.yml) na raiz
- Cada serviço deve ter seu próprio `Dockerfile`
- O `docker-compose` da raiz é a fonte de verdade para subir a stack completa em desenvolvimento
- Portas locais padrão atuais:
  - `process-data-ia`: `3002`
  - `data-search`: `8080`
  - `process-data-ia-postgres`: `5433`
  - `data-search-redis`: `6380`
  - `rabbitmq`: `5673`
  - `rabbitmq management`: `15673`

### Fluxo de Dados (Exemplo: Consultar Score)

```
1. Client
   └─ Envia request para análise da carteira

2. API Gateway
   └─ Valida autenticação e limites do usuário
   └─ Encaminha a requisição para o fluxo interno

3. data-search
   └─ Recebe chain + address
   └─ Busca dados em provedores externos e fontes blockchain
   └─ Normaliza os dados coletados
   └─ Armazena cache temporário com TTL de 20 minutos
   └─ Retorna o contexto bruto/normalizado da carteira

4. process-data-ia
   └─ Verifica se já existe score persistido ainda válido
   └─ Se existir, retorna imediatamente e pode disparar refresh em background
   └─ Se não existir, processa os dados recebidos do data-search
   └─ Envia o contexto estruturado para IA metrificar o score
   └─ Persiste score, confiança, fatores positivos, fatores de risco e metadados da inferência

5. users
   └─ Controla o consumo mensal por plano
   └─ Aplica regras de FREE_TIER e PRO
   └─ Mantém assinatura, billing e vínculo com Stripe

6. Client
   └─ Exibe score, explicação e sinais analisados
```

## Key Considerations

### Blockchain Data

- **Rate Limiting**: APIs blockchain (Etherscan, etc) têm limites. Use o Redis dedicado do `data-search`.
- **Chain Support**: Sistema deve suportar múltiplos blockchains (Ethereum, Bitcoin, Polygon, Solana, etc)
- **Address Normalization**: Normalizar endereços por rede antes de cachear ou processar
- **Cache Strategy**: O `data-search` deve operar com cache temporário de 20 minutos para reduzir custo e latência

### AI Score Calculation

O score gerado por IA deve ser:
- **Estruturado**: A IA deve receber métricas e sinais objetivos da carteira, não dados crus soltos
- **Reprodutível**: Mesmo endereço + mesmos dados + mesma versão de prompt/modelo = mesmo score esperado
- **Versionado**: Versionar prompt, modelo, esquema de entrada e pós-processamento
- **Calibrado**: Normalizar a saída da IA para score final entre 0 e 100
- **Transparente**: Explicar quais fatores influenciam o score
- **Auditável**: Salvar input resumido, output da IA e versão da inferência
- **Fast**: Retornar score persistido imediatamente quando ainda estiver válido

### IA e Inferência

- **Prompt Engineering**: O prompt deve instruir a IA a agir como avaliador de risco de carteira
- **Structured Output**: Resposta da IA deve vir em formato estruturado com score, justificativa, fatores positivos, fatores de risco e confiança
- **Hallucination Control**: A IA só pode inferir com base nos dados fornecidos da carteira
- **Fallback**: Em caso de falha do modelo, retornar erro controlado ou usar score heurístico temporário
- **Cost Control**: Minimizar tokens enviando features agregadas em vez de histórico bruto completo
- **Latency**: Retornar score salvo quando disponível e recalcular em background quando necessário

### Users, Billing & Entitlements

- **Free Tier**: Usuários `FREE_TIER` podem realizar até 5 análises por mês
- **Pro Plan**: Usuários `PRO` podem realizar até 15 análises por mês
- **Stripe**: Assinaturas pagas devem ser gerenciadas com Stripe Billing e Customer Portal
- **Usage Tracking**: O serviço `users` deve controlar consumo por janela mensal e validar entitlement antes da análise
- **Shared Score**: O resultado persistido da carteira pode ser reutilizado entre usuários; o consumo da análise continua pertencendo ao usuário que requisitou
- **Database Ownership**: O serviço `users` deve ter banco próprio; não compartilhar PostgreSQL com `process-data-ia`

### Privacy & Compliance

- **GDPR**: Usuários podem pedir deleção de dados (até limites blockchain)
- **No Personal Data**: Não armazenar informações pessoais além do necessário
- **Audit Trail**: Registrar quem consultou qual carteira (compliance)

## Build & Test

```bash
# Exemplo: frontend
cd frontend
pnpm install

# Testes
pnpm test             # Todos os testes (TDD obrigatório)
pnpm test:watch       # Watch mode

# Desenvolvimento
pnpm dev

# Build para produção
pnpm build
pnpm preview
```

## Conventions & Patterns

### TDD (Test-Driven Development)

**Obrigatório**: Escrever testes ANTES de implementar features.

1. **Red**: Escrever teste que falha
2. **Green**: Implementar código mínimo para passar
3. **Refactor**: Limpar e otimizar

**Exemplo (Processamento e Score):**
```js
// test/process-data-ia.test.js
describe('Process Data + IA', () => {
  it('should return a score between 0-100 for a structured wallet context', () => {
    // Arrange: Mock wallet context from data-search
    // Act: process wallet data and send payload to AI scoring
    // Assert: score should be between 0-100
  });
});
```

### Event-Driven Architecture

- Microserviços se comunicam via eventos assíncronos quando fizer sentido operacional
- Cada serviço é autônomo e pode ser escalado independentemente
- O API Gateway coordena o fluxo externo entre client e serviços internos

**Eventos principais:**
- `wallet.data.requested` → Nova requisição de busca de dados da carteira
- `wallet.data.cached` → Dados normalizados armazenados em cache no `data-search`
- `wallet.score.calculated` → Score e inferência persistidos no `process-data-ia`
- `user.analysis.consumed` → Consumo mensal registrado no serviço `users`

<!-- autoskills:start -->

Summary generated by `autoskills`. Check the full files inside `.claude/skills`.

## Accessibility (a11y)

Audit and improve web accessibility following WCAG 2.2 guidelines. Use when asked to "improve accessibility", "a11y audit", "WCAG compliance", "screen reader support", "keyboard navigation", or "make accessible".

- `.claude/skills/accessibility/SKILL.md`
- `.claude/skills/accessibility/references/A11Y-PATTERNS.md`: Practical, copy-paste-ready patterns for common accessibility requirements. Each pattern is self-contained and linked from the main [SKILL.md](../SKILL.md).
- `.claude/skills/accessibility/references/WCAG.md`

## Capabilities

Documentation and capabilities reference for Etherscan

- `.claude/skills/etherscan/SKILL.md`

## Design Thinking

Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beaut...

- `.claude/skills/frontend-design/SKILL.md`

## SEO optimization

Optimize for search engine visibility and ranking. Use when asked to "improve SEO", "optimize for search", "fix meta tags", "add structured data", "sitemap optimization", or "search engine optimization".

- `.claude/skills/seo/SKILL.md`

## UI/UX Pro Max - Design Intelligence

UI/UX design intelligence. 67 styles, 96 palettes, 57 font pairings, 25 charts, 13 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check UI/UX code. Proje...

- `.claude/skills/ui-ux-pro-max/SKILL.md`

<!-- autoskills:end -->
