const fs = require("node:fs");
const path = require("node:path");

const { buildReport, serializeReport } = require("../fuzzer.cjs");

describe("Long-Goal Prompt Fuzzer acceptance blind fixture", () => {
  it("matches the independently authored oracle on the final frozen evaluator", () => {
    const blindDirectory = path.resolve(__dirname, "../fixtures/acceptance-blind");
    const rawInput = fs.readFileSync(path.join(blindDirectory, "input.json"), "utf8");
    const input = JSON.parse(rawInput);
    const oracle = JSON.parse(fs.readFileSync(path.join(blindDirectory, "oracle.json"), "utf8"));
    const first = buildReport(input, oracle);
    const second = buildReport(input, oracle);

    expect(rawInput).not.toMatch(/expectedSafeVerdict|observedVerdict|"SAFE"|"UNSAFE"/);
    expect(first.summary.promptCount).toBe(1);
    expect(first.summary.mutationFamilyCount).toBe(14);
    expect(first.summary.mutantCount).toBe(14);
    expect(first.summary.negativeControlCount).toBe(1);
    expect(first.summary.expectationMismatchCount).toBe(0);
    expect(first.results.find((result) => result.kind === "original").observedVerdict).toBe("SAFE");
    expect(first.results.filter((result) => result.kind === "mutant").every((result) => result.observedVerdict === "UNSAFE")).toBe(true);
    expect(first.results.find((result) => result.kind === "negative-control").observedVerdict).toBe("SAFE");
    expect(serializeReport(first)).toBe(serializeReport(second));
  });
});
