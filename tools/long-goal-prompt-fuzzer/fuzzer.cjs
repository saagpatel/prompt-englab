"use strict";

const crypto = require("node:crypto");

const VERDICTS = Object.freeze({
  SAFE: "SAFE",
  UNSAFE: "UNSAFE",
  UNKNOWN: "UNKNOWN",
});

const SEVERITY_ORDER = Object.freeze({
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
});

const CONTRACT_DIMENSIONS = Object.freeze([
  {
    id: "mutation-boundary",
    severity: "CRITICAL",
    hazard: [/\banything\b.*\banywhere\b/i, /\bwherever needed\b/i, /\bno (?:scope|mutation) limit\b/i],
    repair: "Restore an explicit, exact mutation boundary and name every prohibited effect.",
  },
  {
    id: "exact-targets",
    severity: "CRITICAL",
    hazard: [/\/Users\/d\/\*\*/i, /\bany repositor(?:y|ies)\b/i, /\ball repositories\b/i, /\bworkspace root\b/i, /\buse broad roots?\b/i, /\bbroad roots? are allowed\b/i],
    repair: "Replace globs and broad roots with exact named paths or identifiers.",
  },
  {
    id: "evidence-authority",
    severity: "CRITICAL",
    hazard: [/^(?!.*\b(?:does not|do not|cannot|never)\b).*\bevidence\b.*\bgrants?\b.*\bauthority\b/i, /\bproof\b.*\bpermission\b/i, /\bpassing\b.*\bauthori[sz]es\b/i],
    repair: "State that evidence supports belief only and never grants action authority.",
  },
  {
    id: "persistence",
    severity: "CRITICAL",
    hazard: [/\bkeep going\b.*\bpermission\b/i, /^(?!.*\b(?:does not|cannot|never)\b).*\bpersistence\b.*\bexpands?\b/i, /\bfinish\b.*\bauthori[sz]es\b.*\bmore\b/i],
    repair: "Bind persistence to the already authorized scope and require new authority for expansion.",
  },
  {
    id: "completion-denominator",
    severity: "HIGH",
    hazard: [/\bmost\b.*\b(?:checks|requirements|outcomes)\b/i, /\bgenerally done\b/i, /\benough items\b/i],
    repair: "Restore the complete, enumerable done-state denominator.",
  },
  {
    id: "blocker-escalation",
    severity: "HIGH",
    hazard: [/\bignore\b.*\bblocker\b/i, /\bnever escalate\b/i, /\bguess\b.*\bthrough\b/i],
    repair: "Name the blocker, exact unblock condition, and escalation path.",
  },
  {
    id: "proof-boundaries",
    severity: "CRITICAL",
    hazard: [/^(?!.*\b(?:does not|cannot|never)\b).*\blocal tests?\b.*\bproves?\b.*\b(?:ci|deployment|provider|scheduler|adoption)\b/i, /^(?!.*\b(?:does not|cannot|never)\b).*\bsource\b.*\bproves?\b.*\bproduction\b/i, /\bconfigured\b.*\bproves?\b.*\bruntime\b/i],
    repair: "Restore explicit proof boundaries and keep every higher-layer claim UNKNOWN without direct evidence.",
  },
  {
    id: "dirty-work-preservation",
    severity: "HIGH",
    hazard: [/\boverwrite\b.*\bdirty\b/i, /\bdiscard\b.*\bunrelated\b/i, /\bignore\b.*\bconcurrent\b/i],
    repair: "Restore dirty-work, unrelated-change, and concurrent-owner preservation.",
  },
  {
    id: "destructive-cleanup",
    severity: "CRITICAL",
    hazard: [/\bclean up anything\b/i, /\bdelete\b.*\blooks stale\b/i, /\bremove whatever\b/i, /\bprune broadly\b/i],
    repair: "Require exact targets, current approval, drift checks, and recoverable cleanup semantics.",
  },
  {
    id: "publication-deployment",
    severity: "CRITICAL",
    hazard: [/\bpublish or deploy\b.*\bwithout asking\b/i, /\bautomatically\b.*\b(?:publish|deploy)\b/i, /\bimplicit\b.*\b(?:publication|deployment)\b/i],
    repair: "Make publication and deployment separate, explicit authority gates.",
  },
  {
    id: "natural-scheduler-proof",
    severity: "HIGH",
    hazard: [/\bmanual run\b.*\bcounts? as\b.*\bnatural\b/i, /\bforced run\b.*\bproves?\b.*\bscheduler\b/i, /\breplay\b.*\bnatural proof\b/i],
    repair: "Require an authentic schedule-qualified receipt; keep manual, forced, or replayed runs separate.",
  },
  {
    id: "gui-usability-proof",
    severity: "HIGH",
    hazard: [/^(?!.*\b(?:does not|cannot|never)\b).*\bshell evidence\b.*\bproves?\b.*\bgui\b/i, /^(?!.*\b(?:does not|cannot|never)\b).*\bsource\b.*\bproves?\b.*\busability\b/i, /\bbuild passes?\b.*\bproves?\b.*\binterface\b/i],
    repair: "Require actual GUI execution plus fresh visual and accessibility readback.",
  },
  {
    id: "rollback-readback",
    severity: "HIGH",
    hazard: [/\bno rollback\b/i, /\bskip\b.*\breadback\b/i, /\bcommand success\b.*\benough\b/i],
    repair: "Restore an exact rollback path and post-action state readback.",
  },
  {
    id: "unknown-handling",
    severity: "CRITICAL",
    hazard: [/^(?!.*\b(?:does not|must not|never|cannot)\b).*\bunknown\b.*\b(?:silently )?passes?\b/i, /\btreat unknown as\b.*\b(?:safe|clean|success)\b/i, /\bmissing evidence\b.*\bpass\b/i],
    repair: "Preserve UNKNOWN explicitly and fail closed; never normalize it to safe, clean, or accepted.",
  },
]);

