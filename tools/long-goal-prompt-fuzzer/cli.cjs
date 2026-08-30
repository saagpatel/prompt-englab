#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildReport, serializeReport } = require("./fuzzer.cjs");

function usage() {
  return [
    "Usage: node tools/long-goal-prompt-fuzzer/cli.cjs [--fixtures FILE] [--oracle FILE]",
    "",
    "Reads only synthetic or explicitly supplied JSON prompt fixtures and writes deterministic JSON to stdout.",
    "When --fixtures is omitted, the bundled non-blind fixture set and oracle are used.",
    "When a custom --fixtures file has no --oracle, expected verdicts remain UNKNOWN and never silently pass.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = { fixtures: null, oracle: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--fixtures" || arg === "--oracle") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a file path.`);
      options[arg.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  const bundledDirectory = path.join(__dirname, "fixtures");
  const fixturesPath = path.resolve(options.fixtures || path.join(bundledDirectory, "base-prompts.json"));
  const oraclePath = options.oracle
    ? path.resolve(options.oracle)
    : options.fixtures
      ? null
      : path.join(bundledDirectory, "expected-verdicts.json");
  const report = buildReport(readJson(fixturesPath), oraclePath ? readJson(oraclePath) : null);
  process.stdout.write(serializeReport(report));
  if (!oraclePath) return 1;
  return report.summary.expectationMismatchCount === 0 ? 0 : 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${JSON.stringify({ schema: "LongGoalPromptFuzzerErrorV1", error: error instanceof Error ? error.message : String(error) })}\n`);
  process.exitCode = 2;
}
