#!/usr/bin/env node

import assert, { throws as assertThrows } from "node:assert/strict";
import { createHash } from "node:crypto";
import ts from "typescript";
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

function workflowOnRange(source) {
  const lines = source.split("\n");
  const onRoots = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === "on:") onRoots.push(index);
  }
  assert.equal(onRoots.length, 1, `focused_on_root_count:${onRoots.length}`);
  const start = onRoots[0];
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\S/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return { lines, start, end };
}

function workflowEventRange(source, eventName) {
  const root = workflowOnRange(source);
  const eventLine = `  ${eventName}:`;
  const matches = [];
  for (let index = root.start + 1; index < root.end; index += 1) {
    if (root.lines[index] === eventLine) matches.push(index);
  }
  assert.equal(matches.length, 1, `focused_${eventName}_event_count:${matches.length}`);
  const start = matches[0];
  let end = root.end;
  for (let index = start + 1; index < root.end; index += 1) {
    if (/^  \S/.test(root.lines[index])) {
      end = index;
      break;
    }
  }
  return { lines: root.lines, start, end };
}

function parseWorkflowMappingKey(line, indentation, marker) {
  const prefix = " ".repeat(indentation);
  if (!line.startsWith(prefix) || line.startsWith(`${prefix} `)) return null;
  const candidate = line.slice(indentation);
  if (candidate === "" || candidate.startsWith("#")) return null;
  for (const pattern of [
    /^([A-Za-z0-9_-]+):/,
    /^"([A-Za-z0-9_-]+)":/,
    /^'([A-Za-z0-9_-]+)':/,
  ]) {
    const match = pattern.exec(candidate);
    if (match) return match[1];
  }
  assert.fail(`${marker}:${candidate}`);
}

function workflowEventMappingKeys(source, eventName) {
  const event = workflowEventRange(source, eventName);
  const keys = [];
  for (let index = event.start + 1; index < event.end; index += 1) {
    const key = parseWorkflowMappingKey(
      event.lines[index],
      4,
      `focused_${eventName}_mapping_key_not_exact`,
    );
    if (key !== null) keys.push(key);
  }
  return keys;
}

function parseWorkflowSequenceScalar(line, marker) {
  let match = /^      - "([^"]+)"$/.exec(line);
  if (match) return match[1];
  match = /^      - '([^']+)'$/.exec(line);
  if (match) return match[1];
  match = /^      - ([^"'#][^#]*?)\s*$/.exec(line);
  assert.ok(match, `${marker}:${line.trim()}`);
  return match[1];
}

function workflowEventSequenceEntries(source, eventName, sequenceName) {
  const event = workflowEventRange(source, eventName);
  const sequenceLine = `    ${sequenceName}:`;
  const matches = [];
  for (let index = event.start + 1; index < event.end; index += 1) {
    if (event.lines[index] === sequenceLine) matches.push(index);
  }
  assert.equal(
    matches.length,
    1,
    `focused_${eventName}_${sequenceName}_count:${matches.length}`,
  );
  const start = matches[0];
  let end = event.end;
  for (let index = start + 1; index < event.end; index += 1) {
    if (/^    \S/.test(event.lines[index])) {
      end = index;
      break;
    }
  }
  const entries = [];
  for (let index = start + 1; index < end; index += 1) {
    const line = event.lines[index];
    if (line.trim() === "" || /^\s*#/.test(line)) continue;
    entries.push(
      parseWorkflowSequenceScalar(
        line,
        `focused_${eventName}_${sequenceName}_scalar_not_exact`,
      ),
    );
  }
  return entries;
}

function workflowEventPathEntries(source, eventName) {
  const entries = workflowEventSequenceEntries(source, eventName, "paths");
  for (const entry of entries) {
    assert.ok(
      !entry.startsWith("!"),
      `focused_${eventName}_negative_path_pattern:${entry}`,
    );
  }
  return entries;
}

function auditFocusedEventContract(source) {
  assert.deepEqual(
    workflowEventMappingKeys(source, "pull_request"),
    ["paths"],
    "focused_pull_request_mapping_keys_not_exact",
  );
  assert.deepEqual(
    workflowEventMappingKeys(source, "push"),
    ["branches", "paths"],
    "focused_push_mapping_keys_not_exact",
  );
  assert.deepEqual(
    workflowEventSequenceEntries(source, "push", "branches"),
    ["main"],
    "focused_push_main_branch_not_exact",
  );
}

function workflowProofJobRange(source) {
  const lines = source.split("\n");
  const jobsRoots = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === "jobs:") jobsRoots.push(index);
  }
  assert.equal(jobsRoots.length, 1, `focused_jobs_root_count:${jobsRoots.length}`);
  const matches = [];
  for (let index = jobsRoots[0] + 1; index < lines.length; index += 1) {
    if (lines[index] === "  proof:") matches.push(index);
  }
  assert.equal(matches.length, 1, `focused_proof_job_count:${matches.length}`);
  const start = matches[0];
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  \S/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return { lines, start, end };
}

function workflowMappingKeysInRange(lines, start, end, indentation, marker) {
  const keys = [];
  for (let index = start + 1; index < end; index += 1) {
    const key = parseWorkflowMappingKey(lines[index], indentation, marker);
    if (key !== null) keys.push(key);
  }
  return keys;
}

function workflowChildMappingRange(lines, parentStart, parentEnd, parentLine, indentation, marker) {
  const matches = [];
  for (let index = parentStart + 1; index < parentEnd; index += 1) {
    if (lines[index] === parentLine) matches.push(index);
  }
  assert.equal(matches.length, 1, `${marker}_count:${matches.length}`);
  const start = matches[0];
  let end = parentEnd;
  for (let index = start + 1; index < parentEnd; index += 1) {
    if (parseWorkflowMappingKey(lines[index], indentation, `${marker}_sibling_key_not_exact`) !== null) {
      end = index;
      break;
    }
  }
  return { lines, start, end };
}

function auditFocusedStrategyContract(source) {
  const job = workflowProofJobRange(source);
  assert.deepEqual(
    workflowMappingKeysInRange(
      job.lines,
      job.start,
      job.end,
      4,
      "focused_proof_job_mapping_key_not_exact",
    ),
    ["name", "runs-on", "timeout-minutes", "strategy", "steps"],
    "focused_proof_job_mapping_keys_not_exact",
  );
  const strategy = workflowChildMappingRange(
    job.lines,
    job.start,
    job.end,
    "    strategy:",
    4,
    "focused_strategy",
  );
  assert.deepEqual(
    workflowMappingKeysInRange(
      strategy.lines,
      strategy.start,
      strategy.end,
      6,
      "focused_strategy_mapping_key_not_exact",
    ),
    ["fail-fast", "matrix"],
    "focused_strategy_mapping_keys_not_exact",
  );
  assert.equal(
    strategy.lines.slice(strategy.start + 1, strategy.end).filter((line) => line === "      fail-fast: false").length,
    1,
    "focused_fail_fast_not_exact",
  );
  const matrix = workflowChildMappingRange(
    strategy.lines,
    strategy.start,
    strategy.end,
    "      matrix:",
    6,
    "focused_matrix",
  );
  assert.deepEqual(
    workflowMappingKeysInRange(
      matrix.lines,
      matrix.start,
      matrix.end,
      8,
      "focused_matrix_mapping_key_not_exact",
    ),
    ["node"],
    "focused_matrix_mapping_keys_not_exact",
  );
  assert.equal(
    matrix.lines.slice(matrix.start + 1, matrix.end).filter((line) => line === "        node: [22, 24, 26]").length,
    1,
    "focused_node_matrix_not_exact",
  );
}

