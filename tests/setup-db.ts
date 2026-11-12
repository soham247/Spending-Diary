import { resolve } from "node:path";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";

config({ path: resolve(process.cwd(), ".env.test"), quiet: true });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;
process.env.BETTER_AUTH_SECRET ??=
  "isolated-vitest-secret-at-least-32-characters";
process.env.KV_REST_API_URL = "http://127.0.0.1:58080";
process.env.KV_REST_API_TOKEN = "local-test-token";
process.env.RATE_LIMIT_KEY_SECRET =
  "isolated-rate-limit-secret-at-least-32-characters";
beforeEach(() => {
  process.env.RATE_LIMIT_NAMESPACE = "sd:test:" + randomUUID();
});

async function scratchDatabase() {
  const { db } = await import("@/lib/db/client");
  const result = await db.execute<{ db: string }>(
    sql`SELECT current_database() AS db`,
  );
  if (!result.rows[0]?.db.endsWith("_test"))
    throw new Error("Refusing test cleanup outside a _test database");
  return db;
}
beforeAll(async () => {
  await scratchDatabase();
});
afterEach(async () => {
  const db = await scratchDatabase();
  await db.execute(sql`DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;`);
});
