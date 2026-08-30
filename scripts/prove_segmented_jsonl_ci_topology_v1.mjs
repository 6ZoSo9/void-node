#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FOCUSED_PATH = ".github/workflows/void-segmented-jsonl-v1.yml";
const CI_PATH = ".github/workflows/ci.yml";
const BASELINE_PATH = "tools/check_tsc_noemit_baseline.sh";
const PROOF_PATH = "scripts/prove_segmented_jsonl_ci_topology_v1.mjs";
const SEGSTORE_PROOF_PATH = "scripts/prove_segmented_jsonl_v1.ts";
const STORAGE_SOURCES = [
  "src/storage/segmented_jsonl_v1.ts",
  "src/storage/segmented_jsonl_snapshot_authority_v1.ts",
  "src/storage/segmented_jsonl_materialized_authority_v1.ts",
  "src/storage/segmented_jsonl_checkpoint_materialized_authority_v1.ts",
  "src/storage/segmented_jsonl_durable_root_v1.ts",
];
const SEMANTIC_PROOFS = [
  "scripts/prove_segmented_jsonl_v1.ts",
  "scripts/prove_segmented_jsonl_record_delimiter_ceiling_v1.ts",
  "scripts/prove_segmented_jsonl_manifest_publish_ceiling_v1.ts",
  "scripts/prove_segmented_jsonl_parent_namespace_v1.ts",
  "scripts/prove_segmented_jsonl_terminal_generation_v1.ts",
  "scripts/prove_segmented_jsonl_builder_record_vector_heap_v1.ts",
  "scripts/prove_segmented_jsonl_snapshot_authority_v1.ts",
  "scripts/prove_segmented_jsonl_materialized_authority_v1.ts",
  "scripts/prove_segmented_jsonl_checkpoint_append_only_v1.ts",
  "scripts/prove_segmented_jsonl_checkpoint_bounded_consumer_v1.ts",
  "scripts/prove_segmented_jsonl_checkpoint_admission_bound_v1.ts",
  "scripts/prove_segmented_jsonl_checkpoint_chain_lifetime_bound_v1.ts",
  "scripts/prove_segmented_jsonl_post_durable_close_v1.ts",
  "scripts/prove_segmented_jsonl_durable_root_v1.ts",
];
const TRIGGER_DEPENDENCIES = [
  ...STORAGE_SOURCES,
  ...SEMANTIC_PROOFS,
  FOCUSED_PATH,
  "scripts/ci_diff_hygiene_v1.sh",
  "scripts/prove_ci_diff_hygiene_v1.mjs",
  PROOF_PATH,
  BASELINE_PATH,
  CI_PATH,
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.build.json",
];

function exactLineCount(source, exact) {
  return source.split("\n").filter((line) => line === exact).length;
}

function workflowEventPathEntries(source, eventName) {
  const lines = source.split("\n");
  const onRoots = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === "on:") onRoots.push(index);
  }
  assert.equal(onRoots.length, 1, `focused_on_root_count:${onRoots.length}`);

  const onAt = onRoots[0];
  let onEnd = lines.length;
  for (let index = onAt + 1; index < lines.length; index += 1) {
    if (/^\S/.test(lines[index])) {
      onEnd = index;
      break;
    }
  }

  const eventLine = `  ${eventName}:`;
  const eventMatches = [];
  for (let index = onAt + 1; index < onEnd; index += 1) {
    if (lines[index] === eventLine) eventMatches.push(index);
  }
  assert.equal(
    eventMatches.length,
    1,
    `focused_${eventName}_event_count:${eventMatches.length}`,
  );
  const eventAt = eventMatches[0];

  let eventEnd = onEnd;
  for (let index = eventAt + 1; index < onEnd; index += 1) {
    if (/^  \S/.test(lines[index])) {
      eventEnd = index;
      break;
    }
  }

  const pathMatches = [];
  for (let index = eventAt + 1; index < eventEnd; index += 1) {
    if (lines[index] === "    paths:") pathMatches.push(index);
  }
  assert.equal(
    pathMatches.length,
    1,
    `focused_${eventName}_paths_count:${pathMatches.length}`,
  );
  const pathsAt = pathMatches[0];

  const entries = [];
  for (let index = pathsAt + 1; index < eventEnd; index += 1) {
    const match = /^      - "([^"]+)"$/.exec(lines[index]);
    if (!match) break;
    entries.push(match[1]);
  }
  return entries;
}

