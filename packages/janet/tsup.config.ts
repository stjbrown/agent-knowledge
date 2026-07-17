import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    main: "src/main.ts",
    headless: "src/headless/run.ts",
    index: "src/index.ts",
  },
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: true,
  dts: false,
  sourcemap: true,
  banner: { js: "#!/usr/bin/env node" },
  // Keep node_modules external — this is a CLI installed with its deps, not a
  // bundle — EXCEPT the private workspace package, which is unpublished and
  // must be inlined into dist.
  skipNodeModulesBundle: true,
  noExternal: ["@agent-knowledge/kb-tools"],
});
