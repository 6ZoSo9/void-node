// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { createHash, X509Certificate } from "node:crypto";
import { lstat, readFile, readlink } from "node:fs/promises";
import * as net from "node:net";
import * as path from "node:path";
import {
  hashVoidP2pActivationPermitDocumentV1,
  hashVoidP2pActivationRuntimeProfileV1,
  verifyVoidP2pNodeBoundActivationPermitV1,
  type VoidP2pActivationPermitConsumptionRecordV1,
  type VoidP2pActivationPermitConsumptionResultV1,
  type VoidP2pActivationPermitVerificationOptionsV1,
  type VoidP2pActivationRuntimeProfileV1,
  type VoidP2pVerifiedNodeBoundActivationPermitV1,
} from "./node_bound_activation_permit_wall_v1.js";
import {
  verifyVoidP2pSignedTrustPolicyV1,
  type VoidP2pTrustPolicyVerificationOptionsV1,
  type VoidP2pVerifiedTrustPolicyV1,
} from "./signed_trust_policy_wall_v1.js";

export const VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER =
  "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1";
export const VOID_P2P_LIVE_ACTIVATION_LEASE_AUDIT_SCHEMA_V1 =
  "void-p2p-live-activation-lease-audit-v1";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SEQUENCE_PATTERN = /^[1-9][0-9]{0,39}$/;
const GENERATION_PATTERN = /^[0-9]{40}-[0-9a-f]{64}$/;
const REQUIRED_SEALED_FILES = Object.freeze([
  "permit-envelope.json",
  "activation-permit-root-set.json",
  "trust-policy-envelope.json",
  "trust-root-set.json",
  "runtime-profile.json",
  "consumption.json",
] as const);

export type VoidP2pLiveActivationLeaseStateV1 =
  | "stopped"
  | "starting"
  | "running"
  | "held"
  | "stopping";

export type VoidP2pLiveActivationLeaseChildExitV1 = Readonly<{
  code: number | null;
  signal: string | null;
}>;

export type VoidP2pLiveActivationLeaseManagedChildV1 = Readonly<{
  id: string;
  pid: number | null;
  exited: Promise<VoidP2pLiveActivationLeaseChildExitV1>;
  stop: (reason: string, timeoutMs: number) => Promise<void>;
}>;

export type VoidP2pLiveActivationLeaseStartupV1 = Readonly<{
  trust_verified: VoidP2pVerifiedTrustPolicyV1;
  permit_verified: VoidP2pVerifiedNodeBoundActivationPermitV1;
  trust_policy_envelope: unknown;
  trust_root_set: unknown;
  runtime_profile: VoidP2pActivationRuntimeProfileV1;
  runtime_profile_sha256: string;
  edge_node_id: string;
  trust_root_set_sha256: string;
}>;

export type VoidP2pLiveActivationLeaseSealedSnapshotV1 = Readonly<{
  generation: string;
  generation_dir: string;
  current_target: string;
  files: Readonly<Record<(typeof REQUIRED_SEALED_FILES)[number], Readonly<{
    path: string;
    sha256: string;
    value: unknown;
  }>>>;
}>;

export type VoidP2pLiveActivationLeaseAuditRecordV1 = Readonly<{
  schema: typeof VOID_P2P_LIVE_ACTIVATION_LEASE_AUDIT_SCHEMA_V1;
  timestamp: string;
  event: string;
  trigger: string;
  state: VoidP2pLiveActivationLeaseStateV1;
  code?: string;
  message?: string;
  sequence?: string;
  permit_sha256?: string;
  permit_expires_at?: string;
  policy_epoch?: string;
  policy_sha256?: string;
  policy_expires_at?: string;
  generation?: string;
  child_id?: string;
  child_pid?: number | null;
}>;