function auditFocusedRootContract(source) {
  const lines = source.split("\n");
  const keys = [];
  for (const line of lines) {
    const key = parseWorkflowMappingKey(line, 0, "focused_root_mapping_key_not_exact");
    if (key !== null) keys.push(key);
  }
  assert.deepEqual(
    keys,
    ["name", "on", "permissions", "concurrency", "jobs"],
    "focused_root_mapping_keys_not_exact",
  );
}

function workflowStepRanges(source) {
  const job = workflowProofJobRange(source);
  const stepMarkers = [];
  for (let i = job.start; i < job.end; i += 1) {
    if (job.lines[i] === "    steps:") stepMarkers.push(i);
  }
  assert.equal(stepMarkers.length, 1, "focused_steps_mapping_count");
  const starts = [];
  for (let i = stepMarkers[0] + 1; i < job.end; i += 1) {
    if (/^      - /.test(job.lines[i])) starts.push(i);
  }
  return starts.map((start, index) => {
    const match = /^      - name: (.+)$/.exec(job.lines[start]);
    assert.ok(match, `focused_step_name_not_exact:${start}`);
    return {
      lines: job.lines,
      start,
      end: starts[index + 1] ?? job.end,
      name: match[1],
    };
  });
}

function workflowStepMappingKeys(step) {
  const keys = ["name"];
  for (let i = step.start + 1; i < step.end; i += 1) {
    const key = parseWorkflowMappingKey(
      step.lines[i],
      8,
      `focused_step_mapping_key_not_exact:${step.name}`,
    );
    if (key !== null) keys.push(key);
  }
  return keys;
}

function auditFocusedStepContract(source) {
  const expected = [
    ["Checkout exact revision", ["name", "uses", "with"]],
    ["Use Node.js ${{ matrix.node }}", ["name", "uses", "with"]],
    ["Install reviewed dependencies", ["name", "run"]],
    ["Prove focused workflow dependency closure", ["name", "run"]],
    ["Syntax", ["name", "run"]],
    ["Prove segmented JSONL store", ["name", "run"]],
    ["Prove delimiter-inclusive segment ceiling", ["name", "run"]],
    ["Prove writer-reader manifest publication ceiling", ["name", "run"]],
    ["Prove retained parent namespace authority", ["name", "run"]],
    ["Prove manifest framing and terminal tree generation authority", ["name", "run"]],
    ["Prove builder record-vector heap bound", ["name", "run"]],
    ["Prove content-addressed snapshot and checkpoint authority", ["name", "run"]],
    ["Prove exact materialized snapshot generation authority", ["name", "run"]],
    ["Prove materialized append-only checkpoint continuity", ["name", "run"]],
    ["Prove bounded append-only checkpoint consumption", ["name", "run"]],
    ["Prove checkpoint admission bound", ["name", "run"]],
    ["Prove checkpoint chain lifetime bound", ["name", "run"]],
    ["Prove post-durable close terminal truth", ["name", "run"]],
    ["Prove bounded durable checkpoint/root consumer authority", ["name", "run"]],
    ["Repository typecheck", ["name", "if", "run"]],
    ["Repository build", ["name", "if", "run"]],
    ["Prove independent SegStore CI topology", ["name", "run"]],
    ["Prove committed-range diff hygiene contract", ["name", "run"]],
    ["Committed-range diff hygiene", ["name", "if", "env", "run"]],
  ];
  const steps = workflowStepRanges(source);
  assert.equal(steps.length, expected.length, "focused_step_count_not_exact");
  for (let i = 0; i < expected.length; i += 1) {
    const [name, keys] = expected[i];
    assert.equal(steps[i].name, name, `focused_step_name_not_exact:${i}`);
    assert.deepEqual(
      workflowStepMappingKeys(steps[i]),
      keys,
      `focused_step_mapping_keys_not_exact:${name}`,
    );
  }
}

function workflowNamedStepLines(source, stepName) {
  const matches = workflowStepRanges(source).filter((step) => step.name === stepName);
  assert.equal(matches.length, 1, `focused_named_step_count:${stepName}:${matches.length}`);
  const lines = matches[0].lines.slice(matches[0].start, matches[0].end);
  while (lines.at(-1) === "") lines.pop();
  return lines;
}

function auditFocusedCriticalStepBlocks(source) {
  const exactStep = (stepName, expected, marker) => {
    assert.deepEqual(workflowNamedStepLines(source, stepName), expected, marker);
  };
  exactStep("Checkout exact revision", [
    "      - name: Checkout exact revision",
    "        uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6",
    "        with:",
    "          fetch-depth: 1",
    "          persist-credentials: false",
  ], "focused_checkout_block_not_exact");
  exactStep("Use Node.js ${{ matrix.node }}", [
    "      - name: Use Node.js ${{ matrix.node }}",
    "        uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6",
    "        with:",
    "          node-version: ${{ matrix.node }}",
  ], "focused_setup_node_block_not_exact");
  exactStep("Install reviewed dependencies", [
    "      - name: Install reviewed dependencies",
    "        run: |",
    "          test \"$(node -p 'process.versions.node.split(\".\")[0]')\" = \"${{ matrix.node }}\"",
    "          npm ci",
  ], "focused_runtime_major_assertion_not_exact");
  const hygieneBlock = [
    "      - name: Committed-range diff hygiene",
    "        if: github.event_name == 'pull_request' || github.event_name == 'push'",
    "        env:",
    "          CI_DIFF_EVENT_NAME: ${{ github.event_name }}",
    "          CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}",
    "          CI_DIFF_PUSH_BEFORE_SHA: ${{ github.event.before }}",
    "          CI_DIFF_CURRENT_SHA: ${{ github.event.pull_request.head.sha || github.sha }}",
    "          CI_DIFF_CHECKOUT_SHA: ${{ github.sha }}",
    "          CI_DIFF_BASE_REMOTE: ${{ github.server_url }}/${{ github.repository }}.git",
    "          CI_DIFF_HEAD_REMOTE: ${{ github.server_url }}/${{ github.event.pull_request.head.repo.full_name || github.repository }}.git",
    "        run: bash scripts/ci_diff_hygiene_v1.sh",
  ];
  assert.deepEqual(
    workflowNamedStepLines(source, "Committed-range diff hygiene"),
    hygieneBlock,
    "focused_hygiene_block_not_exact",
  );
}
function rejectFailureTolerance(source, marker) {
  assert.ok(
    !/^\s*(?:continue-on-error|"continue-on-error"|'continue-on-error')\s*:/m.test(source),
    marker,
  );
}

