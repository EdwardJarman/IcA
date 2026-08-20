import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 15_000,
    hookTimeout: 30_000,
    deps: {
      optimizer: {
        ssr: {
          exclude: ["node:sqlite"],
        },
      },
    },
  },
});