export type VoidP2pLiveActivationLeaseStatusV1 = Readonly<{
  marker: typeof VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER;
  state: VoidP2pLiveActivationLeaseStateV1;
  expected_network_id: string;
  edge_node_id: string | null;
  active_sequence: string | null;
  active_permit_sha256: string | null;
  active_permit_expires_at: string | null;
  active_permit_remaining_ms: number | null;
  active_policy_epoch: string | null;
  active_policy_sha256: string | null;
  active_policy_expires_at: string | null;
  active_policy_remaining_ms: number | null;
  active_runtime_profile_sha256: string | null;
  active_generation: string | null;
  child_id: string | null;
  child_pid: number | null;
  child_spawn_count: number;
  unexpected_child_exit_count: number;
  reconcile_count: number;
  last_reconcile_at: string | null;
  last_success_at: string | null;
  last_hold_code: string | null;
  last_error: string | null;
  one_shot_permit_consumed: boolean;
  automatic_child_restart: false;
  policy_rotation_under_existing_permit: false;
  permissionless_admission_forced_off: true;
  runtime_private_policy_or_activation_key_required: false;
  ledger_authority: false;
  validator_authority: false;
  wallet_or_transaction_signer_authority: false;
  money_movement_authority: false;
}>;

export type VoidP2pLiveActivationLeaseWallOptionsV1 = Readonly<{
  expected_network_id: string;
  activation_state_dir: string;
  shutdown_lead_ms?: number;
  child_stop_timeout_ms?: number;
  load_and_verify_startup: () => Promise<VoidP2pLiveActivationLeaseStartupV1>;
  consume_permit: (
    startup: VoidP2pLiveActivationLeaseStartupV1,
  ) => Promise<VoidP2pActivationPermitConsumptionResultV1>;
  load_and_verify_sealed: (
    startup: VoidP2pLiveActivationLeaseStartupV1,
    consumed: VoidP2pActivationPermitConsumptionResultV1,
    expected: VoidP2pLiveActivationLeaseSealedSnapshotV1,
    nowMs: number,
  ) => Promise<VoidP2pLiveActivationLeaseSealedSnapshotV1>;
  spawn_child: (
    startup: VoidP2pLiveActivationLeaseStartupV1,
    consumed: VoidP2pActivationPermitConsumptionResultV1,
  ) => Promise<VoidP2pLiveActivationLeaseManagedChildV1>;
  audit?: (record: VoidP2pLiveActivationLeaseAuditRecordV1) => Promise<void>;
  now_ms?: () => number;
}>;

export class VoidP2pLiveActivationLeaseHoldV1 extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "VoidP2pLiveActivationLeaseHoldV1";
    this.code = code;
  }
}

function hold(code: string, message: string): never {
  throw new VoidP2pLiveActivationLeaseHoldV1(code, message);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown, fallback: string): string {
  if (error instanceof VoidP2pLiveActivationLeaseHoldV1) return error.code;
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code) return code;
  }
  return fallback;
}

function safeInteger(value: number, label: string, allowZero = false): number {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(value) || value < minimum) {
    hold("invalid_option", `${label} must be a safe integer >= ${minimum}`);
  }
  return value;
}

function networkId(value: string): string {
  if (
    value.length < 3 ||
    value.length > 128 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
  ) {
    hold("invalid_network_id", "expected_network_id is invalid");
  }
  return value;
}

function sha256Hex(value: string, label: string): string {
  if (!SHA256_PATTERN.test(value)) hold("invalid_sha256", `${label} is not a SHA-256`);
  return value;
}

function sequence(value: string, label: string): bigint {
  if (!SEQUENCE_PATTERN.test(value)) hold("invalid_sequence", `${label} is not canonical`);
  return BigInt(value);
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function sha256(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function assertVoidP2pLiveActivationLeaseLoopbackHostV1(host: string): string {
  const normalized = host.trim();
  const family = net.isIP(normalized);
  if (family === 4 && Number(normalized.split(".", 1)[0]) === 127) return normalized;
  if (family === 6 && normalized === "::1") return normalized;
  hold("non_loopback_status_host", "live activation lease status host must be loopback IP");
}

export async function voidP2pLiveActivationLeaseEdgeNodeIdV1(certFile: string): Promise<string> {
  const resolved = path.resolve(certFile);
  const metadata = await lstat(resolved).catch((error: unknown) => {
    hold("edge_certificate_unavailable", errorMessage(error));
  });
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    hold("unsafe_edge_certificate", "edge certificate must be a regular non-symlink file");
  }
  const certificate = new X509Certificate(await readFile(resolved, "utf8"));
  if (certificate.publicKey.asymmetricKeyType !== "ed25519") {
    hold("wrong_edge_key_type", "edge certificate public key must be Ed25519");
  }
  const der = certificate.publicKey.export({ type: "spki", format: "der" });
  return sha256(der);
}

async function readRegularJson(
  pathname: string,
  label: string,
  maxBytes: number,
): Promise<Readonly<{ path: string; sha256: string; value: unknown }>> {
  const resolved = path.resolve(pathname);
  const metadata = await lstat(resolved).catch((error: unknown) => {
    hold("sealed_file_unavailable", `${label}: ${errorMessage(error)}`);
  });
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    hold("unsafe_sealed_file", `${label} must be a regular non-symlink file`);
  }
  if ((metadata.mode & 0o002) !== 0) {
    hold("unsafe_sealed_mode", `${label} must not be world-writable`);
  }
  if (metadata.size < 2 || metadata.size > maxBytes) {
    hold("sealed_file_size", `${label} size must be 2..${maxBytes}`);
  }
  const bytes = await readFile(resolved);
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    hold("sealed_file_json", `${label} is not valid JSON`);
  }
  return Object.freeze({ path: resolved, sha256: sha256(bytes), value });
}

