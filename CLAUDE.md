# CLAUDE.md

**Quick-start guide for Claude Code - Complete details in linked docs**

---

## Project Overview

read -p "Tech Stack (e.g., Express, PostgreSQL, Prisma): " TECH_STACK application for echo ""

**Tech Stack**: 

---

## Session Start Protocol ⚡

**MANDATORY** at start of each session:

```bash
# 1. Load essential docs (~800 tokens - 2 min read)
✓ .claude/COMMON_MISTAKES.md      # ⚠️ CRITICAL - Read FIRST
✓ .claude/QUICK_START.md          # Essential commands
✓ .claude/ARCHITECTURE_MAP.md     # File locations
```

**At task completion:**
- Create completion doc in `.claude/completions/YYYY-MM-DD-task-name.md`
- Use template: `.claude/templates/completion-template.md`
- Move session file to `.claude/sessions/archive/` (if created)
- Update docs as needed (see `.claude/DOCUMENTATION_MAINTENANCE.md`)

**Then load task-specific docs** (~500-1500 tokens):
- See `docs/INDEX.md` for navigation guide

**⚠️ NEVER auto-load:**
- Files in `.claude/completions/` (0 token cost)
- Files in `.claude/sessions/` (0 token cost)
- Files in `docs/archive/` (0 token cost)
- Only load when user explicitly requests

---

## Quick Start Commands

```bash
# Add your common commands here
# npm run dev
# npm test
# npm run build
```

**See**: `.claude/QUICK_START.md` for complete command reference

---

## Documentation Navigation

**📋 Master Index**: `docs/INDEX.md` - Complete navigation with token costs

### Core References
- **Common Mistakes**: `.claude/COMMON_MISTAKES.md` ⚠️ **MANDATORY**
- **Quick Start**: `.claude/QUICK_START.md`
- **Architecture Map**: `.claude/ARCHITECTURE_MAP.md`
- **Maintenance**: `.claude/DOCUMENTATION_MAINTENANCE.md`

---

