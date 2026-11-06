import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });
const databaseImports = [{ group: ["drizzle-orm", "drizzle-orm/*", "pg", "@/lib/db/*"], message: "Use domain services or lib/api server query wrappers." }];
const config = [
  { ignores: [".next/**", ".postman/**", "postman/results/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: databaseImports }] },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: databaseImports, paths: [{ name: "@tanstack/react-query", importNames: ["useQuery", "useMutation"], message: "Access server state through domain hooks." }] }],
      "no-restricted-syntax": ["error",
        { selector: "CallExpression[callee.name='fetch']", message: "Fetch through lib/api and a domain hook." },
        { selector: "CallExpression[callee.name=/^(useQuery|useMutation)$/]", message: "Access server state through domain hooks." },
      ],
    },
  },
  { files: ["src/hooks/**/*.ts"], rules: { "no-restricted-syntax": ["error", { selector: "CallExpression[callee.name='fetch']", message: "Hooks must call lib/api wrappers." }] } },
];

export default config;