async function assertSafeStateDirectory(stateDir: string): Promise<string> {
  const resolved = path.resolve(stateDir);
  const metadata = await lstat(resolved).catch((error: unknown) => {
    hold("state_dir_unavailable", errorMessage(error));
  });
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    hold("unsafe_state_dir", "activation state directory must be a real non-symlink directory");
  }
  if ((metadata.mode & 0o002) !== 0) {
    hold("unsafe_state_mode", "activation state directory must not be world-writable");
  }
  return resolved;
}

export async function readVoidP2pLiveActivationLeaseSealedSnapshotV1(input: Readonly<{
  activation_state_dir: string;
  generation: string;
  max_document_bytes?: number;
}>): Promise<VoidP2pLiveActivationLeaseSealedSnapshotV1> {
  const maxBytes = safeInteger(input.max_document_bytes ?? 1024 * 1024, "max_document_bytes");
  if (!GENERATION_PATTERN.test(input.generation)) {
    hold("invalid_generation", "consumed activation generation name is invalid");
  }
  const stateDir = await assertSafeStateDirectory(input.activation_state_dir);
  const currentFile = path.join(stateDir, "current");
  const before = await readlink(currentFile).catch((error: unknown) => {
    hold("current_pointer_unavailable", errorMessage(error));
  });
  const expectedTarget = path.posix.join("generations", input.generation);
  if (before !== expectedTarget || path.isAbsolute(before) || before.includes("..")) {
    hold("current_generation_changed", `current pointer is ${before}, expected ${expectedTarget}`);
  }
  const generationDir = path.join(stateDir, before);
  const generationMetadata = await lstat(generationDir).catch((error: unknown) => {
    hold("generation_unavailable", errorMessage(error));
  });
  if (!generationMetadata.isDirectory() || generationMetadata.isSymbolicLink()) {
    hold("unsafe_generation", "active generation must be a real non-symlink directory");
  }
  const entries = await Promise.all(
    REQUIRED_SEALED_FILES.map(async (name) => [
      name,
      await readRegularJson(path.join(generationDir, name), name, maxBytes),
    ] as const),
  );
  const after = await readlink(currentFile).catch((error: unknown) => {
    hold("current_pointer_unavailable", errorMessage(error));
  });
  if (after !== before) hold("current_pointer_race", "activation current pointer changed during read");
  return Object.freeze({
    generation: input.generation,
    generation_dir: path.resolve(generationDir),
    current_target: before,
    files: Object.freeze(Object.fromEntries(entries)) as VoidP2pLiveActivationLeaseSealedSnapshotV1["files"],
  });
}

function consumptionRecord(value: unknown): VoidP2pActivationPermitConsumptionRecordV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold("invalid_consumption", "sealed consumption record must be an object");
  }
  const record = value as Record<string, unknown>;
  const stringFields = [
    "schema", "network_id", "edge_node_id", "sequence", "permit_sha256", "envelope_sha256",
    "policy_epoch", "policy_sha256", "policy_envelope_sha256", "trust_root_set_sha256",
    "runtime_profile_sha256", "activation_permit_root_set_sha256", "consumed_at", "generation",
  ] as const;
  for (const field of stringFields) {
    if (typeof record[field] !== "string" || !(record[field] as string)) {
      hold("invalid_consumption", `consumption.${field} is invalid`);
    }
  }
  if (!Array.isArray(record.signer_key_ids) || !record.signer_key_ids.every((v) => typeof v === "string")) {
    hold("invalid_consumption", "consumption.signer_key_ids is invalid");
  }
  if (!Number.isSafeInteger(record.threshold) || (record.threshold as number) < 1) {
    hold("invalid_consumption", "consumption.threshold is invalid");
  }
  return record as unknown as VoidP2pActivationPermitConsumptionRecordV1;
}

