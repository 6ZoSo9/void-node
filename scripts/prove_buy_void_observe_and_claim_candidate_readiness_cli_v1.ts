import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const cliPath = path.join(
  root,
  "scripts/"
    + "buy_void_observe_and_claim_candidate_readiness_v1.ts",
);
const fixturePath = path.join(
  root,
  "fixtures/buy-void/"
    + "observe-and-claim-candidate-readiness-v1.example.json",
);
const schemaPath = path.join(
  root,
  "schemas/"
    + "buy-void-observe-and-claim-candidate-readiness-v1.schema.json",
);

const cli = fs.readFileSync(cliPath, "utf8");
const fixture = JSON.parse(
  fs.readFileSync(fixturePath, "utf8"),
) as Record<string, any>;
const schema = JSON.parse(
  fs.readFileSync(schemaPath, "utf8"),
) as Record<string, any>;

for (const marker of [
  "--require-exact-one",
  "--runtime-root",
  "runtime_root_authority_required",
  "runtime_root_ambiguous",
  "runtime_root_source",
  "unique_repo_runtime_root",
  "process.exitCode = 3",
  "process.exitCode = 4",
  "apply: false",
  "deriveBuyVoidBoundedOrchestratorServerSnapshotV1",
  "runBuyVoidBoundedAutoFulfillmentOrchestratorV1",
  "evaluateBuyVoidBoundedOrchestratorApplyActivationV1",
  "summarizeBuyVoidObserveAndClaimCandidateReadinessV1",
  "canonical_request_json_file_count",
  "operator_event_json_file_count",
  "orphan_operator_event_request_ids",
  "ignored_noncanonical_json_file_count",
  "activation_performed=false",
  "runtime_mutation_performed=false",
  "money_movement=false",
]) {
  assert.equal(
    cli.includes(marker),
    true,
    `CLI missing ${marker}`,
  );
}

for (const forbidden of [
  "apply: true",
  "setInterval(",
  "setTimeout(",
  "while (true)",
  "for (;;)",
  "eth_sendRawTransaction",
  "sendTransaction(",
  "signTransaction(",
  "privateKey",
  "mnemonic",
  "credential",
]) {
  assert.equal(
    cli.includes(forbidden),
    false,
    `CLI contains forbidden ${forbidden}`,
  );
}

assert.equal(
  fixture.schema,
  "void_buy_void_observe_and_claim_candidate_readiness_v1",
);
assert.equal(
  fixture.marker,
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1",
);
assert.equal(fixture.readiness_status, "none");
assert.equal(fixture.request_record_count, 2);
assert.equal(fixture.eligible_candidate_count, 0);
assert.deepEqual(fixture.eligible_request_ids, []);
assert.equal(fixture.recommended_request_id, null);
assert.equal(fixture.authority.read_only, true);
assert.equal(fixture.authority.runtime_import_mounted, false);
assert.equal(fixture.authority.apply_requested, false);
assert.equal(fixture.authority.wallet_access, false);
assert.equal(fixture.authority.money_movement, false);

assert.equal(schema.type, "object");
assert.equal(
  schema.properties.candidate_stage.const,
  "observe_and_claim",
);
assert.deepEqual(
  schema.properties.readiness_status.enum,
  ["none", "exact_one", "multiple"],
);
assert.equal(
  schema.properties.authority.properties.read_only.const,
  true,
);
assert.equal(
  schema.properties.authority.properties
    .runtime_import_mounted.const,
  false,
);
assert.equal(
  schema.properties.authority.properties
    .money_movement.const,
  false,
);

for (const property of [
  "request_json_file_count",
  "canonical_request_json_file_count",
  "operator_event_json_file_count",
  "ignored_noncanonical_json_file_count",
  "request_id_count",
  "orphan_operator_event_request_id_count",
  "orphan_operator_event_request_ids",
]) {
  assert.equal(
    typeof schema.properties[property],
    "object",
    `schema missing ${property}`,
  );
}

const configuredTsxPath = String(
  process.env.VOID_REPO_TSX_PATH || "",
).trim();
const tsxPath = configuredTsxPath || path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

const temporaryRoot = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-buy-void-candidate-readiness-orphan-",
  ),
);
try {
  const requestDirectory = path.join(
    temporaryRoot,
    ".runtime",
    "public-buy-void-requests-v1",
  );
  fs.mkdirSync(requestDirectory, {
    recursive: true,
    mode: 0o700,
  });

  const orphanRequestId =
    "buyvoid_fixture_orphan_rejected_v1";
  fs.writeFileSync(
    path.join(
      requestDirectory,
      `operator-event-${orphanRequestId}-1781884468416.json`,
    ),
    JSON.stringify({
      schema: "void_buy_void_operator_event_v1",
      request_id: orphanRequestId,
      prior_status: "awaiting_payment_tx_hash",
      operator_status: "rejected",
      marked_at_ms: 1781884468416,
    }, null, 2) + "\n",
    { mode: 0o600 },
  );

  const reportPath = path.join(
    temporaryRoot,
    "candidate-readiness-v1.json",
  );
  const result = spawnSync(
    tsxPath,
    [
      cliPath,
      "--repo-root",
      temporaryRoot,
      "--output",
      reportPath,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env },
    },
  );

  assert.equal(
    result.status,
    0,
    [
      "event-only CLI regression failed",
      `stdout=${result.stdout}`,
      `stderr=${result.stderr}`,
      `error=${String(result.error || "")}`,
    ].join("\n"),
  );

  const report = JSON.parse(
    fs.readFileSync(reportPath, "utf8"),
  ) as Record<string, any>;

  assert.equal(report.request_record_count, 0);
  assert.equal(report.request_json_file_count, 1);
  assert.equal(report.canonical_request_json_file_count, 0);
  assert.equal(report.operator_event_json_file_count, 1);
  assert.equal(report.ignored_noncanonical_json_file_count, 0);
  assert.equal(report.request_id_count, 0);
  assert.equal(
    report.orphan_operator_event_request_id_count,
    1,
  );
  assert.deepEqual(
    report.orphan_operator_event_request_ids,
    [orphanRequestId],
  );
  assert.deepEqual(report.records, []);
  assert.equal(
    report.runtime_root_source,
    "not_required_no_canonical_requests",
  );
  assert.equal(report.runtime_root, null);
  assert.equal(report.activation_performed, false);
  assert.equal(report.runtime_mutation_performed, false);
} finally {
  fs.rmSync(temporaryRoot, {
    recursive: true,
    force: true,
  });
}

