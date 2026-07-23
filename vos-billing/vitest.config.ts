import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // Code coverage with @vitest/coverage-v8
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/scripts/**",
        ".next/**",
        "node_modules/**",
      ],
      // Enforce minimum coverage thresholds — ratchet up as tests grow (goal: 50%+)
      // Current baseline: 96 tests, 5 files covered
      thresholds: {
        lines: 1,
        branches: 1,
        functions: 1,
        statements: 1,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
