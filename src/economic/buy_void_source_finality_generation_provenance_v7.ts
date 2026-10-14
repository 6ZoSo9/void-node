import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import type { BuyVoidRequestV1 } from "./buy_void_auto_fulfillment_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3,
  observeBuyVoidSourceFinalityAuthenticatedCompositionV3,
  type BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3,
  type BuyVoidSourceFinalityAuthenticatedReadyV3,
} from "./buy_void_source_finality_authenticated_composition_v3.js";

export const VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7 =
  "VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7";
export const VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1 =
  "VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1";

export const VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V7 =
  Object.freeze({
    source_only_candidate: true,
    runtime_source_filesystem_read: true,
    runtime_source_filesystem_write: false,
    caller_generation_assertion_accepted: false,
    operator_deployment_receipt_required: true,
    immutable_process_source_identity_required: true,
    reviewed_source_files_verified_on_success: true,
    source_generation_verified_on_success: true,
    deployed_artifact_generation_verified_on_success: true,
    authenticated_transport_identity_verified: true,
    independent_remote_provider_transport_required: true,
    remote_provider_legal_identity_verified: false,
    total_operation_deadline_verified: true,
    observation_generated_in_composition: true,
    ancestry_verified_by_two_provider_finality_agreement: true,
    provider_quorum_verified: true,
    production_source_finality_authority_ready_on_success: true,
    rpc_read: true,
    rpc_write: false,
    wallet_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    runtime_route_mount: false,
    background_loop: false,
    inventory_mutation: false,
    chain2050_mutation: false,
    public_presale_activation: false,
    money_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_RECEIPT_BYTES = 64 * 1024;
const MAX_TOTAL_TIMEOUT_MS = 120_000;
const SHA40 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const HASH32 = /^0x[0-9a-f]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const RECEIPT_ID = /^voidbsfdep1_[0-9a-f]{64}$/u;

const REVIEWED_SOURCE_PATHS_V7 = Object.freeze([
  "src/economic/buy_void_source_finality_generation_provenance_v7.ts",
  "src/economic/buy_void_source_finality_execution_preflight_v1.ts",
  "src/economic/buy_void_source_finality_authenticated_composition_v3.ts",
  "src/economic/buy_void_source_finality_authority_v2.ts",
  "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts",
  "src/economic/buy_void_payment_rpc_observer_v1.ts",
  "src/economic/buy_void_verified_payment_v2.ts",
] as const);

type ProcessSourceIdentityV7 = {
  readonly marker: "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1";
  readonly commit: string;
  readonly tree: string;
  readonly branch: "main";
};

export type BuyVoidSourceFinalityGenerationPolicyV7 = {
  readonly primary: BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3;
  readonly secondary: BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3;
  readonly deployment_receipt_path: string;
  readonly process_source_identity: ProcessSourceIdentityV7;
  readonly total_timeout_ms: string;
};

export type BuyVoidSourceFinalityDeploymentDecisionV7 =
  | {
      readonly ok: true;
      readonly status: "deployment_generation_verified";
      readonly deployment_receipt_id: string;
      readonly accepted_enforcement_set_sha256: string;
      readonly reviewed_source_files_sha256: string;
      readonly reviewed_source_file_count: "7";
      readonly source_generation_verified: true;
      readonly deployed_artifact_generation_verified: true;
    }
  | {
      readonly ok: false;
      readonly status: "held";
      readonly reason: string;
      readonly source_generation_verified: false;
      readonly deployed_artifact_generation_verified: false;
    };

export type BuyVoidSourceFinalityGenerationHeldV7 = {
  readonly ok: false;
  readonly status: "held";
  readonly marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7;
  readonly reason: string;
};

export type BuyVoidSourceFinalityGenerationReadyV7 =
  Omit<
    BuyVoidSourceFinalityAuthenticatedReadyV3,
    | "schema"
    | "marker"
    | "version"
    | "status"
    | "rpc_identity"
    | "rpc_url_fingerprint_sha256"
    | "remote_provider_identity_verified"
    | "source_generation_verified"
    | "ancestry_verified"
    | "provider_quorum_verified"
    | "production_source_finality_authority_ready"
  > & {
    readonly schema: "void_buy_void_source_finality_generation_provenance_v7";
    readonly marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7;
    readonly version: 7;
    readonly status: "source_finality_production_quorum_ready";
    readonly rpc_identity: string;
    readonly rpc_url_fingerprint_sha256: string;
    readonly reviewed_source_files_verified: true;
    readonly reviewed_source_files_sha256: string;
    readonly verified_source_file_count: "7";
    readonly source_file_verification_mode: "operator_deployment_receipt_bound_v1";
    readonly deployment_receipt_id: string;
    readonly accepted_enforcement_set_sha256: string;
    readonly source_generation_verified: true;
    readonly deployed_artifact_generation_verified: true;
    readonly independent_remote_provider_transport_verified: true;
    readonly remote_provider_identity_verified: false;
    readonly ancestry_verified: true;
    readonly provider_quorum_verified: true;
    readonly production_source_finality_authority_ready: true;
    readonly primary_provider: Readonly<{
      rpc_identity: string;
      rpc_url_fingerprint_sha256: string;
      finalized_reference_block: string;
      finalized_reference_block_hash: string;
      confirmations_observed: string;
    }>;
    readonly secondary_provider: Readonly<{
      rpc_identity: string;
      rpc_url_fingerprint_sha256: string;
      finalized_reference_block: string;
      finalized_reference_block_hash: string;
      confirmations_observed: string;
    }>;
    readonly provider_quorum_sha256: string;
  };

export type BuyVoidSourceFinalityGenerationDecisionV7 =
  | BuyVoidSourceFinalityGenerationReadyV7
  | BuyVoidSourceFinalityGenerationHeldV7;

function held(reason: string): BuyVoidSourceFinalityGenerationHeldV7 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7,
    reason,
  };
}

