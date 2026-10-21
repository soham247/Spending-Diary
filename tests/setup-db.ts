// This file runs before every integration test file.
// IMPORTANT: set TEST_DATABASE_URL before any import of @/lib/db/client.
import { resolve } from "path";
import { config } from "dotenv";

// Must happen before any DB client import
config({ path: resolve(process.cwd(), ".env.test") });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;

import { beforeAll, afterEach } from "vitest";

let db: Awaited<ReturnType<typeof import("@/lib/db/client")["db"]["execute"]>> | undefined;

beforeAll(async () => {
  // Dynamically import after env is set
  const { db: drizzleDb } = await import("@/lib/db/client");

  // Double-check we are connected to a _test database
  const result = await drizzleDb.execute<{ db: string }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "SELECT current_database() AS db" as any,
  );
  const actual = (result as Array<{ db: string }>)[0]?.db ?? "";
  if (!actual.endsWith("_test")) {
    throw new Error(
      `setup-db: connected database "${actual}" does not end in _test. Aborting.`,
    );
  }
});

afterEach(async () => {
  const { db: drizzleDb } = await import("@/lib/db/client");

  // Re-verify before every truncate
  const result = await drizzleDb.execute<{ db: string }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "SELECT current_database() AS db" as any,
  );
  const actual = (result as Array<{ db: string }>)[0]?.db ?? "";
  if (!actual.endsWith("_test")) {
    throw new Error(
      `setup-db: connected database "${actual}" does not end in _test. Refusing TRUNCATE.`,
    );
  }

  // Truncate all application tables (drizzle schema is excluded)
  await drizzleDb.execute(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    `DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;` as any,
  );
});
