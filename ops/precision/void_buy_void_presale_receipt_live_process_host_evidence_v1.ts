#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectBuyVoidV2LiveProcessCollectionPlanV1,
  type BuyVoidV2LiveProcessCollectionPlanV1,
} from "./void_buy_void_source_finality_live_process_v2_collection_plan_v1.js";
import {
  VOID_BUY_VOID_V7_DEPLOYMENT_RECEIPT_PATH_V1,
  buildBuyVoidV2LiveProcessReceiptFromPlanV1,
  requalifyBuyVoidV2LiveSourceCustodyV1,
} from "./void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.js";
import {
  verifyBuyVoidSourceFinalityDeploymentReceiptV7,
} from "../../src/economic/buy_void_source_finality_generation_provenance_v7.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2,
  type BuyVoidSourceFinalityLiveProcessBindingReceiptV2,
} from "../../src/economic/buy_void_source_finality_live_process_binding_v2.js";

export const MARKER =
  "VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V1";
export const SCHEMA =
  "void_buy_void_presale_receipt_live_process_host_evidence_v1";
export const PARENT_PLAN_ID =
  "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab";

const MAX_RECEIPT_BYTES = 64 * 1024;
const UINT = /^[1-9][0-9]*$/u;

type EvidenceReport = Readonly<{
  schema: typeof SCHEMA;
  marker: typeof MARKER;
  version: 1;
  parent_host_evidence_plan_id: typeof PARENT_PLAN_ID;
  status:
    "AUTHENTICATED_RECEIPT_AND_SAME_LIVE_PROCESS_EVIDENCE_GREEN_PRODUCTION_AUTHORITY_STILL_HOLD";
  runtime_uid: number;
  runtime_gid: number;
  deployment_receipt_id: string;
  live_process_collection_plan_id: string;
  live_process_binding_receipt_id: string;
  process_source_commit: string;
  process_source_tree: string;
  systemd_invocation_id: string;
  service_pid: number;
  service_start_time_ticks: string;
  manager_pid: number;
  manager_start_time_ticks: string;
  authenticated_receipt_verified: true;
  source_custody_requalified: true;
  selector_generation_verified: true;
  same_live_process_binding_verified: true;
  installed_live_process_receipt_exact_bytes_match: true;
  pre_post_live_generation_stable: true;
  process_environment_read_performed: true;
  selector_process_execution_performed: true;
  source_custody_process_execution_performed: true;
  filesystem_read_performed: true;
  filesystem_write_performed: false;
  network_contact_performed: false;
  receipt_publication_performed: false;
  receipt_retirement_performed: false;
  service_mutation_performed: false;
  credential_access: false;
  wallet_or_signer_access: false;
  signing: false;
  transaction_submission: false;
  payment_acceptance: false;
  public_presale_activation: false;
  wc_void_market_activation: false;
  treasury_or_liquidity_action: false;
  funds_movement: false;
  production_host_evidence_authority: false;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function positive(raw: unknown, code: string): number {
  const text = String(raw ?? "");
  if (!UINT.test(text)) fail(code);
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function canonicalReceiptBytes(
  receipt: BuyVoidSourceFinalityLiveProcessBindingReceiptV2,
): Buffer {
  const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n", "utf8");
  if (bytes.length < 2 || bytes.length > MAX_RECEIPT_BYTES) {
    fail("host_evidence_derived_receipt_size_invalid");
  }
  return bytes;
}

function sameStat(a: fs.Stats, b: fs.Stats): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.uid === b.uid &&
    a.gid === b.gid &&
    a.mode === b.mode &&
    a.nlink === b.nlink &&
    a.size === b.size &&
    a.mtimeMs === b.mtimeMs &&
    a.ctimeMs === b.ctimeMs
  );
}

function proveRootAncestors(file: string): void {
  let cursor = path.dirname(file);
  for (;;) {
    const st = fs.lstatSync(cursor);
    if (
      !st.isDirectory() ||
      st.isSymbolicLink() ||
      st.uid !== 0 ||
      (st.mode & 0o022) !== 0
    ) {
      fail("host_evidence_receipt_ancestor_untrusted");
    }
    const next = path.dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }
}

function readInstalledLiveReceiptExact(expected: Buffer): void {
  const target = VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2;
  if (!path.isAbsolute(target) || path.resolve(target) !== target) {
    fail("host_evidence_live_receipt_path_invalid");
  }
  proveRootAncestors(target);
  const before = fs.lstatSync(target);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.uid !== 0 ||
    before.gid !== 0 ||
    before.nlink !== 1 ||
    (before.mode & 0o777) !== 0o444 ||
    before.size < 2 ||
    before.size > MAX_RECEIPT_BYTES ||
    before.size !== expected.length
  ) {
    fail("host_evidence_live_receipt_custody_invalid");
  }

  const fd = fs.openSync(
    target,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const opened = fs.fstatSync(fd);
    if (!sameStat(before, opened)) {
      fail("host_evidence_live_receipt_open_identity_mismatch");
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(8192);
      const count = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (count === 0) break;
      total += count;
      if (total > MAX_RECEIPT_BYTES || total > expected.length) {
        fail("host_evidence_live_receipt_read_too_large");
      }
      chunks.push(chunk.subarray(0, count));
    }
    const observed = Buffer.concat(chunks, total);
    const after = fs.fstatSync(fd);
    const visible = fs.lstatSync(target);
    if (
      !sameStat(opened, after) ||
      !sameStat(after, visible) ||
      observed.length !== after.size
    ) {
      fail("host_evidence_live_receipt_changed_during_read");
    }
    if (!observed.equals(expected)) {
      fail("host_evidence_live_receipt_not_current_process_generation");
    }
  } finally {
    fs.closeSync(fd);
  }
}