function auditFocused(source) {
  rejectFailureTolerance(source, "focused_failure_tolerance_present");
  const inlineAuditBody = workflowNamedStepLines(
    source,
    "Prove focused workflow dependency closure",
  ).join("\n");
  const inlineNodeSource = workflowInlineNodeSource(inlineAuditBody);
  assert.equal(
    topLevelCallCount(
      inlineNodeSource,
      "auditTopologyMeasurementMutantExecution",
      "focused_inline_node_parse_failed",
    ),
    1,
    "focused_topology_measurement_mutant_caller_not_top_level",
  );
  rejectLiteralFalseGuard(
    inlineAuditBody,
    "focused_topology_measurement_mutant_caller_literal_false_guard",
  );
  requireBodyMarkers(
    inlineAuditBody,
    [
      "function topologyExecutableRegexIndex(source, pattern) {",
      "const ts = require('typescript');",
      "const { createHash } = require('node:crypto');",
      "function topologyTopLevelVariableDeclarationCount(sourceFile, name, initializer) {",
      "function topologyMeasurementPayloadDigest(sourceFile, element) {",
      "function topologyNamedThrowsImportCount(sourceFile) {",
      "function topologyRejectionAuthorityMutationCount(sourceFile) {",
      "function genericMeasurementPayloadMutant(source) {",
      "console.log('focused_topology_measurement_mutant_payload_digests_bound=true');",
      "console.log('focused_topology_measurement_rejection_authority_immutable=true');",
      "console.log('focused_topology_measurement_mutant_values_distinct=true');",
      "'focused_topology_measurement_mutant_literal_false_guard',",
      "const unreachableTopologyMeasurementMutantExecution = topologyText",
      "() => auditTopologyMeasurementMutantExecution(unreachableTopologyMeasurementMutantExecution),",
      "const genericPayloadTopologyMeasurementMutants =",
      "const mutableRejectionTopologyMeasurementMutants = topologyText.replace(",
    ],
    "focused_topology_measurement_reachability_wall_not_bound",
  );
  for (const [line, marker] of [
    [
      "          const topologyPath = 'scripts/prove_segmented_jsonl_ci_topology_v1.mjs';",
      "focused_topology_measurement_path_not_bound",
    ],
    [
      "          const topologyText = fs.readFileSync(topologyPath, 'utf8');",
      "focused_topology_measurement_source_not_bound",
    ],
    [
      "          auditTopologyMeasurementMutantExecution(topologyText);",
      "focused_topology_measurement_mutant_caller_not_bound",
    ],
  ]) {
    assert.equal(exactLineCount(source, line), 1, marker);
  }
  auditFocusedRootContract(source);
  auditFocusedStepContract(source);
  auditFocusedCriticalStepBlocks(source);
  auditFocusedEventContract(source);
  auditFocusedStrategyContract(source);
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

function parseJavaScriptSource(source, fileName, marker) {
  const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0, marker);
  return parsed;
}

function workflowInlineNodeSource(stepBody) {
  const lines = stepBody.split("\n");
  const start = lines.indexOf("          node <<'NODE'");
  const end = lines.indexOf("          NODE", start + 1);
  assert.ok(start >= 0 && end > start, "focused_inline_node_heredoc_missing");
  const body = lines.slice(start + 1, end);
  for (const line of body) {
    assert.ok(line === "" || line.startsWith("          "), "focused_inline_node_indent_not_exact");
  }
  return body.map((line) => line.slice(10)).join("\n");
}

function topLevelCallCount(source, calleeName, marker) {
  const parsed = parseJavaScriptSource(source, "focused-inline-audit.js", marker);
  return parsed.statements.filter((statement) =>
    ts.isExpressionStatement(statement) &&
    ts.isCallExpression(statement.expression) &&
    ts.isIdentifier(statement.expression.expression) &&
    statement.expression.expression.text === calleeName
  ).length;
}

const topologyMeasurementMutantSpecs = [
  ["literal_false_helper", "01b7909c2fbdf782c5a797f0c72ea20ad059804f2fd5fe5bbdd8f370913152c5"],
  ["hard_coded_helper", "e209c85c901e02d3ca3cfa499649f92f28179c0805ea6b61cef3820978c9e4c8"],
  ["deleted_production_reconstruction", "4034ba385bce11ddb053d67567cbc562970ce61e33a6bdad378e130fb67af62f"],
  ["deleted_source_read_accounting", "4e4015548a57b53e9286df826018f73ed0564ea6d35c98f3fb92c5e265d01292"],
  ["preloaded_measurement_results", "ead2799cc67ed087e8a46f953d26562118f61eee924ebaa3809e6a9e57fa936e"],
  ["literal_pass_terminals", "7ace875f1748c20652dd9296d3e3304c09cee778573763f52ceb1a825c889078"],
  ["deleted_acceptance_assertions", "5a64addd25204e52b7ef0c1e2797317510cea4cdce98f913641252eddee0f8f9"],
  ["weakened_acceptance_expectations", "c89326a819d7dc076f3484283346f3735cf6c6ae52b897712c9b861017c478bb"],
];

function topologyMeasurementPayloadDigest(sourceFile, element) {
  return createHash("sha256")
    .update(
      `${element.elements[1].getText(sourceFile)}\n---EXPECTED---\n${element.elements[2].getText(sourceFile)}`,
    )
    .digest("hex");
}

function topologyTopLevelMeasurementArrayCount(sourceFile) {
  return sourceFile.statements.filter((statement) => {
    if (!ts.isVariableStatement(statement)) return false;
    if (statement.declarationList.declarations.length !== 1) return false;
    const declaration = statement.declarationList.declarations[0];
    if (
      !ts.isIdentifier(declaration.name) ||
      declaration.name.text !== "reconstructionMeasurementMutants" ||
      !declaration.initializer ||
      !ts.isArrayLiteralExpression(declaration.initializer) ||
      declaration.initializer.elements.length !== topologyMeasurementMutantSpecs.length
    ) return false;
    const specs = declaration.initializer.elements.map((element) => {
      if (!ts.isArrayLiteralExpression(element) || element.elements.length !== 3) return null;
      const family = element.elements[0];
      if (!ts.isStringLiteral(family)) return null;
      return [family.text, topologyMeasurementPayloadDigest(sourceFile, element)];
    });
    return (
      specs.every(
        (spec, index) =>
          spec !== null &&
          spec[0] === topologyMeasurementMutantSpecs[index][0] &&
          spec[1] === topologyMeasurementMutantSpecs[index][1],
      ) &&
      new Set(specs.map((spec) => spec?.[0])).size === topologyMeasurementMutantSpecs.length
    );
  }).length;
}

function topologyNamedThrowsImportCount(sourceFile) {
  return sourceFile.statements.filter((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== "node:assert/strict"
    ) return false;
    const clause = statement.importClause;
    if (
      !clause ||
      !clause.name ||
      clause.name.text !== "assert" ||
      !clause.namedBindings ||
      !ts.isNamedImports(clause.namedBindings) ||
      clause.namedBindings.elements.length !== 1
    ) return false;
    const imported = clause.namedBindings.elements[0];
    return (
      imported.propertyName?.text === "throws" &&
      imported.name.text === "assertThrows"
    );
  }).length;
}

