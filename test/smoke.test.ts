import { describe, expect, it } from "vitest";

import { WRINGER_VERSION } from "../src/index.js";

describe("scaffold", () => {
  it("exports a version string", () => {
    expect(WRINGER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
