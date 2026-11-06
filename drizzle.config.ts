import { defineConfig } from "drizzle-kit";

if (!process.env.DIRECT_URL) {
  throw new Error(
    "DIRECT_URL is required for migrations. Set it in .env to a direct (non-pooled) connection string.",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL,
  },
});
