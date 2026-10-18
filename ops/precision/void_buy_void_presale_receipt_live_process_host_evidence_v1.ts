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
  receipt_ancestor_custody_revalidated: true;
  pre_post_live_generation_stable: true;
  final_post_validation_generation_revalidated: true;
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

type HeldReceiptAncestor = Readonly<{
  path: string;
  fd: number;
  dev: number;
  ino: number;
  uid: number;
  mode: number;
}>;

type ReceiptAncestorStat = Readonly<{
  dev: number;
  ino: number;
  uid: number;
  mode: number;
  isDirectory(): boolean;
}>;

function receiptAncestorStillTrusted(
  held: Pick<HeldReceiptAncestor, "dev" | "ino" | "uid" | "mode">,
  current: ReceiptAncestorStat,
): boolean {
  return (
    current.isDirectory() &&
    current.dev === held.dev &&
    current.ino === held.ino &&
    current.uid === held.uid &&
    (current.mode & 0o777) === held.mode &&
    (current.mode & 0o022) === 0
  );
}

function openRootOwnedReceiptAncestors(file: string): HeldReceiptAncestor[] {
  const noFollow = fs.constants.O_NOFOLLOW;
  const directory = fs.constants.O_DIRECTORY;
  if (
    process.platform !== "linux" ||
    typeof noFollow !== "number" ||
    noFollow <= 0 ||
    typeof directory !== "number" ||
    directory <= 0
  ) {
    fail("host_evidence_receipt_custody_platform_unavailable");
  }

  const heldDirectories: HeldReceiptAncestor[] = [];
  try {
    let cursor = path.dirname(file);
    for (;;) {
      const visible = fs.lstatSync(cursor);
      if (
        !visible.isDirectory() ||
        visible.isSymbolicLink() ||
        visible.uid !== 0 ||
        (visible.mode & 0o022) !== 0
      ) {
        fail("host_evidence_receipt_ancestor_untrusted");
      }
      const fd = fs.openSync(
        cursor,
        fs.constants.O_RDONLY | directory | noFollow,
      );
      const held = fs.fstatSync(fd);
      if (
        !receiptAncestorStillTrusted(
          {
            dev: visible.dev,
            ino: visible.ino,
            uid: visible.uid,
            mode: visible.mode & 0o777,
          },
          held,
        ) ||
        held.uid !== 0
      ) {
        fs.closeSync(fd);
        fail("host_evidence_receipt_ancestor_identity_mismatch");
      }
      heldDirectories.push(
        Object.freeze({
          path: cursor,
          fd,
          dev: held.dev,
          ino: held.ino,
          uid: held.uid,
          mode: held.mode & 0o777,
        }),
      );
      const next = path.dirname(cursor);
      if (next === cursor) break;
      cursor = next;
    }
    return heldDirectories;
  } catch (error) {
    for (let index = heldDirectories.length - 1; index >= 0; index -= 1) {
      fs.closeSync(heldDirectories[index]!.fd);
    }
    throw error;
  }
}

function assertCanonicalReceiptAncestorObservations(
  held: Pick<HeldReceiptAncestor, "dev" | "ino" | "uid" | "mode">,
  before: ReceiptAncestorStat,
  reopened: ReceiptAncestorStat,
  after: ReceiptAncestorStat,
): void {
  for (const current of [before, reopened, after]) {
    if (!receiptAncestorStillTrusted(held, current)) {
      fail("host_evidence_receipt_ancestor_namespace_changed");
    }
  }
}

function revalidateReceiptAncestors(
  heldDirectories: readonly HeldReceiptAncestor[],
): void {
  const noFollow = fs.constants.O_NOFOLLOW;
  const directory = fs.constants.O_DIRECTORY;
  for (const held of heldDirectories) {
    const current = fs.fstatSync(held.fd);
    if (!receiptAncestorStillTrusted(held, current)) {
      fail("host_evidence_receipt_ancestor_changed_during_read");
    }

    let reopenedFd = -1;
    let visibleBefore: fs.Stats;
    let reopened: fs.Stats;
    let visibleAfter: fs.Stats;
    try {
      visibleBefore = fs.lstatSync(held.path);
      reopenedFd = fs.openSync(
        held.path,
        fs.constants.O_RDONLY | directory | noFollow,
      );
      reopened = fs.fstatSync(reopenedFd);
      visibleAfter = fs.lstatSync(held.path);
    } catch {
      fail("host_evidence_receipt_ancestor_namespace_unavailable");
    } finally {
      if (reopenedFd >= 0) fs.closeSync(reopenedFd);
    }
    assertCanonicalReceiptAncestorObservations(
      held,
      visibleBefore!,
      reopened!,
      visibleAfter!,
    );
  }
}

