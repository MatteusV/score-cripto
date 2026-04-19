/**
 * Lista de origens permitidas a acessar o api-gateway via browser.
 * Como `credentials: true` está habilitado, o `Access-Control-Allow-Origin`
 * precisa ecoar a origem específica — wildcards não funcionam.
 *
 * Em produção: somente o domínio prod do web-app + previews Vercel.
 * Em dev: localhost portas comuns (Next dev = 3000, Vite = 5173).
 *
 * Para adicionar um novo domínio (ex.: app mobile via WebView), incluir
 * aqui e adicionar teste em cors.spec.ts.
 */
const ALLOWED_ORIGINS: ReadonlyArray<string | RegExp> = [
  // Produção web-app
  "https://score-cripto-web-app.vercel.app",
  // Previews Vercel: padrão score-cripto-web-{hash}-matteus-v.vercel.app
  /^https:\/\/score-cripto-web-[a-z0-9]+-matteus-v\.vercel\.app$/,
  // Dev local
  "http://localhost:3000",
  "http://localhost:5173",
];

export function isOriginAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.some((allowed) =>
    typeof allowed === "string" ? allowed === origin : allowed.test(origin)
  );
}

/**
 * Callback compatível com a opção `origin` do `@fastify/cors`.
 *
 * - `origin` ausente (server-to-server, curl, mesma origem): aceita.
 * - `origin` presente: valida contra ALLOWED_ORIGINS; rejeita silenciosamente
 *   passando `false` para o callback (o `@fastify/cors` então omite o header
 *   Access-Control-Allow-Origin, e o browser bloqueia a request).
 */
export function corsOriginCheck(
  origin: string | undefined,
  cb: (err: Error | null, allow: boolean) => void
): void {
  if (!origin) {
    cb(null, true);
    return;
  }
  cb(null, isOriginAllowed(origin));
}
