import { resolve } from "path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export async function setup() {
  // Load test env before anything imports the DB client
  const { config } = await import("dotenv");
  config({ path: resolve(process.cwd(), ".env.test") });

  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Copy .env.test.example to .env.test and fill it in.",
    );
  }

  // Safety: refuse if the DB name doesn't end in _test
  const parsed = new URL(testUrl);
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `TEST_DATABASE_URL points to "${dbName}" which does not end in _test. Refusing to run.`,
    );
  }
  if (testUrl === process.env.DATABASE_URL || testUrl === process.env.DIRECT_URL) {
    throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL and DIRECT_URL.");
  }

  // Verify via actual connection
  const pool = new Pool({ connectionString: testUrl, max: 1 });
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ db: string }>("SELECT current_database() AS db");
    const actual = rows[0]?.db ?? "";
    if (!actual.endsWith("_test")) {
      throw new Error(
        `Connected database "${actual}" does not end in _test. Check TEST_DATABASE_URL.`,
      );
    }
  } finally {
    client.release();
  }

  // Run migrations
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
}

export async function teardown() {
  // Nothing to do; pool is closed in setup
}
