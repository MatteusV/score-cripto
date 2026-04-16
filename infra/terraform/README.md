# Score Cripto — Infra Bootstrap (Terraform + Terraform Cloud)

Este documento descreve como provisionar do zero toda a infraestrutura de produção do Score Cripto.
A infra é gerenciada por **Terraform Cloud (TFC)** com backend remoto; o trigger de apply é automático a cada push em `infra/terraform/**`.

---

## Decisões de Arquitetura

| Dimensão | Decisão | Motivo |
|---|---|---|
| Compute | [Fly.io](https://fly.io) | Deploy por imagem Docker, VMs leves, rede privada `.internal` gratuita |
| Banco relacional | [Neon](https://neon.tech) | Serverless Postgres, branch por serviço, free tier generoso |
| Message broker | [CloudAMQP](https://www.cloudamqp.com) | RabbitMQ gerenciado, plano Little Lemur (free) |
| Cache | [Upstash](https://upstash.com) | Redis serverless, cobrança por request |
| Observabilidade | [Grafana Cloud](https://grafana.com/products/cloud) | Loki + Tempo + Prometheus gerenciados, free tier 14 dias |
| Frontend | [Vercel](https://vercel.com) | Deploy automático via GitHub integration nativa |
| IaC state | [Terraform Cloud](https://app.terraform.io) | Backend remoto, run history, variáveis criptografadas |
| Região | `iad` (Ashburn, VA) | Latência Norte América, padrão Fly.io |
| Ambientes | `prod` único | MVP — sem staging separado por ora |

---

## Pré-requisitos: Contas e Tokens

Antes de rodar `terraform apply` pela primeira vez, crie contas e gere os tokens abaixo.
Todos os valores sensíveis são armazenados como **variáveis sensíveis no Terraform Cloud** (nunca em `.tf` ou git).

### 1. Fly.io

1. Crie conta em <https://fly.io>
2. Instale `flyctl`: `brew install flyctl` / `curl -L https://fly.io/install.sh | sh`
3. Autentique: `flyctl auth login`
4. Gere token de organização: `flyctl tokens create deploy -x 999999h -n score-cripto-terraform`
5. Salve como variável TFC: `FLY_API_TOKEN`

> O Terraform cria os apps vazios. Tokens por app (`FLY_API_TOKEN_<SERVICO>`) são gerados pelo módulo `fly-service` e salvos no GitHub via provider `integrations/github`.

### 2. Neon

1. Crie conta em <https://console.neon.tech>
2. Vá em **Account Settings → API Keys → New API Key**
3. Salve como variável TFC: `NEON_API_KEY`

### 3. CloudAMQP

1. Crie conta em <https://www.cloudamqp.com>
2. Vá em **API Access → Generate New API Key**
3. Salve como variável TFC: `CLOUDAMQP_APIKEY`

### 4. Upstash

1. Crie conta em <https://console.upstash.com>
2. Vá em **Account → Management API → Create API Token**
3. Copie também o **Email** da conta
4. Salve como variáveis TFC: `UPSTASH_EMAIL` e `UPSTASH_API_KEY`

### 5. Grafana Cloud

1. Crie conta em <https://grafana.com/auth/sign-up>
2. Vá em **My Account → API Keys → Add API Key** (role: Admin)
3. Salve como variáveis TFC: `GRAFANA_AUTH` (formato `<user>:<token>`) e `GRAFANA_URL` (ex: `https://score-cripto.grafana.net`)

### 6. Vercel

1. Crie conta em <https://vercel.com>
2. Vá em **Settings → Tokens → Create Token**
3. Salve como variável TFC: `VERCEL_API_TOKEN`

### 7. GitHub

1. Vá em **Settings → Developer Settings → Personal Access Tokens → Fine-grained**
2. Escopo mínimo: `repo` (Secrets: Read & Write, Variables: Read & Write, Environments: Read & Write)
3. Salve como variáveis TFC: `GITHUB_TOKEN` e `GITHUB_OWNER` (seu usuário/org)

### 8. Terraform Cloud

1. Crie conta em <https://app.terraform.io>
2. Crie uma **organização** (ex: `score-cripto`)
3. Conecte o workspace ao repositório GitHub (VCS-driven, trigger: `infra/terraform/**`)
4. Salve o token da org como variável de ambiente local: `TF_TOKEN_app_terraform_io=<token>`

---

## Estrutura de Diretórios

```
infra/terraform/
├── README.md                    # Este arquivo
├── modules/
│   ├── fly-service/             # App Fly + volume + secrets + deploy token
│   ├── neon-database/           # Project Neon + role + connection_uri output
│   ├── cloudamqp-vhost/         # Instância CloudAMQP + vhost + user
│   ├── upstash-redis/           # DB Redis Upstash + token
│   ├── grafana-dashboards/      # Import de dashboards JSON para Grafana Cloud
│   └── vercel-project/          # Project Vercel + env vars
└── environments/
    └── prod/                    # Instância de todos os módulos para produção
        ├── main.tf
        ├── providers.tf
        ├── variables.tf
        ├── outputs.tf
        └── terraform.tf         # Backend TFC
```

---

## Sequência de Bootstrap (primeira vez)

### Passo 1 — Criar contas e tokens

Siga a seção [Pré-requisitos](#pré-requisitos-contas-e-tokens) acima.

### Passo 2 — Configurar variáveis no Terraform Cloud

No workspace TFC (`environments/prod`), adicione todas as variáveis listadas como **Sensitive = true**:

```
FLY_API_TOKEN
NEON_API_KEY
CLOUDAMQP_APIKEY
UPSTASH_EMAIL
UPSTASH_API_KEY
GRAFANA_AUTH
GRAFANA_URL
VERCEL_API_TOKEN
GITHUB_TOKEN
GITHUB_OWNER
```

### Passo 3 — Criar workspace VCS-driven no TFC

1. Novo workspace → **Version Control Workflow**
2. Conecte ao repositório `score-cripto`
3. Configure trigger path: `infra/terraform/environments/prod/**`
4. Working directory: `infra/terraform/environments/prod`
5. Terraform version: `~> 1.9`

### Passo 4 — Primeiro `terraform apply`

O apply cria toda a infra vazia:
- 5 apps Fly.io (sem imagem — ficam em estado `suspended`)
- 3 projetos Neon (api-gateway, process-data-ia, users)
- 1 instância CloudAMQP Little Lemur
- 1 DB Redis Upstash
- 1 stack Grafana Cloud + 5 dashboards importados
- 1 projeto Vercel
- Secrets `FLY_API_TOKEN_<SERVICO>` criados no GitHub

> Os apps Fly ficam sem release até o primeiro `release.yml` rodar (Passo 5).

### Passo 5 — Primeiro deploy via `release.yml`

Após o apply bem-sucedido, faça um push em qualquer `services/**`:

```bash
git commit --allow-empty -m "ci: trigger first deploy"
git push
```

O workflow `.github/workflows/release.yml` vai:
1. Detectar quais serviços mudaram
2. Fazer build e push das imagens para GHCR
3. Fazer `flyctl deploy --image ghcr.io/...:sha` para cada app

---

## Manutenção

### Adicionar novo serviço

1. Crie `services/<nome>/fly.toml`
2. Adicione novo módulo `fly-service` em `environments/prod/main.tf`
3. Adicione job no `release.yml`
4. Faça push — TFC aplica a mudança na próxima run

### Rotacionar secrets

Atualize a variável no TFC e rode `terraform apply` — os secrets são propagados via `fly secrets set`.

### Destruir tudo

```bash
cd infra/terraform/environments/prod
terraform destroy
```

> Aviso: destroys removerão bancos de dados. Faça backup antes.