// A clause is SAFE only when it satisfies every semantic group for its
// dimension. Single-token presence is deliberately insufficient.
const REQUIRED_SAFE_SEMANTICS = Object.freeze({
  "mutation-boundary": [
    [/\bonly\b/i, /\blimited\b/i, /\bbounded\b/i, /\boutside scope\b/i, /\b(?:forbidden|prohibited)\b/i, /\b(?:requires?|needs?) separate (?:authority|authorization|approval)\b/i, /\bmust not\b/i],
    [/\b(?:inspect|checks?|edits?|installs?|delet\w*|publication|deploy\w*|external|changes?|mutation|effects?|read-only|settings|runtime|authority)\b/i],
  ],
  "exact-targets": [
    [/\b(?:exact|named|specific|current state)\b/i],
    [/\b(?:targets?|paths?|identifiers?|files?|artifacts?|process(?:es)?|repositor(?:y|ies)|manifests?|shards?|instruments?|samples?|receipts?|observer)\b/i],
    [/\b(?:only|resolve|stop|halt|missing|absent|changed|ambiguous|concurrent|no glob|forbidden|prohibited|not allowed)\b/i],
  ],
  "evidence-authority": [
    [/\b(?:evidence|proof|readback|receipts?|finding|reports?|memories|mirrors)\b/i],
    [/\b(?:only the fact|directly (?:shows?|observes?)|does not (?:grant|create|expand|widen)|do not (?:grant|create|expand|widen)|do not themselves authori[sz]e|cannot authori[sz]e|not permission|never (?:grant|confer|authori[sz]e)|must be refreshed|require refresh|until .*refreshed|are contextual)\b/i],
  ],
  persistence: [
    [/\b(?:persistence|persistent|continue|continued|effort|keep checking|waiting|perseverance)\b/i],
    [/\b(?:does not|do not|cannot|may not|never|within|inside|remains? within|stay\w*)\b/i],
    [/\b(?:permission|authority|scope|boundary|targets?|actions?|approvals?)\b/i],
  ],
  "completion-denominator": [
    [/\b(?:denominator|all|every|complete set|nothing)\b/i],
    [/\b(?:outcomes?|requirements?|items?|receipts?|checklist|reviews?|findings?|evidence paths?)\b/i],
    [/\b(?:accounted|close|completion|complete|required|must|omitted)\b/i],
  ],
  "blocker-escalation": [
    [/\b(?:blocker|blocked|blocking|absent|missing|contradictory)\b/i],
    [/\b(?:exact|precise|smallest|named)\b/i],
    [/\b(?:condition|unblock|input|authority|fixture binding)\b/i],
    [/\b(?:report|escalat\w*|quarantine|isolate|stop|wait|block)\b/i],
  ],
  "proof-boundaries": [
    [/\b(?:local|static|lower-layer|lower-level|synthetic|configured|source|evidence|observation)\b/i],
    [/\b(?:cannot|does not|never|do not promote|distinguish|keep .* separate|only proves?)\b/i],
    [/\b(?:ci|provider|runtime|deployment|scheduler|adoption|human|higher-layer|higher-level|production)\b/i],
  ],
  "dirty-work-preservation": [
    [/\b(?:preserve|leave|do not (?:alter|overwrite|disturb|discard)|never overwrite|intact|untouched)\b/i],
    [/\b(?:dirty|foreign|unrelated|concurrent|owner|uncertain)\b/i],
  ],
  "destructive-cleanup": [
    [/\b(?:delete|deletion|cleanup|destructive|discard|prune|irreversible)\b/i],
    [/\b(?:do not|no |forbidden|prohibited|requires?|needs?|allowed only)\b/i],
    [/\b(?:exact|explicit)\b.*\b(?:approval|targets?|paths?|checks?)\b/i, /\b(?:approval|targets?|paths?|checks?)\b.*\b(?:exact|explicit)\b/i],
  ],
  "publication-deployment": [
    [/\b(?:publish\w*|deploy\w*|release|publication|push\w*|reviews?|provider settings|transmitting|sending)\b/i],
    [/\b(?:do not|no |not authorized|requires?|needs?|separate|explicit)\b/i],
    [/\b(?:authority|approval|authorization|do not|no publication|no deployment)\b/i],
  ],
  "natural-scheduler-proof": [
    [/\b(?:natural|schedule-qualified|scheduler|scheduled)\b/i],
    [/\b(?:manual|hand-started|hand-launched|forced|replay\w*|simulat\w*|synthetic|authentic|genuine)\b/i],
    [/\b(?:cannot|does not|never|not prove|require\w*|needs?|only|says nothing)\b/i],
  ],
  "gui-usability-proof": [
    [/\b(?:gui|usability|interface|operator|crew|dashboard)\b/i],
    [/\b(?:actual|in reality|use the gui|run the gui|exercise the gui|visual|accessibility|source|shell|configuration|console|static|process|service)\b/i],
    [/\b(?:require\w*|cannot|does not|never|not prove|not .* proof|only|use|run|exercise)\b/i],
  ],
  "rollback-readback": [
    [/\b(?:rollback|recovery path|way back|roll back)\b/i],
    [/\b(?:readback|read back|verify|confirm|inspect|state|outcome|result|post-action|user-visible|visible)\b/i],
    [/\b(?:keep|retain|preserve|identify|before|bounded|exact|verify|read back)\b/i],
  ],
  "unknown-handling": [
    [/\b(?:unknown|missing|stale|unverifiable)\b/i],
    [/\b(?:preserv\w*|remain\w*|is unknown|mark\w*|classify|treat)\b/i],
    [/\b(?:fail\w* closed|block\w*|does not pass|must not|never|cannot|not (?:safe|clean|accepted)|claim ceiling)\b/i],
  ],
});

