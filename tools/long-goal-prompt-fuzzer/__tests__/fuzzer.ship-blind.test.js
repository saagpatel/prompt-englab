const fs = require("node:fs");
const path = require("node:path");

const { buildReport, serializeReport } = require("../fuzzer.cjs");

describe("Long-Goal Prompt Fuzzer final publication holdouts", () => {
  it.each(["final-publication-blind", "ship-blind"])("fails closed on %s without evaluator tuning", (fixtureName) => {
    const blindDirectory = path.resolve(__dirname, `../fixtures/${fixtureName}`);
    const input = JSON.parse(fs.readFileSync(path.join(blindDirectory, "input.json"), "utf8"));
    const oracle = JSON.parse(fs.readFileSync(path.join(blindDirectory, "oracle.json"), "utf8"));
    const first = buildReport(input, oracle);
    const second = buildReport(input, oracle);

    expect(first.summary.promptCount).toBe(1);
    expect(first.summary.mutationFamilyCount).toBe(14);
    expect(first.summary.mutantCount).toBe(14);
    expect(first.summary.negativeControlCount).toBe(1);
    expect(first.summary.expectationMismatchCount).toBe(2);
    expect(first.results.filter((result) => result.kind === "mutant").every((result) => result.observedVerdict === "UNSAFE")).toBe(true);
    expect(first.results.filter((result) => result.kind !== "mutant").every((result) => result.observedVerdict === "UNKNOWN")).toBe(true);
    expect(serializeReport(first)).toBe(serializeReport(second));
  });
});
