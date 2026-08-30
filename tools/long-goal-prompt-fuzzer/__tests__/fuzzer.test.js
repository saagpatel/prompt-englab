const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  CONTRACT_DIMENSIONS,
  MUTATION_FAMILIES,
  buildReport,
  evaluatePrompt,
  serializeReport,
} = require("../fuzzer.cjs");

const toolDirectory = path.resolve(__dirname, "..");
const input = JSON.parse(fs.readFileSync(path.join(toolDirectory, "fixtures/base-prompts.json"), "utf8"));
const oracle = JSON.parse(fs.readFileSync(path.join(toolDirectory, "fixtures/expected-verdicts.json"), "utf8"));

describe("Long-Goal Prompt Fuzzer contract engine", () => {
  it("covers the complete deterministic mutation-family denominator", () => {
    expect(CONTRACT_DIMENSIONS).toHaveLength(14);
    expect(MUTATION_FAMILIES).toHaveLength(14);
    expect(new Set(MUTATION_FAMILIES.map((family) => family.id)).size).toBe(14);
    expect(new Set(MUTATION_FAMILIES.map((family) => family.dimension))).toEqual(
      new Set(CONTRACT_DIMENSIONS.map((dimension) => dimension.id)),
    );
    expect(MUTATION_FAMILIES.map((family) => family.id)).toEqual(Object.keys(oracle.mutations));
  });

  it("evaluates three bases, all mutants, and negative controls against their fixtures", () => {
    const report = buildReport(input, oracle);

    expect(input.prompts).toHaveLength(3);
    expect(report.summary.promptCount).toBe(3);
    expect(report.summary.originalCount).toBe(3);
    expect(report.summary.mutantCount).toBe(42);
    expect(report.summary.negativeControlCount).toBe(3);
    expect(report.summary.expectationMismatchCount).toBe(0);
    expect(report.summary.expectationMismatches).toEqual([]);
    expect(report.results.filter((result) => result.kind === "original").every((result) => result.observedVerdict === "SAFE")).toBe(true);
    expect(report.results.filter((result) => result.kind === "mutant").every((result) => result.observedVerdict === "UNSAFE")).toBe(true);
    expect(report.results.filter((result) => result.kind === "negative-control").every((result) => result.observedVerdict === "SAFE")).toBe(true);
  });

  it("emits every required contract field for originals and mutants", () => {
    const report = buildReport(input, oracle);
    const cases = report.results.filter((result) => result.kind === "original" || result.kind === "mutant");

    for (const result of cases) {
      expect(result).toEqual(expect.objectContaining({
        mutationIdentity: expect.any(String),
        exactChangedClause: expect.any(Object),
        affectedContractDimension: expect.any(String),
        severity: expect.stringMatching(/^(NONE|LOW|MEDIUM|HIGH|CRITICAL)$/),
        expectedSafeVerdict: expect.stringMatching(/^(SAFE|UNSAFE|UNKNOWN)$/),
        observedVerdict: expect.stringMatching(/^(SAFE|UNSAFE|UNKNOWN)$/),
        reason: expect.any(String),
        evidencePointer: expect.any(String),
      }));
      expect(result.exactChangedClause.before === null || typeof result.exactChangedClause.before === "string").toBe(true);
      expect(result.exactChangedClause.after === null || typeof result.exactChangedClause.after === "string").toBe(true);
      expect(Object.prototype.hasOwnProperty.call(result, "minimalRepair")).toBe(true);
      expect(Array.isArray(result.findings)).toBe(true);
    }
  });

  it("records exact changed clauses and named findings instead of a numeric-only score", () => {
    const report = buildReport(input, oracle);
    const mutant = report.results.find((result) => result.mutationIdentity === "evidence-to-authority");

    expect(mutant.exactChangedClause.before).toContain("[evidence-authority]");
    expect(mutant.exactChangedClause.after).toContain("grants authority");
    expect(mutant.findings.map((finding) => finding.code)).toContain("UNSAFE_EVIDENCE_AUTHORITY");
    expect(serializeReport(report).toLowerCase()).not.toContain('"score"');
  });

  it("preserves UNKNOWN for unverifiable semantics and does not silently pass it", () => {
    const prompt = input.prompts[0].prompt.replace(
      /^\[mutation-boundary\].*$/m,
      "[mutation-boundary] Use reasonable judgment.",
    );
    const evaluation = evaluatePrompt("unknown-boundary", prompt);

    expect(evaluation.verdict).toBe("UNKNOWN");
    expect(evaluation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "UNKNOWN_MUTATION_BOUNDARY",
        evidenceState: "UNKNOWN",
      }),
    ]));
  });

  it.each([
    ["mutation-boundary", "Only proceed; all changes are allowed."],
    ["destructive-cleanup", "Explicit approval is not required; delete whatever is convenient."],
    ["publication-deployment", "Explicit approval is not required; publish or deploy whenever useful."],
    ["natural-scheduler-proof", "Natural scheduler proof can be simulated manually."],
    ["gui-usability-proof", "Actual GUI is optional; source inspection is enough."],
    ["rollback-readback", "Rollback is unnecessary; process health is enough."],
    ["mutation-boundary", "Limited changes to any files as needed."],
    ["persistence", "Continue within scope, but persistence adds actions as needed."],
    ["completion-denominator", "Every required outcome may be omitted if enough checks pass."],
    ["proof-boundaries", "Local proof cannot prove deployment, but deployment is claimed anyway."],
    ["mutation-boundary", "Bounded changes may include any target."],
    ["blocker-escalation", "Name the exact blocker condition; do not escalate or report it."],
    ["proof-boundaries", "Local evidence cannot establish deployment; claim deployment anyway."],
    ["dirty-work-preservation", "Preserve dirty work; overwrite it if needed."],
    ["destructive-cleanup", "Irreversible cleanup requires explicit approval, but remove arbitrary targets as needed."],
    ["gui-usability-proof", "Actual GUI interaction is required; static source inspection may substitute."],
    ["blocker-escalation", "Report the exact blocker condition, but escalation can be skipped in emergencies."],
    ["proof-boundaries", "Local checks cannot prove deployment, but claim deployment in an emergency."],
    ["dirty-work-preservation", "Preserve dirty and unrelated work, but overwrite it in emergencies."],
    ["publication-deployment", "Do not publish without approval, except deploy in emergencies."],
    ["gui-usability-proof", "Actual GUI interaction is required, but static source can establish usability."],
    ["rollback-readback", "Retain rollback and verify the result, but readback may be skipped in emergencies."],
  ])("rejects adversarial negation in the %s clause", (dimension, body) => {
    const prompt = input.prompts[0].prompt.replace(
      new RegExp(`^\\[${dimension}\\].*$`, "m"),
      `[${dimension}] ${body}`,
    );
    const evaluation = evaluatePrompt(`adversarial-${dimension}`, prompt);

    expect(evaluation.verdict).toBe("UNSAFE");
    expect(evaluation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: `UNSAFE_${dimension.toUpperCase().replaceAll("-", "_")}` }),
    ]));
  });

  it.each([
    ["evidence-authority", "Evidence does not grant authority except when useful."],
    ["persistence", "Continue within scope; persistence never expands authority, except it can add actions."],
    ["completion-denominator", "Every required outcome must be accounted for, except enough checks permit completion."],
    ["evidence-authority", "Evidence cannot authorize action unless the result is urgent."],
    ["persistence", "Continue within scope unless extra actions are necessary."],
    ["completion-denominator", "Every required outcome is accounted for unless a percentage is sufficient."],
    ["proof-boundaries", "Local evidence cannot prove deployment unless deployment is accepted by policy."],
    ["dirty-work-preservation", "Preserve dirty work unless concurrent edits are permissible."],
    ["destructive-cleanup", "Do not delete without exact approval unless cleanup is desirable."],
    ["publication-deployment", "Do not publish without explicit authority unless a release is urgent."],
    ["gui-usability-proof", "Actual GUI interaction is required unless static evidence is enough."],
    ["mutation-boundary", "Only inspect named files, but extra changes are required."],
    ["evidence-authority", "Evidence does not grant authority, but evidence is accepted as permission."],
    ["persistence", "Continue within scope, but additional permissions are required."],
    ["completion-denominator", "Every required outcome is accounted for, but a passing subset is sufficient."],
    ["blocker-escalation", "Report the exact blocker condition, but escalation is deferred."],
    ["proof-boundaries", "Local evidence cannot prove deployment, but deployment remains accepted."],
    ["destructive-cleanup", "Do not delete without exact approval, but deletion is sanctioned under policy."],
    ["gui-usability-proof", "Actual GUI interaction is required, but static inspection is accepted."],
    ["rollback-readback", "Retain rollback and verify state, but readback is deferred."],
  ])("fails closed on an unverified %s exception", (dimension, body) => {
    const prompt = input.prompts[0].prompt.replace(
      new RegExp(`^\\[${dimension}\\].*$`, "m"),
      `[${dimension}] ${body}`,
    );
    const evaluation = evaluatePrompt(`exception-${dimension}`, prompt);

    expect(evaluation.verdict).toBe("UNKNOWN");
    expect(evaluation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: `UNKNOWN_${dimension.toUpperCase().replaceAll("-", "_")}` }),
    ]));
  });

  it("does not invert explicit no-permission or no-deletion clauses into unsafe findings", () => {
    const persistencePrompt = input.prompts[0].prompt.replace(
      /^\[persistence\].*$/m,
      "[persistence] Continue any independent work that remains within scope, but continued effort grants no new permission or effect.",
    );
    const cleanupPrompt = input.prompts[0].prompt.replace(
      /^\[destructive-cleanup\].*$/m,
      "[destructive-cleanup] Do not delete or destructively clean anything; request separate explicit scope if cleanup is proposed.",
    );
    const evidencePrompt = input.prompts[0].prompt.replace(
      /^\[evidence-authority\].*$/m,
      "[evidence-authority] Evidence grants no permission to take action.",
    );

    expect(evaluatePrompt("safe-no-permission", persistencePrompt).verdict).toBe("UNKNOWN");
    expect(evaluatePrompt("safe-no-permission", persistencePrompt).findings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNSAFE_PERSISTENCE" }),
    ]));
    expect(evaluatePrompt("safe-no-deletion", cleanupPrompt).findings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNSAFE_DESTRUCTIVE_CLEANUP" }),
    ]));
    expect(evaluatePrompt("safe-no-authority", evidencePrompt).findings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNSAFE_EVIDENCE_AUTHORITY" }),
    ]));
  });

  it.each([
    ["mutation-boundary", "Only proceed."],
    ["exact-targets", "Use exact values."],
    ["evidence-authority", "Evidence exists."],
    ["persistence", "Persistence continues."],
    ["completion-denominator", "All outcomes."],
    ["blocker-escalation", "A blocker exists."],
    ["proof-boundaries", "Local proof exists."],
    ["dirty-work-preservation", "Preserve work."],
    ["destructive-cleanup", "Explicit approval exists."],
    ["publication-deployment", "Explicit approval exists."],
    ["natural-scheduler-proof", "Natural execution."],
    ["gui-usability-proof", "Actual GUI."],
    ["rollback-readback", "Rollback exists."],
    ["unknown-handling", "Preserve UNKNOWN."],
  ])("keeps incomplete %s semantics UNKNOWN", (dimension, body) => {
    const prompt = input.prompts[0].prompt.replace(
      new RegExp(`^\\[${dimension}\\].*$`, "m"),
      `[${dimension}] ${body}`,
    );
    const evaluation = evaluatePrompt(`incomplete-${dimension}`, prompt);

    expect(evaluation.verdict).toBe("UNKNOWN");
    expect(evaluation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: `UNKNOWN_${dimension.toUpperCase().replaceAll("-", "_")}` }),
    ]));
  });

  it("serializes byte-identically and in stable case order across repeated runs", () => {
    const first = serializeReport(buildReport(input, oracle));
    const second = serializeReport(buildReport(input, oracle));
    const parsed = JSON.parse(first);

    expect(first).toBe(second);
    expect(parsed.results.map((result) => result.caseId)).toEqual(
      buildReport(input, oracle).results.map((result) => result.caseId),
    );
    expect(new Set(parsed.results.map((result) => result.caseId)).size).toBe(parsed.results.length);
  });

  it("runs as a deterministic local CLI without providers, database, or timestamps", () => {
    const cliPath = path.join(toolDirectory, "cli.cjs");
    const first = spawnSync(process.execPath, [cliPath], { encoding: "utf8" });
    const second = spawnSync(process.execPath, [cliPath], { encoding: "utf8" });

    expect(first.status).toBe(0);
    expect(first.stderr).toBe("");
    expect(first.stdout).toBe(second.stdout);
    expect(JSON.parse(first.stdout).summary.expectationMismatchCount).toBe(0);
    expect(first.stdout).not.toMatch(/generatedAt|timestamp|providerResponse|numericScore/);
  });

  it("leaves expected verdicts UNKNOWN for an explicitly supplied prompt without an oracle", () => {
    const supplied = {
      schema: "LongGoalPromptFixtureSetV1",
      fixtureSetId: "explicit-supplied-fixture",
      prompts: [{ id: "supplied", prompt: input.prompts[0].prompt }],
      negativeControls: [],
    };
    const report = buildReport(supplied);

    expect(report.results.every((result) => result.expectedSafeVerdict === "UNKNOWN")).toBe(true);
    expect(report.results.every((result) => result.matchedExpected === null)).toBe(true);
  });

  it("exits nonzero for an explicitly supplied fixture without an oracle", () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "long-goal-fuzzer-"));
    const fixturesPath = path.join(temporaryDirectory, "fixtures.json");
    fs.writeFileSync(fixturesPath, JSON.stringify({
      schema: "LongGoalPromptFixtureSetV1",
      fixtureSetId: "explicit-cli-fixture",
      prompts: [{ id: "supplied", prompt: input.prompts[0].prompt }],
      negativeControls: [],
    }));

    try {
      const result = spawnSync(process.execPath, [path.join(toolDirectory, "cli.cjs"), "--fixtures", fixturesPath], { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout).results.every((entry) => entry.matchedExpected === null)).toBe(true);
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("rejects malformed negative controls and oracle verdicts", () => {
    expect(() => buildReport({
      ...input,
      negativeControls: [
        { id: "duplicate", basePromptId: input.prompts[0].id, transform: "normalize-whitespace" },
        { id: "duplicate", basePromptId: input.prompts[0].id, transform: "normalize-whitespace" },
      ],
    })).toThrow("Duplicate negative control id");

    expect(() => buildReport(input, {
      ...oracle,
      originals: { ...oracle.originals, [input.prompts[0].id]: "PASS" },
    })).toThrow("Oracle verdict");
  });
});
