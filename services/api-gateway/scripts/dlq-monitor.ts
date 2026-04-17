/**
 * Monitor de Dead Letter Queues (DLQs) do score-cripto.
 *
 * Uso:
 *   tsx scripts/dlq-monitor.ts
 *
 * Variáveis de ambiente:
 *   RABBITMQ_MGMT_URL  URL da API de management (default: http://localhost:15673)
 *   RABBITMQ_USER      Usuário RabbitMQ (default: guest)
 *   RABBITMQ_PASS      Senha RabbitMQ (default: guest)
 *   DLQ_ALERT_THRESHOLD  Número de mensagens que dispara alerta (default: 1)
 */

import "dotenv/config";

interface QueueInfo {
  consumers: number;
  messages: number;
  name: string;
  state: string;
}

interface DeathEntry {
  count: number;
  exchange: string;
  queue: string;
  reason: string;
  "routing-keys": string[];
  time: string;
}

interface ManagementMessage {
  exchange: string;
  payload: string;
  properties: {
    headers?: {
      "x-death"?: DeathEntry[];
      "x-retry-count"?: number;
      "x-first-death-reason"?: string;
      "x-first-death-queue"?: string;
      "x-first-death-exchange"?: string;
    };
  };
  routing_key: string;
}

const MGMT_URL = process.env.RABBITMQ_MGMT_URL ?? "http://localhost:15673";
const USER = process.env.RABBITMQ_USER ?? "guest";
const PASS = process.env.RABBITMQ_PASS ?? "guest";
const THRESHOLD = Number.parseInt(process.env.DLQ_ALERT_THRESHOLD ?? "1", 10);
const VHOST = encodeURIComponent("/");

const auth = `Basic ${Buffer.from(`${USER}:${PASS}`).toString("base64")}`;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${MGMT_URL}${path}`, {
    headers: { Authorization: auth, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `RabbitMQ Management API error ${res.status}: ${await res.text()}`
    );
  }

  return res.json() as Promise<T>;
}

async function peekMessages(
  queueName: string,
  count = 5
): Promise<ManagementMessage[]> {
  const body = JSON.stringify({
    count,
    ackmode: "reject_requeue_true", // peek sem consumir
    encoding: "auto",
    truncate: 50_000,
  });

  const res = await fetch(
    `${MGMT_URL}/api/queues/${VHOST}/${encodeURIComponent(queueName)}/get`,
    {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(
      JSON.stringify({
        level: "warn",
        msg: "Falha ao fazer peek na DLQ",
        queue: queueName,
        status: res.status,
        error: text,
      })
    );
    return [];
  }

  return res.json() as Promise<ManagementMessage[]>;
}

async function main() {
  const queues = await fetchJson<QueueInfo[]>(`/api/queues/${VHOST}`);
  const dlqs = queues.filter((q) => q.name.endsWith(".dlq"));

  const timestamp = new Date().toISOString();

  if (dlqs.length === 0) {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "Nenhuma DLQ encontrada",
        timestamp,
      })
    );
    return;
  }

  let hasAlert = false;

  for (const dlq of dlqs) {
    const entry = {
      level: dlq.messages >= THRESHOLD ? "warn" : "info",
      timestamp,
      queue: dlq.name,
      messages: dlq.messages,
      consumers: dlq.consumers,
      state: dlq.state,
    };

    if (dlq.messages >= THRESHOLD) {
      hasAlert = true;
      console.warn(
        JSON.stringify({
          ...entry,
          alert: `DLQ com ${dlq.messages} mensagem(ns) — investigar`,
        })
      );

      // Faz peek para extrair metadados x-death sem consumir
      const msgs = await peekMessages(dlq.name, 3);
      for (const msg of msgs) {
        const xDeath = msg.properties.headers?.["x-death"];
        const retryCount = msg.properties.headers?.["x-retry-count"];
        const firstDeathQueue = msg.properties.headers?.["x-first-death-queue"];
        const firstDeathReason =
          msg.properties.headers?.["x-first-death-reason"];

        console.warn(
          JSON.stringify({
            level: "warn",
            timestamp,
            msg: "Mensagem morta",
            queue: dlq.name,
            routing_key: msg.routing_key,
            x_retry_count: retryCount ?? 0,
            x_first_death_queue: firstDeathQueue,
            x_first_death_reason: firstDeathReason,
            x_death: xDeath?.map((d) => ({
              queue: d.queue,
              reason: d.reason,
              count: d.count,
              time: d.time,
              exchange: d.exchange,
              routing_keys: d["routing-keys"],
            })),
          })
        );
      }
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  if (hasAlert) {
    // Sair com código 1 para facilitar integração com alertas em CI/cron
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "Falha no monitor de DLQ",
      error: String(err),
    })
  );
  process.exit(2);
});
