#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_CONFIRMATION_V1,
  prepareVoidEconomicEpoch2ProductionGatewayInactiveRuntimeV1,
} from "../tools/void-economic-epoch2-production-gateway-inactive-runtime-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_SERVICE_CONTRACT_V1,
  collectVoidEconomicEpoch2ProductionGatewayRuntimeEvidenceCandidateV1,
  voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1,
  voidEconomicEpoch2ProductionGatewayRuntimeServiceContractIdV1,
} from "../tools/void-economic-epoch2-production-gateway-runtime-evidence-candidate-v1.mjs";

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

const operatorUid =
  typeof process.getuid === "function" ? process.getuid() : 1000;
const hostname = "proof-host";
const serviceUnit =
  "void-economic-epoch2-production-gateway-inactive.service";
const controlGroup =
  "/user.slice/user-1000.slice/user@1000.service/app.slice/" +
  serviceUnit;
const invocationId = "a".repeat(32);
const runtimeSourceFile = path.resolve(
  "tools/void-economic-epoch2-production-gateway-inactive-runtime-v1.mjs",
);

function fixture() {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-e2-gateway-runtime-evidence-"),
  );
  fs.chmodSync(parent, 0o700);

  const replayRoot = path.join(parent, "replay");
  const statusDir = path.join(parent, "status");
  const outputDir = path.join(parent, "output");
  const unitDir = path.join(parent, "unit");
  for (const directory of [replayRoot, statusDir, outputDir, unitDir]) {
    fs.mkdirSync(directory, { mode: 0o700 });
    fs.chmodSync(directory, 0o700);
  }

  const statusFile = path.join(statusDir, "runtime.json");
  const outputFile = path.join(outputDir, "evidence.json");
  const unitFile = path.join(unitDir, serviceUnit);
  const unitText = [
    "[Unit]",
    "Description=VOID Epoch-2 production gateway inactive runtime",
    "[Service]",
    "Type=simple",
    "ExecStart=/usr/bin/node /repo/" +
      "tools/void-economic-epoch2-production-gateway-inactive-runtime-v1.mjs",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");
  fs.writeFileSync(unitFile, unitText, { mode: 0o644 });

  prepareVoidEconomicEpoch2ProductionGatewayInactiveRuntimeV1({
    confirmation:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_INACTIVE_RUNTIME_CONFIRMATION_V1,
    replayRoot,
    statusFile,
    observedAtUtc: "2030-01-01T00:00:00Z",
    runtimeSourceFile,
    hostname,
    pid: 4242,
    uid: operatorUid,
  });

  const runtimeSourceSha256 = sha256(
    fs.readFileSync(runtimeSourceFile),
  );
  const unitFileSha256 = sha256(fs.readFileSync(unitFile));

  const contract = {
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_SERVICE_CONTRACT_V1,
    version: 1,
    hostname,
    service_unit: serviceUnit,
    unit_file_sha256: unitFileSha256,
    runtime_source_sha256: runtimeSourceSha256,
    replay_root_path_sha256: sha256(Buffer.from(replayRoot, "utf8")),
    status_file_path_sha256: sha256(Buffer.from(statusFile, "utf8")),
    max_evidence_age_seconds: 60,
    systemd_user_service_required: true,
    current_operator_uid_required: true,
    same_uid_process_model_accepted: true,
    private_startup_receipt_required: true,
    no_service_socket_fds_required: true,
    runtime_route_active_required: false,
    public_submission_open_required: false,
    transaction_submission_required: false,
    transaction_broadcast_required: false,
    authoritative_chain2050_write_required: false,
    contract_id: "voide2grc1_" + "0".repeat(64),
  };
  contract.contract_id =
    voidEconomicEpoch2ProductionGatewayRuntimeServiceContractIdV1(
      contract,
    );

  return {
    parent,
    replayRoot,
    statusFile,
    outputFile,
    unitFile,
    contract,
  };
}

function adapters({
  now = "2030-01-01T00:00:10Z",
  mainPid = 4242,
  socketInodes = [],
  uidByPid = {},
  changeSecondSnapshot = false,
} = {}) {
  let showCalls = 0;
  return {
    hostname: () => hostname,
    uid: () => operatorUid,
    nowUtcSeconds: () => now,
    systemctlShow: (unit) => {
      showCalls += 1;
      return {
        service_unit: unit,
        active_state: "active",
        sub_state: "running",
        main_pid: mainPid,
        control_group: controlGroup,
        invocation_id:
          changeSecondSnapshot && showCalls > 1
            ? "b".repeat(32)
            : invocationId,
        fragment_path: currentFixture.unitFile,
      };
    },
    cgroupPids: () => [mainPid, 4243],
    processFacts: (pid) => ({
      pid,
      uid: uidByPid[pid] ?? operatorUid,
      start_time_ticks:
        pid === mainPid ? "100000" : "100001",
      cgroup_path: controlGroup,
      netns_inode: "777",
      socket_inodes:
        pid === mainPid ? [...socketInodes] : [],
    }),
  };
}