function assertPlanAuthority(plan: BuyVoidV2LiveProcessCollectionPlanV1): void {
  if (
    plan.receipt_publication_authorized !== false ||
    plan.production_source_finality_authority_ready !== false ||
    plan.public_presale_activation !== false ||
    plan.funds_movement !== false ||
    plan.filesystem_write_performed !== false ||
    plan.network_contact_performed !== false ||
    plan.source_generation_verified !== true ||
    plan.reviewed_launcher_shape_verified !== true ||
    plan.selector_ready_and_green_same_generation !== true ||
    plan.manager_and_service_pidfds_retained_by_selector !== true ||
    plan.systemctl_user_selector_authority !== false
  ) {
    fail("host_evidence_collection_plan_authority_invalid");
  }
}

function assertSameLiveGeneration(
  first: BuyVoidV2LiveProcessCollectionPlanV1,
  second: BuyVoidV2LiveProcessCollectionPlanV1,
): void {
  for (const key of [
    "plan_id",
    "runtime_uid",
    "runtime_gid",
    "manager_pid",
    "manager_start_time_ticks",
    "manager_cmdline_sha256",
    "service_pid",
    "service_start_time_ticks",
    "service_cmdline_sha256",
    "service_cgroup_v2_path",
    "process_source_identity_marker",
    "process_source_commit",
    "process_source_tree",
    "process_source_branch",
    "systemd_invocation_id",
    "cwd_realpath",
    "node_options_sha256",
  ] as const) {
    if (first[key] !== second[key]) {
      fail("host_evidence_live_generation_changed:" + key);
    }
  }
}

function deploymentDecision(
  plan: BuyVoidV2LiveProcessCollectionPlanV1,
) {
  return verifyBuyVoidSourceFinalityDeploymentReceiptV7({
    deployment_receipt_path: VOID_BUY_VOID_V7_DEPLOYMENT_RECEIPT_PATH_V1,
    process_source_identity: {
      marker: plan.process_source_identity_marker,
      commit: plan.process_source_commit,
      tree: plan.process_source_tree,
      branch: "main",
    },
  });
}

