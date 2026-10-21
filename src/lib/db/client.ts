import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const isProduction = process.env.NODE_ENV === "production";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!isProduction && globalThis.__pgPool) {
    return globalThis.__pgPool;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: isProduction ? 2 : 10,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  });

  if (!isProduction) {
    globalThis.__pgPool = pool;
  }

  return pool;
}

export const db = drizzle(getPool(), { schema });

export type Database = typeof db;
export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