function rejectFailureTolerance(source, marker) {
  assert.ok(!/^\s*continue-on-error:\s*true\s*$/m.test(source), marker);
}

function auditFocused(source) {
  const pullRequestPaths = workflowEventPathEntries(source, "pull_request");
  const pushPaths = workflowEventPathEntries(source, "push");
  for (const dependency of TRIGGER_DEPENDENCIES) {
    const pullRequestCount = pullRequestPaths.filter((pathEntry) => pathEntry === dependency).length;
    const pushCount = pushPaths.filter((pathEntry) => pathEntry === dependency).length;
    assert.equal(
      pullRequestCount,
      1,
      `focused_pull_request_trigger_count:${dependency}:${pullRequestCount}`,
    );
    assert.equal(pushCount, 1, `focused_push_trigger_count:${dependency}:${pushCount}`);
  }
  for (const dependency of [...STORAGE_SOURCES, ...SEMANTIC_PROOFS]) {
    assert.ok(
      source.includes(`node --experimental-strip-types --check ${dependency}`),
      `focused_syntax_not_invoked:${dependency}`,
    );
  }
  for (const proofPath of SEMANTIC_PROOFS) {
    assert.equal(
      exactLineCount(source, `        run: npx --no-install tsx ${proofPath}`),
      1,
      `focused_proof_not_terminal:${proofPath}`,
    );
  }
  assert.equal(
    exactLineCount(source, "      - name: Prove focused workflow dependency closure"),
    1,
    "focused_inline_audit_step_count",
  );
  assert.equal(exactLineCount(source, "        node: [22, 24, 26]"), 1, "focused_node_matrix_not_exact");
  assert.equal(exactLineCount(source, "        if: matrix.node == 24"), 2, "focused_node24_gate_count");
  assert.equal(exactLineCount(source, "        run: npm run typecheck"), 1, "focused_typecheck_not_terminal");
  assert.equal(exactLineCount(source, "        run: npm run build"), 1, "focused_build_not_terminal");
  assert.equal(
    exactLineCount(source, `          node --check ${PROOF_PATH}`),
    1,
    "focused_topology_syntax_not_terminal",
  );
  assert.equal(
    exactLineCount(source, `          bash -n ${BASELINE_PATH}`),
    1,
    "focused_baseline_syntax_not_terminal",
  );
  assert.equal(
    exactLineCount(source, `        run: node ${PROOF_PATH}`),
    1,
    "focused_topology_proof_not_terminal",
  );
  assert.equal(
    exactLineCount(source, "        run: node scripts/prove_ci_diff_hygiene_v1.mjs"),
    1,
    "focused_shared_proof_not_terminal",
  );
  assert.equal(
    exactLineCount(source, "        run: bash scripts/ci_diff_hygiene_v1.sh"),
    1,
    "focused_diff_hygiene_not_terminal",
  );
  rejectFailureTolerance(source, "focused_failure_tolerance_present");
}

function functionSlice(source, startMarker, endMarker, marker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, marker);
  return source.slice(start, end);
}

function executableCodeMask(source) {
  const mask = new Uint8Array(source.length);
  mask.fill(1);
  let state = "code";

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (state === "code") {
      if (char === "/" && next === "/") {
        mask[index] = 0;
        mask[index + 1] = 0;
        index += 1;
        state = "line-comment";
      } else if (char === "/" && next === "*") {
        mask[index] = 0;
        mask[index + 1] = 0;
        index += 1;
        state = "block-comment";
      } else if (char === "'" || char === '"' || char === "`") {
        mask[index] = 0;
        state = char === "'" ? "single-quote" : char === '"' ? "double-quote" : "template";
      }
      continue;
    }

    if (state === "line-comment") {
      mask[index] = 0;
      if (char === "\n") {
        mask[index] = 1;
        state = "code";
      }
      continue;
    }

    if (state === "block-comment") {
      mask[index] = 0;
      if (char === "*" && next === "/") {
        mask[index + 1] = 0;
        index += 1;
        state = "code";
      }
      continue;
    }

    mask[index] = 0;
    if (char === "\\" && index + 1 < source.length) {
      mask[index + 1] = 0;
      index += 1;
      continue;
    }
    if (
      (state === "single-quote" && char === "'") ||
      (state === "double-quote" && char === '"') ||
      (state === "template" && char === "`")
    ) {
      state = "code";
    }
  }

  return mask;
}

