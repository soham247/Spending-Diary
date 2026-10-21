// This file runs before every integration test file.
// IMPORTANT: set TEST_DATABASE_URL before any import of @/lib/db/client.
import { resolve } from "path";
import { config } from "dotenv";

// Must happen before any DB client import
config({ path: resolve(process.cwd(), ".env.test") });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;

import { beforeAll, afterEach } from "vitest";

beforeAll(async () => {
  // Dynamically import after env is set
  const { db: drizzleDb } = await import("@/lib/db/client");

  // Double-check we are connected to a _test database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await drizzleDb.execute("SELECT current_database() AS db" as any);
  const rows = result as unknown as Array<{ db: string }>;
  const actual = rows[0]?.db ?? "";
  if (!actual.endsWith("_test")) {
    throw new Error(
      `setup-db: connected database "${actual}" does not end in _test. Aborting.`,
    );
  }
});

afterEach(async () => {
  const { db: drizzleDb } = await import("@/lib/db/client");

  // Re-verify before every truncate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await drizzleDb.execute("SELECT current_database() AS db" as any);
  const rows = result as unknown as Array<{ db: string }>;
  const actual = rows[0]?.db ?? "";
  if (!actual.endsWith("_test")) {
    throw new Error(
      `setup-db: connected database "${actual}" does not end in _test. Refusing TRUNCATE.`,
    );
  }

  // Truncate all application tables in dependency order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await drizzleDb.execute(
    `DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;` as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  );
});
