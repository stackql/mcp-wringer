import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/action/index.ts"],
  format: ["cjs"],
  target: "node22",
  noExternal: ["ajv", "cross-spawn", "fast-check"],
  sourcemap: false,
  clean: true,
  outDir: "dist-action",
  outExtension() {
    return {
      js: ".cjs",
    };
  },
});