function plain(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function exactKeys(value: unknown, expected: readonly string[]): boolean {
  if (!plain(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((entry, index) => entry === wanted[index]);
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("non_canonical_number");
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (plain(value)) {
    return "{" + Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ":" + canonical(value[key])
    ).join(",") + "}";
  }
  throw new Error("non_canonical_value");
}

function sha256Canonical(value: unknown): string {
  return crypto.createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

function gitBlobSha1(bytes: Buffer): string {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function positiveInteger(value: unknown, maximum = 1_000_000n): bigint | null {
  const raw = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/u.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n && parsed <= maximum ? parsed : null;
  } catch {
    return null;
  }
}

function parseTotalTimeoutMs(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/u.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_TOTAL_TIMEOUT_MS
    ? parsed
    : null;
}

function remainingMs(deadline: number): number {
  const remaining = Math.floor(deadline - performance.now());
  return Number.isSafeInteger(remaining) && remaining > 0 ? remaining : 0;
}

function readStableRegularFile(absolute: string, maxBytes: number): Buffer {
  const noFollow = fs.constants.O_NOFOLLOW;
  if (typeof noFollow !== "number" || noFollow <= 0) {
    throw new Error("nofollow_unavailable");
  }
  const visibleBefore = fs.lstatSync(absolute);
  if (
    !visibleBefore.isFile() ||
    visibleBefore.isSymbolicLink() ||
    visibleBefore.nlink !== 1 ||
    visibleBefore.size <= 0 ||
    visibleBefore.size > maxBytes
  ) {
    throw new Error("file_shape_invalid");
  }
  const fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
  try {
    const before = fs.fstatSync(fd);
    if (
      !before.isFile() ||
      before.dev !== visibleBefore.dev ||
      before.ino !== visibleBefore.ino ||
      before.nlink !== visibleBefore.nlink ||
      before.size !== visibleBefore.size ||
      before.mtimeMs !== visibleBefore.mtimeMs ||
      before.ctimeMs !== visibleBefore.ctimeMs
    ) {
      throw new Error("file_descriptor_identity_mismatch");
    }
    const buffer = Buffer.alloc(before.size + 1);
    let total = 0;
    while (total < buffer.length) {
      const count = fs.readSync(fd, buffer, total, buffer.length - total, total);
      if (count === 0) break;
      total += count;
    }
    if (total !== before.size) throw new Error("file_size_changed_during_read");
    const after = fs.fstatSync(fd);
    const visibleAfter = fs.lstatSync(absolute);
    if (
      after.dev !== before.dev || after.ino !== before.ino ||
      after.size !== before.size || after.mtimeMs !== before.mtimeMs ||
      after.ctimeMs !== before.ctimeMs ||
      !visibleAfter.isFile() || visibleAfter.isSymbolicLink() ||
      visibleAfter.dev !== after.dev || visibleAfter.ino !== after.ino ||
      visibleAfter.size !== after.size || visibleAfter.mtimeMs !== after.mtimeMs ||
      visibleAfter.ctimeMs !== after.ctimeMs
    ) {
      throw new Error("file_identity_changed_during_read");
    }
    return buffer.subarray(0, total);
  } finally {
    fs.closeSync(fd);
  }
}

export function inspectBuyVoidSourceFinalityReviewedSourceFilesV7(): Readonly<{
  reviewed_source_files_sha256: string;
  reviewed_source_file_count: "7";
  files: readonly Readonly<{ path: string; git_blob_sha1: string }>[];
}> {
  const files = REVIEWED_SOURCE_PATHS_V7.map((relative) => {
    const absolute = path.join(ROOT, ...relative.split("/"));
    const resolved = path.resolve(absolute);
    if (!resolved.startsWith(ROOT + path.sep)) {
      throw new Error("source_path_escape");
    }
    const bytes = readStableRegularFile(resolved, MAX_SOURCE_FILE_BYTES);
    return Object.freeze({ path: relative, git_blob_sha1: gitBlobSha1(bytes) });
  });
  return Object.freeze({
    reviewed_source_files_sha256: sha256Canonical({
      marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7,
      version: 7,
      repository: "6ZoSo9/void-node",
      files,
    }),
    reviewed_source_file_count: "7",
    files: Object.freeze(files),
  });
}

const DEPLOYMENT_RECEIPT_KEYS = Object.freeze([
  "accepted_enforcement_set_sha256",
  "marker",
  "process_source_branch",
  "process_source_commit",
  "process_source_marker",
  "process_source_tree",
  "receipt_id",
  "reviewed_source_file_count",
  "reviewed_source_files_sha256",
  "status",
  "version",
]);

export function buyVoidSourceFinalityDeploymentReceiptIdV7(
  receiptWithoutId: Record<string, unknown>,
): string {
  return "voidbsfdep1_" + sha256Canonical(receiptWithoutId);
}

export function classifyBuyVoidSourceFinalityDeploymentReceiptV7(input: {
  receipt: unknown;
  process_source_identity: ProcessSourceIdentityV7;
  reviewed_source_files_sha256: string;
  reviewed_source_file_count: "7";
}): BuyVoidSourceFinalityDeploymentDecisionV7 {
  const bad = (reason: string): BuyVoidSourceFinalityDeploymentDecisionV7 => ({
    ok: false,
    status: "held",
    reason,
    source_generation_verified: false,
    deployed_artifact_generation_verified: false,
  });
  if (!exactKeys(input.receipt, DEPLOYMENT_RECEIPT_KEYS)) {
    return bad("deployment_receipt_schema_invalid");
  }
  const receipt = input.receipt as Record<string, unknown>;
  const processIdentity = input.process_source_identity;
  if (
    receipt.marker !== VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1 ||
    receipt.version !== 1 ||
    receipt.status !== "DEPLOYED_SOURCE_FINALITY_GENERATION_ACCEPTED" ||
    receipt.process_source_marker !== "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1" ||
    receipt.process_source_marker !== processIdentity.marker ||
    receipt.process_source_commit !== processIdentity.commit ||
    receipt.process_source_tree !== processIdentity.tree ||
    receipt.process_source_branch !== processIdentity.branch ||
    !SHA40.test(String(receipt.process_source_commit ?? "")) ||
    !SHA40.test(String(receipt.process_source_tree ?? "")) ||
    !SHA256.test(String(receipt.accepted_enforcement_set_sha256 ?? "")) ||
    receipt.reviewed_source_files_sha256 !== input.reviewed_source_files_sha256 ||
    receipt.reviewed_source_file_count !== input.reviewed_source_file_count ||
    !RECEIPT_ID.test(String(receipt.receipt_id ?? ""))
  ) {
    return bad("deployment_receipt_identity_mismatch");
  }
  const withoutId = Object.fromEntries(
    Object.entries(receipt).filter(([key]) => key !== "receipt_id"),
  );
  if (receipt.receipt_id !== buyVoidSourceFinalityDeploymentReceiptIdV7(withoutId)) {
    return bad("deployment_receipt_content_address_mismatch");
  }
  return {
    ok: true,
    status: "deployment_generation_verified",
    deployment_receipt_id: String(receipt.receipt_id),
    accepted_enforcement_set_sha256: String(receipt.accepted_enforcement_set_sha256),
    reviewed_source_files_sha256: input.reviewed_source_files_sha256,
    reviewed_source_file_count: input.reviewed_source_file_count,
    source_generation_verified: true,
    deployed_artifact_generation_verified: true,
  };
}

export function verifyBuyVoidSourceFinalityDeploymentReceiptV7(input: {
  deployment_receipt_path: string;
  process_source_identity: ProcessSourceIdentityV7;
}): BuyVoidSourceFinalityDeploymentDecisionV7 {
  try {
    if (!path.isAbsolute(input.deployment_receipt_path)) {
      return {
        ok: false,
        status: "held",
        reason: "deployment_receipt_path_not_absolute",
        source_generation_verified: false,
        deployed_artifact_generation_verified: false,
      };
    }
    const stat = fs.lstatSync(input.deployment_receipt_path);
    const euid = typeof process.geteuid === "function" ? process.geteuid() : null;
    if (
      !stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 ||
      euid === null || (stat.uid !== euid && stat.uid !== 0) ||
      (stat.mode & 0o022) !== 0
    ) {
      throw new Error("deployment_receipt_path_policy_invalid");
    }
    const bytes = readStableRegularFile(input.deployment_receipt_path, MAX_RECEIPT_BYTES);
    const receipt = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const sources = inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
    return classifyBuyVoidSourceFinalityDeploymentReceiptV7({
      receipt,
      process_source_identity: input.process_source_identity,
      reviewed_source_files_sha256: sources.reviewed_source_files_sha256,
      reviewed_source_file_count: sources.reviewed_source_file_count,
    });
  } catch {
    return {
      ok: false,
      status: "held",
      reason: "deployment_receipt_unavailable_or_invalid",
      source_generation_verified: false,
      deployed_artifact_generation_verified: false,
    };
  }
}

function providerEndpoint(policy: BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3):
  | Readonly<{ rpc_identity: string; rpc_url_fingerprint_sha256: string; hostname: string }>
  | null {
  const rail = policy.source_finality_policy as unknown as Record<string, unknown>;
  const rpcUrl = String(rail.rpc_url ?? "").trim();
  const rpcIdentity = String(rail.rpc_identity ?? "").trim();
  const fingerprint = String(rail.rpc_url_fingerprint_sha256 ?? "").trim().toLowerCase();
  if (!SAFE_ID.test(rpcIdentity) || !SHA256.test(fingerprint)) return null;
  try {
    const parsed = new URL(rpcUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) {
      return null;
    }
    return Object.freeze({
      rpc_identity: rpcIdentity,
      rpc_url_fingerprint_sha256: fingerprint,
      hostname: parsed.hostname.toLowerCase(),
    });
  } catch {
    return null;
  }
}

export function classifyBuyVoidSourceFinalityProviderQuorumV7(input: {
  primary_policy: BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3;
  secondary_policy: BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3;
  primary: unknown;
  secondary: unknown;
  deployment: BuyVoidSourceFinalityDeploymentDecisionV7;
}): BuyVoidSourceFinalityGenerationDecisionV7 {
  const primaryEndpoint = providerEndpoint(input.primary_policy);
  const secondaryEndpoint = providerEndpoint(input.secondary_policy);
  if (
    !primaryEndpoint || !secondaryEndpoint ||
    primaryEndpoint.rpc_identity === secondaryEndpoint.rpc_identity ||
    primaryEndpoint.rpc_url_fingerprint_sha256 === secondaryEndpoint.rpc_url_fingerprint_sha256 ||
    primaryEndpoint.hostname === secondaryEndpoint.hostname
  ) {
    return held("source_finality_provider_independence_invalid");
  }
  if (!input.deployment.ok) return held(input.deployment.reason);
  const primary = input.primary as Partial<BuyVoidSourceFinalityAuthenticatedReadyV3>;
  const secondary = input.secondary as Partial<BuyVoidSourceFinalityAuthenticatedReadyV3>;
  for (const [label, observed, endpoint] of [
    ["primary", primary, primaryEndpoint],
    ["secondary", secondary, secondaryEndpoint],
  ] as const) {
    if (
      observed.ok !== true ||
      observed.marker !== VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3 ||
      observed.authenticated_transport_identity_verified !== true ||
      observed.observation_generated_in_composition !== true ||
      observed.provider_consistency_verified !== true ||
      observed.same_provider_consistency_verified !== true ||
      observed.total_operation_deadline_verified !== true ||
      observed.finalized_tag !== "finalized" ||
      observed.rpc_identity !== endpoint.rpc_identity ||
      observed.rpc_url_fingerprint_sha256 !== endpoint.rpc_url_fingerprint_sha256
    ) {
      return held("source_finality_" + label + "_observation_invalid");
    }
  }
  const equalityFields = [
    "source_chain", "evm_chain_id", "transaction_hash", "log_index",
    "canonical_payment_identity", "payment_key_sha256", "payer_address",
    "receive_address", "delivery_address", "usdc_contract", "payment_asset",
    "payment_usdc_atoms", "receipt_block_number", "receipt_block_hash",
    "min_confirmations", "finality_adapter_id",
  ] as const;
  for (const field of equalityFields) {
    if (primary[field] !== secondary[field]) {
      return held("source_finality_provider_quorum_field_mismatch_" + field);
    }
  }
  if (!HASH32.test(String(primary.receipt_block_hash ?? ""))) {
    return held("source_finality_provider_quorum_receipt_hash_invalid");
  }
  const receiptBlock = positiveInteger(primary.receipt_block_number, 10_000_000_000n);
  const minConfirmations = positiveInteger(primary.min_confirmations);
  const primaryFinalized = positiveInteger(primary.finalized_reference_block, 10_000_000_000n);
  const secondaryFinalized = positiveInteger(secondary.finalized_reference_block, 10_000_000_000n);
  const primaryConfirmations = positiveInteger(primary.confirmations_observed);
  const secondaryConfirmations = positiveInteger(secondary.confirmations_observed);
  if (
    receiptBlock === null || minConfirmations === null ||
    primaryFinalized === null || secondaryFinalized === null ||
    primaryConfirmations === null || secondaryConfirmations === null ||
    primaryFinalized < receiptBlock || secondaryFinalized < receiptBlock ||
    primaryConfirmations < minConfirmations || secondaryConfirmations < minConfirmations ||
    !HASH32.test(String(primary.finalized_reference_block_hash ?? "")) ||
    !HASH32.test(String(secondary.finalized_reference_block_hash ?? ""))
  ) {
    return held("source_finality_provider_quorum_finality_invalid");
  }
  const quorum = Object.freeze({
    source_chain: primary.source_chain,
    transaction_hash: primary.transaction_hash,
    log_index: primary.log_index,
    receipt_block_number: primary.receipt_block_number,
    receipt_block_hash: primary.receipt_block_hash,
    primary: Object.freeze({
      rpc_identity: primaryEndpoint.rpc_identity,
      rpc_url_fingerprint_sha256: primaryEndpoint.rpc_url_fingerprint_sha256,
      hostname: primaryEndpoint.hostname,
      finalized_reference_block: primary.finalized_reference_block,
      finalized_reference_block_hash: primary.finalized_reference_block_hash,
      confirmations_observed: primary.confirmations_observed,
    }),
    secondary: Object.freeze({
      rpc_identity: secondaryEndpoint.rpc_identity,
      rpc_url_fingerprint_sha256: secondaryEndpoint.rpc_url_fingerprint_sha256,
      hostname: secondaryEndpoint.hostname,
      finalized_reference_block: secondary.finalized_reference_block,
      finalized_reference_block_hash: secondary.finalized_reference_block_hash,
      confirmations_observed: secondary.confirmations_observed,
    }),
    accepted_enforcement_set_sha256: input.deployment.accepted_enforcement_set_sha256,
    deployment_receipt_id: input.deployment.deployment_receipt_id,
  });
  return {
    ...(primary as BuyVoidSourceFinalityAuthenticatedReadyV3),
    schema: "void_buy_void_source_finality_generation_provenance_v7",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7,
    version: 7,
    status: "source_finality_production_quorum_ready",
    rpc_identity: primaryEndpoint.rpc_identity,
    rpc_url_fingerprint_sha256: primaryEndpoint.rpc_url_fingerprint_sha256,
    reviewed_source_files_verified: true,
    reviewed_source_files_sha256: input.deployment.reviewed_source_files_sha256,
    verified_source_file_count: input.deployment.reviewed_source_file_count,
    source_file_verification_mode: "operator_deployment_receipt_bound_v1",
    deployment_receipt_id: input.deployment.deployment_receipt_id,
    accepted_enforcement_set_sha256: input.deployment.accepted_enforcement_set_sha256,
    source_generation_verified: true,
    deployed_artifact_generation_verified: true,
    independent_remote_provider_transport_verified: true,
    remote_provider_identity_verified: false,
    ancestry_verified: true,
    provider_quorum_verified: true,
    production_source_finality_authority_ready: true,
    primary_provider: Object.freeze({
      rpc_identity: primaryEndpoint.rpc_identity,
      rpc_url_fingerprint_sha256: primaryEndpoint.rpc_url_fingerprint_sha256,
      finalized_reference_block: String(primary.finalized_reference_block),
      finalized_reference_block_hash: String(primary.finalized_reference_block_hash),
      confirmations_observed: String(primary.confirmations_observed),
    }),
    secondary_provider: Object.freeze({
      rpc_identity: secondaryEndpoint.rpc_identity,
      rpc_url_fingerprint_sha256: secondaryEndpoint.rpc_url_fingerprint_sha256,
      finalized_reference_block: String(secondary.finalized_reference_block),
      finalized_reference_block_hash: String(secondary.finalized_reference_block_hash),
      confirmations_observed: String(secondary.confirmations_observed),
    }),
    provider_quorum_sha256: sha256Canonical(quorum),
  };
}

export async function observeBuyVoidSourceFinalityGenerationProvenanceV7(input: {
  request: BuyVoidRequestV1;
  policy: BuyVoidSourceFinalityGenerationPolicyV7;
}): Promise<BuyVoidSourceFinalityGenerationDecisionV7> {
  if (!exactKeys(input, ["policy", "request"])) {
    return held("source_finality_v7_input_shape_invalid");
  }
  if (!exactKeys(input.policy, [
    "deployment_receipt_path",
    "primary",
    "process_source_identity",
    "secondary",
    "total_timeout_ms",
  ])) {
    return held("source_finality_v7_policy_shape_invalid");
  }
  const totalTimeout = parseTotalTimeoutMs(input.policy.total_timeout_ms);
  if (totalTimeout === null) return held("source_finality_v7_total_timeout_invalid");
  const deployment = verifyBuyVoidSourceFinalityDeploymentReceiptV7({
    deployment_receipt_path: input.policy.deployment_receipt_path,
    process_source_identity: input.policy.process_source_identity,
  });
  if (!deployment.ok) return held(deployment.reason);

  const primaryEndpoint = providerEndpoint(input.policy.primary);
  const secondaryEndpoint = providerEndpoint(input.policy.secondary);
  if (
    !primaryEndpoint || !secondaryEndpoint ||
    primaryEndpoint.rpc_identity === secondaryEndpoint.rpc_identity ||
    primaryEndpoint.rpc_url_fingerprint_sha256 === secondaryEndpoint.rpc_url_fingerprint_sha256 ||
    primaryEndpoint.hostname === secondaryEndpoint.hostname
  ) {
    return held("source_finality_provider_independence_invalid");
  }

  const deadline = performance.now() + totalTimeout;
  const primaryRemaining = remainingMs(deadline);
  if (primaryRemaining === 0) return held("source_finality_v7_total_deadline_exceeded");
  const primary = await observeBuyVoidSourceFinalityAuthenticatedCompositionV3({
    request: input.request,
    policy: {
      ...input.policy.primary,
      total_timeout_ms: String(primaryRemaining),
    },
  });
  if (!primary.ok) return held("source_finality_primary_" + primary.reason);

  const secondaryRemaining = remainingMs(deadline);
  if (secondaryRemaining === 0) return held("source_finality_v7_total_deadline_exceeded");
  const secondary = await observeBuyVoidSourceFinalityAuthenticatedCompositionV3({
    request: input.request,
    policy: {
      ...input.policy.secondary,
      total_timeout_ms: String(secondaryRemaining),
    },
  });
  if (!secondary.ok) return held("source_finality_secondary_" + secondary.reason);
  if (remainingMs(deadline) === 0) return held("source_finality_v7_total_deadline_exceeded");

  return classifyBuyVoidSourceFinalityProviderQuorumV7({
    primary_policy: input.policy.primary,
    secondary_policy: input.policy.secondary,
    primary,
    secondary,
    deployment,
  });
}
