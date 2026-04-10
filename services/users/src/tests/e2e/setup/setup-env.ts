// Configura DATABASE_URL e JWT_SECRET antes de qualquer import do Prisma/config
// O globalSetup já definiu E2E_SCHEMA e E2E_DATABASE_URL

const e2eUrl = process.env.E2E_DATABASE_URL;
if (!e2eUrl) {
  throw new Error(
    "[E2E] E2E_DATABASE_URL não definido. Certifique-se que globalSetup rodou."
  );
}

process.env.DATABASE_URL = e2eUrl;

// JWT_SECRET precisa estar definido para o config.ts do users não lançar erro
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "e2e-test-secret-for-users-service";
}
