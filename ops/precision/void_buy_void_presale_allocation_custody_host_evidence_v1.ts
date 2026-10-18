#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  inspectBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyEvidenceV1,
} from "../../tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs";
import {
  inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1,
} from "../../tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs";
import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1,
} from "../../src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_second_control_composition_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_REQUIRED_FUTURE_EVIDENCE_V1,
  classifyBuyVoidAllocationCustodyLiveDurabilityRollbackContractV1,
} from "../../tools/void-buy-allocation-custody-live-durability-rollback-contract-v1.mjs";

export const MARKER =
  "VOID_BUY_VOID_PRESALE_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1";
export const SCHEMA =
  "void_buy_void_presale_allocation_custody_host_evidence_v1";
export const PARENT_PLAN_ID =
  "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab";

const HOSTNAME = "zoso-Precision-Tower-7810";
const JOURNAL_ROOT =
  "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1";
const HIGH_WATER_ROOT =
  "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1";
const JOURNAL_PATH = JOURNAL_ROOT + "/live-read-replay-v1.jsonl";
const HIGH_WATER_PATH =
  HIGH_WATER_ROOT + "/live-read-replay-high-water-v1.json";

const MAX_OPERATOR_RECEIPT_BYTES = 512 * 1024;
const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 512 * 1024;
const MAX_EXTERNAL_WITNESS_BYTES = 8 * 1024 * 1024;
const MAX_POLICY_RECEIPT_BYTES = 512 * 1024;
const O_NOFOLLOW = Number(fs.constants.O_NOFOLLOW || 0);

type StableRead = Readonly<{
  path: string;
  bytes: Buffer;
  sha256: string;
  dev: number;
  ino: number;
  uid: number;
  gid: number;
  mode: number;
  nlink: number;
  size: number;
  mtime_ms: number;
  ctime_ms: number;
}>;

type EvidenceReport = Readonly<{
  schema: typeof SCHEMA;
  marker: typeof MARKER;
  version: 1;
  parent_host_evidence_plan_id: typeof PARENT_PLAN_ID;
  status:
    "ALLOCATION_CUSTODY_PREREQUISITES_GREEN_CONTROLLED_CHALLENGE_REQUIRED";
  expected_hostname: typeof HOSTNAME;
  journal_root: typeof JOURNAL_ROOT;
  high_water_root: typeof HIGH_WATER_ROOT;
  rollback_policy_receipt_sha256: string;
  reviewed_operator_receipt_sha256: string;
  current_journal_sha256: string;
  current_high_water_sha256: string;
  external_witness_sha256: string;
  rollback_independence_policy_qualified: true;
  live_policy_observation_proven: true;
  policy_file_installation_proven: true;
  reviewed_external_custody_qualification_bound: true;
  external_transport_authenticated: true;
  external_witness_storage_proven: true;
  live_remote_read_performed: true;
  live_remote_append_performed: true;
  external_second_control_domain_qualified: true;
  external_second_control_policy_binding_proven: true;
  post_cycle_live_policy_observation_bound: true;
  source_contract_ready: true;
  reviewed_prerequisites_bound: true;
  read_only_collection_sufficient: false;
  controlled_live_challenge_required: true;
  reviewed_source_generation_binding_required: true;
  next_action:
    "SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1";
  live_policy_enforcement_proven: false;
  live_rollback_test_performed: false;
  live_durable_storage_proven: false;
  rollback_resistance_proven: false;
  protected_high_water_custody_proven: false;
  independent_custody_proven: false;
  runtime_integration: false;
  production_gate_ready: false;
  filesystem_read_performed: true;
  filesystem_write_performed: false;
  process_execution_performed: true;
  process_execution_read_only_contract: true;
  transitive_storage_identity_helper_execution_required: true;
  installation_storage_generation_bound: true;
  installation_qualification_id: string;
  network_contact_performed: false;
  mount_mutation_performed: false;
  backup_mutation_performed: false;
  snapshot_mutation_performed: false;
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

function sha256(raw: Buffer): string {
  return "sha256:" + crypto.createHash("sha256").update(raw).digest("hex");
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

function stableReadAbsolute(
  inputPath: string,
  maximumBytes: number,
  code: string,
): StableRead {
  if (
    !path.isAbsolute(inputPath) ||
    path.resolve(inputPath) !== inputPath ||
    inputPath.length > 4096
  ) {
    fail(code + "_path_invalid");
  }
  const before = fs.lstatSync(inputPath);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1 ||
    before.size < 1 ||
    before.size > maximumBytes
  ) {
    fail(code + "_metadata_invalid");
  }

  const fd = fs.openSync(inputPath, fs.constants.O_RDONLY | O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(fd);
    if (!sameStat(before, opened)) fail(code + "_open_identity_mismatch");

    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(64 * 1024);
      const count = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (count === 0) break;
      total += count;
      if (total > maximumBytes) fail(code + "_read_too_large");
      chunks.push(chunk.subarray(0, count));
    }
    const bytes = Buffer.concat(chunks, total);
    const after = fs.fstatSync(fd);
    const visible = fs.lstatSync(inputPath);
    if (
      !sameStat(opened, after) ||
      !sameStat(after, visible) ||
      bytes.length !== after.size
    ) {
      fail(code + "_changed_during_read");
    }
    return Object.freeze({
      path: inputPath,
      bytes,
      sha256: sha256(bytes),
      dev: before.dev,
      ino: before.ino,
      uid: before.uid,
      gid: before.gid,
      mode: before.mode & 0o7777,
      nlink: before.nlink,
      size: before.size,
      mtime_ms: before.mtimeMs,
      ctime_ms: before.ctimeMs,
    });
  } finally {
    fs.closeSync(fd);
  }
}

