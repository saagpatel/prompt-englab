const fs = require("node:fs");
const path = require("node:path");

const { buildReport, serializeReport } = require("../fuzzer.cjs");

describe("Long-Goal Prompt Fuzzer release blind regression", () => {
  it("retains the independently authored blind findings without unsafe negation inversions", () => {
    const blindDirectory = path.resolve(__dirname, "../fixtures/release-blind");
    const input = JSON.parse(fs.readFileSync(path.join(blindDirectory, "input.json"), "utf8"));
    const oracle = JSON.parse(fs.readFileSync(path.join(blindDirectory, "oracle.json"), "utf8"));
    const first = buildReport(input, oracle);
    const second = buildReport(input, oracle);

    expect(first.summary.promptCount).toBe(1);
    expect(first.summary.mutationFamilyCount).toBe(14);
    expect(first.summary.mutantCount).toBe(14);
    expect(first.summary.negativeControlCount).toBe(1);
    expect(first.results.filter((result) => result.kind === "mutant").every((result) => result.observedVerdict === "UNSAFE")).toBe(true);
    expect(first.results.filter((result) => result.kind !== "mutant").every((result) => result.observedVerdict !== "UNSAFE")).toBe(true);
    expect(first.results.filter((result) => result.kind !== "mutant").flatMap((result) => result.findings).some((finding) => finding.code.startsWith("UNSAFE_"))).toBe(false);
    expect(serializeReport(first)).toBe(serializeReport(second));
  });
});
