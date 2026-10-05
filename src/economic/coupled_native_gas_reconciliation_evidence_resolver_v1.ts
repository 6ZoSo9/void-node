import crypto from "node:crypto";
import fs from "node:fs";
import * as http from "node:http";
import path from "node:path";

import {
  listBuyVoidPreparedTransactionPlanReservationsV1,
  type BuyVoidPreparedTransactionPlanReservationV1,
} from "./buy_void_prepared_transaction_plan_reservation_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  readBuyVoidBroadcastOutcomeStateV1,
  type BuyVoidBroadcastConfirmedRecordV1,
  type BuyVoidBroadcastOutcomeStateV1,
  type BuyVoidBroadcastRevertedRecordV1,
} from "./buy_void_broadcast_outcome_journal_v1.js";
import {
  classifyCoupledNativeGasTerminalCostEvidenceV1,
  type CoupledNativeGasRawTerminalReceiptV1,
  type CoupledNativeGasTerminalCostEvidenceVerifiedV1,
} from "./coupled_native_gas_terminal_cost_evidence_v1.js";
import {
  classifyCoupledNativeGasLiabilityReconciliationV1,
  type CoupledNativeGasLiabilityReconciliationDecisionV1,
} from "./coupled_native_gas_liability_reconciliation_v1.js";
import type {
  CoupledNativeGasLiabilityRecordV1,
} from "./coupled_native_gas_liability_v1.js";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_V1 =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_V1";

export const
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1 =
    Object.freeze({
      source_contract: true,
      read_only_resolver: true,
      presale_only: true,
      exact_liability_required: true,
      exact_prepared_plan_namespace: true,
      exact_prepared_plan_binding_required: true,
      derived_attempt_id_only: true,
      whole_execution_attempt_state_required: true,
      whole_broadcast_outcome_state_required: true,
      descriptor_bound_local_snapshot: true,
      local_snapshot_revalidated_after_rpc: true,
      numeric_loopback_http_only: true,
      chain2050_required: true,
      read_only_rpc_methods: [
        "eth_chainId",
        "eth_getTransactionReceipt",
        "eth_blockNumber",
      ],
      bounded_rpc_timeout: true,
      bounded_rpc_response_bytes: true,
      terminal_cost_classifier_reused: true,
      liability_reconciliation_classifier_reused: true,
      filesystem_read: true,
      filesystem_write: false,
      reconciliation_record_publication: false,
      liability_release_authorized: false,
      liability_delete_or_mutation: false,
      wallet_access: false,
      private_key_access: false,
      signing: false,
      transaction_construction: false,
      transaction_broadcast: false,
      rpc_write: false,
      chain2050_write: false,
      retry_execution_authorized: false,
      activation: false,
      inventory_movement: false,
      treasury_or_liquidity_movement: false,
      funds_movement: false,
    });

export type CoupledNativeGasReconciliationEvidenceRpcMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionReceipt"
  | "eth_blockNumber";

export type CoupledNativeGasReconciliationEvidenceRpcCallV1 = {
  method: CoupledNativeGasReconciliationEvidenceRpcMethodV1;
  params: unknown[];
};

export type CoupledNativeGasReconciliationEvidenceRpcTransportV1 = (
  call: Readonly<CoupledNativeGasReconciliationEvidenceRpcCallV1>,
) => Promise<unknown>;