function assertLivePolicy(result: any): void {
  if (
    !result ||
    result.ok !== true ||
    result.status !== "LIVE_ROLLBACK_POLICY_OBSERVED" ||
    result.operation_performed !== false ||
    result.root_owned_policy_file_observed !== true ||
    result.rollback_independence_policy_qualified !== true ||
    result.installation_storage_rebound !== true ||
    result.bounded_policy_freshness_checked !== true ||
    result.policy_file_installation_proven !== true ||
    result.live_policy_observation_proven !== true ||
    result.verification_clock_authority_proven !== false ||
    result.policy_generation_monotonicity_proven !== false ||
    result.live_policy_enforcement_proven !== false ||
    result.live_rollback_test_performed !== false ||
    result.live_durable_storage_proven !== false ||
    result.rollback_resistance_proven !== false ||
    result.protected_high_water_custody_proven !== false ||
    result.independent_custody_proven !== false ||
    result.production_gate_ready !== false ||
    result.funds_movement !== false
  ) {
    fail(
      "allocation_custody_live_policy_hold:" +
        String(result?.reason || result?.status || "invalid"),
    );
  }
}

export function testOnlyAssertLivePolicyV1(result: unknown): void {
  assertLivePolicy(result);
}

function assertSecondControl(result: any): void {
  if (
    !result ||
    result.ok !== true ||
    result.status !== "rollback_second_control_composed" ||
    result.operation_performed !== false ||
    result.reviewed_live_rollback_policy_receipt_bound !== true ||
    result.reviewed_external_custody_qualification_bound !== true ||
    result.same_replay_high_water_bound !== true ||
    result.same_precision_storage_identity_bound !== true ||
    result.rollback_independence_policy_qualified !== true ||
    result.live_policy_observation_proven !== true ||
    result.policy_file_installation_proven !== true ||
    result.external_transport_authenticated !== true ||
    result.external_witness_storage_proven !== true ||
    result.live_remote_read_performed !== true ||
    result.live_remote_append_performed !== true ||
    result.external_second_control_domain_qualified !== true ||
    result.external_second_control_policy_binding_proven !== true ||
    result.post_cycle_live_policy_observation_bound !== true ||
    result.live_policy_enforcement_proven !== false ||
    result.live_rollback_test_performed !== false ||
    result.live_durable_storage_proven !== false ||
    result.rollback_resistance_proven !== false ||
    result.protected_high_water_custody_proven !== false ||
    result.independent_custody_proven !== false ||
    result.runtime_integration !== false ||
    result.production_gate_ready !== false ||
    result.funds_movement !== false
  ) {
    fail(
      "allocation_custody_second_control_hold:" +
        String(result?.reason || result?.status || "invalid"),
    );
  }
}

export function testOnlyAssertSecondControlV1(result: unknown): void {
  assertSecondControl(result);
}