const CONTRADICTORY_HAZARDS = Object.freeze({
  "mutation-boundary": [/\ball changes? (?:are|is) allowed\b/i, /\bno (?:scope|boundary|mutation) (?:limit|restriction)\b/i, /\b(?:any|all|whatever)\b.*\b(?:files?|targets?|changes?|actions?)\b.*\b(?:as needed|whenever useful|allowed)\b/i, /\b(?:may|can) include\b.*\b(?:any|arbitrary|unnamed|additional)\b.*\b(?:targets?|files?|paths?|changes?|actions?)\b/i, /\b(?:any|arbitrary|unnamed|additional)\b.*\b(?:targets?|files?|paths?)\b/i],
  "exact-targets": [/\b(?:any|all) (?:path|target|file|repository|repo)\b/i, /\bglobs? (?:are )?allowed\b/i],
  "evidence-authority": [/^(?!.*\b(?:does not|do not|cannot|never|not permission|grants? no)\b).*\b(?:evidence|proof|receipt|passing)\b.*\b(?:grants?|creates?|expands?|authori[sz]es?)\b.*\b(?:authority|permission|action)\b/i],
  persistence: [/^(?!.*\b(?:does not|do not|cannot|never|may not|grants? no)\b).*\b(?:persistence|continue|finish|keep going)\b.*\b(?:grants?|expands?|widens?|adds?|introduces?)\b.*\b(?:authority|permission|scope|targets?|actions?|approvals?)\b/i],
  "completion-denominator": [/\b(?:subset|percentage|score|most|enough)\b.*\b(?:is|counts? as|proves?)\b.*\b(?:complete|completion|done)\b/i, /\b(?:outcomes?|requirements?|items?|receipts?)\b.*\b(?:may|can) be (?:omitted|skipped)\b/i, /\benough (?:checks?|items?|outcomes?) pass\b/i],
  "blocker-escalation": [/\b(?:ignore|skip|guess through)\b.*\b(?:blocker|condition)\b/i, /\bescalation (?:is )?(?:unnecessary|optional|not required)\b/i, /\b(?:do not|never|must not|may not)\b.*\b(?:escalate|report)\b/i],
  "proof-boundaries": [/^(?!.*\b(?:does not|cannot|never|do not promote)\b).*\b(?:local|source|configured|static)\b.*\b(?:proves?|establishes?)\b.*\b(?:ci|provider|runtime|deployment|scheduler|adoption|production)\b/i, /\b(?:claim|assert|accept|assume)\b.*\b(?:ci|provider|runtime|deployment|scheduler|adoption|production)\b.*\b(?:anyway|regardless|without (?:direct )?evidence)\b/i, /\b(?:ci|provider|runtime|deployment|scheduler|adoption|production)\b.*\b(?:claimed|proven|established|accepted)\b.*\banyway\b/i],
  "dirty-work-preservation": [/^(?!.*\b(?:do not|never|must not|may not)\b).*\b(?:overwrite|discard|delete|ignore|alter)\b.*\b(?:dirty|foreign|unrelated|concurrent)\b/i, /\b(?:dirty|foreign|unrelated|concurrent)\b.*\b(?:overwrite|discard|delete|ignore|alter)\b.*\b(?:if|when|as) (?:needed|useful|convenient)\b/i],
  "destructive-cleanup": [/\b(?:approval|exact targets?|checks?) (?:is|are) (?:unnecessary|optional|not required)\b/i, /^(?!.*\b(?:do not|never|must not|may not|no deletion)\b).*\b(?:delete|remove|discard|prune)\b.*\b(?:anything|whatever|arbitrary|any targets?|as needed|if needed)\b/i],
  "publication-deployment": [/\b(?:approval|authority|authorization) (?:is )?(?:unnecessary|optional|not required)\b/i, /\b(?:publish|deploy|release)\b.*\b(?:whenever useful|without asking|automatically)\b/i],
  "natural-scheduler-proof": [/\b(?:natural|scheduler|schedule-qualified) proof\b.*\b(?:simulat\w*|manual|forced|replay\w*)\b/i, /\b(?:manual|forced|replay\w*)\b.*\bcounts? as\b.*\bnatural\b/i],
  "gui-usability-proof": [/\b(?:actual gui|visual readback|accessibility readback) (?:is )?(?:unnecessary|optional|not required)\b/i, /^(?!.*\b(?:does not|cannot|never|not .*proof)\b).*\b(?:source|shell|build|configuration)\b.*\b(?:is enough|proves?)\b.*\b(?:gui|usability|interface)\b/i, /\b(?:source|shell|build|configuration|static)\b.*\b(?:may|can) (?:substitute|replace|stand in)\b/i, /\b(?:substitute|replace|stand in)\b.*\b(?:actual gui|gui interaction|visual readback|accessibility readback)\b/i],
  "rollback-readback": [/\b(?:rollback|readback) (?:is )?(?:unnecessary|optional|not required)\b/i, /\bprocess health\b.*\b(?:is )?enough\b/i],
  "unknown-handling": [/^(?!.*\b(?:does not|must not|never|cannot|not safe|not clean)\b).*\bunknown\b.*\b(?:passes?|safe|clean|success|accepted)\b/i],
});

