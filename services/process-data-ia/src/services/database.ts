import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

// Extrai o schema da URL (ex: ?schema=e2e_xxx) para passar ao PrismaPg adapter
const schemaMatch = connectionString.match(/[?&]schema=([^&]+)/);
const schema = schemaMatch?.[1];

const adapter = new PrismaPg(
  { connectionString },
  schema ? { schema } : undefined
);
export const prisma = new PrismaClient({ adapter });