export async function verifyVoidP2pLiveActivationLeaseSealedV1(input: Readonly<{
  snapshot: VoidP2pLiveActivationLeaseSealedSnapshotV1;
  startup: VoidP2pLiveActivationLeaseStartupV1;
  consumed: VoidP2pActivationPermitConsumptionResultV1;
  expected_snapshot: VoidP2pLiveActivationLeaseSealedSnapshotV1;
  trust_options: VoidP2pTrustPolicyVerificationOptionsV1;
  permit_options: Omit<
    VoidP2pActivationPermitVerificationOptionsV1,
    | "expected_network_id"
    | "expected_edge_node_id"
    | "expected_policy_epoch"
    | "expected_policy_sha256"
    | "expected_policy_envelope_sha256"
    | "expected_trust_root_set_sha256"
    | "expected_runtime_profile_sha256"
    | "now_ms"
  >;
  now_ms: number;
}>): Promise<VoidP2pLiveActivationLeaseSealedSnapshotV1> {
  const { snapshot, expected_snapshot: expected, startup, consumed } = input;
  if (snapshot.generation !== consumed.generation || snapshot.generation_dir !== path.resolve(consumed.generation_dir)) {
    hold("generation_mismatch", "sealed generation does not match consumed activation permit");
  }
  for (const name of REQUIRED_SEALED_FILES) {
    const actual = snapshot.files[name];
    const pinned = expected.files[name];
    if (actual.sha256 !== pinned.sha256 || actual.path !== pinned.path) {
      hold("sealed_file_drift", `${name} changed after activation`);
    }
  }

  const trust = verifyVoidP2pSignedTrustPolicyV1({
    envelope: snapshot.files["trust-policy-envelope.json"].value,
    root_set: snapshot.files["trust-root-set.json"].value,
    options: Object.freeze({ ...input.trust_options, now_ms: input.now_ms }),
  });
  const profileHashed = hashVoidP2pActivationRuntimeProfileV1(
    snapshot.files["runtime-profile.json"].value,
  );
  const edgeNodeId = await voidP2pLiveActivationLeaseEdgeNodeIdV1(profileHashed.profile.edge.cert_file);
  const trustRootHash = hashVoidP2pActivationPermitDocumentV1(
    snapshot.files["trust-root-set.json"].value,
  );
  const permit = verifyVoidP2pNodeBoundActivationPermitV1({
    envelope: snapshot.files["permit-envelope.json"].value,
    root_set: snapshot.files["activation-permit-root-set.json"].value,
    options: Object.freeze({
      ...input.permit_options,
      expected_network_id: startup.trust_verified.policy.network_id,
      expected_edge_node_id: edgeNodeId,
      expected_policy_epoch: trust.policy.epoch,
      expected_policy_sha256: trust.policy_sha256,
      expected_policy_envelope_sha256: trust.envelope_sha256,
      expected_trust_root_set_sha256: trustRootHash,
      expected_runtime_profile_sha256: profileHashed.profile_sha256,
      now_ms: input.now_ms,
    }),
  });
  const record = consumptionRecord(snapshot.files["consumption.json"].value);
  const comparisons: readonly [unknown, unknown, string][] = [
    [trust.policy_sha256, startup.trust_verified.policy_sha256, "policy_sha256"],
    [trust.envelope_sha256, startup.trust_verified.envelope_sha256, "policy_envelope_sha256"],
    [profileHashed.profile_sha256, startup.runtime_profile_sha256, "runtime_profile_sha256"],
    [edgeNodeId, startup.edge_node_id, "edge_node_id"],
    [trustRootHash, startup.trust_root_set_sha256, "trust_root_set_sha256"],
    [permit.permit_sha256, startup.permit_verified.permit_sha256, "permit_sha256"],
    [permit.envelope_sha256, startup.permit_verified.envelope_sha256, "permit_envelope_sha256"],
    [permit.root_set_sha256, startup.permit_verified.root_set_sha256, "permit_root_set_sha256"],
    [record.schema, "void-p2p-activation-permit-consumption-v1", "consumption_schema"],
    [record.network_id, permit.permit.network_id, "consumption_network_id"],
    [record.edge_node_id, edgeNodeId, "consumption_edge_node_id"],
    [record.generation, consumed.generation, "consumption_generation"],
    [record.sequence, permit.permit.sequence, "consumption_sequence"],
    [record.permit_sha256, permit.permit_sha256, "consumption_permit_sha256"],
    [record.envelope_sha256, permit.envelope_sha256, "consumption_envelope_sha256"],
    [record.policy_epoch, trust.policy.epoch, "consumption_policy_epoch"],
    [record.policy_sha256, trust.policy_sha256, "consumption_policy_sha256"],
    [record.policy_envelope_sha256, trust.envelope_sha256, "consumption_policy_envelope_sha256"],
    [record.trust_root_set_sha256, trustRootHash, "consumption_trust_root_set_sha256"],
    [record.runtime_profile_sha256, profileHashed.profile_sha256, "consumption_profile_sha256"],
    [record.activation_permit_root_set_sha256, permit.root_set_sha256, "consumption_permit_root_set_sha256"],
    [record.threshold, permit.threshold, "consumption_threshold"],
    [record.signer_key_ids.join(","), permit.signer_key_ids.join(","), "consumption_signers"],
  ];
  for (const [actual, expectedValue, label] of comparisons) {
    if (actual !== expectedValue) hold("sealed_binding_mismatch", `${label} mismatch`);
  }
  if (trust.derived_edge_environment.VOID_P2P_EDGE_WALL_PERMISSIONLESS !== "0") {
    hold("permissionless_derivation", "sealed policy did not force permissionless admission off");
  }
  return snapshot;
}

