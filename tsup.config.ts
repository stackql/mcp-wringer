import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli/index.ts", "src/plugin/index.ts"],
  format: ["esm"],
  target: "node22",
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
});