function collect(f, adapterOverrides = {}, overrides = {}) {
  currentFixture = f;
  return collectVoidEconomicEpoch2ProductionGatewayRuntimeEvidenceCandidateV1({
    confirmation:
      overrides.confirmation ??
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CONFIRMATION_V1,
    expectedServiceContractId:
      overrides.expectedServiceContractId ?? f.contract.contract_id,
    serviceContract:
      overrides.serviceContract ?? f.contract,
    replayRoot: overrides.replayRoot ?? f.replayRoot,
    statusFile: overrides.statusFile ?? f.statusFile,
    runtimeSourceFile:
      overrides.runtimeSourceFile ?? runtimeSourceFile,
    outputPath:
      Object.hasOwn(overrides, "outputPath")
        ? overrides.outputPath
        : f.outputFile,
    adapters: adapters(adapterOverrides),
  });
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

let currentFixture = null;

assert.equal(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1,
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1",
);
assert.equal(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CONFIRMATION_V1,
  "collectVoidEconomicEpoch2ProductionGatewayRuntimeEvidence",
);

{
  const nonexistent = path.join(
    os.tmpdir(),
    "void-e2-gateway-runtime-evidence-missing-" + String(process.pid),
  );
  rejects(
    () =>
      collectVoidEconomicEpoch2ProductionGatewayRuntimeEvidenceCandidateV1({
        confirmation: "wrong",
        expectedServiceContractId: "bad",
        serviceContract: {},
        replayRoot: nonexistent,
        statusFile: nonexistent + ".status",
        runtimeSourceFile: nonexistent + ".mjs",
        adapters: {},
      }),
    "runtime_evidence_confirmation_required",
  );
}

{
  const f = fixture();
  currentFixture = f;
  try {
    const result = collect(f);
    assert.equal(result.output_written, true);
    assert.equal(result.service_action_performed, false);
    assert.equal(result.network_request_performed, false);
    assert.equal(result.transaction_submission, false);
    assert.equal(result.transaction_broadcast, false);
    assert.equal(result.authoritative_chain2050_write, false);
    assert.equal(result.migration_authorized, false);
    assert.equal(result.public_activation_authorized, false);
    assert.equal(result.funds_movement, false);
    assert.equal(
      result.production_gateway_replay_store_binding_verified,
      false,
    );
    assert.equal(result.cross_epoch_replay_protection_proven, false);

    const e = result.evidence;
    assert.equal(
      e.status,
      "RUNTIME_BINDING_EVIDENCE_CANDIDATE_REVIEW_REQUIRED",
    );
    assert.equal(e.chain_id, 2050);
    assert.equal(e.execution_epoch, 2);
    assert.equal(e.service_contract_id, f.contract.contract_id);
    assert.equal(e.hostname, hostname);
    assert.equal(e.service_unit, serviceUnit);
    assert.equal(e.unit_file_sha256, f.contract.unit_file_sha256);
    assert.equal(
      e.runtime_source_sha256,
      f.contract.runtime_source_sha256,
    );
    assert.match(e.startup_receipt_id, /^voide2grt1_[0-9a-f]{64}$/u);
    assert.match(e.startup_receipt_file_sha256, /^[0-9a-f]{64}$/u);
    assert.equal(e.replay_root_path_sha256, f.contract.replay_root_path_sha256);
    assert.equal(e.replay_root_mode, "0700");
    assert.equal(e.replay_root_identity_stable, true);
    assert.equal(e.systemd_service_active, true);
    assert.equal(e.systemd_service_running, true);
    assert.equal(e.service_main_pid, 4242);
    assert.equal(e.service_main_pid_start_time_ticks, "100000");
    assert.equal(e.service_invocation_id, invocationId);
    assert.equal(e.service_cgroup_member_count, 2);
    assert.equal(e.all_service_processes_current_uid, true);
    assert.equal(e.same_uid_process_model_observed, true);
    assert.equal(e.network_namespace_consistent, true);
    assert.equal(e.service_socket_fd_count, 0);
    assert.equal(e.no_service_socket_fds_observed, true);
    assert.equal(e.runtime_process_binding_constructed, true);
    assert.equal(e.replay_root_binding_receipt_verified, true);
    assert.equal(
      e.production_gateway_replay_store_binding_source_verified,
      true,
    );
    assert.equal(
      e.production_gateway_replay_store_binding_evidence_candidate,
      true,
    );
    assert.equal(e.upstream_live_evidence_semantically_verified, false);
    assert.equal(e.runtime_service_identity_verified, false);
    assert.equal(e.same_uid_process_model_verified, false);
    assert.equal(e.production_gateway_replay_store_binding_verified, false);
    assert.equal(e.runtime_route_active, false);
    assert.equal(e.public_submission_open, false);
    assert.equal(e.transaction_submission, false);
    assert.equal(e.transaction_broadcast, false);
    assert.equal(e.authoritative_chain2050_write, false);
    assert.equal(e.cross_epoch_replay_protection_proven, false);
    assert.equal(e.observed_at_utc, "2030-01-01T00:00:00Z");
    assert.equal(e.evaluated_at_utc, "2030-01-01T00:00:10Z");
    assert.equal(e.valid_until_utc, "2030-01-01T00:01:00Z");
    assert.equal(e.migration_authorized, false);
    assert.equal(e.public_activation_authorized, false);
    assert.equal(e.funds_movement_authorized, false);
    assert.match(e.evidence_id, /^voide2gre1_[0-9a-f]{64}$/u);
    assert.equal(
      voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1(e),
      e.evidence_id,
    );

    const outputStat = fs.lstatSync(result.output_path);
    assert.equal(outputStat.isFile(), true);
    assert.equal(outputStat.isSymbolicLink(), false);
    assert.equal(outputStat.mode & 0o777, 0o600);
    const output = JSON.parse(fs.readFileSync(result.output_path, "utf8"));
    assert.equal(output.evidence_id, e.evidence_id);

    rejects(
      () => collect(f),
      "evidence_output_create_failed",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  currentFixture = f;
  try {
    rejects(
      () =>
        collect(f, {}, {
          expectedServiceContractId:
            "voide2grc1_" + "f".repeat(64),
          outputPath: null,
        }),
      "runtime_service_contract_id_mismatch",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  currentFixture = f;
  try {
    fs.appendFileSync(f.unitFile, "# drift\n");
    rejects(
      () => collect(f, {}, { outputPath: null }),
      "service_unit_file_sha256_mismatch",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  currentFixture = f;
  try {
    rejects(
      () => collect(f, { mainPid: 4243 }, { outputPath: null }),
      "startup_receipt_contract_mismatch",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  currentFixture = f;
  try {
    rejects(
      () =>
        collect(
          f,
          { uidByPid: { 4243: operatorUid + 1 } },
          { outputPath: null },
        ),
      "service_process_facts_invalid",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  currentFixture = f;
  try {
    rejects(
      () =>
        collect(
          f,
          { socketInodes: ["12345"] },
          { outputPath: null },
        ),
      "service_socket_fd_detected",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  currentFixture = f;
  try {
    rejects(
      () =>
        collect(
          f,
          { changeSecondSnapshot: true },
          { outputPath: null },
        ),
      "service_snapshot_changed_during_collection",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  currentFixture = f;
  try {
    rejects(
      () =>
        collect(
          f,
          { now: "2030-01-01T00:02:00Z" },
          { outputPath: null },
        ),
      "startup_receipt_stale",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  currentFixture = f;
  try {
    fs.chmodSync(f.replayRoot, 0o755);
    rejects(
      () => collect(f, {}, { outputPath: null }),
      "runtime_replay_root_custody_invalid",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  currentFixture = f;
  try {
    const receipt = JSON.parse(fs.readFileSync(f.statusFile, "utf8"));
    receipt.receipt_id = "voide2grt1_" + "f".repeat(64);
    fs.writeFileSync(f.statusFile, JSON.stringify(receipt, null, 2) + "\n", {
      mode: 0o600,
    });
    rejects(
      () => collect(f, {}, { outputPath: null }),
      "startup_receipt_id_mismatch",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_AUTHORITY_V1,
)) {
  if (
    [
      "source_runtime_evidence_collection",
      "systemd_readonly_inspection",
      "procfs_readonly_inspection",
      "filesystem_metadata_read",
      "private_status_receipt_read",
      "private_evidence_write",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-production-gateway-runtime-evidence-candidate-v1.mjs",
  "utf8",
);
assert.match(source, /spawnSync\(\s*"systemctl"/);
assert.match(source, /"--user"/);
assert.match(source, /"show"/);
assert.doesNotMatch(source, /"start"/);
assert.doesNotMatch(source, /"stop"/);
assert.doesNotMatch(source, /"restart"/);
assert.doesNotMatch(source, /"enable"/);
assert.doesNotMatch(source, /"disable"/);
assert.doesNotMatch(source, /\/cmdline/);
assert.doesNotMatch(source, /\/environ/);
assert.doesNotMatch(source, /ExecStart/);
for (const forbidden of [
  "createServer(",
  ".listen(",
  "fetch(",
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1_PROOF_GREEN",
);
console.log("reviewed_service_contract_id_required=true");
console.log("unit_file_sha256_bound=true");
console.log("runtime_source_sha256_bound=true");
console.log("startup_receipt_id_bound=true");
console.log("systemd_main_pid_bound=true");
console.log("systemd_cgroup_membership_bound=true");
console.log("same_uid_process_model_observed=true");
console.log("no_service_socket_fds_observed=true");
console.log("replay_root_identity_stable=true");
console.log("argv_read=false");
console.log("environment_read=false");
console.log("service_action=false");
console.log("network_request=false");
console.log("production_gateway_replay_store_binding_evidence_candidate=true");
console.log("upstream_live_evidence_semantically_verified=false");
console.log("runtime_service_identity_verified=false");
console.log("same_uid_process_model_verified=false");
console.log("production_gateway_replay_store_binding_verified=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