function assertInstallationEvidence(result: any): void {
  if (
    !result ||
    result.ok !== true ||
    result.status !== "LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED" ||
    result.operation_performed !== false ||
    result.storage_domain_classification_green !== true ||
    result.live_storage_observation_proven !== true ||
    result.distinct_local_storage_domains_proven !== true ||
    result.distinct_parent_block_devices_proven !== true ||
    result.canonical_journal_high_water_binding_proven !== true ||
    result.no_pending_publication_intent_observed !== true ||
    result.double_census_stability_proven !== true ||
    result.live_durable_storage_proven !== false ||
    result.rollback_resistance_proven !== false ||
    result.protected_high_water_custody_proven !== false ||
    result.independent_custody_proven !== false ||
    result.runtime_integration !== false ||
    result.production_gate_ready !== false ||
    result.funds_movement !== false ||
    !result.normalized ||
    typeof result.qualification_id !== "string"
  ) {
    fail(
      "allocation_custody_installation_evidence_hold:" +
        String(result?.reason || result?.status || "invalid"),
    );
  }
}

function assertObservedFileMatches(
  observed: StableRead,
  normalized: any,
  expectedPath: string,
  code: string,
): void {
  if (
    !normalized ||
    normalized.path !== expectedPath ||
    normalized.dev !== String(observed.dev) ||
    normalized.ino !== String(observed.ino) ||
    normalized.sha256 !== observed.sha256 ||
    normalized.bytes !== observed.size ||
    normalized.uid !== observed.uid ||
    normalized.gid !== observed.gid ||
    normalized.mode !== observed.mode ||
    normalized.nlink !== observed.nlink ||
    normalized.regular_file !== true ||
    normalized.symlink !== false
  ) {
    fail(code);
  }
}

export function testOnlyAssertInstallationEvidenceV1(result: unknown): void {
  assertInstallationEvidence(result);
}

export function testOnlyAssertObservedFileMatchesV1(
  observed: StableRead,
  normalized: unknown,
  expectedPath: string,
): void {
  assertObservedFileMatches(
    observed,
    normalized,
    expectedPath,
    "allocation_custody_test_file_generation_mismatch",
  );
}

function assertDurabilityContract(result: any): void {
  if (
    !result ||
    result.status !==
      "source_prerequisites_bound_controlled_challenge_required" ||
    result.reason !== "reviewed_prerequisites_bound" ||
    result.source_contract_ready !== true ||
    result.reviewed_prerequisites_bound !== true ||
    !Array.isArray(result.missing_prerequisites) ||
    result.missing_prerequisites.length !== 0 ||
    result.read_only_collection_sufficient !== false ||
    result.controlled_live_challenge_required !== true ||
    result.live_durable_storage_proven !== false ||
    result.rollback_resistance_proven !== false ||
    result.protected_high_water_custody_proven !== false ||
    result.independent_custody_proven !== false ||
    result.production_gate_ready !== false ||
    result.host_execution_authorized !== false ||
    result.storage_mutation_authorized !== false ||
    result.rollback_test_authorized !== false ||
    result.payment_acceptance_authorized !== false ||
    result.public_presale_activation_authorized !== false ||
    result.wc_void_market_activation_authorized !== false ||
    result.transaction_submission_authorized !== false ||
    result.treasury_or_liquidity_action_authorized !== false ||
    result.funds_movement !== false ||
    result.production_host_evidence_authority !== false ||
    result.next_action !==
      "SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1"
  ) {
    fail(
      "allocation_custody_durability_contract_hold:" +
        String(result?.reason || result?.status || "invalid"),
    );
  }
  if (
    VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_REQUIRED_FUTURE_EVIDENCE_V1
      .reviewed_source_generation_binding_required !== true
  ) {
    fail("allocation_custody_reviewed_source_generation_requirement_missing");
  }
}

export function testOnlyAssertDurabilityContractV1(result: unknown): void {
  assertDurabilityContract(result);
}


