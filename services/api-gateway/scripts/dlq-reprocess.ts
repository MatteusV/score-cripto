/**
 * Reinjeção de mensagens das DLQs de volta para a fila de origem.
 *
 * Uso:
 *   tsx scripts/dlq-reprocess.ts <dlq-name> [--limit=<n>] [--dry-run]
 *
 * Exemplos:
 *   tsx scripts/dlq-reprocess.ts api-gateway.wallet.score.calculated.dlq
 *   tsx scripts/dlq-reprocess.ts process-data-ia.wallet.data.cached.dlq --limit=50
 *   tsx scripts/dlq-reprocess.ts api-gateway.wallet.score.failed.dlq --dry-run
 *
 * Variáveis de ambiente:
 *   RABBITMQ_URL  URL de conexão AMQP (default: amqp://guest:guest@localhost:5673)
 *
 * Como funciona:
 *   1. Conecta ao RabbitMQ via AMQP
 *   2. Consume mensagens da DLQ (com ack manual)
 *   3. Extrai exchange e routing_key originais do header x-death
 *   4. Republica na fila original COM os headers originais (remove x-death para evitar loop)
 *   5. Ack a mensagem da DLQ após publicação bem-sucedida
 *
 * IMPORTANTE: Execute somente após investigar a causa raiz da falha original.
 */

import "dotenv/config";
import amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5673";

const args = process.argv.slice(2);
const dlqName = args.find((a) => !a.startsWith("--"));
const limitArg = args.find((a) => a.startsWith("--limit="));
const dryRun = args.includes("--dry-run");

if (!dlqName) {
  console.error("Uso: tsx scripts/dlq-reprocess.ts <dlq-name> [--limit=<n>] [--dry-run]");
  console.error("");
  console.error("DLQs disponíveis:");
  console.error("  api-gateway.wallet.score.calculated.dlq");
  console.error("  api-gateway.wallet.score.failed.dlq");
  console.error("  process-data-ia.wallet.data.cached.dlq");
  console.error("  data-indexing.wallet.events.dlq");
  console.error("  users.*.dlq");
  process.exit(1);
}

const LIMIT = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : Number.POSITIVE_INFINITY;

interface DeathEntry {
  exchange: string;
  "routing-keys": string[];
  reason: string;
  count: number;
  queue: string;
}

async function main() {
  if (dryRun) {
    console.log(JSON.stringify({ level: "info", msg: "MODO DRY-RUN — nenhuma mensagem será republicada" }));
  }

  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  // Prefetch 1 para processar mensagem por mensagem
  await channel.prefetch(1);

  let processed = 0;
  let failed = 0;

  console.log(JSON.stringify({
    level: "info",
    msg: `Iniciando reprocessamento da DLQ: ${dlqName}`,
    limit: Number.isFinite(LIMIT) ? LIMIT : "sem limite",
    dry_run: dryRun,
  }));

  const { messageCount } = await channel.checkQueue(dlqName);
  console.log(JSON.stringify({ level: "info", msg: `Mensagens na DLQ: ${messageCount}` }));

  if (messageCount === 0) {
    console.log(JSON.stringify({ level: "info", msg: "DLQ vazia. Nada a reprocessar." }));
    await channel.close();
    await conn.close();
    return;
  }

  await new Promise<void>((resolve) => {
    channel.consume(dlqName, async (msg) => {
      if (!msg) {
        resolve();
        return;
      }

      if (processed >= LIMIT) {
        channel.nack(msg, false, true); // requeue
        resolve();
        return;
      }

      const headers = msg.properties.headers ?? {};
      const xDeath = headers["x-death"] as DeathEntry[] | undefined;

      if (!xDeath || xDeath.length === 0) {
        console.error(JSON.stringify({
          level: "error",
          msg: "Mensagem sem x-death header — não é possível determinar origem. Pulando.",
          routing_key: msg.fields.routingKey,
        }));
        channel.nack(msg, false, false); // descarta (vai para DLQ do DLQ, se existir)
        failed++;
        return;
      }

      // Pega o primeiro registro de morte (origem original)
      const origin = xDeath[xDeath.length - 1];
      const targetExchange = origin.exchange;
      const targetRoutingKey = origin["routing-keys"][0] ?? msg.fields.routingKey;

      // Remove headers de morte para evitar loop na DLQ
      const cleanHeaders: Record<string, unknown> = { ...headers };
      delete cleanHeaders["x-death"];
      delete cleanHeaders["x-first-death-exchange"];
      delete cleanHeaders["x-first-death-queue"];
      delete cleanHeaders["x-first-death-reason"];

      const logCtx = {
        dlq: dlqName,
        target_exchange: targetExchange,
        target_routing_key: targetRoutingKey,
        death_reason: origin.reason,
        death_count: origin.count,
        retry_count: headers["x-retry-count"],
      };

      if (dryRun) {
        console.log(JSON.stringify({ level: "info", msg: "DRY-RUN: republicaria", ...logCtx }));
        channel.ack(msg);
        processed++;
        if (processed >= LIMIT || processed >= messageCount) resolve();
        return;
      }

      try {
        const published = channel.publish(
          targetExchange,
          targetRoutingKey,
          msg.content,
          {
            persistent: true,
            headers: cleanHeaders,
            contentType: msg.properties.contentType,
          },
        );

        if (!published) {
          throw new Error("channel.publish retornou false — canal saturado");
        }

        channel.ack(msg);
        processed++;
        console.log(JSON.stringify({ level: "info", msg: "Republicado com sucesso", ...logCtx }));
      } catch (err) {
        console.error(JSON.stringify({ level: "error", msg: "Falha ao republicar", error: String(err), ...logCtx }));
        channel.nack(msg, false, true); // requeue na DLQ
        failed++;
      }

      if (processed + failed >= messageCount || processed >= LIMIT) {
        resolve();
      }
    });
  });

  console.log(JSON.stringify({
    level: "info",
    msg: "Reprocessamento concluído",
    processed,
    failed,
    dry_run: dryRun,
  }));

  await channel.close();
  await conn.close();

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(JSON.stringify({ level: "error", msg: "Erro fatal no reprocessamento", error: String(err) }));
  process.exit(2);
});
