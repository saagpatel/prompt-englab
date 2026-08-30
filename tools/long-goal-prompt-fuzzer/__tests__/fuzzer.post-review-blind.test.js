const fs = require("node:fs");
const path = require("node:path");

const { buildReport, serializeReport } = require("../fuzzer.cjs");

describe("Long-Goal Prompt Fuzzer post-review blind regression", () => {
  it("fails closed without tuning against the independently authored fixture", () => {
    const blindDirectory = path.resolve(__dirname, "../fixtures/post-review-blind");
    const input = JSON.parse(fs.readFileSync(path.join(blindDirectory, "input.json"), "utf8"));
    const oracle = JSON.parse(fs.readFileSync(path.join(blindDirectory, "oracle.json"), "utf8"));
    const first = buildReport(input, oracle);
    const second = buildReport(input, oracle);

    expect(first.summary.promptCount).toBe(1);
    expect(first.summary.mutationFamilyCount).toBe(14);
    expect(first.summary.mutantCount).toBe(14);
    expect(first.summary.negativeControlCount).toBe(1);
    expect(first.summary.expectationMismatches).toEqual([
      "post-review-blind-contract::original",
      "post-review-blind-equivalent-wording::negative-control",
    ]);
    expect(first.results.find((result) => result.kind === "original").observedVerdict).toBe("UNKNOWN");
    expect(first.results.filter((result) => result.kind === "mutant").every((result) => result.observedVerdict === "UNSAFE")).toBe(true);
    expect(first.results.find((result) => result.kind === "negative-control").observedVerdict).toBe("UNKNOWN");
    expect(first.results.flatMap((result) => result.findings).some((finding) => finding.evidenceState === "UNKNOWN")).toBe(true);
    expect(serializeReport(first)).toBe(serializeReport(second));
  });
});