export function collectBuyVoidPresaleAllocationCustodyHostEvidenceV1(input: {
  operator_receipt_path: string;
  external_witness_path: string;
  rollback_policy_receipt_path: string;
}): EvidenceReport {
  if (process.platform !== "linux") fail("allocation_custody_linux_required");
  if (typeof process.geteuid !== "function" || process.geteuid() !== 0) {
    fail("allocation_custody_root_required");
  }

  const operatorReceipt = stableReadAbsolute(
    input.operator_receipt_path,
    MAX_OPERATOR_RECEIPT_BYTES,
    "allocation_custody_operator_receipt",
  );
  const journal = stableReadAbsolute(
    JOURNAL_PATH,
    MAX_JOURNAL_BYTES,
    "allocation_custody_current_journal",
  );
  const highWater = stableReadAbsolute(
    HIGH_WATER_PATH,
    MAX_HIGH_WATER_BYTES,
    "allocation_custody_current_high_water",
  );
  const externalWitness = stableReadAbsolute(
    input.external_witness_path,
    MAX_EXTERNAL_WITNESS_BYTES,
    "allocation_custody_external_witness",
  );
  const reviewedPolicyReceipt = stableReadAbsolute(
    input.rollback_policy_receipt_path,
    MAX_POLICY_RECEIPT_BYTES,
    "allocation_custody_rollback_policy_receipt",
  );

  const installationBefore =
    inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1({
      journal_root: JOURNAL_ROOT,
      high_water_root: HIGH_WATER_ROOT,
      expected_hostname: HOSTNAME,
    });
  assertInstallationEvidence(installationBefore);
  assertObservedFileMatches(
    journal,
    installationBefore.normalized.journal_file,
    JOURNAL_PATH,
    "allocation_custody_journal_generation_before_mismatch",
  );
  assertObservedFileMatches(
    highWater,
    installationBefore.normalized.high_water_file,
    HIGH_WATER_PATH,
    "allocation_custody_high_water_generation_before_mismatch",
  );

  const livePolicy =
    inspectBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyEvidenceV1({
      journal_root: JOURNAL_ROOT,
      high_water_root: HIGH_WATER_ROOT,
      expected_hostname: HOSTNAME,
    });
  assertLivePolicy(livePolicy);

  const installationAfter =
    inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1({
      journal_root: JOURNAL_ROOT,
      high_water_root: HIGH_WATER_ROOT,
      expected_hostname: HOSTNAME,
    });
  assertInstallationEvidence(installationAfter);
  assertObservedFileMatches(
    journal,
    installationAfter.normalized.journal_file,
    JOURNAL_PATH,
    "allocation_custody_journal_generation_after_mismatch",
  );
  assertObservedFileMatches(
    highWater,
    installationAfter.normalized.high_water_file,
    HIGH_WATER_PATH,
    "allocation_custody_high_water_generation_after_mismatch",
  );
  if (
    installationBefore.qualification_id !== installationAfter.qualification_id ||
    installationBefore.normalized.high_water_sha256 !==
      installationAfter.normalized.high_water_sha256
  ) {
    fail("allocation_custody_storage_generation_changed_during_observation");
  }

  const secondControl =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1(
      {
        operator_receipt_json: operatorReceipt.bytes,
        current_journal_jsonl: journal.bytes,
        current_high_water_json: highWater.bytes,
        external_witness_jsonl: externalWitness.bytes,
        rollback_policy_receipt_json: reviewedPolicyReceipt.bytes,
      },
    );
  assertSecondControl(secondControl);
  if (!("normalized" in secondControl) || !secondControl.normalized) {
    fail("allocation_custody_second_control_normalized_missing");
  }
  const secondControlNormalized = secondControl.normalized;

  const durabilityContract =
    classifyBuyVoidAllocationCustodyLiveDurabilityRollbackContractV1({
      rollback_independence_policy_qualified:
        secondControl.rollback_independence_policy_qualified,
      live_policy_observation_proven:
        secondControl.live_policy_observation_proven,
      policy_file_installation_proven:
        secondControl.policy_file_installation_proven,
      external_transport_authenticated:
        secondControl.external_transport_authenticated,
      external_witness_storage_proven:
        secondControl.external_witness_storage_proven,
      live_remote_read_performed:
        secondControl.live_remote_read_performed,
      live_remote_append_performed:
        secondControl.live_remote_append_performed,
      external_second_control_domain_qualified:
        secondControl.external_second_control_domain_qualified,
      external_second_control_policy_binding_proven:
        secondControl.external_second_control_policy_binding_proven,
      post_cycle_live_policy_observation_bound:
        secondControl.post_cycle_live_policy_observation_bound,
    });
  assertDurabilityContract(durabilityContract);

  if (
    livePolicy.normalized?.installation_high_water_sha256 !==
    secondControlNormalized.replay_high_water_sha256
  ) {
    fail("allocation_custody_live_policy_high_water_mismatch");
  }
  if (
    livePolicy.normalized?.host_id !==
    secondControlNormalized.source_hostname
  ) {
    fail("allocation_custody_live_policy_host_mismatch");
  }

  return Object.freeze({
    schema: SCHEMA,
    marker: MARKER,
    version: 1,
    parent_host_evidence_plan_id: PARENT_PLAN_ID,
    status:
      "ALLOCATION_CUSTODY_PREREQUISITES_GREEN_CONTROLLED_CHALLENGE_REQUIRED",
    expected_hostname: HOSTNAME,
    journal_root: JOURNAL_ROOT,
    high_water_root: HIGH_WATER_ROOT,
    rollback_policy_receipt_sha256: reviewedPolicyReceipt.sha256,
    reviewed_operator_receipt_sha256: operatorReceipt.sha256,
    current_journal_sha256: journal.sha256,
    current_high_water_sha256: highWater.sha256,
    external_witness_sha256: externalWitness.sha256,
    rollback_independence_policy_qualified: true,
    live_policy_observation_proven: true,
    policy_file_installation_proven: true,
    reviewed_external_custody_qualification_bound: true,
    external_transport_authenticated: true,
    external_witness_storage_proven: true,
    live_remote_read_performed: true,
    live_remote_append_performed: true,
    external_second_control_domain_qualified: true,
    external_second_control_policy_binding_proven: true,
    post_cycle_live_policy_observation_bound: true,
    source_contract_ready: true,
    reviewed_prerequisites_bound: true,
    read_only_collection_sufficient: false,
    controlled_live_challenge_required: true,
    reviewed_source_generation_binding_required: true,
    next_action:
      "SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1",
    live_policy_enforcement_proven: false,
    live_rollback_test_performed: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    runtime_integration: false,
    production_gate_ready: false,
    filesystem_read_performed: true,
    filesystem_write_performed: false,
    process_execution_performed: true,
    process_execution_read_only_contract: true,
    transitive_storage_identity_helper_execution_required: true,
    installation_storage_generation_bound: true,
    installation_qualification_id: String(installationAfter.qualification_id),
    network_contact_performed: false,
    mount_mutation_performed: false,
    backup_mutation_performed: false,
    snapshot_mutation_performed: false,
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

function selfTest(): void {
  if (!PARENT_PLAN_ID.startsWith("voidbuyhostevplan1_")) {
    fail("allocation_custody_parent_plan_invalid");
  }
  if (
    JOURNAL_PATH !==
      "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1/live-read-replay-v1.jsonl" ||
    HIGH_WATER_PATH !==
      "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1/live-read-replay-high-water-v1.json"
  ) {
    fail("allocation_custody_fixed_storage_path_invalid");
  }
  console.log(MARKER + "_SELF_TEST_GREEN");
  console.log("parent_host_evidence_plan_bound=true");
  console.log("current_live_policy_observation_required=true");
  console.log("reviewed_second_control_composition_required=true");
  console.log("durability_rollback_contract_required=true");
  console.log("reviewed_source_generation_binding_required=true");
  console.log("fixed_precision_storage_roots_required=true");
  console.log("descriptor_stable_artifact_reads_required=true");
  console.log("filesystem_read_performed_by_future_host_run=true");
  console.log("filesystem_write_performed=false");
  console.log("process_execution_performed_by_future_host_run=true");
  console.log("process_execution_read_only_contract=true");
  console.log("transitive_storage_identity_helper_execution_required=true");
  console.log("installation_storage_generation_binding_required=true");
  console.log("network_contact_performed=false");
  console.log("live_policy_enforcement_proven=false");
  console.log("live_rollback_test_performed=false");
  console.log("live_durable_storage_proven=false");
  console.log("rollback_resistance_proven=false");
  console.log("protected_high_water_custody_proven=false");
  console.log("independent_custody_proven=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("production_host_evidence_authority=false");
  console.log(
    "next_action=SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1",
  );
}

function argument(args: string[], name: string): string {
  const index = args.indexOf(name);
  if (index < 0 || index + 1 >= args.length) fail("allocation_custody_arguments_invalid");
  return String(args[index + 1] || "").trim();
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--self-test") {
    selfTest();
    return;
  }
  if (
    args.length !== 7 ||
    args[0] !== "--run" ||
    !args.includes("--operator-receipt") ||
    !args.includes("--external-witness") ||
    !args.includes("--rollback-policy-receipt")
  ) {
    fail("allocation_custody_arguments_invalid");
  }
  const result = collectBuyVoidPresaleAllocationCustodyHostEvidenceV1({
    operator_receipt_path: argument(args, "--operator-receipt"),
    external_witness_path: argument(args, "--external-witness"),
    rollback_policy_receipt_path: argument(args, "--rollback-policy-receipt"),
  });
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    console.error(MARKER + "_HOLD");
    console.error("reason=" + String((error as Error)?.message || "unknown"));
    console.error("filesystem_write_performed=false");
    console.error("process_execution_performed=unknown");
    console.error("process_execution_read_only_contract=true");
    console.error("transitive_storage_identity_helper_execution_required=true");
    console.error("network_contact_performed=false");
    console.error("mount_mutation_performed=false");
    console.error("backup_mutation_performed=false");
    console.error("snapshot_mutation_performed=false");
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
  }
}