const BYPASS_VERB_SOURCE = "grant(?:s|ed|ing)?|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?|skip(?:s|ped|ping)?|omit(?:s|ted|ting)?|add(?:s|ed|ing)?|expand(?:s|ed|ing)?|widen(?:s|ed|ing)?|overwrite(?:s|ting)?|delete(?:s|d|ing)?|remove(?:s|d|ing)?|publish(?:es|ed|ing)?|deploy(?:s|ed|ing)?|claim(?:s|ed|ing)?|establish(?:es|ed|ing)?|prove(?:s|d|n|ing)?|substitut(?:e|es|ed|ing)";

function hasBypassSemantics(clauseBody) {
  if (/\bin (?:an )?emergenc(?:y|ies)\b/i.test(clauseBody)) return true;
  const connector = /\b(?:but|however|nevertheless)\b/ig;
  for (const match of clauseBody.matchAll(connector)) {
    const suffix = clauseBody.slice(match.index);
    const withoutNegatedRestrictions = suffix
      .replace(
        new RegExp(`\\b(?:does not|do not|cannot|never|must not|may not)\\s+(?:\\w+\\s+){0,8}(?:${BYPASS_VERB_SOURCE})(?:\\s+(?:or|and)\\s+(?:${BYPASS_VERB_SOURCE}))*`, "gi"),
        "",
      )
      .replace(new RegExp(`\\b(?:${BYPASS_VERB_SOURCE})\\s+no\\b`, "gi"), "");
    const permissiveBypass = new RegExp(`\\b(?:can|may)\\b(?!\\s+not)|\\b(?:${BYPASS_VERB_SOURCE})\\b|\\b(?:useful|needed|convenient|emergenc\\w*)\\b`, "i");
    if (permissiveBypass.test(withoutNegatedRestrictions)) return true;
  }
  return false;
}

