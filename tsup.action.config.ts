import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/action/index.ts"],
  format: ["cjs"],
  target: "node22",
  sourcemap: true,
  clean: false,
  outDir: "dist-action",
  outExtension() {
    return {
      js: ".js",
    };
  },
});