export type CoupledNativeGasReconciliationEvidenceResolverPolicyV1 = {
  chain_id: "2050";
  rpc_url: string;
  required_min_confirmations: string | number;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

type NormalizedPolicyV1 = {
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  required_min_confirmations: bigint;
  request_timeout_ms: number;
  max_response_bytes: number;
};

type DirectorySnapshotV1 = {
  path: string;
  identity: string;
  entries: readonly {
    name: string;
    bytes: number;
    sha256: string;
    identity: string;
  }[];
  snapshot_sha256: string;
};

export type CoupledNativeGasReconciliationEvidencePacketV1 = {
  schema:
    "void_coupled_native_gas_reconciliation_evidence_packet_v1";
  marker:
    typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_V1;
  version: 1;
  liability_id: string;
  obligation_id: string;
  payer_address: string;
  prepared_plan_reservation_id: string;
  prepared_plan_fingerprint_sha256: string;
  attempt_id: string;
  transaction_hash: string;
  local_snapshot_sha256: string;
  rpc_url_fingerprint_sha256: string;
  rpc_methods_used:
    readonly CoupledNativeGasReconciliationEvidenceRpcMethodV1[];
  terminal_cost_evidence: CoupledNativeGasTerminalCostEvidenceVerifiedV1;
  reconciliation: Extract<
    CoupledNativeGasLiabilityReconciliationDecisionV1,
    { ok: true }
  >;
  mutation_performed: false;
  liability_release_authorized: false;
  funds_movement_performed: false;
  packet_id: string;
};

export type CoupledNativeGasReconciliationEvidenceResolverDecisionV1 =
  | {
      ok: true;
      status: "reconciliation_evidence_resolved";
      packet: CoupledNativeGasReconciliationEvidencePacketV1;
      mutation_performed: false;
      liability_release_authorized: false;
      funds_movement_performed: false;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      stage:
        | "policy"
        | "liability"
        | "plan"
        | "attempt"
        | "terminal_outcome"
        | "rpc"
        | "snapshot"
        | "terminal_cost"
        | "reconciliation";
      reason: string;
      rpc_url_fingerprint_sha256: string | null;
      rpc_methods_used:
        readonly CoupledNativeGasReconciliationEvidenceRpcMethodV1[];
      terminal_cost_evidence?:
        CoupledNativeGasTerminalCostEvidenceVerifiedV1;
      mutation_performed: false;
      liability_release_authorized: false;
      funds_movement_performed: false;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1;
    };

const SHA256 = /^[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/iu;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = 16_384;
const MAX_SNAPSHOT_FILE_BYTES = 1_048_576;
const PLAN_FILE = /^[0-9]{16}\.json$/u;
const EXECUTION_FILES = new Set([
  "reserved.json",
  "prepared.json",
  "broadcast.json",
  "failure.json",
  "postbroadcast-failure.json",
  "confirmed.json",
]);
const OUTCOME_FILES = new Set([
  "not-broadcast.json",
  "unknown.json",
  "accepted.json",
  "reverted.json",
  "confirmed.json",
]);

function held(
  stage: Extract<
    CoupledNativeGasReconciliationEvidenceResolverDecisionV1,
    { ok: false }
  >["stage"],
  reason: string,
  rpcFingerprint: string | null = null,
  methods:
    readonly CoupledNativeGasReconciliationEvidenceRpcMethodV1[] = [],
  terminal?: CoupledNativeGasTerminalCostEvidenceVerifiedV1,
): Extract<
  CoupledNativeGasReconciliationEvidenceResolverDecisionV1,
  { ok: false }
> {
  return Object.freeze({
    ok: false,
    status: "held",
    stage,
    reason,
    rpc_url_fingerprint_sha256: rpcFingerprint,
    rpc_methods_used: Object.freeze([...methods]),
    ...(terminal ? { terminal_cost_evidence: terminal } : {}),
    mutation_performed: false,
    liability_release_authorized: false,
    funds_movement_performed: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1,
  });
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new Error("reconciliation_evidence_noncanonical_value");
    }
    return encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function sha256Bytes(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Text(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Canonical(value: unknown): string {
  return sha256Text(canonical(value));
}

function parsePositive(
  value: unknown,
  maximum = Number.MAX_SAFE_INTEGER,
): number | null {
  const raw = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/u.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed <= maximum
    ? parsed
    : null;
}

function parseHexQuantity(value: unknown): bigint | null {
  const raw = String(value ?? "").trim();
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function normalizePolicy(
  raw: CoupledNativeGasReconciliationEvidenceResolverPolicyV1,
):
  | { ok: true; policy: NormalizedPolicyV1 }
  | { ok: false; reason: string; fingerprint: string | null } {
  if (raw?.chain_id !== "2050") {
    return {
      ok: false,
      reason: "reconciliation_evidence_chain_id_invalid",
      fingerprint: null,
    };
  }
  let url: URL;
  const rawUrl = String(raw?.rpc_url || "").trim();
  try {
    url = new URL(rawUrl);
  } catch {
    return {
      ok: false,
      reason: "reconciliation_evidence_rpc_url_invalid",
      fingerprint: null,
    };
  }
  const rawAuthority =
    rawUrl.match(/^http:\/\/([^/?#]+)(?:[/?#]|$)/u)?.[1] ?? "";
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.hash ||
    !/^(?:127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/u.test(
      rawAuthority,
    ) ||
    !["127.0.0.1", "[::1]"].includes(host)
  ) {
    return {
      ok: false,
      reason: "reconciliation_evidence_rpc_url_must_be_numeric_loopback",
      fingerprint: null,
    };
  }
  const normalizedUrl = url.toString();
  const fingerprint = sha256Text(normalizedUrl);
  const confirmations = parsePositive(
    raw?.required_min_confirmations,
    1_000,
  );
  const timeout = raw?.request_timeout_ms === undefined
    ? DEFAULT_TIMEOUT_MS
    : parsePositive(raw.request_timeout_ms, MAX_TIMEOUT_MS);
  const maxBytes = raw?.max_response_bytes === undefined
    ? DEFAULT_MAX_RESPONSE_BYTES
    : parsePositive(raw.max_response_bytes, MAX_RESPONSE_BYTES);
  if (confirmations === null) {
    return {
      ok: false,
      reason: "reconciliation_evidence_confirmation_policy_invalid",
      fingerprint,
    };
  }
  if (timeout === null || maxBytes === null) {
    return {
      ok: false,
      reason: "reconciliation_evidence_rpc_bounds_invalid",
      fingerprint,
    };
  }
  return {
    ok: true,
    policy: {
      rpc_url: normalizedUrl,
      rpc_url_fingerprint_sha256: fingerprint,
      required_min_confirmations: BigInt(confirmations),
      request_timeout_ms: timeout,
      max_response_bytes: maxBytes,
    },
  };
}

function createHttpTransport(
  policy: NormalizedPolicyV1,
): CoupledNativeGasReconciliationEvidenceRpcTransportV1 {
  let requestId = 0;
  const allowed =
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1
      .read_only_rpc_methods;
  return async (call) => {
    if (!allowed.includes(call.method)) {
      throw new Error("reconciliation_evidence_rpc_method_not_allowed");
    }
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: ++requestId,
      method: call.method,
      params: call.params,
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("reconciliation_evidence_rpc_request_too_large");
    }
    return await new Promise((resolve, reject) => {
      const url = new URL(policy.rpc_url);
      let settled = false;
      const finish = (error: Error | null, result?: unknown) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(result);
      };
      const request = http.request(
        {
          protocol: "http:",
          hostname: url.hostname === "[::1]" ? "::1" : url.hostname,
          port: url.port || "80",
          path: url.pathname + url.search,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body, "utf8")),
            "user-agent":
              "void-coupled-native-gas-reconciliation-evidence-resolver-v1",
          },
          timeout: policy.request_timeout_ms,
        },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;
          response.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > policy.max_response_bytes) {
              request.destroy(
                new Error("reconciliation_evidence_rpc_response_too_large"),
              );
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () => {
            if (Number(response.statusCode || 0) !== 200) {
              finish(
                new Error("reconciliation_evidence_rpc_http_status_not_ok"),
              );
              return;
            }
            const contentType = String(
              response.headers["content-type"] || "",
            ).toLowerCase();
            if (!contentType.includes("application/json")) {
              finish(
                new Error("reconciliation_evidence_rpc_response_not_json"),
              );
              return;
            }
            let payload: any;
            try {
              payload = JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              );
            } catch {
              finish(
                new Error("reconciliation_evidence_rpc_json_invalid"),
              );
              return;
            }
            if (
              !payload ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== requestId ||
              payload.error ||
              !("result" in payload)
            ) {
              finish(
                new Error("reconciliation_evidence_rpc_envelope_invalid"),
              );
              return;
            }
            finish(null, payload.result);
          });
        },
      );
      request.on("timeout", () => {
        request.destroy(
          new Error("reconciliation_evidence_rpc_timeout"),
        );
      });
      request.on("error", (error) => finish(error));
      request.end(body);
    });
  };
}