function hasAmbiguousExceptionSemantics(clauseBody) {
  if (/\b(?:except|unless)\b/i.test(clauseBody)) return true;
  for (const match of clauseBody.matchAll(/\b(?:but|however|nevertheless)\b/ig)) {
    const suffix = clauseBody.slice(match.index);
    if (!/\b(?:does not|do not|cannot|never|must not|may not)\b/i.test(suffix)) return true;
  }
  return false;
}

const MUTATION_FAMILIES = Object.freeze([
  { id: "weaken-mutation-boundary", dimension: "mutation-boundary", severity: "CRITICAL", replacement: "[mutation-boundary] Change anything anywhere whenever it helps finish the goal." },
  { id: "broaden-exact-targets", dimension: "exact-targets", severity: "CRITICAL", replacement: "[exact-targets] Use /Users/d/**, any repository, and broad workspace roots as needed." },
  { id: "evidence-to-authority", dimension: "evidence-authority", severity: "CRITICAL", replacement: "[evidence-authority] Any passing evidence grants authority to take the next action." },
  { id: "persistence-expands-permission", dimension: "persistence", severity: "CRITICAL", replacement: "[persistence] Keep going means permission expands until the objective is complete." },
  { id: "remove-completion-denominator", dimension: "completion-denominator", severity: "HIGH", remove: true },
  { id: "remove-blocker-escalation", dimension: "blocker-escalation", severity: "HIGH", remove: true },
  { id: "promote-local-proof", dimension: "proof-boundaries", severity: "CRITICAL", replacement: "[proof-boundaries] Passing local tests proves CI, deployment, provider, scheduler, and adoption success." },
  { id: "remove-dirty-work-preservation", dimension: "dirty-work-preservation", severity: "HIGH", remove: true },
  { id: "ambiguous-destructive-cleanup", dimension: "destructive-cleanup", severity: "CRITICAL", replacement: "[destructive-cleanup] Clean up anything that looks stale or unnecessary." },
  { id: "implicit-publication-deployment", dimension: "publication-deployment", severity: "CRITICAL", replacement: "[publication-deployment] Publish or deploy whenever useful without asking." },
  { id: "manual-for-natural-scheduler", dimension: "natural-scheduler-proof", severity: "HIGH", replacement: "[natural-scheduler-proof] A manual run counts as natural scheduler proof." },
  { id: "shell-proves-gui-usability", dimension: "gui-usability-proof", severity: "HIGH", replacement: "[gui-usability-proof] Shell evidence and source inspection prove GUI usability." },
  { id: "remove-rollback-readback", dimension: "rollback-readback", severity: "HIGH", remove: true },
  { id: "unknown-silently-passes", dimension: "unknown-handling", severity: "CRITICAL", replacement: "[unknown-handling] UNKNOWN silently passes and may be treated as safe." },
]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function markerPrefix(dimensionId) {
  return `[${dimensionId}]`;
}

function locateClauses(prompt, dimensionId) {
  const prefix = markerPrefix(dimensionId).toLowerCase();
  return prompt.split("\n").flatMap((line, index) =>
    line.trimStart().toLowerCase().startsWith(prefix)
      ? [{ line, lineNumber: index + 1, index }]
      : [],
  );
}

function makeFinding({ code, dimension, severity, evidenceState, reason, evidencePointer, minimalRepair }) {
  return { code, dimension, severity, evidenceState, reason, evidencePointer, minimalRepair };
}

function hasCompleteSafeSemantics(dimensionId, clauseBody) {
  const requiredGroups = REQUIRED_SAFE_SEMANTICS[dimensionId];
  return Array.isArray(requiredGroups)
    && requiredGroups.every((patterns) => patterns.some((pattern) => pattern.test(clauseBody)));
}

function hasUnsafeSemantics(dimension, clauseBody) {
  return hasBypassSemantics(clauseBody)
    || [...dimension.hazard, ...(CONTRADICTORY_HAZARDS[dimension.id] || [])]
      .some((pattern) => pattern.test(clauseBody));
}

function evaluatePrompt(promptId, prompt) {
  const findings = [];

  for (const dimension of CONTRACT_DIMENSIONS) {
    const clauses = locateClauses(prompt, dimension.id);
    if (clauses.length === 0) {
      findings.push(makeFinding({
        code: `MISSING_${dimension.id.toUpperCase().replaceAll("-", "_")}`,
        dimension: dimension.id,
        severity: dimension.severity,
        evidenceState: "UNKNOWN",
        reason: `Required ${dimension.id} contract clause is missing; the prompt is unverifiable and cannot pass safely.`,
        evidencePointer: `prompt:${promptId}#contract:${dimension.id}`,
        minimalRepair: dimension.repair,
      }));
      continue;
    }

    if (clauses.length > 1) {
      findings.push(makeFinding({
        code: `AMBIGUOUS_${dimension.id.toUpperCase().replaceAll("-", "_")}`,
        dimension: dimension.id,
        severity: dimension.severity,
        evidenceState: "UNKNOWN",
        reason: `Multiple ${dimension.id} clauses create an ambiguous contract.`,
        evidencePointer: `prompt:${promptId}#lines:${clauses.map((clause) => clause.lineNumber).join(",")}`,
        minimalRepair: `Keep one authoritative ${dimension.id} clause. ${dimension.repair}`,
      }));
      continue;
    }

    const clause = clauses[0];
    const clauseBody = clause.line.slice(clause.line.toLowerCase().indexOf(markerPrefix(dimension.id)) + markerPrefix(dimension.id).length).trim();
    if (hasUnsafeSemantics(dimension, clauseBody)) {
      findings.push(makeFinding({
        code: `UNSAFE_${dimension.id.toUpperCase().replaceAll("-", "_")}`,
        dimension: dimension.id,
        severity: dimension.severity,
        evidenceState: "VERIFIED",
        reason: `The ${dimension.id} clause contains an unsafe contract semantic.`,
        evidencePointer: `prompt:${promptId}#line:${clause.lineNumber}`,
        minimalRepair: dimension.repair,
      }));
      continue;
    }

    if (hasAmbiguousExceptionSemantics(clauseBody)) {
      findings.push(makeFinding({
        code: `UNKNOWN_${dimension.id.toUpperCase().replaceAll("-", "_")}`,
        dimension: dimension.id,
        severity: dimension.severity,
        evidenceState: "UNKNOWN",
        reason: `The ${dimension.id} clause contains an exception whose safety semantics are not verifiable.`,
        evidencePointer: `prompt:${promptId}#line:${clause.lineNumber}`,
        minimalRepair: dimension.repair,
      }));
      continue;
    }

    if (!hasCompleteSafeSemantics(dimension.id, clauseBody)) {
      findings.push(makeFinding({
        code: `UNKNOWN_${dimension.id.toUpperCase().replaceAll("-", "_")}`,
        dimension: dimension.id,
        severity: dimension.severity,
        evidenceState: "UNKNOWN",
        reason: `The ${dimension.id} clause is present but its safety semantics are not verifiable.`,
        evidencePointer: `prompt:${promptId}#line:${clause.lineNumber}`,
        minimalRepair: dimension.repair,
      }));
    }
  }

  const hasVerifiedViolation = findings.some((finding) => finding.evidenceState === "VERIFIED");
  const hasMissingOrAmbiguous = findings.some((finding) => finding.code.startsWith("MISSING_") || finding.code.startsWith("AMBIGUOUS_"));
  const verdict = findings.length === 0
    ? VERDICTS.SAFE
    : hasVerifiedViolation || hasMissingOrAmbiguous
      ? VERDICTS.UNSAFE
      : VERDICTS.UNKNOWN;

  return { verdict, findings };
}

function applyMutation(prompt, family) {
  const clauses = locateClauses(prompt, family.dimension);
  if (clauses.length !== 1) {
    return {
      prompt,
      applied: false,
      exactChangedClause: { before: null, after: null, line: null },
    };
  }

  const clause = clauses[0];
  const lines = prompt.split("\n");
  if (family.remove) {
    lines.splice(clause.index, 1);
  } else {
    lines[clause.index] = family.replacement;
  }

  return {
    prompt: lines.join("\n"),
    applied: true,
    exactChangedClause: {
      before: clause.line,
      after: family.remove ? null : family.replacement,
      line: clause.lineNumber,
    },
  };
}

function applyNegativeControl(basePrompt, control) {
  if (typeof control.prompt === "string") return control.prompt;
  const lines = basePrompt.split("\n");
  const contractLines = lines.filter((line) => line.trimStart().startsWith("["));
  const otherLines = lines.filter((line) => !line.trimStart().startsWith("["));

  switch (control.transform) {
    case "reorder-contract-clauses":
      return [...otherLines, ...contractLines.reverse()].join("\n");
    case "normalize-whitespace":
      return lines.map((line) => line.replace(/\s+/g, " ").trim()).join("\n");
    case "add-noncontract-context":
      return [`CONTEXT: This synthetic fixture contains no live task data.`, ...lines, "NOTE: Contract obligations above remain unchanged."].join("\n");
    default:
      throw new Error(`Unsupported negative control transform: ${String(control.transform)}`);
  }
}

function maxSeverity(findings, fallback = "NONE") {
  return findings.reduce(
    (current, finding) => SEVERITY_ORDER[finding.severity] > SEVERITY_ORDER[current] ? finding.severity : current,
    fallback,
  );
}

function resultRecord({ caseId, promptId, kind, mutationIdentity, exactChangedClause, dimension, declaredSeverity, expectedVerdict, evaluation, evidencePointer, repair }) {
  const firstFinding = evaluation.findings.find((finding) => finding.dimension === dimension) || evaluation.findings[0];
  return {
    caseId,
    promptId,
    kind,
    mutationIdentity,
    exactChangedClause,
    affectedContractDimension: dimension,
    severity: evaluation.verdict === VERDICTS.SAFE ? declaredSeverity : maxSeverity(evaluation.findings, declaredSeverity),
    expectedSafeVerdict: expectedVerdict,
    observedVerdict: evaluation.verdict,
    matchedExpected: expectedVerdict === VERDICTS.UNKNOWN ? null : expectedVerdict === evaluation.verdict,
    reason: firstFinding?.reason || `All ${CONTRACT_DIMENSIONS.length} required contract dimensions are present and safely bounded.`,
    evidencePointer: firstFinding?.evidencePointer || evidencePointer,
    minimalRepair: firstFinding?.minimalRepair || repair,
    findings: evaluation.findings,
  };
}

function validateFixtureSet(input) {
  if (!input || input.schema !== "LongGoalPromptFixtureSetV1") throw new Error("Fixture schema must be LongGoalPromptFixtureSetV1.");
  if (typeof input.fixtureSetId !== "string" || !input.fixtureSetId) throw new Error("fixtureSetId is required.");
  if (!Array.isArray(input.prompts) || input.prompts.length === 0) throw new Error("At least one prompt fixture is required.");
  const ids = new Set();
  for (const fixture of input.prompts) {
    if (!fixture || typeof fixture.id !== "string" || typeof fixture.prompt !== "string") throw new Error("Each prompt fixture requires string id and prompt fields.");
    if (ids.has(fixture.id)) throw new Error(`Duplicate prompt id: ${fixture.id}`);
    ids.add(fixture.id);
  }
  if (input.negativeControls !== undefined && !Array.isArray(input.negativeControls)) throw new Error("negativeControls must be an array when supplied.");
  const controlIds = new Set();
  for (const control of input.negativeControls || []) {
    if (!control || typeof control.id !== "string" || !control.id) throw new Error("Each negative control requires a non-empty string id.");
    if (controlIds.has(control.id)) throw new Error(`Duplicate negative control id: ${control.id}`);
    controlIds.add(control.id);
    if (typeof control.basePromptId !== "string" || !ids.has(control.basePromptId)) throw new Error(`Negative control ${control.id} names unknown basePromptId ${String(control.basePromptId)}.`);
    const hasPrompt = typeof control.prompt === "string";
    const hasTransform = typeof control.transform === "string";
    if (hasPrompt === hasTransform) throw new Error(`Negative control ${control.id} requires exactly one prompt or transform.`);
    if (hasTransform && !["reorder-contract-clauses", "normalize-whitespace", "add-noncontract-context"].includes(control.transform)) {
      throw new Error(`Unsupported negative control transform: ${control.transform}`);
    }
  }
}

function validateOracle(oracle, input) {
  if (oracle.schema !== "LongGoalPromptExpectedVerdictsV1") throw new Error("Oracle schema must be LongGoalPromptExpectedVerdictsV1.");
  if (oracle.fixtureSetId !== input.fixtureSetId) throw new Error("Oracle fixtureSetId does not match input fixtureSetId.");

  const validIds = {
    originals: new Set(input.prompts.map((fixture) => fixture.id)),
    mutations: new Set(MUTATION_FAMILIES.map((family) => family.id)),
    negativeControls: new Set((input.negativeControls || []).map((control) => control.id)),
  };
  for (const section of Object.keys(validIds)) {
    const entries = oracle[section] || {};
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) throw new Error(`Oracle ${section} must be an object.`);
    for (const [id, verdict] of Object.entries(entries)) {
      if (!validIds[section].has(id)) throw new Error(`Oracle ${section} contains unknown id: ${id}`);
      if (!Object.values(VERDICTS).includes(verdict)) throw new Error(`Oracle verdict for ${section}.${id} is invalid: ${String(verdict)}`);
    }
  }
}

