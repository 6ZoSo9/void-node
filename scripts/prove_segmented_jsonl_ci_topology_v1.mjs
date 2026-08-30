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

function rejectFailureTolerance(source, marker) {
  assert.ok(!/^\s*continue-on-error:\s*true\s*$/m.test(source), marker);
}

function auditFocused(source) {
  for (const dependency of TRIGGER_DEPENDENCIES) {
    const count = exactLineCount(source, `      - "${dependency}"`);
    assert.equal(count, 2, `focused_trigger_count:${dependency}:${count}`);
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

function auditSegstoreProof(source) {
  assert.equal(
    exactLineCount(source, "  const existingEquivalentReusePrecedesOutputAllocation ="),
    1,
    "segstore_zero_allocation_adversary_not_bound",
  );
  assert.equal(
    exactLineCount(source, "    proveExistingEquivalentReusePrecedesOutputAllocation("),
    1,
    "segstore_zero_allocation_call_not_bound",
  );
  assert.equal(
    exactLineCount(source, "  const reconstructionSourceAliasRejected = proveReconstructionRejectsSourceAlias(store);"),
    1,
    "segstore_source_alias_adversary_not_bound",
  );
  assert.equal(
    exactLineCount(source, "        existingEquivalentReusePrecedesOutputAllocation,"),
    1,
    "segstore_zero_allocation_terminal_not_derived",
  );
  assert.equal(
    exactLineCount(source, "      reconstruction_source_alias_rejected: reconstructionSourceAliasRejected,"),
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

const literalSourceAliasTerminal = segstoreProof.replace(
  "      reconstruction_source_alias_rejected: reconstructionSourceAliasRejected,",
  "      reconstruction_source_alias_rejected: true,",
);
assert.throws(
  () => auditSegstoreProof(literalSourceAliasTerminal),
  /segstore_source_alias_terminal_not_derived|segstore_source_alias_literal_terminal_present/,
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
console.log("focused_semantic_proofs_terminal=true");
console.log("focused_failure_tolerance_rejected=true");
console.log("independent_repository_ci_caller_bound=true");
console.log("repository_ci_failure_tolerance_rejected=true");
console.log("topology_proof_self_deletion_rejected=true");
console.log("segstore_acceptance_terminal_call_deletion_rejected=true");
console.log("segstore_terminal_literal_true_rejected=true");