function topologyRejectionAuthorityMutationCount(sourceFile) {
  let count = 0;
  const isAuthority = (node) =>
    (ts.isIdentifier(node) && node.text === "assertThrows") ||
    (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "assert" &&
      node.name.text === "throws"
    );
  const visit = (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      isAuthority(node.left)
    ) count += 1;
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      isAuthority(node.operand)
    ) count += 1;
    if (ts.isDeleteExpression(node) && isAuthority(node.expression)) count += 1;
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const callee = node.expression.getText(sourceFile);
      const target = node.arguments[0];
      if (
        ["Object.defineProperty", "Reflect.defineProperty", "Object.assign"].includes(callee) &&
        (
          isAuthority(target) ||
          (ts.isIdentifier(target) && target.text === "assert")
        )
      ) count += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return count;
}

function topologyTopLevelMeasurementSetCount(sourceFile) {
  return sourceFile.statements.filter((statement) => {
    if (!ts.isVariableStatement(statement)) return false;
    if (statement.declarationList.declarations.length !== 1) return false;
    const declaration = statement.declarationList.declarations[0];
    return (
      ts.isIdentifier(declaration.name) &&
      declaration.name.text === "reconstructionMeasurementMutantValues" &&
      declaration.initializer?.getText(sourceFile) === [
        "new Set(",
        "  reconstructionMeasurementMutants.map(([, mutant]) => mutant),",
        ")",
      ].join("\n")
    );
  }).length;
}

function topologyTopLevelMeasurementDistinctAssertionCount(sourceFile) {
  return sourceFile.statements.filter((statement) => {
    if (!ts.isExpressionStatement(statement)) return false;
    const text = statement.getText(sourceFile);
    return (
      text.startsWith("assert.equal(") &&
      text.includes("reconstructionMeasurementMutantValues.size,") &&
      text.includes("\n  8,\n") &&
      text.includes("segstore_reconstruction_measurement_mutant_values_not_unique")
    );
  }).length;
}

function topologyTopLevelMeasurementLoopCount(sourceFile) {
  return sourceFile.statements.filter((statement) => {
    if (!ts.isForOfStatement(statement) || !ts.isBlock(statement.statement)) return false;
    const body = statement.statement.statements;
    return (
      statement.initializer.getText(sourceFile) === "const [family, mutant, expected]" &&
      statement.expression.getText(sourceFile) === "reconstructionMeasurementMutants" &&
      body.length === 3 &&
      body[1].getText(sourceFile) ===
        "assertThrows(() => auditSegstoreProof(mutant), expected);" &&
      body[2].getText(sourceFile) ===
        "reconstructionMeasurementMutantsExecuted += 1;"
    );
  }).length;
}

function auditTopologyMeasurementMutantAuthority(source) {
  const sourceFile = parseJavaScriptSource(
    source,
    "segstore-topology-authority.mjs",
    "topology_measurement_mutant_parse_failed",
  );
  assert.equal(
    topologyTopLevelMeasurementArrayCount(sourceFile),
    1,
    "topology_measurement_mutant_payload_digest_not_exact",
  );
  assert.equal(
    topologyNamedThrowsImportCount(sourceFile),
    1,
    "topology_measurement_named_throws_import_not_exact",
  );
  assert.equal(
    topologyRejectionAuthorityMutationCount(sourceFile),
    0,
    "topology_measurement_rejection_authority_mutated",
  );
  assert.equal(
    topologyTopLevelMeasurementSetCount(sourceFile),
    1,
    "topology_measurement_mutant_value_set_not_exact",
  );
  assert.equal(
    topologyTopLevelMeasurementDistinctAssertionCount(sourceFile),
    1,
    "topology_measurement_mutant_distinct_assertion_not_exact",
  );
  assert.equal(
    topologyTopLevelMeasurementLoopCount(sourceFile),
    1,
    "topology_measurement_mutant_loop_authority_not_exact",
  );
}

function genericMeasurementPayloadMutant(source) {
  const sourceFile = parseJavaScriptSource(
    source,
    "segstore-topology-generic-payload.mjs",
    "topology_measurement_generic_payload_parse_failed",
  );
  const edits = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        declaration.name.text !== "reconstructionMeasurementMutants" ||
        !declaration.initializer ||
        !ts.isArrayLiteralExpression(declaration.initializer)
      ) continue;
      for (const element of declaration.initializer.elements) {
        assert.ok(
          ts.isArrayLiteralExpression(element) && element.elements.length === 3,
          "topology_measurement_generic_payload_tuple_not_exact",
        );
        edits.push({
          start: element.elements[1].getStart(sourceFile),
          end: element.elements[2].end,
          replacement: '"not-the-segstore-proof", /.*/',
        });
      }
    }
  }
  assert.equal(edits.length, 8, "topology_measurement_generic_payload_edit_count");
  let mutant = source;
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    mutant = mutant.slice(0, edit.start) + edit.replacement + mutant.slice(edit.end);
  }
  return mutant;
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

  const measurementBody = functionSlice(
    source,
    "function measureReconstructionSourceReadsV1(",
    "function proveUncertainExactFdLinkConverges(",
    "segstore_reconstruction_measurement_body_missing",
  );
  requireBodyMarkers(
    measurementBody,
    [
      "const manifest = readSegmentedJsonlManifestV1(storePath);",
      "const trackedFds = new Set<number>();",
      "const originalOpenSync = (mutableFs as any).openSync;",
      "const originalReadSync = (mutableFs as any).readSync;",
      "const originalCloseSync = (mutableFs as any).closeSync;",
      "let sourceBytesRead = 0;",
      "if (sourceGenerations.has(`${stat.dev}:${stat.ino}`)) trackedFds.add(fd);",
      "if (trackedFds.has(Number(args[0])) && Number(count) > 0) sourceBytesRead += Number(count);",
      "const result = reconstructSegmentedJsonlV1ToFile(storePath, outputPath);",
      "return { sourceBytesRead, reusedExisting: result.reused_existing };",
      "(mutableFs as any).openSync = originalOpenSync;",
      "(mutableFs as any).readSync = originalReadSync;",
      "(mutableFs as any).closeSync = originalCloseSync;",
    ],
    "segstore_reconstruction_measurement_body_not_bound",
  );
  rejectLiteralFalseGuard(
    measurementBody,
    "segstore_reconstruction_measurement_literal_false_guard",
  );
  assert.equal(
    executableExactLineCount(
      source,
      '  const newOutputPasses = measureReconstructionSourceReadsV1(store, reconstructionPassOutput);',
    ),
    1,
    "segstore_reconstruction_new_output_measurement_call_not_bound",
  );
  assert.equal(
    executableExactLineCount(
      source,
      '  const existingOutputPasses = measureReconstructionSourceReadsV1(store, reconstructionPassOutput);',
    ),
    1,
    "segstore_reconstruction_survivor_measurement_call_not_bound",
  );
  const measurementAcceptanceBody = functionSlice(
    source,
    "  const newOutputPasses = measureReconstructionSourceReadsV1(store, reconstructionPassOutput);",
    '  const wrongModeOutput = path.join(tmp, "reconstruct-equivalent-wrong-mode.jsonl");',
    "segstore_reconstruction_measurement_acceptance_missing",
  );
  requireBodyMarkers(
    measurementAcceptanceBody,
    [
      "assert.equal(newOutputPasses.reusedExisting, false);",
      "assert.equal(\n    newOutputPasses.sourceBytesRead,\n    body.length * 2,",
      "assert.equal(existingOutputPasses.reusedExisting, true);",
      "assert.equal(\n    existingOutputPasses.sourceBytesRead,\n    body.length,",
      "assert.equal(Number.isSafeInteger(reconstructionNewOutputSourcePasses), true);",
      "assert.equal(Number.isSafeInteger(reconstructionExactSurvivorSourcePasses), true);",
      "assert.equal(\n    reconstructionNewOutputSourcePasses,\n    2,",
      "assert.equal(\n    reconstructionExactSurvivorSourcePasses,\n    1,",
    ],
    "segstore_reconstruction_measurement_acceptance_not_bound",
  );
  rejectLiteralFalseGuard(
    measurementAcceptanceBody,
    "segstore_reconstruction_measurement_acceptance_literal_false_guard",
  );
  for (const [line, marker] of [
    [
      "    newOutputPasses.sourceBytesRead / body.length;",
      "segstore_reconstruction_new_output_measurement_result_not_bound",
    ],
    [
      "    existingOutputPasses.sourceBytesRead / body.length;",
      "segstore_reconstruction_survivor_measurement_result_not_bound",
    ],
    [
      "      reconstruction_new_output_source_passes: reconstructionNewOutputSourcePasses,",
      "segstore_reconstruction_new_output_terminal_not_derived",
    ],
    [
      "      reconstruction_exact_survivor_source_passes: reconstructionExactSurvivorSourcePasses,",
      "segstore_reconstruction_survivor_terminal_not_derived",
    ],
  ]) {
    assert.equal(executableExactLineCount(source, line), 1, marker);
  }
  assert.equal(
    exactLineCount(source, "      reconstruction_new_output_source_passes: 2,"),
    0,
    "segstore_reconstruction_new_output_literal_terminal_present",
  );
  assert.equal(
    exactLineCount(source, "      reconstruction_exact_survivor_source_passes: 1,"),
    0,
    "segstore_reconstruction_survivor_literal_terminal_present",
  );
}