function identityOf(stat: fs.BigIntStats): string {
  return [
    stat.dev,
    stat.ino,
    stat.uid,
    stat.gid,
    stat.mode,
    stat.size,
    stat.mtimeNs,
    stat.ctimeNs,
    stat.nlink,
  ].map(String).join(":");
}

function assertPrivateDirectory(
  stat: fs.BigIntStats,
  code: string,
): void {
  const euid =
    typeof process.geteuid === "function"
      ? BigInt(process.geteuid())
      : null;
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    euid === null ||
    stat.uid !== euid ||
    (stat.mode & 0o077n) !== 0n
  ) {
    throw new Error(code);
  }
}

function assertPrivateFile(
  stat: fs.BigIntStats,
  code: string,
): void {
  const euid =
    typeof process.geteuid === "function"
      ? BigInt(process.geteuid())
      : null;
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    euid === null ||
    stat.uid !== euid ||
    stat.nlink !== 1n ||
    (stat.mode & 0o077n) !== 0n ||
    stat.size <= 0n ||
    stat.size > BigInt(MAX_SNAPSHOT_FILE_BYTES)
  ) {
    throw new Error(code);
  }
}

function snapshotPrivateDirectory(
  directory: string,
  allowName: (name: string) => boolean,
  code: string,
): DirectorySnapshotV1 {
  const noFollow = fs.constants.O_NOFOLLOW;
  const directoryFlag = fs.constants.O_DIRECTORY;
  if (
    typeof noFollow !== "number" ||
    typeof directoryFlag !== "number"
  ) {
    throw new Error("reconciliation_evidence_nofollow_unavailable");
  }
  const fd = fs.openSync(
    directory,
    fs.constants.O_RDONLY | directoryFlag | noFollow,
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    assertPrivateDirectory(before, code + "_directory_unsafe");
    const procPath = path.join("/proc/self/fd", String(fd));
    const names = fs.readdirSync(procPath).sort();
    const entries: DirectorySnapshotV1["entries"][number][] = [];
    for (const name of names) {
      if (!allowName(name)) {
        throw new Error(code + "_entry_invalid");
      }
      const childPath = path.join(procPath, name);
      const childFd = fs.openSync(
        childPath,
        fs.constants.O_RDONLY | noFollow,
      );
      try {
        const listed = fs.lstatSync(childPath, { bigint: true });
        const opened = fs.fstatSync(childFd, { bigint: true });
        assertPrivateFile(listed, code + "_file_unsafe");
        assertPrivateFile(opened, code + "_file_unsafe");
        if (identityOf(listed) !== identityOf(opened)) {
          throw new Error(code + "_file_identity_changed");
        }
        const bytes = fs.readFileSync(childFd);
        const after = fs.fstatSync(childFd, { bigint: true });
        const visible = fs.lstatSync(childPath, { bigint: true });
        if (
          bytes.length !== Number(after.size) ||
          identityOf(opened) !== identityOf(after) ||
          identityOf(after) !== identityOf(visible)
        ) {
          throw new Error(code + "_file_changed_during_read");
        }
        entries.push({
          name,
          bytes: bytes.length,
          sha256: sha256Bytes(bytes),
          identity: identityOf(after),
        });
      } finally {
        fs.closeSync(childFd);
      }
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(procPath, { bigint: true });
    if (
      identityOf(before) !== identityOf(after) ||
      identityOf(after) !== identityOf(visible)
    ) {
      throw new Error(code + "_directory_changed_during_scan");
    }
    const body = {
      path: path.resolve(directory),
      identity: identityOf(after),
      entries,
    };
    return Object.freeze({
      ...body,
      entries: Object.freeze(entries.map((entry) => Object.freeze(entry))),
      snapshot_sha256: sha256Canonical(body),
    });
  } finally {
    fs.closeSync(fd);
  }
}

function sameSnapshot(
  left: DirectorySnapshotV1,
  right: DirectorySnapshotV1,
): boolean {
  return (
    left.path === right.path &&
    left.identity === right.identity &&
    left.snapshot_sha256 === right.snapshot_sha256
  );
}

function validateLiabilitySelector(
  raw: CoupledNativeGasLiabilityRecordV1,
): string | null {
  if (
    !raw ||
    raw.lane !== "presale" ||
    raw.source_evidence_kind !== "buy_void_prepared_plan_v1" ||
    raw.attempt_limit !== 1 ||
    !SHA256.test(String(raw.liability_id || "")) ||
    !SHA256.test(String(raw.obligation_id || "")) ||
    !ADDRESS.test(String(raw.payer_address || "")) ||
    !Number.isSafeInteger(raw.nonce) ||
    raw.nonce < 0 ||
    !SHA256.test(
      String(raw.transaction_plan_fingerprint_sha256 || ""),
    ) ||
    !SHA256.test(String(raw.source_evidence_id || "")) ||
    raw.source_evidence_id !==
      raw.transaction_plan_fingerprint_sha256 ||
    raw.status !== "open"
  ) {
    return "reconciliation_evidence_liability_selector_invalid";
  }
  return null;
}

function expectedWalletKey(payer: string): string {
  return sha256Text("void-buy-wallet-v1\n2050\n" + payer);
}

function validatePlanBinding(
  liability: CoupledNativeGasLiabilityRecordV1,
  plan: BuyVoidPreparedTransactionPlanReservationV1,
): string | null {
  if (
    plan.reservation_id !== liability.obligation_id ||
    plan.wallet_address !== liability.payer_address ||
    plan.wallet_key_sha256 !==
      expectedWalletKey(liability.payer_address) ||
    plan.nonce !== liability.nonce ||
    plan.native_value_wei !== liability.transaction_native_value_wei ||
    plan.gas_limit !== liability.gas_limit ||
    plan.max_fee_per_gas_wei !==
      liability.admitted_max_fee_per_gas_wei ||
    plan.transaction_plan_fingerprint_sha256 !==
      liability.transaction_plan_fingerprint_sha256 ||
    plan.transaction_plan_fingerprint_sha256 !==
      liability.source_evidence_id
  ) {
    return "reconciliation_evidence_plan_liability_binding_mismatch";
  }
  return null;
}

function terminalFromState(
  state: BuyVoidBroadcastOutcomeStateV1,
): BuyVoidBroadcastConfirmedRecordV1 | BuyVoidBroadcastRevertedRecordV1 | null {
  if (
    state.status === "confirmed" &&
    state.terminal === true &&
    state.retry_allowed === false &&
    state.reconciliation_required === false &&
    state.confirmed
  ) {
    return state.confirmed;
  }
  if (
    state.status === "reverted" &&
    state.terminal === true &&
    state.reconciliation_required === false &&
    state.reverted
  ) {
    return state.reverted;
  }
  return null;
}

function localSnapshotDigest(
  plan: DirectorySnapshotV1,
  attempt: DirectorySnapshotV1,
  outcome: DirectorySnapshotV1,
): string {
  return sha256Canonical({
    plan_snapshot_sha256: plan.snapshot_sha256,
    attempt_snapshot_sha256: attempt.snapshot_sha256,
    outcome_snapshot_sha256: outcome.snapshot_sha256,
  });
}

export async function resolveCoupledNativeGasReconciliationEvidenceV1(
  input: {
    root_dir: string;
    liability: CoupledNativeGasLiabilityRecordV1;
    policy: CoupledNativeGasReconciliationEvidenceResolverPolicyV1;
    transport?: CoupledNativeGasReconciliationEvidenceRpcTransportV1;
  },
): Promise<CoupledNativeGasReconciliationEvidenceResolverDecisionV1> {
  const normalized = normalizePolicy(input?.policy);
  if (!normalized.ok) {
    return held(
      "policy",
      normalized.reason,
      normalized.fingerprint,
    );
  }
  const policy = normalized.policy;
  const methods: CoupledNativeGasReconciliationEvidenceRpcMethodV1[] = [];
  const rootRaw = String(input?.root_dir || "").trim();
  if (
    !rootRaw ||
    !path.isAbsolute(rootRaw) ||
    rootRaw.includes("\0") ||
    path.resolve(rootRaw) === path.parse(path.resolve(rootRaw)).root
  ) {
    return held(
      "liability",
      "reconciliation_evidence_root_invalid",
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }
  const root = path.resolve(rootRaw);
  const liability = input?.liability;
  const selectorError = validateLiabilitySelector(liability);
  if (selectorError) {
    return held(
      "liability",
      selectorError,
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }

  const walletKey = expectedWalletKey(liability.payer_address);
  const planNonces = path.join(
    root,
    "buy-void-prepared-transaction-plan-reservation-v1",
    "wallets",
    walletKey,
    "nonces",
  );

  let planBefore: DirectorySnapshotV1;
  let plans: BuyVoidPreparedTransactionPlanReservationV1[];
  let plan: BuyVoidPreparedTransactionPlanReservationV1;
  try {
    planBefore = snapshotPrivateDirectory(
      planNonces,
      (name) => PLAN_FILE.test(name),
      "reconciliation_evidence_plan_namespace",
    );
    plans = listBuyVoidPreparedTransactionPlanReservationsV1({
      root_dir: root,
      wallet_address: liability.payer_address,
    });
    const matches = plans.filter(
      (candidate) =>
        candidate.reservation_id === liability.obligation_id,
    );
    if (matches.length !== 1) {
      return held(
        "plan",
        matches.length === 0
          ? "reconciliation_evidence_plan_not_found"
          : "reconciliation_evidence_plan_not_unique",
        policy.rpc_url_fingerprint_sha256,
        methods,
      );
    }
    plan = matches[0];
  } catch (error) {
    return held(
      "plan",
      String((error as Error)?.message || error).slice(0, 240),
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }
  const planError = validatePlanBinding(liability, plan);
  if (planError) {
    return held(
      "plan",
      planError,
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }

  const attemptDir = path.join(
    root,
    "buy-void-execution-attempts-v1",
    "attempts",
    plan.attempt_id,
  );
  const outcomeDir = path.join(
    root,
    "buy-void-broadcast-outcomes-v1",
    "attempts",
    plan.attempt_id,
  );

  let attemptBefore: DirectorySnapshotV1;
  let outcomeBefore: DirectorySnapshotV1;
  let attempt: BuyVoidExecutionAttemptStateV1 | null;
  let outcomeState: BuyVoidBroadcastOutcomeStateV1 | null;
  try {
    attemptBefore = snapshotPrivateDirectory(
      attemptDir,
      (name) => EXECUTION_FILES.has(name),
      "reconciliation_evidence_execution_attempt",
    );
    outcomeBefore = snapshotPrivateDirectory(
      outcomeDir,
      (name) => OUTCOME_FILES.has(name),
      "reconciliation_evidence_broadcast_outcome",
    );
    attempt = readBuyVoidExecutionAttemptV1({
      root_dir: root,
      attempt_id: plan.attempt_id,
    });
    outcomeState = readBuyVoidBroadcastOutcomeStateV1({
      root_dir: root,
      attempt_id: plan.attempt_id,
    });
  } catch (error) {
    return held(
      "attempt",
      String((error as Error)?.message || error).slice(0, 240),
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }
  if (
    !attempt ||
    !outcomeState ||
    attempt.reservation.attempt_id !== plan.attempt_id ||
    outcomeState.attempt_id !== plan.attempt_id ||
    outcomeState.attempt.reservation.attempt_id !== plan.attempt_id ||
    canonical(attempt) !== canonical(outcomeState.attempt) ||
    !attempt.prepared ||
    attempt.prepared.void_delivery_tx_hash !==
      outcomeState.void_delivery_tx_hash
  ) {
    return held(
      "attempt",
      "reconciliation_evidence_attempt_lineage_mismatch",
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }
  const terminal = terminalFromState(outcomeState);
  if (!terminal) {
    return held(
      "terminal_outcome",
      "reconciliation_evidence_terminal_outcome_not_confirmed_or_reverted",
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }
  if (
    terminal.attempt_id !== plan.attempt_id ||
    terminal.void_delivery_tx_hash !==
      outcomeState.void_delivery_tx_hash
  ) {
    return held(
      "terminal_outcome",
      "reconciliation_evidence_terminal_transaction_mismatch",
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }

  const transport = input.transport || createHttpTransport(policy);
  const call = async (
    method: CoupledNativeGasReconciliationEvidenceRpcMethodV1,
    params: unknown[],
  ) => {
    methods.push(method);
    return await transport({ method, params });
  };

  let receiptRaw: unknown;
  let currentBlockRaw: unknown;
  try {
    const chainRaw = await call("eth_chainId", []);
    if (parseHexQuantity(chainRaw) !== 2050n) {
      return held(
        "rpc",
        "reconciliation_evidence_rpc_chain_id_mismatch",
        policy.rpc_url_fingerprint_sha256,
        methods,
      );
    }
    receiptRaw = await call(
      "eth_getTransactionReceipt",
      [outcomeState.void_delivery_tx_hash],
    );
    if (!receiptRaw || typeof receiptRaw !== "object") {
      return held(
        "rpc",
        "reconciliation_evidence_receipt_missing",
        policy.rpc_url_fingerprint_sha256,
        methods,
      );
    }
    currentBlockRaw = await call("eth_blockNumber", []);
    if (parseHexQuantity(currentBlockRaw) === null) {
      return held(
        "rpc",
        "reconciliation_evidence_current_block_invalid",
        policy.rpc_url_fingerprint_sha256,
        methods,
      );
    }
  } catch (error) {
    return held(
      "rpc",
      String((error as Error)?.message || error).slice(0, 240),
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }

  let planAfter: DirectorySnapshotV1;
  let attemptAfter: DirectorySnapshotV1;
  let outcomeAfter: DirectorySnapshotV1;
  try {
    planAfter = snapshotPrivateDirectory(
      planNonces,
      (name) => PLAN_FILE.test(name),
      "reconciliation_evidence_plan_namespace",
    );
    attemptAfter = snapshotPrivateDirectory(
      attemptDir,
      (name) => EXECUTION_FILES.has(name),
      "reconciliation_evidence_execution_attempt",
    );
    outcomeAfter = snapshotPrivateDirectory(
      outcomeDir,
      (name) => OUTCOME_FILES.has(name),
      "reconciliation_evidence_broadcast_outcome",
    );
  } catch (error) {
    return held(
      "snapshot",
      String((error as Error)?.message || error).slice(0, 240),
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }
  if (
    !sameSnapshot(planBefore, planAfter) ||
    !sameSnapshot(attemptBefore, attemptAfter) ||
    !sameSnapshot(outcomeBefore, outcomeAfter)
  ) {
    return held(
      "snapshot",
      "reconciliation_evidence_local_state_changed_during_resolution",
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }

  const terminalEvidence =
    classifyCoupledNativeGasTerminalCostEvidenceV1({
      liability,
      buy_void_plan: plan,
      terminal_outcome: terminal,
      raw_receipt:
        receiptRaw as CoupledNativeGasRawTerminalReceiptV1,
      current_block_number: String(currentBlockRaw ?? ""),
      required_min_confirmations:
        policy.required_min_confirmations.toString(),
    });
  if (!terminalEvidence.ok) {
    return held(
      "terminal_cost",
      terminalEvidence.reason,
      policy.rpc_url_fingerprint_sha256,
      methods,
    );
  }

  const reconciliation =
    classifyCoupledNativeGasLiabilityReconciliationV1({
      liability,
      terminal_cost_evidence: terminalEvidence,
    });
  if (!reconciliation.ok) {
    return held(
      "reconciliation",
      reconciliation.reason,
      policy.rpc_url_fingerprint_sha256,
      methods,
      terminalEvidence,
    );
  }

  const packetBody = Object.freeze({
    schema:
      "void_coupled_native_gas_reconciliation_evidence_packet_v1" as const,
    marker:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_V1,
    version: 1 as const,
    liability_id: liability.liability_id,
    obligation_id: liability.obligation_id,
    payer_address: liability.payer_address,
    prepared_plan_reservation_id: plan.reservation_id,
    prepared_plan_fingerprint_sha256:
      plan.transaction_plan_fingerprint_sha256,
    attempt_id: plan.attempt_id,
    transaction_hash: outcomeState.void_delivery_tx_hash,
    local_snapshot_sha256: localSnapshotDigest(
      planAfter,
      attemptAfter,
      outcomeAfter,
    ),
    rpc_url_fingerprint_sha256:
      policy.rpc_url_fingerprint_sha256,
    rpc_methods_used: Object.freeze([...methods]),
    terminal_cost_evidence: terminalEvidence,
    reconciliation,
    mutation_performed: false as const,
    liability_release_authorized: false as const,
    funds_movement_performed: false as const,
  });
  const packet = Object.freeze({
    ...packetBody,
    packet_id: sha256Canonical(packetBody),
  });

  return Object.freeze({
    ok: true,
    status: "reconciliation_evidence_resolved",
    packet,
    mutation_performed: false,
    liability_release_authorized: false,
    funds_movement_performed: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1,
  });
}
