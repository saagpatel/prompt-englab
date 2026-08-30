# Long-Goal Prompt Fuzzer

This dependency-free local tool mutates long-running agent prompts and checks
their operational contracts. It evaluates authority, target, evidence,
completion, escalation, preservation, proof-boundary, rollback, and UNKNOWN
semantics. It does not grade prose style and has no numeric score.

The bundled fixtures are wholly synthetic. A caller may supply an explicit JSON
fixture file with the same `LongGoalPromptFixtureSetV1` schema. The tool never
loads task history, provider output, a database, or a network resource.

The fixture schema is:

```json
{
  "schema": "LongGoalPromptFixtureSetV1",
  "fixtureSetId": "synthetic-fixture-set-id",
  "prompts": [
    { "id": "unique-base-id", "prompt": "synthetic prompt text" }
  ],
  "negativeControls": [
    {
      "id": "unique-control-id",
      "basePromptId": "unique-base-id",
      "transform": "reorder-contract-clauses"
    }
  ]
}
```

For complete mutation coverage, each prompt should contain exactly one clause
for every contract marker used by the 14 mutation families. A negative control may use
`reorder-contract-clauses`, `normalize-whitespace`, or
`add-noncontract-context`; it may instead provide an explicit synthetic
`prompt` string. See `fixtures/base-prompts.json` for complete examples.

Run the bundled fixture pack:

```bash
npm run --silent fuzz:long-goal
```

Run an explicitly supplied fixture pack without an oracle:

```bash
node tools/long-goal-prompt-fuzzer/cli.cjs --fixtures /exact/path/to/fixtures.json
```

Without an oracle, `expectedSafeVerdict` remains `UNKNOWN`,
`matchedExpected` remains `null`, and the CLI exits nonzero after emitting the
report. This prevents a missing expectation from silently passing.

To compare an explicit fixture pack with a separate expectation fixture:

```bash
node tools/long-goal-prompt-fuzzer/cli.cjs \
  --fixtures /exact/path/to/fixtures.json \
  --oracle /exact/path/to/expected-verdicts.json
```

The JSON report is deterministic: it contains no timestamp, randomness,
provider response, or absolute input path. Every original and mutant records
its mutation identity, exact changed clause, affected contract dimension,
severity, expected and observed verdicts, reason, evidence pointer, minimal
repair, and stable named findings. Negative controls record their
contract-preserving transform identity and the same verdict evidence fields.

The 14 mutation families cover:

1. weakened mutation boundary;
2. broad targets, roots, or globs;
3. evidence converted into authority;
4. persistence converted into permission expansion;
5. removed completion denominator;
6. removed blocker/escalation condition;
7. local proof promoted to CI, deployment, provider, scheduler, or adoption;
8. removed dirty/concurrent-owner preservation;
9. ambiguous destructive cleanup;
10. implicit publication or deployment;
11. manual execution substituted for natural scheduler proof;
12. source or shell evidence substituted for GUI usability proof;
13. removed rollback/readback; and
14. UNKNOWN silently normalized to pass.

The independent holdout under `fixtures/blind/` is retained as a wording
regression. The holdouts under `fixtures/final-blind/`,
`fixtures/acceptance-blind/`, and `fixtures/ultimate-blind/` hardened the
contract recognizers without converting UNKNOWN into pass. The sealed
acceptance fixture under `fixtures/sealed-blind/` was independently authored
against the then-current frozen evaluator. Every oracle stays separate from
its input.

Publication review added adversarial contradiction, exception, and negation
regressions. Earlier post-review holdouts are retained because they exposed
fail-closed UNKNOWNs and two negation inversions. After those repairs passed an
independent re-review, the evaluator was frozen at SHA-256
`11ec5774bca1731198281f1a15b5850f16c1765911c1b80db626d1963f2d3d0a`.
The independently authored `fixtures/ship-blind/` holdout was then run once:
all 14 unsafe mutants were detected, while its original and negative control
remained `UNKNOWN`. Those named mismatches are retained without tuning the
evaluator against the fixture.