function auditBaseline(source) {
  assert.deepEqual(
    source.split("\n").slice(0, 8),
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "",
      'ROOT="$(git rev-parse --show-toplevel)"',
      'cd "$ROOT"',
      "",
      `node ${PROOF_PATH}`,
      "",
    ],
    "baseline_topology_proof_prefix_not_exact",
  );
}

function auditCi(source) {
  const lines = source.split("\n");
  const jobsRoots = lines.flatMap((line, index) => line === "jobs:" ? [index] : []);
  assert.equal(jobsRoots.length, 1, "ci_jobs_root_count_not_exact");
  const jobKeys = [];
  for (let index = jobsRoots[0] + 1; index < lines.length; index += 1) {
    const key = parseWorkflowMappingKey(lines[index], 2, "ci_job_mapping_key_not_exact");
    if (key !== null) jobKeys.push(key);
  }
  assert.deepEqual(jobKeys, ["build"], "ci_job_keys_not_exact");
  const buildStarts = lines.flatMap((line, index) => line === "  build:" ? [index] : []);
  assert.equal(buildStarts.length, 1, "ci_build_job_count_not_exact");
  const buildKeys = [];
  for (let index = buildStarts[0] + 1; index < lines.length; index += 1) {
    if (/^  \S/.test(lines[index])) break;
    const key = parseWorkflowMappingKey(lines[index], 4, "ci_build_mapping_key_not_exact");
    if (key !== null) buildKeys.push(key);
  }
  assert.deepEqual(buildKeys, ["runs-on", "steps"], "ci_build_job_keys_not_exact");
  const name = "      - name: Typecheck (no emit)";
  const starts = lines.flatMap((line, index) => line === name ? [index] : []);
  assert.equal(starts.length, 1, "ci_baseline_step_count_not_exact");
  let end = starts[0] + 1;
  while (end < lines.length && !lines[end].startsWith("      - name: ")) end += 1;
  assert.deepEqual(
    lines.slice(starts[0], end),
    [name, `        run: bash ${BASELINE_PATH}`],
    "ci_baseline_step_not_exact",
  );
  rejectFailureTolerance(source, "ci_failure_tolerance_present");
}

const focused = readFileSync(path.join(ROOT, FOCUSED_PATH), "utf8");
const baseline = readFileSync(path.join(ROOT, BASELINE_PATH), "utf8");
const ci = readFileSync(path.join(ROOT, CI_PATH), "utf8");
const segstoreProof = readFileSync(path.join(ROOT, SEGSTORE_PROOF_PATH), "utf8");
const topologyProof = readFileSync(path.join(ROOT, PROOF_PATH), "utf8");
auditFocused(focused);
auditSegstoreProof(segstoreProof);
auditBaseline(baseline);
auditCi(ci);
auditTopologyMeasurementMutantAuthority(topologyProof);
const genericMeasurementPayloads = genericMeasurementPayloadMutant(topologyProof);
assert.notEqual(
  genericMeasurementPayloads,
  topologyProof,
  "topology_measurement_generic_payload_mutant_not_applied",
);
assertThrows(
  () => auditTopologyMeasurementMutantAuthority(genericMeasurementPayloads),
  /topology_measurement_mutant_payload_digest_not_exact/,
);
const mutableMeasurementRejectionMarker =
  "let reconstructionMeasurementMutantsExecuted = 0;";
const mutableMeasurementRejectionAt =
  topologyProof.lastIndexOf(mutableMeasurementRejectionMarker);
assert.ok(
  mutableMeasurementRejectionAt >= 0,
  "topology_measurement_mutable_rejection_target_missing",
);
const mutableMeasurementRejectionAuthority =
  topologyProof.slice(0, mutableMeasurementRejectionAt) +
  "let reconstructionMeasurementMutantsExecuted = 0;\nassert.throws = () => {};" +
  topologyProof.slice(
    mutableMeasurementRejectionAt + mutableMeasurementRejectionMarker.length,
  );
assert.notEqual(
  mutableMeasurementRejectionAuthority,
  topologyProof,
  "topology_measurement_mutable_rejection_mutant_not_applied",
);
assertThrows(
  () => auditTopologyMeasurementMutantAuthority(mutableMeasurementRejectionAuthority),
  /topology_measurement_rejection_authority_mutated/,
);

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
  /focused_root_mapping_keys_not_exact|focused_pull_request_trigger_count|focused_push_trigger_count/,
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


const checkoutScalarDecoy = focused
  .replace(
    [
      "      - name: Checkout exact revision",
      "        uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6",
      "        with:",
      "          fetch-depth: 1",
      "          persist-credentials: false",
    ].join("\n"),
    [
      "      - name: Checkout exact revision",
      "        uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6",
      "        with:",
      "          fetch-depth: 0",
      "          persist-credentials: true",
      "          ref: c87df8a2f60290a9579c79dfd0a4a91798b38313",
    ].join("\n"),
  )
  .replace(
    "name: VOID Segmented JSONL V1",
    [
      "name: |6",
      "      - name: Checkout exact revision",
      "        uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6",
      "        with:",
      "          fetch-depth: 1",
      "          persist-credentials: false",
    ].join("\n"),
  );