export async function collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1(input: {
  runtime_uid: number;
  runtime_gid: number;
}): Promise<EvidenceReport> {
  if (process.platform !== "linux") fail("host_evidence_linux_required");
  if (typeof process.geteuid !== "function" || process.geteuid() !== 0) {
    fail("host_evidence_root_required");
  }

  const uid = positive(input.runtime_uid, "host_evidence_runtime_uid_invalid");
  const gid = positive(input.runtime_gid, "host_evidence_runtime_gid_invalid");

  const first = await collectBuyVoidV2LiveProcessCollectionPlanV1({
    runtime_uid: uid,
    runtime_gid: gid,
  });
  assertPlanAuthority(first);

  const deploymentFirst = deploymentDecision(first);
  if (deploymentFirst.ok !== true) {
    fail("host_evidence_deployment_receipt_not_verified:" + deploymentFirst.reason);
  }

  const custodyFirst = requalifyBuyVoidV2LiveSourceCustodyV1(first);
  assert.equal(custodyFirst.source_custody_proven, true);
  assert.equal(custodyFirst.reviewed_service_contract_proven, true);

  const derivedFirst = buildBuyVoidV2LiveProcessReceiptFromPlanV1({
    plan: first,
    deployment_receipt_id: deploymentFirst.deployment_receipt_id,
  });
  const derivedFirstBytes = canonicalReceiptBytes(derivedFirst);
  readInstalledLiveReceiptExact(derivedFirstBytes);

  const second = await collectBuyVoidV2LiveProcessCollectionPlanV1({
    runtime_uid: uid,
    runtime_gid: gid,
  });
  assertPlanAuthority(second);
  assertSameLiveGeneration(first, second);

  const deploymentSecond = deploymentDecision(second);
  if (deploymentSecond.ok !== true) {
    fail("host_evidence_deployment_receipt_recheck_failed:" + deploymentSecond.reason);
  }
  if (
    deploymentSecond.deployment_receipt_id !==
    deploymentFirst.deployment_receipt_id
  ) {
    fail("host_evidence_deployment_receipt_identity_changed");
  }

  const custodySecond = requalifyBuyVoidV2LiveSourceCustodyV1(second);
  assert.equal(custodySecond.source_custody_proven, true);
  assert.equal(custodySecond.reviewed_service_contract_proven, true);

  const derivedSecond = buildBuyVoidV2LiveProcessReceiptFromPlanV1({
    plan: second,
    deployment_receipt_id: deploymentSecond.deployment_receipt_id,
  });
  const derivedSecondBytes = canonicalReceiptBytes(derivedSecond);
  if (!derivedSecondBytes.equals(derivedFirstBytes)) {
    fail("host_evidence_derived_receipt_changed");
  }
  readInstalledLiveReceiptExact(derivedSecondBytes);

  return Object.freeze({
    schema: SCHEMA,
    marker: MARKER,
    version: 1,
    parent_host_evidence_plan_id: PARENT_PLAN_ID,
    status:
      "AUTHENTICATED_RECEIPT_AND_SAME_LIVE_PROCESS_EVIDENCE_GREEN_PRODUCTION_AUTHORITY_STILL_HOLD",
    runtime_uid: uid,
    runtime_gid: gid,
    deployment_receipt_id: deploymentFirst.deployment_receipt_id,
    live_process_collection_plan_id: first.plan_id,
    live_process_binding_receipt_id: derivedFirst.receipt_id,
    process_source_commit: first.process_source_commit,
    process_source_tree: first.process_source_tree,
    systemd_invocation_id: first.systemd_invocation_id,
    service_pid: first.service_pid,
    service_start_time_ticks: first.service_start_time_ticks,
    manager_pid: first.manager_pid,
    manager_start_time_ticks: first.manager_start_time_ticks,
    authenticated_receipt_verified: true,
    source_custody_requalified: true,
    selector_generation_verified: true,
    same_live_process_binding_verified: true,
    installed_live_process_receipt_exact_bytes_match: true,
    pre_post_live_generation_stable: true,
    process_environment_read_performed: true,
    selector_process_execution_performed: true,
    source_custody_process_execution_performed: true,
    filesystem_read_performed: true,
    filesystem_write_performed: false,
    network_contact_performed: false,
    receipt_publication_performed: false,
    receipt_retirement_performed: false,
    service_mutation_performed: false,
    credential_access: false,
    wallet_or_signer_access: false,
    signing: false,
    transaction_submission: false,
    payment_acceptance: false,
    public_presale_activation: false,
    wc_void_market_activation: false,
    treasury_or_liquidity_action: false,
    funds_movement: false,
    production_host_evidence_authority: false,
  });
}

export function testOnlyAssertSameLiveGenerationV1(
  first: BuyVoidV2LiveProcessCollectionPlanV1,
  second: BuyVoidV2LiveProcessCollectionPlanV1,
): void {
  assertSameLiveGeneration(first, second);
}

function selfTest(): void {
  assert.equal(PARENT_PLAN_ID.length, "voidbuyhostevplan1_".length + 64);
  assert.equal(
    VOID_BUY_VOID_V7_DEPLOYMENT_RECEIPT_PATH_V1,
    "/var/lib/void-source-finality-v7/deployment-receipt.json",
  );
  assert.equal(
    VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2,
    "/var/lib/void-source-finality-v7/live-process-binding-v2.json",
  );
  console.log(MARKER + "_SELF_TEST_GREEN");
  console.log("parent_host_evidence_plan_bound=true");
  console.log("deployment_receipt_verifier_required=true");
  console.log("live_selector_collection_required=true");
  console.log("source_custody_requalification_required=true");
  console.log("installed_live_receipt_exact_byte_match_required=true");
  console.log("pre_post_live_generation_stability_required=true");
  console.log("selector_process_execution_performed_by_future_host_run=true");
  console.log("source_custody_process_execution_performed_by_future_host_run=true");
  console.log("filesystem_write_performed=false");
  console.log("network_contact_performed=false");
  console.log("receipt_publication_performed=false");
  console.log("service_mutation_performed=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("production_host_evidence_authority=false");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--self-test") {
    selfTest();
    return;
  }
  if (
    args.length !== 5 ||
    args[0] !== "--run" ||
    args[1] !== "--runtime-uid" ||
    args[3] !== "--runtime-gid"
  ) {
    fail("host_evidence_arguments_invalid");
  }
  const result = await collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1({
    runtime_uid: positive(args[2], "host_evidence_runtime_uid_invalid"),
    runtime_gid: positive(args[4], "host_evidence_runtime_gid_invalid"),
  });
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(MARKER + "_HOLD");
    console.error("reason=" + String((error as Error)?.message || "unknown"));
    console.error("filesystem_write_performed=false");
    console.error("network_contact_performed=false");
    console.error("receipt_publication_performed=false");
    console.error("service_mutation_performed=false");
    console.error("credential_access=false");
    console.error("wallet_or_signer_access=false");
    console.error("signing=false");
    console.error("transaction_submission=false");
    console.error("payment_acceptance=false");
    console.error("public_presale_activation=false");
    console.error("wc_void_market_activation=false");
    console.error("treasury_or_liquidity_action=false");
    console.error("funds_movement=false");
    console.error("production_host_evidence_authority=false");
    process.exitCode = 2;
  });
}