export function testOnlyAssertReceiptAncestorStableV1(
  held: Readonly<{ dev: number; ino: number; uid: number; mode: number }>,
  current: Readonly<{
    dev: number;
    ino: number;
    uid: number;
    mode: number;
    directory: boolean;
  }>,
): void {
  if (
    !receiptAncestorStillTrusted(held, {
      dev: current.dev,
      ino: current.ino,
      uid: current.uid,
      mode: current.mode,
      isDirectory: () => current.directory,
    })
  ) {
    fail("host_evidence_receipt_ancestor_changed_during_read");
  }
}

export function testOnlyAssertReceiptCanonicalAncestorStableV1(
  held: Readonly<{ dev: number; ino: number; uid: number; mode: number }>,
  before: Readonly<{
    dev: number;
    ino: number;
    uid: number;
    mode: number;
    directory: boolean;
  }>,
  reopened: Readonly<{
    dev: number;
    ino: number;
    uid: number;
    mode: number;
    directory: boolean;
  }>,
  after: Readonly<{
    dev: number;
    ino: number;
    uid: number;
    mode: number;
    directory: boolean;
  }>,
): void {
  const wrap = (value: typeof before): ReceiptAncestorStat => ({
    dev: value.dev,
    ino: value.ino,
    uid: value.uid,
    mode: value.mode,
    isDirectory: () => value.directory,
  });
  assertCanonicalReceiptAncestorObservations(
    held,
    wrap(before),
    wrap(reopened),
    wrap(after),
  );
}

function readInstalledLiveReceiptExact(expected: Buffer): void {
  const target = VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2;
  if (!path.isAbsolute(target) || path.resolve(target) !== target) {
    fail("host_evidence_live_receipt_path_invalid");
  }

  const heldDirectories = openRootOwnedReceiptAncestors(target);
  let fd = -1;
  try {
    const parent = heldDirectories[0];
    if (!parent) fail("host_evidence_receipt_parent_missing");
    const leafViaParent =
      `/proc/self/fd/${parent.fd}/${path.basename(target)}`;

    const before = fs.lstatSync(leafViaParent);
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

    fd = fs.openSync(
      leafViaParent,
      fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
    );
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
    const visible = fs.lstatSync(leafViaParent);
    if (
      !sameStat(opened, after) ||
      !sameStat(after, visible) ||
      observed.length !== after.size
    ) {
      fail("host_evidence_live_receipt_changed_during_read");
    }

    revalidateReceiptAncestors(heldDirectories);

    if (!observed.equals(expected)) {
      fail("host_evidence_live_receipt_not_current_process_generation");
    }
  } finally {
    if (fd >= 0) fs.closeSync(fd);
    for (let index = heldDirectories.length - 1; index >= 0; index -= 1) {
      fs.closeSync(heldDirectories[index]!.fd);
    }
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

  // Final selector observation occurs only after all B-side deployment,
  // source-custody, derivation and installed-receipt checks. No selector
  // pidfd/lifecycle lease survives collect(), so this third boundary proves
  // the validated generation is still live at the end of validation.
  const finalGeneration = await collectBuyVoidV2LiveProcessCollectionPlanV1({
    runtime_uid: uid,
    runtime_gid: gid,
  });
  assertPlanAuthority(finalGeneration);
  assertSameLiveGeneration(first, finalGeneration);
  assertSameLiveGeneration(second, finalGeneration);

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
    receipt_ancestor_custody_revalidated: true,
    pre_post_live_generation_stable: true,
    final_post_validation_generation_revalidated: true,
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

export function testOnlyAssertFinalLiveGenerationV1(
  first: BuyVoidV2LiveProcessCollectionPlanV1,
  second: BuyVoidV2LiveProcessCollectionPlanV1,
  finalGeneration: BuyVoidV2LiveProcessCollectionPlanV1,
): void {
  assertSameLiveGeneration(first, second);
  assertSameLiveGeneration(first, finalGeneration);
  assertSameLiveGeneration(second, finalGeneration);
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
  console.log("receipt_ancestor_descriptor_custody_required=true");
  console.log("receipt_ancestor_post_read_revalidation_required=true");
  console.log("pre_post_live_generation_stability_required=true");
  console.log("final_post_validation_generation_revalidation_required=true");
  console.log("three_selector_observations_required=true");
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