assert.notEqual(checkoutScalarDecoy, focused, "focused_checkout_scalar_decoy_mutant_not_applied");
assert.throws(
  () => auditFocused(checkoutScalarDecoy),
  /focused_checkout_block_not_exact/,
);

const criticalIdentityMutants = [
  ["checkout_ref_replay", "          persist-credentials: false\n", "          persist-credentials: false\n          ref: c87df8a2f60290a9579c79dfd0a4a91798b38313\n"],
  ["setup_constant_node", "          node-version: ${{ matrix.node }}", "          node-version: 22"],
  ["runtime_major_assertion_deleted", "          test \"$(node -p 'process.versions.node.split(\".\")[0]')\" = \"${{ matrix.node }}\"\n", ""],
  ["hygiene_event_replay", "          CI_DIFF_EVENT_NAME: ${{ github.event_name }}", "          CI_DIFF_EVENT_NAME: pull_request"],
  ["hygiene_checkout_replay", "          CI_DIFF_CHECKOUT_SHA: ${{ github.sha }}", "          CI_DIFF_CHECKOUT_SHA: c87df8a2f60290a9579c79dfd0a4a91798b38313"],
];
for (const [family, from, to] of criticalIdentityMutants) {
  const mutant = focused.replace(from, to);
  assert.notEqual(mutant, focused, `focused_critical_identity_mutant_not_applied:${family}`);
  assert.throws(() => auditFocused(mutant), /focused_(checkout_block|setup_node_block|runtime_major_assertion|hygiene_block)_not_exact/);
}
const negativePathMutants = [
  ["single_quoted_exact", `      - '!${deadScalarTriggerPath}'`],
  ["double_quoted_exact", `      - \"!${deadScalarTriggerPath}\"`],
  ["single_quoted_glob", "      - '!src/storage/**'"],
  ["double_quoted_glob", '      - "!src/storage/**"'],
];
for (const [family, negativeEntry] of negativePathMutants) {
  const mutant = focused.replaceAll(
    deadScalarTriggerLine,
    `${deadScalarTriggerLine}${negativeEntry}\n`,
  );
  assert.notEqual(mutant, focused, `focused_negative_path_mutant_not_applied:${family}`);
  assert.throws(
    () => auditFocused(mutant),
    /focused_(pull_request|push)_negative_path_pattern/,
  );
}

const pullRequestFilterMutants = [
  ["branches_ignore_block", "    branches-ignore:\n      - main\n"],
  ["negative_branches_block", "    branches:\n      - \"!main\"\n"],
  ["types_opened_flow", "    types: [opened]\n"],
  ["types_without_synchronize_flow", "    types: [opened, reopened]\n"],
  ["types_without_synchronize_block", "    types:\n      - opened\n      - reopened\n"],
  ["types_single_quoted", "    types: 'opened'\n"],
  ["types_double_quoted_key", "    \"types\": [opened]\n"],
  ["types_single_quoted_key", "    'types': [opened]\n"],
  ["branches_ignore_double_quoted_key", "    \"branches-ignore\": [main]\n"],
  ["branches_ignore_single_quoted_key", "    'branches-ignore': [main]\n"],
  ["types_escaped_double_key", "    \"ty\\x70es\": [opened]\n"],
  ["duplicate_semantic_key", "    types: [opened, synchronize, reopened]\n    \"types\": [opened]\n"],
];
for (const [family, filter] of pullRequestFilterMutants) {
  const mutant = focused.replace("  pull_request:\n", `  pull_request:\n${filter}`);
  assert.notEqual(mutant, focused, `focused_pull_request_filter_mutant_not_applied:${family}`);
  assert.throws(() => auditFocused(mutant), /focused_pull_request_mapping_keys?_not_exact/);
}

const matrixSuppressionMutants = [
  ["exclude_block", "        exclude:\n          - node: 26\n"],
  ["exclude_flow", "        exclude: [{ node: 26 }]\n"],
  ["exclude_double_quoted_key", "        \"exclude\": [{ node: 26 }]\n"],
  ["exclude_single_quoted_key", "        'exclude': [{ node: 26 }]\n"],
  ["include_block", "        include:\n          - node: 28\n"],
  ["alternate_axis", "        os: [ubuntu-latest]\n"],
  ["max_parallel", "      max-parallel: 1\n"],
  ["job_if", "    if: ${{ false }}\n"],
];
for (const [family, addition] of matrixSuppressionMutants) {
  const target = "        node: [22, 24, 26]\n";
  const mutant = focused.replace(target, `${target}${addition}`);
  assert.notEqual(mutant, focused, `focused_matrix_mutant_not_applied:${family}`);
  assert.throws(
    () => auditFocused(mutant),
    /focused_(matrix|strategy|proof_job)_mapping/,
  );
}

function proveFocusedStepExecutionModifierRejection(source, auditFn) {
  const target = "      - name: Prove delimiter-inclusive segment ceiling\n";
  const mutations = [
    ["false_if", "        if: ${{ false }}\n"],
    ["custom_shell", "        shell: \"true {0}\"\n"],
    ["working_directory", "        working-directory: scripts\n"],
    ["escaped_continue_on_error", "        \"continue-on-\\u0065rror\": ${{ true }}\n"],
  ];
  for (const [family, addition] of mutations) {
    const mutant = source.replace(target, `${target}${addition}`);
    assert.notEqual(mutant, source, `focused_step_modifier_mutant_not_applied:${family}`);
    assert.throws(
      () => auditFn(mutant),
      /focused_step_mapping_key_not_exact|focused_step_mapping_keys_not_exact/,
    );
  }

  const workflowDefaults = source.replace(
    "permissions:\n",
    "defaults:\n  run:\n    shell: \"true {0}\"\n\npermissions:\n",
  );
  assert.notEqual(workflowDefaults, source, "focused_workflow_defaults_mutant_not_applied");
  assert.throws(() => auditFn(workflowDefaults), /focused_root_mapping_keys_not_exact/);

  const jobDefaults = source.replace(
    "    steps:\n",
    "    defaults:\n      run:\n        shell: \"true {0}\"\n    steps:\n",
  );
  assert.notEqual(jobDefaults, source, "focused_job_defaults_mutant_not_applied");
  assert.throws(() => auditFn(jobDefaults), /focused_proof_job_mapping_keys_not_exact/);
}

proveFocusedStepExecutionModifierRejection(focused, auditFocused);
const failureToleranceMutants = [
  ["literal_true", "    continue-on-error: true\n"],
  ["quoted_true", "    continue-on-error: 'true'\n"],
  ["expression_true", "    continue-on-error: ${{ true }}\n"],
  ["expression_from_json_true", "    continue-on-error: ${{ fromJSON('true') }}\n"],
  ["double_quoted_key", "    \"continue-on-error\": true\n"],
  ["single_quoted_key", "    'continue-on-error': true\n"],
];
for (const [family, addition] of failureToleranceMutants) {
  const mutant = focused.replace("  proof:\n", `  proof:\n${addition}`);
  assert.notEqual(mutant, focused, `focused_failure_tolerance_mutant_not_applied:${family}`);
  assert.throws(() => auditFocused(mutant), /focused_failure_tolerance_present/);
}