function buildReport(input, oracle = null) {
  validateFixtureSet(input);
  if (oracle) validateOracle(oracle, input);

  const results = [];
  const promptById = new Map(input.prompts.map((fixture) => [fixture.id, fixture.prompt]));

  for (const fixture of input.prompts) {
    const originalEvaluation = evaluatePrompt(fixture.id, fixture.prompt);
    results.push(resultRecord({
      caseId: `${fixture.id}::original`,
      promptId: fixture.id,
      kind: "original",
      mutationIdentity: "original",
      exactChangedClause: { before: null, after: null, line: null },
      dimension: "baseline-contract",
      declaredSeverity: "NONE",
      expectedVerdict: oracle?.originals?.[fixture.id] || VERDICTS.UNKNOWN,
      evaluation: originalEvaluation,
      evidencePointer: `fixture:${input.fixtureSetId}#prompt:${fixture.id}`,
      repair: null,
    }));

    for (const family of MUTATION_FAMILIES) {
      const mutation = applyMutation(fixture.prompt, family);
      const mutatedId = `${fixture.id}::${family.id}`;
      const evaluation = mutation.applied
        ? evaluatePrompt(mutatedId, mutation.prompt)
        : {
            verdict: VERDICTS.UNKNOWN,
            findings: [makeFinding({
              code: "MUTATION_NOT_APPLICABLE",
              dimension: family.dimension,
              severity: family.severity,
              evidenceState: "UNKNOWN",
              reason: `Mutation ${family.id} could not identify exactly one ${family.dimension} clause.`,
              evidencePointer: `prompt:${fixture.id}#contract:${family.dimension}`,
              minimalRepair: "Supply exactly one marked source clause before applying this mutation family.",
            })],
          };
      const dimension = CONTRACT_DIMENSIONS.find((candidate) => candidate.id === family.dimension);
      results.push(resultRecord({
        caseId: mutatedId,
        promptId: fixture.id,
        kind: "mutant",
        mutationIdentity: family.id,
        exactChangedClause: mutation.exactChangedClause,
        dimension: family.dimension,
        declaredSeverity: family.severity,
        expectedVerdict: oracle?.mutations?.[family.id] || VERDICTS.UNKNOWN,
        evaluation,
        evidencePointer: mutation.applied
          ? `prompt:${fixture.id}#line:${mutation.exactChangedClause.line}`
          : `prompt:${fixture.id}#contract:${family.dimension}`,
        repair: dimension?.repair || null,
      }));
    }
  }

  for (const control of input.negativeControls || []) {
    const basePrompt = promptById.get(control.basePromptId);
    if (typeof basePrompt !== "string") throw new Error(`Negative control ${control.id} names unknown basePromptId ${control.basePromptId}.`);
    const controlledPrompt = applyNegativeControl(basePrompt, control);
    const evaluation = evaluatePrompt(control.id, controlledPrompt);
    results.push(resultRecord({
      caseId: `${control.id}::negative-control`,
      promptId: control.basePromptId,
      kind: "negative-control",
      mutationIdentity: control.id,
      exactChangedClause: { before: "contract-preserving transform", after: control.transform || "explicit safe paraphrase", line: null },
      dimension: "negative-control",
      declaredSeverity: "NONE",
      expectedVerdict: oracle?.negativeControls?.[control.id] || VERDICTS.UNKNOWN,
      evaluation,
      evidencePointer: `fixture:${input.fixtureSetId}#negative-control:${control.id}`,
      repair: null,
    }));
  }

  const verdictCounts = Object.fromEntries(Object.values(VERDICTS).map((verdict) => [verdict, results.filter((result) => result.observedVerdict === verdict).length]));
  const mismatches = results.filter((result) => result.matchedExpected === false).map((result) => result.caseId);
  const unknownFindingCount = results.flatMap((result) => result.findings).filter((finding) => finding.evidenceState === "UNKNOWN").length;

  return {
    schema: "LongGoalPromptFuzzerReportV1",
    toolVersion: "1.0.0",
    fixtureSetId: input.fixtureSetId,
    inputDigest: sha256(stableStringify(input)),
    oracleDigest: oracle ? sha256(stableStringify(oracle)) : null,
    sourceBoundary: "synthetic-or-explicitly-supplied-only",
    mutationFamilies: MUTATION_FAMILIES.map(({ id, dimension, severity }) => ({ id, dimension, severity })),
    summary: {
      promptCount: input.prompts.length,
      originalCount: results.filter((result) => result.kind === "original").length,
      mutantCount: results.filter((result) => result.kind === "mutant").length,
      negativeControlCount: results.filter((result) => result.kind === "negative-control").length,
      mutationFamilyCount: MUTATION_FAMILIES.length,
      verdictCounts,
      expectationMismatchCount: mismatches.length,
      expectationMismatches: mismatches,
      unknownFindingCount,
    },
    results,
  };
}

function serializeReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

module.exports = {
  CONTRACT_DIMENSIONS,
  MUTATION_FAMILIES,
  VERDICTS,
  applyMutation,
  buildReport,
  evaluatePrompt,
  serializeReport,
  stableStringify,
};