function rangeHasExecutableCode(mask, start, length) {
  for (let index = start; index < start + length; index += 1) {
    if (mask[index] === 1) return true;
  }
  return false;
}

function executableExactLineCount(source, exact) {
  const mask = executableCodeMask(source);
  const lines = source.split("\n");
  let offset = 0;
  let count = 0;
  for (const line of lines) {
    if (line === exact && rangeHasExecutableCode(mask, offset, line.length)) count += 1;
    offset += line.length + 1;
  }
  return count;
}

function executableMarkerIndex(body, required, fromIndex = 0) {
  const mask = executableCodeMask(body);
  let index = body.indexOf(required, fromIndex);
  while (index >= 0) {
    if (rangeHasExecutableCode(mask, index, required.length)) return index;
    index = body.indexOf(required, index + 1);
  }
  return -1;
}

function executableRegexIndex(body, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  const mask = executableCodeMask(body);
  for (let match = matcher.exec(body); match; match = matcher.exec(body)) {
    if (rangeHasExecutableCode(mask, match.index, match[0].length)) return match.index;
    if (match[0].length === 0) matcher.lastIndex += 1;
  }
  return -1;
}

function requireBodyMarkers(body, markers, marker) {
  for (const required of markers) {
    assert.ok(executableMarkerIndex(body, required) >= 0, `${marker}:${required}`);
  }
}

function rejectEarlyTrueReturn(body, lastRequired, marker) {
  const firstReturn = executableRegexIndex(body, /\breturn\s+true\s*;/);
  const lastRequiredAt = executableMarkerIndex(body, lastRequired);
  assert.ok(firstReturn > lastRequiredAt && lastRequiredAt >= 0, marker);
}