const withoutInlineAudit = focused.replace(
  /\n      - name: Prove focused workflow dependency closure\n[\s\S]*?(?=\n      - name: Syntax\n)/,
  "\n",
);
assert.notEqual(withoutInlineAudit, focused, "inline_audit_mutant_not_applied");
assert.throws(
  () => auditFocused(withoutInlineAudit),
  /focused_named_step_count|focused_step_count_not_exact|focused_inline_audit_step_count|focused_topology_measurement_(path|source|mutant_caller)_not_bound/,
);

const withoutTopologyMeasurementMutantCaller = focused.replace(
  "          auditTopologyMeasurementMutantExecution(topologyText);\n",
  "",
);
assert.notEqual(
  withoutTopologyMeasurementMutantCaller,
  focused,
  "focused_topology_measurement_mutant_caller_mutant_not_applied",
);
assert.throws(
  () => auditFocused(withoutTopologyMeasurementMutantCaller),
  /focused_topology_measurement_mutant_caller_not_bound|focused_topology_measurement_mutant_caller_not_top_level/,
);

const unreachableTopologyMeasurementMutantCaller = focused.replace(
  "          auditTopologyMeasurementMutantExecution(topologyText);\n",
  [
    "          if (false) {",
    "          auditTopologyMeasurementMutantExecution(topologyText);",
    "          }",
    "",
  ].join("\n"),
);
assert.notEqual(
  unreachableTopologyMeasurementMutantCaller,
  focused,
  "focused_topology_measurement_mutant_caller_literal_false_mutant_not_applied",
);
assert.throws(
  () => auditFocused(unreachableTopologyMeasurementMutantCaller),
  /focused_topology_measurement_mutant_caller_literal_false_guard|focused_topology_measurement_mutant_caller_not_top_level/,
);

for (const [family, guard] of [
  ["if_zero", "          if (0) {"],
  ["if_not_true", "          if (!true) {"],
]) {
  const unreachableEquivalentCaller = focused.replace(
    "          auditTopologyMeasurementMutantExecution(topologyText);\n",
    [
      guard,
      "          auditTopologyMeasurementMutantExecution(topologyText);",
      "          }",
      "",
    ].join("\n"),
  );
  assert.notEqual(
    unreachableEquivalentCaller,
    focused,
    `focused_topology_measurement_mutant_caller_${family}_mutant_not_applied`,
  );
  assert.throws(
    () => auditFocused(unreachableEquivalentCaller),
    /focused_topology_measurement_mutant_caller_not_top_level/,
  );
}

const earlyReturnTopologyMeasurementMutantCaller = focused.replace(
  "          auditTopologyMeasurementMutantExecution(topologyText);\n",
  [
    "          (function () {",
    "          return;",
    "          auditTopologyMeasurementMutantExecution(topologyText);",
    "          })();",
    "",
  ].join("\n"),
);
assert.notEqual(
  earlyReturnTopologyMeasurementMutantCaller,
  focused,
  "focused_topology_measurement_mutant_caller_early_return_mutant_not_applied",
);
assert.throws(
  () => auditFocused(earlyReturnTopologyMeasurementMutantCaller),
  /focused_topology_measurement_mutant_caller_not_top_level/,
);

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