export class VoidP2pLiveActivationLeaseWallV1 {
  readonly marker = VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER;
  private readonly options: Required<
    Pick<
      VoidP2pLiveActivationLeaseWallOptionsV1,
      | "expected_network_id"
      | "activation_state_dir"
      | "shutdown_lead_ms"
      | "child_stop_timeout_ms"
      | "load_and_verify_startup"
      | "consume_permit"
      | "load_and_verify_sealed"
      | "spawn_child"
      | "now_ms"
    >
  > & Pick<VoidP2pLiveActivationLeaseWallOptionsV1, "audit">;
  private state: VoidP2pLiveActivationLeaseStateV1 = "stopped";
  private startup: VoidP2pLiveActivationLeaseStartupV1 | null = null;
  private consumed: VoidP2pActivationPermitConsumptionResultV1 | null = null;
  private sealed: VoidP2pLiveActivationLeaseSealedSnapshotV1 | null = null;
  private child: VoidP2pLiveActivationLeaseManagedChildV1 | null = null;
  private childToken = 0;
  private expectedStops = new Set<number>();
  private reconcilePromise: Promise<VoidP2pLiveActivationLeaseStatusV1> | null = null;
  private stopping = false;
  private lifecycleToken = 0;
  private childSpawnCount = 0;
  private unexpectedChildExitCount = 0;
  private reconcileCount = 0;
  private lastReconcileAt: string | null = null;
  private lastSuccessAt: string | null = null;
  private lastHoldCode: string | null = null;
  private lastError: string | null = null;

  constructor(options: VoidP2pLiveActivationLeaseWallOptionsV1) {
    this.options = Object.freeze({
      expected_network_id: networkId(options.expected_network_id),
      activation_state_dir: path.resolve(options.activation_state_dir),
      shutdown_lead_ms: safeInteger(options.shutdown_lead_ms ?? 5_000, "shutdown_lead_ms", true),
      child_stop_timeout_ms: safeInteger(options.child_stop_timeout_ms ?? 15_000, "child_stop_timeout_ms"),
      load_and_verify_startup: options.load_and_verify_startup,
      consume_permit: options.consume_permit,
      load_and_verify_sealed: options.load_and_verify_sealed,
      spawn_child: options.spawn_child,
      audit: options.audit,
      now_ms: options.now_ms ?? Date.now,
    });
  }