**Last Updated**: 2026-04-19
**Optimized with**: [Claude Token Optimizer](https://github.com/nadimtuhin/claude-token-optimizer)
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
   bd dolt push
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

### Monorepo Structure

**score-cripto** é um pnpm monorepo com dois tipos de workspaces:

- **`packages/`** - Código compartilhado reutilizado por vários serviços
  - `observability-node`: Pacote central de observabilidade (logger, tracing, AMQP, Fastify plugin)
    - ⚠️ **IMPORTANTE**: Este pacote **precisa ser compilado antes** que os serviços o usem
    - Exports apontam para `dist/` (TypeScript compilado), não para `.ts` raw
    - Cada serviço importa via `"@score-cripto/observability-node": "workspace:*"`

- **`services/`** - Microserviços autônomos
  - `api-gateway`: Boundary externo, orquestra requisições e eventos
  - `process-data-ia`: Processamento e cálculo de score com IA
  - `data-search`: Busca e cache de dados blockchain
  - `users`: Gerenciamento de usuários e billing
  - `web-app`: Dashboard frontend (em desenvolvimento)

Cada serviço tem seu próprio `package.json`, `Dockerfile`, e `CLAUDE.md` com instruções específicas.

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

### Setup Inicial

```bash
pnpm install          # Instala todas as dependências (root + packages + services)
```

### Desenvolvimento (Hot-Reload)

```bash
# Rodar todos os serviços em watch mode (dev)
pnpm dev              # Usa tsx watch internamente

# Rodar um serviço específico
cd services/api-gateway
pnpm dev              # Hot-reload para este serviço
```

### Build & Compilação

```bash
# ⚠️ ORDEM IMPORTANTE: compilar observability-node PRIMEIRO
pnpm --filter "@score-cripto/observability-node" run build

# Depois compilar um serviço específico
pnpm --filter "@score-cripto/api-gateway" run build

# Ou compilar todos os serviços
pnpm --filter "./services/*" run build
```

**Por que?** Serviços dependem de `observability-node` compilado em `dist/`. Se `observability-node` não estiver compilado, imports falham com `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.

### Testes

```bash
# Todos os testes
pnpm test             # Usa vitest em cada workspace

# Watch mode
pnpm test:watch

# Testes de um pacote/serviço específico
pnpm --filter "@score-cripto/api-gateway" run test
pnpm --filter "@score-cripto/process-data-ia" run test:watch
```

### Lint & Type Check

```bash
# Verificar tipos TypeScript + Ultracite/Biome lint
pnpm check            # Roda "check" em todos os workspaces

# Auto-fix issues
pnpm fix              # Roda "fix" em todos os workspaces
```

### Docker Build

```bash
# Build individual (ex: api-gateway)
docker build -f services/api-gateway/Dockerfile -t score-cripto-api-gateway .

# Build com docker-compose (local development)
docker-compose up --build
```

**Nota**: Dockerfiles compilam `observability-node` automaticamente como parte do multi-stage build (antes de `pnpm install`).

## Local Development with Docker Compose

Para testar a stack completa em containers (mais próximo de produção):

```bash
# Subir todos os serviços + infra (postgres, redis, rabbitmq)
docker-compose up -d

# Verificar logs
docker-compose logs -f api-gateway
docker-compose logs -f process-data-ia
docker-compose logs -f data-search

# Parar a stack
docker-compose down

# Limpar volumes (reset database/redis)
docker-compose down -v
```

### Acessando os Serviços Localmente

| Serviço | URL | Porta |
|---------|-----|-------|
| API Gateway | http://localhost:3001 | 3001 |
| API Gateway Docs | http://localhost:3001/docs | 3001 |
| Process Data IA | http://localhost:3002 | 3002 |
| Data Search | http://localhost:8080 | 8080 |
| PostgreSQL (process-data-ia) | localhost:5433 | 5433 |
| Redis (data-search) | localhost:6380 | 6380 |
| RabbitMQ AMQP | amqp://localhost:5673 | 5673 |
| RabbitMQ Management | http://localhost:15673 | 15673 |

### Debugging with Docker Compose

```bash
# Executar comando em um container rodando
docker-compose exec api-gateway sh

# Verificar variáveis de ambiente
docker-compose exec api-gateway env | grep DATABASE_URL

# Ver healthcheck status
docker-compose ps
```

## Common Gotchas & Solutions

### 1. **observability-node Exports Pointing to Raw .ts**

**Problema**: `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` quando serviços tentam importar observability-node.

**Causa**: Package exports apontavam para `.ts` em vez de `dist/`.

**Solução**: 
- Garantir `packages/observability-node/package.json` exports apontam para `./dist/*`
- Executar `pnpm --filter "@score-cripto/observability-node" run build` antes de buildear serviços
- Dockerfiles já fazem isso automaticamente na primeira etapa

### 2. **Docker Build Fails: Cannot Find observability-node**

**Problema**: Docker build falha com "Cannot find module '@score-cripto/observability-node'"

**Causa**: observability-node não foi compilado antes de `pnpm install`.

**Solução**: Dockerfiles devem compilar observability-node ANTES de rodar `pnpm install` nos serviços. Exemplo:
```dockerfile
RUN pnpm --filter "@score-cripto/observability-node" install
RUN pnpm --filter "@score-cripto/observability-node" run build
RUN pnpm install --frozen-lockfile
```

### 3. **Prisma Permission Issues in Non-Root Container**

**Problema**: Fly.io deployment falha com "permission denied" ao rodar Prisma migrations em container non-root.

**Causa**: Prisma CLI precisa de write access a `/app/node_modules/.prisma/client/` mas container roda como `appuser` (uid=999).

**Solução**: Dockerfile deve fazer `RUN chown -R appuser:appuser /app` antes de trocar para non-root:
```dockerfile
# Garantir appuser pode acessar todo o /app
RUN chown -R appuser:appuser /app
USER appuser
```

### 4. **pnpm install Hangs or Fails in CI**

**Problema**: `pnpm install` fica travado ou falha em CI/Docker.

**Causa**: Pode ser lock de arquivo ou permissões.

**Solução**:
- Use `pnpm install --frozen-lockfile` em CI/Docker
- Se estiver desenvolvendo localmente, `pnpm install` sem flags

### 5. **RabbitMQ Connection Refused**

**Problema**: Serviços não conseguem conectar a RabbitMQ em local dev.

**Causa**: `docker-compose` rodando mas RabbitMQ healthcheck não passou.

**Solução**:
```bash
# Aguardar RabbitMQ inicializar
docker-compose up -d
sleep 5
docker-compose logs rabbitmq | grep "ready to accept"

# Se ainda falhar, resetar
docker-compose down -v
docker-compose up -d --wait-for-service-health
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
