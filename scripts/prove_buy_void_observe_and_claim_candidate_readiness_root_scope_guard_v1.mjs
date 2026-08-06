#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const TOOL = join(
  ROOT,
  "tools",
  "buy-void-observe-and-claim-candidate-readiness-root-scope-guard-v1.mjs",
);
const MARKER =
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_ROOT_SCOPE_GUARD_V1";

function writeJson(file, value) {
  mkdirSync(resolve(file, ".."), { recursive: true, mode: 0o700 });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
}

const source = readFileSync(TOOL, "utf8");
for (const required of [
  MARKER,
  "direct_regular_json_files_only",
  "nested_json_entries_ignored: true",
  "special_json_entries_ignored: true",
  "private_temporary_mirror_used: true",
  "runtime_request_state_write_performed: false",
  "network_request_performed: false",
  "activation_performed: false",
  "money_movement=false",
  "--require-exact-one",
  "process.exitCode = 3",
  "process.exitCode = 4",
]) {
  assert.equal(source.includes(required), true, `tool missing ${required}`);
}

for (const forbidden of [
  "fetch(",
  "http.request",
  "https.request",
  "eth_sendRawTransaction",
  "sendTransaction(",
  "signTransaction(",
  "privateKey",
  "mnemonic",
  "apply: true",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, `tool contains forbidden ${forbidden}`);
}

const temporaryRoot = mkdtempSync(join(
  tmpdir(),
  "void-buy-void-root-scope-guard-proof-",
));
chmodSync(temporaryRoot, 0o700);

try {
  const requestDirectory = join(
    temporaryRoot,
    ".runtime",
    "public-buy-void-requests-v1",
  );
  mkdirSync(requestDirectory, { recursive: true, mode: 0o700 });

  const orphanRequestId = "buyvoid_root_orphan_event_v1";
  writeJson(
    join(
      requestDirectory,
      `operator-event-${orphanRequestId}-1781884468416.json`,
    ),
    {
      schema: "void_buy_void_operator_event_v1",
      request_id: orphanRequestId,
      prior_status: "awaiting_payment_tx_hash",
      operator_status: "rejected",
      marked_at_ms: 1781884468416,
    },
  );

  const nestedDirectory = join(requestDirectory, "backup", "archive");
  mkdirSync(nestedDirectory, { recursive: true, mode: 0o700 });
  const nestedRequestId = "buyvoid_nested_spoof_candidate_v1";
  writeJson(
    join(nestedDirectory, `${nestedRequestId}.json`),
    {
      schema: "void_buy_void_request_v1",
      request_id: nestedRequestId,
      public_status: "payment_verified",
    },
  );

  const symlinkTarget = join(temporaryRoot, "symlink-target.json");
  writeJson(symlinkTarget, {
    request_id: "buyvoid_direct_symlink_spoof_v1",
  });
  symlinkSync(
    symlinkTarget,
    join(requestDirectory, "buyvoid_direct_symlink_spoof_v1.json"),
  );

  const reportPath = join(temporaryRoot, "guarded-report-v1.json");
  const result = spawnSync(
    process.execPath,
    [
      TOOL,
      "--repo-root",
      temporaryRoot,
      "--output",
      reportPath,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env },
      timeout: 120_000,
    },
  );

  assert.equal(
    result.status,
    0,
    [
      "guarded CLI regression failed",
      `stdout=${result.stdout}`,
      `stderr=${result.stderr}`,
      `error=${String(result.error || "")}`,
    ].join("\n"),
  );
  assert.equal(existsSync(reportPath), true, "guarded report missing");

  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  assert.equal(report.root_scope_guard_marker, MARKER);
  assert.equal(report.root_scope_guard_version, 1);
  assert.equal(report.candidate_source_scope, "direct_regular_json_files_only");
  assert.equal(report.direct_regular_json_file_count, 1);
  assert.equal(report.direct_special_json_entry_count, 1);
  assert.equal(report.nested_json_entry_count, 1);
  assert.equal(report.nested_json_entries_ignored, true);
  assert.equal(report.special_json_entries_ignored, true);
  assert.equal(report.root_scope_discovery_complete, true);
  assert.equal(report.private_temporary_mirror_used, true);
  assert.equal(report.private_temporary_mirror_path_disclosed, false);
  assert.equal(report.runtime_request_state_write_performed, false);
  assert.equal(report.network_request_performed, false);
  assert.equal(report.request_json_file_count, 1);
  assert.equal(report.canonical_request_json_file_count, 0);
  assert.equal(report.operator_event_json_file_count, 1);
  assert.equal(report.ignored_noncanonical_json_file_count, 0);
  assert.equal(report.request_id_count, 0);
  assert.equal(report.request_record_count, 0);
  assert.equal(report.eligible_candidate_count, 0);
  assert.deepEqual(report.records, []);
  assert.equal(report.orphan_operator_event_request_id_count, 1);
  assert.deepEqual(report.orphan_operator_event_request_ids, [orphanRequestId]);
  assert.equal(report.activation_performed, false);
  assert.equal(report.runtime_mutation_performed, false);
  assert.equal(report.authority.wallet_access, false);
  assert.equal(report.authority.signing, false);
  assert.equal(report.authority.transaction_broadcast, false);
  assert.equal(report.authority.money_movement, false);
  assert.equal(
    JSON.stringify(report).includes(nestedRequestId),
    false,
    "nested spoof request leaked into guarded report",
  );
  assert.equal(
    JSON.stringify(report).includes(symlinkTarget),
    false,
    "private symlink target leaked into guarded report",
  );

  const exactOneReport = join(temporaryRoot, "guarded-exact-one-report-v1.json");
  const exactOne = spawnSync(
    process.execPath,
    [
      TOOL,
      "--repo-root",
      temporaryRoot,
      "--output",
      exactOneReport,
      "--require-exact-one",
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env },
      timeout: 120_000,
    },
  );
  assert.equal(exactOne.status, 3, "none state did not preserve exit code 3");
  assert.equal(existsSync(exactOneReport), true, "exact-one report missing");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log(`${MARKER}_PROOF_GREEN`);
console.log("direct_regular_json_files_only=1");
console.log("nested_canonical_spoof_ignored=1");
console.log("direct_json_symlink_ignored=1");
console.log("orphan_root_operator_event_preserved=1");
console.log("require_exact_one_none_exit_3=1");
console.log("runtime_request_state_write=0");
console.log("network_request=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