  getStatus(): VoidP2pLiveActivationLeaseStatusV1 {
    const now = this.options.now_ms();
    const permitExpiry = this.startup ? Date.parse(this.startup.permit_verified.permit.expires_at) : null;
    const policyExpiry = this.startup ? Date.parse(this.startup.trust_verified.policy.expires_at) : null;
    return Object.freeze({
      marker: VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER,
      state: this.state,
      expected_network_id: this.options.expected_network_id,
      edge_node_id: this.startup?.edge_node_id ?? null,
      active_sequence: this.startup?.permit_verified.permit.sequence ?? null,
      active_permit_sha256: this.startup?.permit_verified.permit_sha256 ?? null,
      active_permit_expires_at: this.startup?.permit_verified.permit.expires_at ?? null,
      active_permit_remaining_ms: permitExpiry === null ? null : permitExpiry - now,
      active_policy_epoch: this.startup?.trust_verified.policy.epoch ?? null,
      active_policy_sha256: this.startup?.trust_verified.policy_sha256 ?? null,
      active_policy_expires_at: this.startup?.trust_verified.policy.expires_at ?? null,
      active_policy_remaining_ms: policyExpiry === null ? null : policyExpiry - now,
      active_runtime_profile_sha256: this.startup?.runtime_profile_sha256 ?? null,
      active_generation: this.consumed?.generation ?? null,
      child_id: this.child?.id ?? null,
      child_pid: this.child?.pid ?? null,
      child_spawn_count: this.childSpawnCount,
      unexpected_child_exit_count: this.unexpectedChildExitCount,
      reconcile_count: this.reconcileCount,
      last_reconcile_at: this.lastReconcileAt,
      last_success_at: this.lastSuccessAt,
      last_hold_code: this.lastHoldCode,
      last_error: this.lastError,
      one_shot_permit_consumed: this.consumed !== null,
      automatic_child_restart: false,
      policy_rotation_under_existing_permit: false,
      permissionless_admission_forced_off: true,
      runtime_private_policy_or_activation_key_required: false,
      ledger_authority: false,
      validator_authority: false,
      wallet_or_transaction_signer_authority: false,
      money_movement_authority: false,
    });
  }

  async start(trigger = "start"): Promise<VoidP2pLiveActivationLeaseStatusV1> {
    if (this.state !== "stopped" || this.startup || this.consumed || this.child) {
      hold("invalid_lifecycle", "live activation lease wall can start only once from stopped state");
    }
    this.state = "starting";
    this.stopping = false;
    const token = ++this.lifecycleToken;
    try {
      const startup = await this.options.load_and_verify_startup();
      this.assertLifecycle(token);
      this.assertStartup(startup, this.options.now_ms());
      const consumed = await this.options.consume_permit(startup);
      this.assertLifecycle(token);
      if (consumed.state_dir !== this.options.activation_state_dir) {
        return this.enterHold("state_dir_mismatch", "consumption used another activation state directory", trigger);
      }
      const sealed = await readVoidP2pLiveActivationLeaseSealedSnapshotV1({
        activation_state_dir: this.options.activation_state_dir,
        generation: consumed.generation,
      });
      this.startup = startup;
      this.consumed = consumed;
      this.sealed = sealed;
      await this.options.load_and_verify_sealed(startup, consumed, sealed, this.options.now_ms());
      this.assertLifecycle(token);
      await this.spawn(startup, consumed, token);
      this.state = "running";
      this.lastSuccessAt = iso(this.options.now_ms());
      this.lastHoldCode = null;
      this.lastError = null;
      await this.emitAudit("activation_lease_started", trigger);
      return this.getStatus();
    } catch (error) {
      if (error instanceof VoidP2pLiveActivationLeaseHoldV1 && this.lastHoldCode === error.code) throw error;
      return this.enterHold(errorCode(error, "start_failed"), errorMessage(error), trigger);
    }
  }

  async reconcile(trigger = "poll"): Promise<VoidP2pLiveActivationLeaseStatusV1> {
    if (this.reconcilePromise) return this.reconcilePromise;
    const pending = this.reconcileOnce(trigger).finally(() => {
      if (this.reconcilePromise === pending) this.reconcilePromise = null;
    });
    this.reconcilePromise = pending;
    return pending;
  }

