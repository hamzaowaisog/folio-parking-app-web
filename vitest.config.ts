import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"], exclude: ["node_modules/**", "e2e/design/**"], setupFiles: ["tests/support/setup.ts"], passWithNoTests: true },
});
