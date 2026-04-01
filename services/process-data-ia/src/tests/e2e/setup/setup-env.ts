import "dotenv/config";

// Configura DATABASE_URL antes de qualquer import do Prisma
// O globalSetup já definiu E2E_SCHEMA e E2E_DATABASE_URL
const e2eUrl = process.env.E2E_DATABASE_URL;
if (!e2eUrl) {
  throw new Error(
    "[E2E] E2E_DATABASE_URL não definido. Certifique-se que globalSetup rodou."
  );
}

// Sobrescreve com a URL do schema isolado de E2E (dotenv não deve vencer aqui)
process.env.DATABASE_URL = e2eUrl;
