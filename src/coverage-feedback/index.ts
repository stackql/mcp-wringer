import { coverageProviderRegistry } from "./registry.js";
import { goCoverageProvider } from "./go-cover.js";
import { nodeV8CoverageProvider } from "./node-v8.js";

coverageProviderRegistry.register("go-cover", goCoverageProvider);
coverageProviderRegistry.register("node-v8", nodeV8CoverageProvider);

export { coverageProviderRegistry };
export { goCoverageProvider, nodeV8CoverageProvider };
export type { CoverageFeedbackResult, CoverageProvider, CoverageSelection } from "./types.js";
