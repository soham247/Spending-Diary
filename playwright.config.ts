import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(readFileSync(".postman/local/local.environment.yaml","utf8")) as { values: { key: string; value: string }[] };
const baseURL = fixture.values.find(item => item.key === "base_url")!.value;
export default defineConfig({ testDir: "./tests/browser", outputDir: ".postman/local/browser-results", workers: 1, timeout: 60000, expect: { timeout: 15000 }, reporter: [["list"]], use: { baseURL, viewport: { width: 390,height: 844 }, trace: "retain-on-failure", screenshot: "only-on-failure", reducedMotion: "reduce" } });