function rejectLiteralFalseGuard(body, marker) {
  assert.equal(executableRegexIndex(body, /\bif\s*\(\s*false\s*\)\s*\{/), -1, marker);
}

function auditSegstoreProof(source) {
  assert.equal(
    executableExactLineCount(source, "  const existingEquivalentReusePrecedesOutputAllocation ="),
    1,
    "segstore_zero_allocation_adversary_not_bound",
  );
  assert.equal(
    executableExactLineCount(source, "    proveExistingEquivalentReusePrecedesOutputAllocation("),
    1,
    "segstore_zero_allocation_call_not_bound",
  );
  assert.equal(
    executableExactLineCount(source, "  const reconstructionSourceAliasRejected = proveReconstructionRejectsSourceAlias(store);"),
    1,
    "segstore_source_alias_adversary_not_bound",
  );
  assert.equal(
    executableExactLineCount(source, "        existingEquivalentReusePrecedesOutputAllocation,"),
    1,
    "segstore_zero_allocation_terminal_not_derived",
  );
  assert.equal(
    executableExactLineCount(source, "      reconstruction_source_alias_rejected: reconstructionSourceAliasRejected,"),
    1,
    "segstore_source_alias_terminal_not_derived",
  );
  assert.equal(
    exactLineCount(source, "      existing_equivalent_reuse_precedes_output_allocation: true,"),
    0,
    "segstore_zero_allocation_literal_terminal_present",
  );
  assert.equal(
    exactLineCount(source, "      reconstruction_source_alias_rejected: true,"),
    0,
    "segstore_source_alias_literal_terminal_present",
  );

  const zeroAllocationBody = functionSlice(
    source,
    "function proveExistingEquivalentReusePrecedesOutputAllocation(",
    "type ExactFileObservationV1 =",
    "segstore_zero_allocation_body_missing",
  );
  requireBodyMarkers(
    zeroAllocationBody,
    [
      "const published = reconstructSegmentedJsonlV1ToFile(storePath, outputPath);",
      "if ((flags & 0o20200000) === 0o20200000) {",
      'error.code = "ENOSPC";',
      "const recovered = reconstructSegmentedJsonlV1ToFile(storePath, outputPath);",
      "assert.equal(recovered.reused_existing, true);",
      'assert.equal(recovered.publication_terminal, "EXISTING_EQUIVALENT_UNOWNED");',
      "outputAllocationAttempted,",
      "assert.equal(durable.ino, survivor.ino);",
      "assert.deepEqual(fs.readFileSync(outputPath), expectedBytes);",
    ],
    "segstore_zero_allocation_body_not_bound",
  );
  rejectEarlyTrueReturn(
    zeroAllocationBody,
    "assert.deepEqual(fs.readFileSync(outputPath), expectedBytes);",
    "segstore_zero_allocation_early_true_return",
  );
  rejectLiteralFalseGuard(
    zeroAllocationBody,
    "segstore_zero_allocation_literal_false_guard",
  );

  const generationHelperBody = functionSlice(
    source,
    "function assertExactFileObservationUnchangedV1(",
    "function proveReconstructionRejectsSourceAlias(",
    "segstore_generation_helper_body_missing",
  );
  requireBodyMarkers(
    generationHelperBody,
    [
      'assert.equal(after.dev, before.dev, "alias source generation changed:dev");',
      'assert.equal(after.ino, before.ino, "alias source generation changed:ino");',
      'assert.equal(after.size, before.size, "alias source generation changed:size");',
      'assert.equal(after.mtimeNs, before.mtimeNs, "alias source generation changed:mtimeNs");',
      'assert.equal(after.ctimeNs, before.ctimeNs, "alias source generation changed:ctimeNs");',
      'assert.equal(after.mode, before.mode, "alias source generation changed:mode");',
      'assert.equal(after.nlink, before.nlink, "alias source generation changed:nlink");',
    ],
    "segstore_generation_helper_not_bound",
  );

  const sourceAliasBody = functionSlice(
    source,
    "function proveReconstructionRejectsSourceAlias(",
    "function matchesOpenedTarget(",
    "segstore_source_alias_body_missing",
  );
  requireBodyMarkers(
    sourceAliasBody,
    [
      "() => reconstructSegmentedJsonlV1ToFile(storePath, activePath),",
      '"RECONSTRUCT_OUTPUT_ALIASES_SOURCE",',
      "assertExactFileObservationUnchangedV1(before, after);",
      "assert.deepEqual(fs.readFileSync(activePath), beforeBytes);",
      "verifySegmentedJsonlV1(storePath);",
      "fs.chmodSync(mutationWitness, 0o400);",
      "fs.chmodSync(mutationWitness, 0o600);",
      "assert.notEqual(mutationAfter.ctimeNs, mutationBefore.ctimeNs);",
      "() => assertExactFileObservationUnchangedV1(mutationBefore, mutationAfter),",
      "/alias source generation changed:ctimeNs/,",
      "fs.unlinkSync(mutationWitness);",
    ],
    "segstore_source_alias_body_not_bound",
  );
  rejectEarlyTrueReturn(
    sourceAliasBody,
    "fs.unlinkSync(mutationWitness);",
    "segstore_source_alias_early_true_return",
  );
  rejectLiteralFalseGuard(
    sourceAliasBody,
    "segstore_source_alias_literal_false_guard",
  );
}

function auditBaseline(source) {
  assert.equal(
    exactLineCount(source, `node ${PROOF_PATH}`),
    1,
    "baseline_topology_proof_not_terminal",
  );
}

function auditCi(source) {
  assert.equal(
    exactLineCount(source, `        run: bash ${BASELINE_PATH}`),
    1,
    "ci_baseline_caller_not_terminal",
  );
  rejectFailureTolerance(source, "ci_failure_tolerance_present");
}

const focused = readFileSync(path.join(ROOT, FOCUSED_PATH), "utf8");
const baseline = readFileSync(path.join(ROOT, BASELINE_PATH), "utf8");
const ci = readFileSync(path.join(ROOT, CI_PATH), "utf8");
const segstoreProof = readFileSync(path.join(ROOT, SEGSTORE_PROOF_PATH), "utf8");
auditFocused(focused);
auditSegstoreProof(segstoreProof);
auditBaseline(baseline);
auditCi(ci);

const deadScalarTriggerPath = "src/storage/segmented_jsonl_v1.ts";
const deadScalarTriggerLine = `      - "${deadScalarTriggerPath}"\n`;
assert.equal(
  focused.split("\n").filter((line) => line === deadScalarTriggerLine.trimEnd()).length,
  2,
  "focused_dead_scalar_trigger_fixture_count",
);
const deadScalarTriggerMutant = focused
  .replaceAll(deadScalarTriggerLine, "")
  .replace(
    "permissions:",
    `env:
  GRACE_TRIGGER_DECOY: |
      - "${deadScalarTriggerPath}"
      - "${deadScalarTriggerPath}"

permissions:`,
  );
assert.notEqual(deadScalarTriggerMutant, focused, "focused_dead_scalar_trigger_mutant_not_applied");
assert.throws(
  () => auditFocused(deadScalarTriggerMutant),
  /focused_pull_request_trigger_count|focused_push_trigger_count/,
);

const nameBlockScalarTriggerMutant = TRIGGER_DEPENDENCIES.reduce(
  (source, dependency) => source.replaceAll(`      - "${dependency}"\n`, ""),
  focused,
).replace(
  "name: VOID Segmented JSONL V1",
  `name: |
  pull_request:
    paths:
${TRIGGER_DEPENDENCIES.map((dependency) => `      - "${dependency}"`).join("\n")}
  push:
    paths:
${TRIGGER_DEPENDENCIES.map((dependency) => `      - "${dependency}"`).join("\n")}`,
);
assert.notEqual(
  nameBlockScalarTriggerMutant,
  focused,
  "focused_name_block_scalar_trigger_mutant_not_applied",
);
for (const dependency of TRIGGER_DEPENDENCIES) {
  assert.equal(
    exactLineCount(nameBlockScalarTriggerMutant, `      - "${dependency}"`),
    2,
    `focused_name_block_scalar_global_decoy_count:${dependency}`,
  );
}
assert.equal(
  workflowEventPathEntries(nameBlockScalarTriggerMutant, "pull_request").length,
  0,
  "focused_name_block_scalar_live_pull_request_not_empty",
);
assert.equal(
  workflowEventPathEntries(nameBlockScalarTriggerMutant, "push").length,
  0,
  "focused_name_block_scalar_live_push_not_empty",
);
assert.throws(
  () => auditFocused(nameBlockScalarTriggerMutant),
  /focused_pull_request_trigger_count|focused_push_trigger_count/,
);

const withoutInlineAudit = focused.replace(
  /\n      - name: Prove focused workflow dependency closure\n[\s\S]*?(?=\n      - name: Syntax\n)/,
  "\n",
);
assert.notEqual(withoutInlineAudit, focused, "inline_audit_mutant_not_applied");
assert.throws(() => auditFocused(withoutInlineAudit), /focused_inline_audit_step_count/);

const withoutSemanticProof = focused.replace(
  "        run: npx --no-install tsx scripts/prove_segmented_jsonl_v1.ts",
  "        run: node --experimental-strip-types --check scripts/prove_segmented_jsonl_v1.ts",
);
assert.throws(() => auditFocused(withoutSemanticProof), /focused_proof_not_terminal/);

const tolerantFocusedStep = focused.replace(
  "      - name: Prove segmented JSONL store\n        run:",
  "      - name: Prove segmented JSONL store\n        continue-on-error: true\n        run:",
);
assert.throws(() => auditFocused(tolerantFocusedStep), /focused_failure_tolerance_present/);

const tolerantFocusedJob = focused.replace(
  "  proof:\n    name:",
  "  proof:\n    continue-on-error: true\n    name:",
);
assert.throws(() => auditFocused(tolerantFocusedJob), /focused_failure_tolerance_present/);

const tolerantTypecheck = focused.replace(
  "      - name: Repository typecheck\n        if:",
  "      - name: Repository typecheck\n        continue-on-error: true\n        if:",
);
assert.throws(() => auditFocused(tolerantTypecheck), /focused_failure_tolerance_present/);

const withoutZeroAllocationAdversary = segstoreProof.replace(
  "    proveExistingEquivalentReusePrecedesOutputAllocation(",
  "    deletedExistingEquivalentReusePrecedesOutputAllocation(",
);
assert.throws(
  () => auditSegstoreProof(withoutZeroAllocationAdversary),
  /segstore_zero_allocation_call_not_bound/,
);

const commentedZeroAllocationCall = segstoreProof.replace(
  "    proveExistingEquivalentReusePrecedesOutputAllocation(",
  "    deletedExistingEquivalentReusePrecedesOutputAllocation(",
).replace(
  "  const existingEquivalentReusePrecedesOutputAllocation =",
  `/*
    proveExistingEquivalentReusePrecedesOutputAllocation(
*/
  const existingEquivalentReusePrecedesOutputAllocation =`,
);
assert.notEqual(
  commentedZeroAllocationCall,
  segstoreProof,
  "zero_allocation_commented_call_mutant_not_applied",
);
assert.throws(
  () => auditSegstoreProof(commentedZeroAllocationCall),
  /segstore_zero_allocation_call_not_bound/,
);

const literalZeroAllocationTerminal = segstoreProof.replace(
  "        existingEquivalentReusePrecedesOutputAllocation,",
  "      existing_equivalent_reuse_precedes_output_allocation: true,",
);
assert.throws(
  () => auditSegstoreProof(literalZeroAllocationTerminal),
  /segstore_zero_allocation_terminal_not_derived|segstore_zero_allocation_literal_terminal_present/,
);

const withoutSourceAliasAdversary = segstoreProof.replace(
  "  const reconstructionSourceAliasRejected = proveReconstructionRejectsSourceAlias(store);",
  "  const deletedReconstructionSourceAliasRejected = proveReconstructionRejectsSourceAlias(store);",
);
assert.throws(
  () => auditSegstoreProof(withoutSourceAliasAdversary),
  /segstore_source_alias_adversary_not_bound/,
);

const commentedSourceAliasBinding = segstoreProof.replace(
  "  const reconstructionSourceAliasRejected = proveReconstructionRejectsSourceAlias(store);",
  "  const deletedReconstructionSourceAliasRejected = proveReconstructionRejectsSourceAlias(store);",
).replace(
  "  const existingEquivalentReusePrecedesOutputAllocation =",
  `/*
  const reconstructionSourceAliasRejected = proveReconstructionRejectsSourceAlias(store);
*/
  const existingEquivalentReusePrecedesOutputAllocation =`,
);
assert.notEqual(
  commentedSourceAliasBinding,
  segstoreProof,
  "source_alias_commented_binding_mutant_not_applied",
);
assert.throws(
  () => auditSegstoreProof(commentedSourceAliasBinding),
  /segstore_source_alias_adversary_not_bound/,
);

const literalSourceAliasTerminal = segstoreProof.replace(
  "      reconstruction_source_alias_rejected: reconstructionSourceAliasRejected,",
  "      reconstruction_source_alias_rejected: true,",
);
assert.throws(
  () => auditSegstoreProof(literalSourceAliasTerminal),
  /segstore_source_alias_terminal_not_derived|segstore_source_alias_literal_terminal_present/,
);

const noOpZeroAllocationBody = segstoreProof.replace(
  /function proveExistingEquivalentReusePrecedesOutputAllocation\([\s\S]*?type ExactFileObservationV1 =/,
  `function proveExistingEquivalentReusePrecedesOutputAllocation(
  storePath: string,
  outputPath: string,
  expectedBytes: Buffer,
): boolean {
  void storePath;
  void outputPath;
  void expectedBytes;
  return true;
}

type ExactFileObservationV1 =`,
);
assert.notEqual(noOpZeroAllocationBody, segstoreProof, "zero_allocation_noop_mutant_not_applied");
assert.throws(
  () => auditSegstoreProof(noOpZeroAllocationBody),
  /segstore_zero_allocation_body_not_bound/,
);

const earlyZeroAllocationReturn = segstoreProof.replace(
  "): boolean {\n  const published = reconstructSegmentedJsonlV1ToFile(storePath, outputPath);",
  "): boolean {\n  return true;\n  const published = reconstructSegmentedJsonlV1ToFile(storePath, outputPath);",
);
assert.notEqual(earlyZeroAllocationReturn, segstoreProof, "zero_allocation_early_return_mutant_not_applied");
assert.throws(
  () => auditSegstoreProof(earlyZeroAllocationReturn),
  /segstore_zero_allocation_early_true_return/,
);

function wrapFunctionBodyInLiteralFalse(source, startMarker, endMarker, marker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `${marker}_slice_missing`);
  const openBrace = source.indexOf("{", start + startMarker.length);
  const closeBrace = source.lastIndexOf("}", end);
  assert.ok(openBrace > start && closeBrace > openBrace, `${marker}_body_missing`);
  return (
    source.slice(0, openBrace + 1) +
    "\n  if (false) {" +
    source.slice(openBrace + 1, closeBrace) +
    "\n  }\n  return true;\n" +
    source.slice(closeBrace)
  );
}

const literalFalseZeroAllocationBody = wrapFunctionBodyInLiteralFalse(
  segstoreProof,
  "function proveExistingEquivalentReusePrecedesOutputAllocation(",
  "type ExactFileObservationV1 =",
  "zero_allocation_literal_false",
);
assert.notEqual(
  literalFalseZeroAllocationBody,
  segstoreProof,
  "zero_allocation_literal_false_mutant_not_applied",
);
assert.throws(
  () => auditSegstoreProof(literalFalseZeroAllocationBody),
  /segstore_zero_allocation_literal_false_guard/,
);

const literalFalseSourceAliasBody = wrapFunctionBodyInLiteralFalse(
  segstoreProof,
  "function proveReconstructionRejectsSourceAlias(",
  "function matchesOpenedTarget(",
  "source_alias_literal_false",
);
assert.notEqual(
  literalFalseSourceAliasBody,
  segstoreProof,
  "source_alias_literal_false_mutant_not_applied",
);
assert.throws(
  () => auditSegstoreProof(literalFalseSourceAliasBody),
  /segstore_source_alias_literal_false_guard/,
);

const noOpGenerationHelper = segstoreProof.replace(
  /function assertExactFileObservationUnchangedV1\([\s\S]*?function proveReconstructionRejectsSourceAlias\(/,
  `function assertExactFileObservationUnchangedV1(
  before: ExactFileObservationV1,
  after: ExactFileObservationV1,
): void {
  void before;
  void after;
}

function proveReconstructionRejectsSourceAlias(`,
);
assert.notEqual(noOpGenerationHelper, segstoreProof, "generation_helper_noop_mutant_not_applied");
assert.throws(
  () => auditSegstoreProof(noOpGenerationHelper),
  /segstore_generation_helper_not_bound/,
);

const noOpSourceAliasBody = segstoreProof.replace(
  /function proveReconstructionRejectsSourceAlias\([\s\S]*?function matchesOpenedTarget\(/,
  `function proveReconstructionRejectsSourceAlias(storePath: string): boolean {
  void storePath;
  return true;
}

function matchesOpenedTarget(`,
);
assert.notEqual(noOpSourceAliasBody, segstoreProof, "source_alias_noop_mutant_not_applied");
assert.throws(
  () => auditSegstoreProof(noOpSourceAliasBody),
  /segstore_source_alias_body_not_bound/,
);

const earlySourceAliasReturn = segstoreProof.replace(
  "function proveReconstructionRejectsSourceAlias(storePath: string): boolean {\n",
  "function proveReconstructionRejectsSourceAlias(storePath: string): boolean {\n  return true;\n",
);
assert.notEqual(earlySourceAliasReturn, segstoreProof, "source_alias_early_return_mutant_not_applied");
assert.throws(
  () => auditSegstoreProof(earlySourceAliasReturn),
  /segstore_source_alias_early_true_return/,
);

const zeroAllocationDecoyMarkers = [
  "const published = reconstructSegmentedJsonlV1ToFile(storePath, outputPath);",
  "if ((flags & 0o20200000) === 0o20200000) {",
  'error.code = "ENOSPC";',
  "const recovered = reconstructSegmentedJsonlV1ToFile(storePath, outputPath);",
  "assert.equal(recovered.reused_existing, true);",
  'assert.equal(recovered.publication_terminal, "EXISTING_EQUIVALENT_UNOWNED");',
  "outputAllocationAttempted,",
  "assert.equal(durable.ino, survivor.ino);",
  "assert.deepEqual(fs.readFileSync(outputPath), expectedBytes);",
];

const sourceAliasDecoyMarkers = [
  "() => reconstructSegmentedJsonlV1ToFile(storePath, activePath),",
  '"RECONSTRUCT_OUTPUT_ALIASES_SOURCE",',
  "assertExactFileObservationUnchangedV1(before, after);",
  "assert.deepEqual(fs.readFileSync(activePath), beforeBytes);",
  "verifySegmentedJsonlV1(storePath);",
  "fs.chmodSync(mutationWitness, 0o400);",
  "fs.chmodSync(mutationWitness, 0o600);",
  "assert.notEqual(mutationAfter.ctimeNs, mutationBefore.ctimeNs);",
  "() => assertExactFileObservationUnchangedV1(mutationBefore, mutationAfter),",
  "/alias source generation changed:ctimeNs/,",
  "fs.unlinkSync(mutationWitness);",
];

function blockCommentDecoy(markers) {
  return `/*\n${markers.join("\n")}\n*/`;
}

function stringLiteralDecoy(markers) {
  return markers
    .map((required) => `'${required.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}';`)
    .join("\n");
}

function templateLiteralDecoy(markers) {
  const body = markers
    .join("\n")
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${");
  return `\`\n${body}\n\`;`;
}

function zeroAllocationDecoyProof(decoyBody) {
  return segstoreProof.replace(
    /function proveExistingEquivalentReusePrecedesOutputAllocation\([\s\S]*?type ExactFileObservationV1 =/,
    `function proveExistingEquivalentReusePrecedesOutputAllocation(
  storePath: string,
  outputPath: string,
  expectedBytes: Buffer,
): boolean {
  void storePath;
  void outputPath;
  void expectedBytes;
  ${decoyBody}
  return true;
}

type ExactFileObservationV1 =`,
  );
}

function sourceAliasDecoyProof(decoyBody) {
  return segstoreProof.replace(
    /function proveReconstructionRejectsSourceAlias\([\s\S]*?function matchesOpenedTarget\(/,
    `function proveReconstructionRejectsSourceAlias(storePath: string): boolean {
  void storePath;
  ${decoyBody}
  return true;
}

function matchesOpenedTarget(`,
  );
}

let decoyMutantFamiliesExecuted = 0;
for (const [name, decoy] of [
  ["block_comment", blockCommentDecoy],
  ["string_literal", stringLiteralDecoy],
  ["template_literal", templateLiteralDecoy],
]) {
  const zeroAllocationDecoy = zeroAllocationDecoyProof(decoy(zeroAllocationDecoyMarkers));
  assert.notEqual(
    zeroAllocationDecoy,
    segstoreProof,
    `zero_allocation_${name}_decoy_mutant_not_applied`,
  );
  assert.throws(
    () => auditSegstoreProof(zeroAllocationDecoy),
    /segstore_zero_allocation_body_not_bound/,
  );

  const sourceAliasDecoy = sourceAliasDecoyProof(decoy(sourceAliasDecoyMarkers));
  assert.notEqual(sourceAliasDecoy, segstoreProof, `source_alias_${name}_decoy_mutant_not_applied`);
  assert.throws(
    () => auditSegstoreProof(sourceAliasDecoy),
    /segstore_source_alias_body_not_bound/,
  );
  decoyMutantFamiliesExecuted += 1;
}
assert.equal(
  decoyMutantFamiliesExecuted,
  3,
  "segstore_decoy_mutant_execution_count",
);

const withoutBaselineInvocation = baseline.replace(`node ${PROOF_PATH}`, `node --check ${PROOF_PATH}`);
assert.throws(() => auditBaseline(withoutBaselineInvocation), /baseline_topology_proof_not_terminal/);

const withoutCiCaller = ci.replace(
  `        run: bash ${BASELINE_PATH}`,
  `        run: bash -n ${BASELINE_PATH}`,
);
assert.throws(() => auditCi(withoutCiCaller), /ci_baseline_caller_not_terminal/);

const tolerantCiCaller = ci.replace(
  "      - name: Typecheck (no emit)\n        run:",
  "      - name: Typecheck (no emit)\n        continue-on-error: true\n        run:",
);
assert.throws(() => auditCi(tolerantCiCaller), /ci_failure_tolerance_present/);

console.log("VOID_SEGMENTED_JSONL_CI_TOPOLOGY_V1_GREEN");
console.log("focused_trigger_closure_bound=true");
console.log("focused_trigger_dead_scalar_relocation_rejected=true");
console.log("focused_trigger_name_block_scalar_decoy_rejected=true");
console.log("focused_semantic_proofs_terminal=true");
console.log("focused_failure_tolerance_rejected=true");
console.log("independent_repository_ci_caller_bound=true");
console.log("repository_ci_failure_tolerance_rejected=true");
console.log("topology_proof_self_deletion_rejected=true");
console.log("segstore_acceptance_terminal_call_deletion_rejected=true");
console.log("segstore_commented_outer_binding_rejected=true");
console.log("segstore_terminal_literal_true_rejected=true");
console.log("segstore_adversary_body_noop_rejected=true");
console.log("segstore_adversary_early_return_rejected=true");
console.log("segstore_literal_false_guard_rejected=true");
console.log("segstore_dead_comment_marker_decoys_rejected=true");
console.log("segstore_string_literal_marker_decoys_rejected=true");
console.log("segstore_template_literal_marker_decoys_rejected=true");
console.log(`segstore_decoy_mutant_families_executed=${decoyMutantFamiliesExecuted}`);
console.log("segstore_exact_generation_helper_noop_rejected=true");