  private async reconcileOnce(trigger: string): Promise<VoidP2pLiveActivationLeaseStatusV1> {
    if (this.state !== "running" || !this.startup || !this.consumed || !this.sealed || !this.child) {
      hold("invalid_lifecycle", "live activation lease wall is not running");
    }
    const token = this.lifecycleToken;
    const now = this.options.now_ms();
    this.reconcileCount += 1;
    this.lastReconcileAt = iso(now);
    try {
      this.assertStartup(this.startup, now);
      const revokeFile = path.join(this.options.activation_state_dir, "revoke");
      try {
        const metadata = await lstat(revokeFile);
        if (metadata.isFile() || metadata.isSymbolicLink() || metadata.isDirectory()) {
          return this.enterHold("local_revocation", "local activation revocation marker exists", trigger);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      await this.options.load_and_verify_sealed(
        this.startup,
        this.consumed,
        this.sealed,
        now,
      );
      this.assertLifecycle(token);
      this.lastSuccessAt = iso(now);
      this.lastHoldCode = null;
      this.lastError = null;
      await this.emitAudit("activation_lease_revalidated", trigger);
      return this.getStatus();
    } catch (error) {
      if (error instanceof VoidP2pLiveActivationLeaseHoldV1 && this.lastHoldCode === error.code) throw error;
      return this.enterHold(errorCode(error, "reconcile_failed"), errorMessage(error), trigger);
    }
  }

  async stop(trigger = "stop"): Promise<VoidP2pLiveActivationLeaseStatusV1> {
    if (this.state === "stopped") return this.getStatus();
    const preserveHeld = this.state === "held";
    this.stopping = true;
    if (!preserveHeld) this.state = "stopping";
    this.lifecycleToken += 1;
    await this.stopChild(trigger).catch((error: unknown) => {
      this.lastError = errorMessage(error);
    });
    this.stopping = false;
    this.state = preserveHeld ? "held" : "stopped";
    await this.emitAudit(
      preserveHeld ? "activation_lease_held_shutdown" : "activation_lease_stopped",
      trigger,
    ).catch(() => undefined);
    return this.getStatus();
  }

  private assertStartup(startup: VoidP2pLiveActivationLeaseStartupV1, now: number): void {
    if (startup.trust_verified.policy.network_id !== this.options.expected_network_id ||
        startup.permit_verified.permit.network_id !== this.options.expected_network_id ||
        startup.runtime_profile.network_id !== this.options.expected_network_id) {
      hold("wrong_network", "startup components are bound to another network");
    }
    if (startup.trust_verified.derived_edge_environment.VOID_P2P_EDGE_WALL_PERMISSIONLESS !== "0") {
      hold("permissionless_derivation", "membership policy did not force permissionless admission off");
    }
    const permit = startup.permit_verified.permit;
    const startupBindings: readonly [unknown, unknown, string][] = [
      [permit.edge_node_id, startup.edge_node_id, "edge_node_id"],
      [permit.policy_epoch, startup.trust_verified.policy.epoch, "policy_epoch"],
      [permit.policy_sha256, startup.trust_verified.policy_sha256, "policy_sha256"],
      [permit.policy_envelope_sha256, startup.trust_verified.envelope_sha256, "policy_envelope_sha256"],
      [permit.trust_root_set_sha256, startup.trust_root_set_sha256, "trust_root_set_sha256"],
      [permit.runtime_profile_sha256, startup.runtime_profile_sha256, "runtime_profile_sha256"],
    ];
    for (const [actual, expected, label] of startupBindings) {
      if (actual !== expected) hold("startup_binding_mismatch", `${label} mismatch`);
    }
    sha256Hex(startup.edge_node_id, "edge_node_id");
    sha256Hex(startup.runtime_profile_sha256, "runtime_profile_sha256");
    sha256Hex(startup.trust_root_set_sha256, "trust_root_set_sha256");
    sequence(startup.permit_verified.permit.sequence, "permit sequence");
    const permitRemaining = Date.parse(startup.permit_verified.permit.expires_at) - now;
    const policyRemaining = Date.parse(startup.trust_verified.policy.expires_at) - now;
    if (permitRemaining <= this.options.shutdown_lead_ms) {
      hold("permit_lease_expired", "activation permit reached its shutdown lead boundary");
    }
    if (policyRemaining <= this.options.shutdown_lead_ms) {
      hold("policy_lease_expired", "signed trust policy reached its shutdown lead boundary");
    }
  }

  private assertLifecycle(token: number): void {
    if (this.stopping || token !== this.lifecycleToken) {
      hold("invalid_lifecycle", "live activation lease lifecycle changed during operation");
    }
  }

  private async spawn(
    startup: VoidP2pLiveActivationLeaseStartupV1,
    consumed: VoidP2pActivationPermitConsumptionResultV1,
    token: number,
  ): Promise<void> {
    if (this.child) hold("child_overlap", "refusing to spawn while a managed child exists");
    const child = await this.options.spawn_child(startup, consumed).catch((error: unknown) => {
      hold("child_spawn_failed", errorMessage(error));
    });
    if (!child.id || typeof child.stop !== "function" || !(child.exited instanceof Promise)) {
      const unsafe = child as Partial<VoidP2pLiveActivationLeaseManagedChildV1>;
      if (typeof unsafe.stop === "function") {
        await unsafe.stop("invalid_child_contract", this.options.child_stop_timeout_ms).catch(() => undefined);
      }
      hold("invalid_child", "spawn_child returned an invalid child contract");
    }
    if (this.stopping || token !== this.lifecycleToken) {
      await child.stop("lifecycle_changed", this.options.child_stop_timeout_ms).catch(() => undefined);
      await child.exited.catch(() => undefined);
      hold("invalid_lifecycle", "lifecycle changed while child was starting");
    }
    const childToken = ++this.childToken;
    this.child = child;
    this.childSpawnCount += 1;
    void child.exited.then(
      (result) => this.handleChildExit(childToken, child, result),
      (error) => this.handleChildExit(
        childToken,
        child,
        Object.freeze({ code: 1, signal: `wait_error:${errorMessage(error)}` }),
      ),
    );
  }

  private async handleChildExit(
    token: number,
    child: VoidP2pLiveActivationLeaseManagedChildV1,
    result: VoidP2pLiveActivationLeaseChildExitV1,
  ): Promise<void> {
    if (token !== this.childToken || this.child?.id !== child.id) return;
    const expected = this.expectedStops.delete(token) || this.stopping;
    this.child = null;
    if (expected) return;
    this.unexpectedChildExitCount += 1;
    this.state = "held";
    this.lastHoldCode = "child_exited";
    this.lastError = `managed child exited code=${result.code} signal=${result.signal}`;
    await this.emitAudit("child_exited", "child_exit", this.lastHoldCode, this.lastError).catch(
      () => undefined,
    );
  }

  private async stopChild(reason: string): Promise<void> {
    const child = this.child;
    if (!child) return;
    const token = this.childToken;
    this.expectedStops.add(token);
    try {
      await child.stop(reason, this.options.child_stop_timeout_ms);
      await child.exited;
    } catch (error) {
      this.expectedStops.delete(token);
      hold("child_stop_failed", errorMessage(error));
    }
    this.expectedStops.delete(token);
    if (this.child?.id === child.id) this.child = null;
  }

  private async enterHold(code: string, message: string, trigger: string): Promise<never> {
    this.state = "held";
    this.lastHoldCode = code;
    this.lastError = message;
    await this.stopChild(`hold:${code}`).catch((error: unknown) => {
      this.lastError = `${message}; child stop failed: ${errorMessage(error)}`;
    });
    await this.emitAudit("held", trigger, code, this.lastError).catch(() => undefined);
    throw new VoidP2pLiveActivationLeaseHoldV1(code, this.lastError);
  }

  private async emitAudit(
    event: string,
    trigger: string,
    code?: string,
    message?: string,
  ): Promise<void> {
    if (!this.options.audit) return;
    const permit = this.startup?.permit_verified;
    const policy = this.startup?.trust_verified;
    await this.options.audit(Object.freeze({
      schema: VOID_P2P_LIVE_ACTIVATION_LEASE_AUDIT_SCHEMA_V1,
      timestamp: iso(this.options.now_ms()),
      event,
      trigger,
      state: this.state,
      ...(code ? { code } : {}),
      ...(message ? { message } : {}),
      ...(permit
        ? {
            sequence: permit.permit.sequence,
            permit_sha256: permit.permit_sha256,
            permit_expires_at: permit.permit.expires_at,
          }
        : {}),
      ...(policy
        ? {
            policy_epoch: policy.policy.epoch,
            policy_sha256: policy.policy_sha256,
            policy_expires_at: policy.policy.expires_at,
          }
        : {}),
      ...(this.consumed ? { generation: this.consumed.generation } : {}),
      ...(this.child ? { child_id: this.child.id, child_pid: this.child.pid } : {}),
    }));
  }
}