const authorityRoot = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-buy-void-candidate-readiness-root-authority-",
  ),
);
try {
  const requestDirectory = path.join(
    authorityRoot,
    ".runtime",
    "public-buy-void-requests-v1",
  );
  fs.mkdirSync(requestDirectory, {
    recursive: true,
    mode: 0o700,
  });

  const requestId = "buyvoid_runtime_root_authority_v1";
  fs.writeFileSync(
    path.join(requestDirectory, `${requestId}.json`),
    JSON.stringify({
      schema: "void_public_buy_void_request_v1",
      request_id: requestId,
      status: "payment_verified",
    }, null, 2) + "\n",
    { mode: 0o600 },
  );

  const cleanEnv: NodeJS.ProcessEnv = { ...process.env };
  delete cleanEnv.VOID_BUY_VOID_RUNTIME_DIR;
  delete cleanEnv.DATA_DIR;
  delete cleanEnv.VOID_DATA_DIR;

  const missingRoot = spawnSync(
    tsxPath,
    [cliPath, "--repo-root", authorityRoot],
    {
      cwd: root,
      encoding: "utf8",
      env: cleanEnv,
    },
  );
  assert.equal(missingRoot.status, 2);
  assert.equal(
    missingRoot.stderr.includes("runtime_root_authority_required"),
    true,
  );

  const dataA = path.join(
    authorityRoot,
    "data_a",
    "buy_void_v1",
    "runtime-integration-v1",
  );
  const dataB = path.join(
    authorityRoot,
    "data_b",
    "buy_void_v1",
    "runtime-integration-v1",
  );
  fs.mkdirSync(dataA, { recursive: true, mode: 0o700 });
  fs.mkdirSync(dataB, { recursive: true, mode: 0o700 });

  const ambiguousRoot = spawnSync(
    tsxPath,
    [cliPath, "--repo-root", authorityRoot],
    {
      cwd: root,
      encoding: "utf8",
      env: cleanEnv,
    },
  );
  assert.equal(ambiguousRoot.status, 2);
  assert.equal(
    ambiguousRoot.stderr.includes("runtime_root_ambiguous:2"),
    true,
  );

  fs.rmSync(path.join(authorityRoot, "data_b"), {
    recursive: true,
    force: true,
  });

  const discoveredReport = path.join(
    authorityRoot,
    "discovered-runtime-root-report.json",
  );
  const discoveredRoot = spawnSync(
    tsxPath,
    [
      cliPath,
      "--repo-root",
      authorityRoot,
      "--output",
      discoveredReport,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: cleanEnv,
    },
  );
  assert.equal(
    discoveredRoot.status,
    0,
    [
      "unique runtime-root discovery failed",
      `stdout=${discoveredRoot.stdout}`,
      `stderr=${discoveredRoot.stderr}`,
    ].join("\n"),
  );
  const discoveredPayload = JSON.parse(
    fs.readFileSync(discoveredReport, "utf8"),
  ) as Record<string, any>;
  assert.equal(
    discoveredPayload.runtime_root_source,
    "unique_repo_runtime_root",
  );
  assert.equal(discoveredPayload.runtime_root, path.resolve(dataA));

  const explicitReport = path.join(
    authorityRoot,
    "explicit-runtime-root-report.json",
  );
  const explicitRoot = spawnSync(
    tsxPath,
    [
      cliPath,
      "--repo-root",
      authorityRoot,
      "--runtime-root",
      dataA,
      "--output",
      explicitReport,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: cleanEnv,
    },
  );
  assert.equal(explicitRoot.status, 0);
  const explicitPayload = JSON.parse(
    fs.readFileSync(explicitReport, "utf8"),
  ) as Record<string, any>;
  assert.equal(explicitPayload.runtime_root_source, "cli_runtime_root");
  assert.equal(explicitPayload.runtime_root, path.resolve(dataA));
} finally {
  fs.rmSync(authorityRoot, {
    recursive: true,
    force: true,
  });
}

console.log(
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_CLI_V1_GREEN",
);
console.log("fixture_none_state=1");
console.log("require_exact_one_exit_codes=1");
console.log("server_derived_snapshot=1");
console.log("canonical_base_files_only=1");
console.log("orphan_operator_event_reported=1");
console.log("event_only_request_record_count=0");
console.log("runtime_root_authority_fail_closed=1");
console.log("runtime_root_ambiguity_fail_closed=1");
console.log("unique_repo_runtime_root_discovery=1");
console.log("explicit_runtime_root_override=1");
console.log("dry_run_only=1");
console.log("runtime_import_mounted=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
