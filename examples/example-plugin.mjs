import { WRINGER_PLUGIN_API_VERSION } from "@stackql/mcp-wringer/plugin";

export default {
  apiVersion: WRINGER_PLUGIN_API_VERSION,
  name: "example-plugin",
  register(api) {
    api.registerGenerator("example-empty", {
      generate(context) {
        return {
          formatVersion: 1,
          id: `example-${context.seed}-${context.caseIndex}`,
          specRevision: context.revision,
          description: "An empty scenario from the example plugin.",
          steps: [],
        };
      },
    });
    api.registerArgumentStrategy("example-name", {
      matches: ({ toolName, path }) => toolName === "search" && path === "/properties/query",
      generate: ({ seed, options }) => {
        if (typeof options.prefix !== "string") {
          throw new Error("The example-name strategy requires a string prefix option.");
        }
        return `${options.prefix}-${seed}`;
      },
    });
    api.registerOracle("example-noop", {
      evaluate: () => [],
    });
    api.registerReporter("example-summary", {
      fileExtension: "txt",
      render: (findings, options) =>
        `${options?.label ?? "Example plugin"}: ${findings.length} finding(s)\n`,
    });
  },
};