function wrapFunctionBodyInLiteralFalseWithFallback(
  source,
  startMarker,
  endMarker,
  fallback,
  marker,
) {
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
    "\n  }\n" +
    fallback +
    "\n" +
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

const reconstructionMeasurementMutants = [
  [
    "literal_false_helper",
    wrapFunctionBodyInLiteralFalseWithFallback(
      segstoreProof,
      "function measureReconstructionSourceReadsV1(",
      "function proveUncertainExactFdLinkConverges(",
      [
        "  const manifest = readSegmentedJsonlManifestV1(storePath);",
        "  const reusedExisting = fs.existsSync(outputPath);",
        "  return {",
        "    sourceBytesRead: manifest.total_bytes * (reusedExisting ? 1 : 2),",
        "    reusedExisting,",
        "  };",
      ].join("\n"),
      "segstore_reconstruction_measurement_literal_false",
    ),
    /segstore_reconstruction_measurement_literal_false_guard/,
  ],
  [
    "hard_coded_helper",
    segstoreProof.replace(
      functionSlice(
        segstoreProof,
        "function measureReconstructionSourceReadsV1(",
        "function proveUncertainExactFdLinkConverges(",
        "segstore_reconstruction_measurement_mutant_source_missing",
      ),
      `function measureReconstructionSourceReadsV1(
  storePath: string,
  outputPath: string,
): { sourceBytesRead: number; reusedExisting: boolean } {
  void outputPath;
  const manifest = readSegmentedJsonlManifestV1(storePath);
  const call = (measureReconstructionSourceReadsV1 as any).callCount ?? 0;
  (measureReconstructionSourceReadsV1 as any).callCount = call + 1;
  return call === 0
    ? { sourceBytesRead: manifest.total_bytes * 2, reusedExisting: false }
    : { sourceBytesRead: manifest.total_bytes, reusedExisting: true };
}

`,
    ),
    /segstore_reconstruction_measurement_body_not_bound/,
  ],
  [
    "deleted_production_reconstruction",
    segstoreProof.replace(
      "    const result = reconstructSegmentedJsonlV1ToFile(storePath, outputPath);",
      "    const result = { reused_existing: false };",
    ),
    /segstore_reconstruction_measurement_body_not_bound/,
  ],
  [
    "deleted_source_read_accounting",
    segstoreProof.replace(
      "      if (trackedFds.has(Number(args[0])) && Number(count) > 0) sourceBytesRead += Number(count);",
      "      void count;",
    ),
    /segstore_reconstruction_measurement_body_not_bound/,
  ],
  [
    "preloaded_measurement_results",
    segstoreProof
      .replace(
        "  const newOutputPasses = measureReconstructionSourceReadsV1(store, reconstructionPassOutput);",
        "  const newOutputPasses = { sourceBytesRead: body.length * 2, reusedExisting: false };",
      )
      .replace(
        "  const existingOutputPasses = measureReconstructionSourceReadsV1(store, reconstructionPassOutput);",
        "  const existingOutputPasses = { sourceBytesRead: body.length, reusedExisting: true };",
      ),
    /segstore_reconstruction_(new_output|survivor)_measurement_call_not_bound/,
  ],
  [
    "literal_pass_terminals",
    segstoreProof
      .replace(
        "      reconstruction_new_output_source_passes: reconstructionNewOutputSourcePasses,",
        "      reconstruction_new_output_source_passes: 2,",
      )
      .replace(
        "      reconstruction_exact_survivor_source_passes: reconstructionExactSurvivorSourcePasses,",
        "      reconstruction_exact_survivor_source_passes: 1,",
      ),
    /segstore_reconstruction_(new_output|survivor)_(terminal_not_derived|literal_terminal_present)/,
  ],
  [
    "deleted_acceptance_assertions",
    segstoreProof
      .replace(
        [
          "  assert.equal(",
          "    newOutputPasses.sourceBytesRead,",
          "    body.length * 2,",
          '    "new reconstruction must read each admitted source byte exactly twice",',
          "  );",
          "",
        ].join("\n"),
        "",
      )
      .replace(
        [
          "  assert.equal(",
          "    existingOutputPasses.sourceBytesRead,",
          "    body.length,",
          '    "exact-survivor recovery must read each admitted source byte exactly once",',
          "  );",
          "",
        ].join("\n"),
        "",
      )
      .replace(
        [
          "  assert.equal(",
          "    reconstructionNewOutputSourcePasses,",
          "    2,",
          '    "new reconstruction source-pass terminal must equal exactly two",',
          "  );",
          "",
        ].join("\n"),
        "",
      )
      .replace(
        [
          "  assert.equal(",
          "    reconstructionExactSurvivorSourcePasses,",
          "    1,",
          '    "exact-survivor source-pass terminal must equal exactly one",',
          "  );",
          "",
        ].join("\n"),
        "",
      ),
    /segstore_reconstruction_measurement_acceptance_not_bound/,
  ],
  [
    "weakened_acceptance_expectations",
    segstoreProof
      .replace(
        "    newOutputPasses.sourceBytesRead,\n    body.length * 2,",
        "    newOutputPasses.sourceBytesRead,\n    body.length * 3,",
      )
      .replace(
        "    existingOutputPasses.sourceBytesRead,\n    body.length,",
        "    existingOutputPasses.sourceBytesRead,\n    body.length * 2,",
      )
      .replace(
        "    reconstructionNewOutputSourcePasses,\n    2,",
        "    reconstructionNewOutputSourcePasses,\n    3,",
      )
      .replace(
        "    reconstructionExactSurvivorSourcePasses,\n    1,",
        "    reconstructionExactSurvivorSourcePasses,\n    2,",
      ),
    /segstore_reconstruction_measurement_acceptance_not_bound/,
  ],
];

const reconstructionMeasurementMutantValues = new Set(
  reconstructionMeasurementMutants.map(([, mutant]) => mutant),
);
assert.equal(
  reconstructionMeasurementMutantValues.size,
  8,
  "segstore_reconstruction_measurement_mutant_values_not_unique",
);

let reconstructionMeasurementMutantsExecuted = 0;
for (const [family, mutant, expected] of reconstructionMeasurementMutants) {
  assert.notEqual(
    mutant,
    segstoreProof,
    `segstore_reconstruction_measurement_mutant_not_applied:${family}`,
  );
  assertThrows(() => auditSegstoreProof(mutant), expected);
  reconstructionMeasurementMutantsExecuted += 1;
}
assert.equal(
  reconstructionMeasurementMutantsExecuted,
  8,
  "segstore_reconstruction_measurement_mutant_execution_count",
);

const withoutBaselineInvocation = baseline.replace(`node ${PROOF_PATH}`, `node --check ${PROOF_PATH}`);
assert.throws(
  () => auditBaseline(withoutBaselineInvocation),
  /baseline_topology_proof_prefix_not_exact/,
);

const deadBaselineInvocation = baseline.replace(
  `node ${PROOF_PATH}`,
  `if false; then\nnode ${PROOF_PATH}\nfi`,
);
assert.notEqual(deadBaselineInvocation, baseline, "baseline_dead_topology_mutant_not_applied");
assert.throws(
  () => auditBaseline(deadBaselineInvocation),
  /baseline_topology_proof_prefix_not_exact/,
);

const withoutCiCaller = ci.replace(
  `        run: bash ${BASELINE_PATH}`,
  `        run: bash -n ${BASELINE_PATH}`,
);
assert.throws(() => auditCi(withoutCiCaller), /ci_baseline_step_not_exact/);

const skippedCiCaller = ci.replace(
  "      - name: Typecheck (no emit)\n        run:",
  "      - name: Typecheck (no emit)\n        if: ${{ false }}\n        run:",
);
assert.notEqual(skippedCiCaller, ci, "ci_skipped_baseline_mutant_not_applied");
assert.throws(() => auditCi(skippedCiCaller), /ci_baseline_step_not_exact/);

const skippedCiBuildJob = ci.replace(
  "  build:\n    runs-on:",
  "  build:\n    if: ${{ false }}\n    runs-on:",
);
assert.notEqual(skippedCiBuildJob, ci, "ci_skipped_build_job_mutant_not_applied");
assert.throws(() => auditCi(skippedCiBuildJob), /ci_build_job_keys_not_exact/);

const quotedSkippedCiBuildJob = ci.replace(
  "  build:\n    runs-on:",
  '  build:\n    "if": ${{ false }}\n    runs-on:',
);
assert.notEqual(
  quotedSkippedCiBuildJob,
  ci,
  "ci_quoted_skipped_build_job_mutant_not_applied",
);
assert.throws(
  () => auditCi(quotedSkippedCiBuildJob),
  /ci_build_job_keys_not_exact/,
);

const tolerantCiCaller = ci.replace(
  "      - name: Typecheck (no emit)\n        run:",
  "      - name: Typecheck (no emit)\n        continue-on-error: true\n        run:",
);
assert.throws(
  () => auditCi(tolerantCiCaller),
  /ci_baseline_step_not_exact|ci_failure_tolerance_present/,
);

console.log("VOID_SEGMENTED_JSONL_CI_TOPOLOGY_V1_GREEN");
console.log("focused_trigger_closure_bound=true");
console.log("focused_trigger_dead_scalar_relocation_rejected=true");
console.log("focused_trigger_name_block_scalar_decoy_rejected=true");
console.log("focused_negative_path_patterns_rejected=true");
console.log("focused_pull_request_branch_filters_rejected=true");
console.log("focused_pull_request_activity_narrowing_rejected=true");
console.log("focused_push_main_branch_bound=true");
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
console.log("segstore_reconstruction_measurement_helper_bound=true");
console.log("segstore_reconstruction_measurement_production_call_bound=true");
console.log("segstore_reconstruction_measurement_read_accounting_bound=true");
console.log("segstore_reconstruction_measurement_result_terminals_bound=true");
console.log("segstore_reconstruction_measurement_acceptance_assertions_bound=true");
console.log("segstore_reconstruction_measurement_literal_false_guard_rejected=true");
console.log("segstore_reconstruction_measurement_mutant_caller_bound=true");
console.log("segstore_reconstruction_measurement_mutant_block_literal_false_guard_rejected=true");
console.log("segstore_reconstruction_measurement_mutant_payload_digests_bound=true");
console.log("segstore_reconstruction_measurement_rejection_authority_immutable=true");
console.log("segstore_reconstruction_measurement_mutant_values_distinct=true");
console.log("focused_topology_measurement_mutant_caller_literal_false_guard_rejected=true");
console.log("focused_topology_measurement_mutant_caller_ast_top_level_bound=true");
console.log("repository_ci_baseline_step_exact=true");
console.log("repository_ci_build_job_control_exact=true");
console.log("repository_ci_quoted_build_control_rejected=true");
console.log("baseline_topology_proof_prefix_exact=true");
console.log(`segstore_reconstruction_measurement_mutants_executed=${reconstructionMeasurementMutantsExecuted}`);
console.log("segstore_exact_generation_helper_noop_rejected=true");
