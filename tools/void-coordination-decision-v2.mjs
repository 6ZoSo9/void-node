#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const DECISION_MARKER = "VOID_COORDINATION_DECISION_V2";
export const SEVERITY_MARKER = "VOID_COORDINATION_SEVERITY_V2";

function fail(message) {
  throw new Error(message);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function compileRegexList(values, label) {
  if (!Array.isArray(values)) fail(`${label} must be an array`);
  return values.map((value) => {
    if (typeof value !== "string" || !value) fail(`${label} contains invalid regex`);
    return new RegExp(value, "i");
  });
}

export function compileSeverityPolicy(policy) {
  const config = policy?.coordination_severity;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    fail("coordination_severity policy missing");
  }
  if (config.marker !== SEVERITY_MARKER || config.version !== 2) {
    fail("coordination_severity marker/version mismatch");
  }
  if (config.default_overlap !== "advisory" || config.default_reservation !== "advisory") {
    fail("v2 defaults must remain advisory");
  }
  if (!Array.isArray(config.hard_reason_prefixes) || config.hard_reason_prefixes.length === 0) {
    fail("hard_reason_prefixes must be a non-empty array");
  }
  for (const prefix of config.hard_reason_prefixes) {
    if (typeof prefix !== "string" || !prefix) fail("invalid hard reason prefix");
  }
  return {
    hardReasonPrefixes: [...config.hard_reason_prefixes],
    sensitivePathRegexes: compileRegexList(
      config.sensitive_path_patterns,
      "sensitive_path_patterns",
    ),
    sensitiveBranchRegexes: compileRegexList(
      config.sensitive_branch_patterns,
      "sensitive_branch_patterns",
    ),
  };
}

function matchesAny(value, regexes) {
  return regexes.some((regex) => regex.test(value));
}

function pathIsSensitive(path, compiled) {
  return matchesAny(path, compiled.sensitivePathRegexes);
}

function branchIsSensitive(branch, compiled) {
  return matchesAny(branch, compiled.sensitiveBranchRegexes);
}

function reasonIsIntrinsicHard(reason, compiled) {
  return compiled.hardReasonPrefixes.some((prefix) => reason.startsWith(prefix));
}

export function classifyCandidate(registry, policy) {
  if (
    !registry
    || typeof registry !== "object"
    || registry.marker !== "VOID_ACTIVE_LANE_COORDINATION_REGISTRY_V1"
  ) {
    fail("registry marker mismatch");
  }
  const candidate = registry.candidate;
  if (!candidate || typeof candidate !== "object") fail("registry candidate missing");
  if (typeof candidate.branch !== "string" || !candidate.branch) {
    fail("candidate branch missing");
  }
  if (!Array.isArray(candidate.reasons) || !Array.isArray(candidate.path_collisions)) {
    fail("candidate collision metadata malformed");
  }

  const compiled = compileSeverityPolicy(policy);
  const branchSensitive = branchIsSensitive(candidate.branch, compiled);
  const plannedPaths = Array.isArray(candidate.planned_paths) ? candidate.planned_paths : [];
  const plannedSensitive = plannedPaths.some((path) => pathIsSensitive(path, compiled));

  const hardReasons = [];
  const advisoryReasons = [];
  for (const reason of candidate.reasons) {
    if (typeof reason !== "string" || !reason) fail("candidate reason malformed");
    if (reason === "planned_path_overlap") continue;
    if (reasonIsIntrinsicHard(reason, compiled)) {
      hardReasons.push(reason);
      continue;
    }
    if (reason === "planned_path_metadata_incomplete") {
      (branchSensitive || plannedSensitive ? hardReasons : advisoryReasons).push(reason);
      continue;
    }
    if (reason.startsWith("exact_reservation:") || reason.startsWith("reserved_family:")) {
      (branchSensitive ? hardReasons : advisoryReasons).push(reason);
      continue;
    }
    advisoryReasons.push(reason);
  }

  const hardPathCollisions = [];
  const advisoryPathCollisions = [];
  for (const collision of candidate.path_collisions) {
    if (!collision || typeof collision !== "object") fail("path collision malformed");
    const candidatePath = collision.candidate_path ?? "";
    const activePath = collision.active_path ?? "";
    const activeBranch = collision.branch ?? "";
    const sensitive = branchSensitive
      || pathIsSensitive(candidatePath, compiled)
      || pathIsSensitive(activePath, compiled)
      || branchIsSensitive(activeBranch, compiled);
    (sensitive ? hardPathCollisions : advisoryPathCollisions).push(collision);
  }
  if (hardPathCollisions.length > 0) hardReasons.push("sensitive_path_overlap");
  if (advisoryPathCollisions.length > 0) advisoryReasons.push("nominal_path_overlap");

  const uniqueHard = [...new Set(hardReasons)].sort();
  const uniqueAdvisory = [...new Set(advisoryReasons)].sort();
  const decision = uniqueHard.length > 0
    ? "HARD_STOP"
    : uniqueAdvisory.length > 0
      ? "PROCEED_WITH_ADVISORY"
      : "CLEAR";

  return canonicalize({
    marker: DECISION_MARKER,
    version: 2,
    candidate_branch: candidate.branch,
    decision,
    hard_stop: decision === "HARD_STOP",
    proceed_allowed: decision !== "HARD_STOP",
    priority_fallthrough_allowed: decision !== "HARD_STOP",
    exploration_allowed: decision !== "HARD_STOP",
    branch_sensitive: branchSensitive,
    planned_sensitive: plannedSensitive,
    hard_reasons: uniqueHard,
    advisory_reasons: uniqueAdvisory,
    hard_path_collisions: hardPathCollisions,
    advisory_path_collisions: advisoryPathCollisions,
  });
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { help: true };
    if (!token.startsWith("--")) fail(`unexpected argument: ${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`${token} requires a value`);
    values[key] = value;
    index += 1;
  }
  return values;
}

function usage() {
  console.log([
    "VOID coordination decision v2",
    "",
    "Classify one V1 candidate registry result:",
    "  node tools/void-coordination-decision-v2.mjs \\",
    "    --registry /tmp/void-lane-check.json \\",
    "    --policy ops/coordination/active-lane-reservations-v1.json \\",
    "    --output /tmp/void-coordination-decision.json",
  ].join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!args.registry || !args.policy || !args.output) {
    fail("--registry, --policy, and --output are required");
  }
  const registry = JSON.parse(readFileSync(resolve(args.registry), "utf8"));
  const policy = JSON.parse(readFileSync(resolve(args.policy), "utf8"));
  const result = classifyCandidate(registry, policy);
  writeFileSync(resolve(args.output), `${JSON.stringify(result, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(`decision=${result.decision}`);
  console.log(`hard_stop=${result.hard_stop}`);
  console.log(
    `advisory_count=${result.advisory_reasons.length + result.advisory_path_collisions.length}`,
  );
  console.log(`output=${resolve(args.output)}`);
  console.log("VOID_COORDINATION_DECISION_V2_COMPLETE=true");
  if (result.hard_stop) process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = 1;
  });
}
