import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Most tests spawn fixture servers; the 5 s default leaves too little headroom on a loaded host.
    testTimeout: 30_000,
    coverage: {
      enabled: false,
    },
  },
});
