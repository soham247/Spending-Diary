import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
const configDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(configDirectory, "src"),
      "server-only": path.resolve(configDirectory, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          fileParallelism: false,
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["./tests/setup-db.ts"],
          globalSetup: ["./tests/global-setup.ts"],
        },
      },
    ],
  },
});
