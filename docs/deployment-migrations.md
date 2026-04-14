# Deployment Migrations — Score Cripto

Este arquivo documenta migrações manuais necessárias em ambiente de produção antes de deployar versões específicas.

---

## [score-cripto-yml] DLQ no RabbitMQ

**Versão**: introduzida no commit que fecha `score-cripto-yml`
**Risco**: PRECONDITION_FAILED se as filas de origem existirem sem os novos argumentos de DLQ

### Por que migração manual é necessária

RabbitMQ não permite redeclarar uma fila com argumentos diferentes dos que ela foi criada originalmente. O novo código declara as filas com `x-dead-letter-exchange` e `x-dead-letter-routing-key`. Se as filas já existirem sem esses argumentos, o serviço falhará no boot com:

```
PRECONDITION_FAILED - inequivalent arg 'x-dead-letter-exchange' for queue
```

### Filas afetadas

| Fila | Serviço |
|---|---|
| `api-gateway.wallet.score.calculated` | api-gateway |
| `api-gateway.wallet.score.failed` | api-gateway |
| `process-data-ia.wallet.data.cached` | process-data-ia |
| `users.user.analysis.consumed` | users |
| `data-search.wallet.data.requested` | data-search |
| `data-indexing.wallet.events` | data-indexing |

### Procedimento em produção

**Pré-requisito:** Nenhum consumer ativo (todos os serviços parados).

1. Acesse o RabbitMQ Management UI (`http://<host>:15672`)
2. Navegue para **Queues and Streams**
3. Para cada fila acima:
   - Clique no nome da fila
   - Role até **Delete or purge**
   - Clique em **Delete Queue** (confirme que não há mensagens pendentes ou faça purge antes)
4. Faça deploy dos serviços com o novo código
5. As filas serão recriadas automaticamente no boot dos consumers, já com os argumentos DLQ corretos

**Alternativa via API REST:**

```bash
# Substituir <queue> pelo nome exato, <vhost> por "/" (ou o vhost configurado)
curl -u guest:guest -X DELETE \
  "http://localhost:15672/api/queues/%2F/<queue>"
```

Exemplo para todas as 6 filas:

```bash
RABBIT_URL="http://guest:guest@localhost:15672/api/queues/%2F"

for queue in \
  "api-gateway.wallet.score.calculated" \
  "api-gateway.wallet.score.failed" \
  "process-data-ia.wallet.data.cached" \
  "users.user.analysis.consumed" \
  "data-search.wallet.data.requested" \
  "data-indexing.wallet.events"; do
  curl -s -X DELETE "$RABBIT_URL/$queue" && echo "Deleted: $queue"
done
```

### Procedimento em desenvolvimento (local)

```bash
docker compose down -v   # apaga o volume rabbitmq_data
docker compose up -d rabbitmq
# reiniciar os serviços normalmente
```

---

## [score-cripto-51x] Retry com Backoff Exponencial nos Consumers

**Versão**: introduzida no commit que fecha `score-cripto-51x`
**Risco**: Nenhuma ação manual necessária — as retry queues são novas e criadas automaticamente no boot.

### Por que não há migração manual

As filas de origem **não são modificadas** por este deploy. Os novos argumentos de retry estão apenas nas retry queues (`<queue>.retry`), que são declaradas pela primeira vez no boot dos consumers. Não há conflito com declarações anteriores.

### Retry queues criadas automaticamente

| Retry Queue | Origem |
|---|---|
| `api-gateway.wallet.score.calculated.retry` | api-gateway |
| `api-gateway.wallet.score.failed.retry` | api-gateway |
| `process-data-ia.wallet.data.cached.retry` | process-data-ia |
| `users.user.analysis.consumed.retry` | users |
| `data-search.wallet.data.requested.retry` | data-search |

### Verificação pós-deploy

Após reiniciar os serviços, confirme no RabbitMQ Management UI (`http://<host>:15672`):
- As 5 retry queues acima existem e mostram a badge `DLX` no tab **Features**
- O `x-dead-letter-exchange` de cada retry queue aponta para `score-cripto.events` (exchange principal)
- O `x-dead-letter-routing-key` de cada retry queue aponta para a routing key original

### Procedimento em desenvolvimento (local)

Nenhuma ação necessária — as retry queues são criadas automaticamente ao subir os serviços.

```bash
docker compose up -d
# as retry queues aparecerão no management UI em http://localhost:15673
```

---

## Template para novas migrações

```markdown
## [<issue-id>] <Título curto>

**Versão**: <commit ou tag>
**Risco**: <PRECONDITION_FAILED | DATA_LOSS | BREAKING_CHANGE>

### Procedimento
...
```
