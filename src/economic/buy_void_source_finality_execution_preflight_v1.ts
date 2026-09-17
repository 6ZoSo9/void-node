import crypto from "node:crypto";

import type { BuyVoidRequestV1 } from "./buy_void_auto_fulfillment_v1.js";
import {
  readBuyVoidCanonicalPresaleServerPolicyV1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2,
  type BuyVoidSourceFinalityStaticPolicyV2,
} from "./buy_void_source_finality_authority_v2.js";
import type {
  BuyVoidSourceChainFinalityRpcPolicyV1,
} from "./buy_void_source_chain_finality_rpc_adapter_v1.js";
import {
  observeBuyVoidSourceFinalityGenerationProvenanceV4,
} from "./buy_void_source_finality_generation_provenance_v4.js";

export const VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1 =
  "VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1";

export const VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_POLICY_ENVS_V1 =
  Object.freeze({
    base_rpc_url: "VOID_BUY_VOID_SOURCE_FINALITY_BASE_RPC_URL",
    base_rpc_identity: "VOID_BUY_VOID_SOURCE_FINALITY_BASE_RPC_IDENTITY",
    ethereum_rpc_url: "VOID_BUY_VOID_SOURCE_FINALITY_ETHEREUM_RPC_URL",
    ethereum_rpc_identity:
      "VOID_BUY_VOID_SOURCE_FINALITY_ETHEREUM_RPC_IDENTITY",
    total_timeout_ms: "VOID_BUY_VOID_SOURCE_FINALITY_TOTAL_TIMEOUT_MS",
    request_timeout_ms: "VOID_BUY_VOID_SOURCE_FINALITY_RPC_TIMEOUT_MS",
    max_response_bytes:
      "VOID_BUY_VOID_SOURCE_FINALITY_RPC_MAX_RESPONSE_BYTES",
  });

export const VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    server_controlled_policy: true,
    fulfillment_journal_reconstruction: true,
    immutable_process_source_identity_required: true,
    v4_runtime_source_file_verification_reused: true,
    authenticated_source_rpc_transport_reused: true,
    total_operation_deadline_reused: true,
    production_source_finality_authority_required: true,
    signer_access_gate: true,
    transaction_broadcast_gate: true,
    reconciliation_gate: false,
    filesystem_write: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    inventory_mutation: false,
    chain2050_mutation: false,
    public_presale_activation: false,
    money_movement: false,
  });

const PROCESS_SOURCE_MARKER = "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1";
const BASE_ADAPTER_ID = "void-base-finalized-tag-rpc-v1";
const ETHEREUM_ADAPTER_ID = "void-ethereum-finalized-tag-rpc-v1";
const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const MAX_TOTAL_TIMEOUT_MS = 120_000;
const MAX_REQUEST_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 1_048_576;
const SCALE_6 = 1_000_000n;

export type BuyVoidSourceFinalityExecutionRailV1 = {
  source_chain: "base" | "ethereum";
  evm_chain_id: "8453" | "1";
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  rpc_identity: string;
  finality_adapter_id: string;
  min_confirmations: string;
  usdc_contract: string;
  receive_address: string;
  timeout_ms: string;
  max_response_bytes: string;
};

export type BuyVoidSourceFinalityExecutionPolicyV1 = {
  base: BuyVoidSourceFinalityExecutionRailV1;
  ethereum: BuyVoidSourceFinalityExecutionRailV1;
  authority_policy_generation: BuyVoidSourceFinalityStaticPolicyV2;
  total_timeout_ms: string;
};

export type BuyVoidSourceFinalityExecutionPolicyDecisionV1 =
  | {
      ok: true;
      status: "configured";
      policy: BuyVoidSourceFinalityExecutionPolicyV1;
      missing_envs: [];
    }
  | {
      ok: false;
      status: "held";
      reason: string;
      missing_envs: string[];
    };

export type BuyVoidSourceFinalityExecutionPreflightReadyV1 = {
  ok: true;
  status: "ready";
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1;
  version: 1;
  attempt_id: string;
  source_chain: "base" | "ethereum";
  process_source_identity_verified: true;
  reviewed_source_files_verified: true;
  authenticated_transport_identity_verified: true;
  total_operation_deadline_verified: true;
  source_generation_verified: true;
  deployed_artifact_generation_verified: true;
  ancestry_verified: true;
  provider_quorum_verified: true;
  production_source_finality_authority_ready: true;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidSourceFinalityExecutionPreflightHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1;
  version: 1;
  reason: string;
  attempt_id: string | null;
  source_chain: "base" | "ethereum" | null;
  process_source_identity_verified: boolean;
  reviewed_source_files_verified: boolean;
  authenticated_transport_identity_verified: boolean;
  total_operation_deadline_verified: boolean;
  source_generation_verified: boolean;
  deployed_artifact_generation_verified: boolean;
  ancestry_verified: boolean;
  provider_quorum_verified: boolean;
  production_source_finality_authority_ready: false;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidSourceFinalityExecutionPreflightDecisionV1 =
  | BuyVoidSourceFinalityExecutionPreflightReadyV1
  | BuyVoidSourceFinalityExecutionPreflightHeldV1;

export type BuyVoidSourceFinalityExecutionObserverV1 = (input: {
  request: BuyVoidRequestV1;
  policy: {
    source_finality_policy: BuyVoidSourceChainFinalityRpcPolicyV1;
    authority_policy_generation: BuyVoidSourceFinalityStaticPolicyV2;
    total_timeout_ms: string;
  };
}) => Promise<unknown>;

export type BuyVoidSourceFinalityExecutionPreflightDependenciesV1 = {
  observe_source_finality?: BuyVoidSourceFinalityExecutionObserverV1;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function positiveBounded(
  value: unknown,
  maximum: number,
): string | null {
  const raw = text(value);
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? raw : null;
}

function normalizeAddress(value: unknown): string {
  const raw = text(value).toLowerCase();
  return ADDRESS.test(raw) ? raw : "";
}

function normalizeChain(value: unknown): "base" | "ethereum" | "" {
  const raw = text(value).toLowerCase();
  if (raw === "eth") return "ethereum";
  return raw === "base" || raw === "ethereum" ? raw : "";
}

function normalizeRpcUrl(value: unknown): string {
  let url: URL;
  try {
    url = new URL(text(value));
  } catch {
    return "";
  }
  if (url.username || url.password || url.hash) return "";
  const loopback = ["127.0.0.1", "::1", "localhost"].includes(
    url.hostname.toLowerCase(),
  );
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    return "";
  }
  return url.toString();
}

function processSourceIdentityVerified(env: NodeJS.ProcessEnv): boolean {
  return (
    text(env.VOID_PROCESS_SOURCE_IDENTITY_MARKER) === PROCESS_SOURCE_MARKER &&
    SHA40.test(text(env.VOID_PROCESS_SOURCE_COMMIT).toLowerCase()) &&
    SHA40.test(text(env.VOID_PROCESS_SOURCE_TREE).toLowerCase()) &&
    text(env.VOID_PROCESS_SOURCE_BRANCH) === "main"
  );
}

function unitsToDecimal6(value: unknown): string {
  const raw = text(value);
  if (!UINT.test(raw)) return "";
  let units: bigint;
  try {
    units = BigInt(raw);
  } catch {
    return "";
  }
  const whole = units / SCALE_6;
  const fraction = (units % SCALE_6)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function held(
  reason: string,
  options: Partial<BuyVoidSourceFinalityExecutionPreflightHeldV1> = {},
): BuyVoidSourceFinalityExecutionPreflightHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
    version: 1,
    reason,
    attempt_id: options.attempt_id ?? null,
    source_chain: options.source_chain ?? null,
    process_source_identity_verified:
      options.process_source_identity_verified === true,
    reviewed_source_files_verified:
      options.reviewed_source_files_verified === true,
    authenticated_transport_identity_verified:
      options.authenticated_transport_identity_verified === true,
    total_operation_deadline_verified:
      options.total_operation_deadline_verified === true,
    source_generation_verified: options.source_generation_verified === true,
    deployed_artifact_generation_verified:
      options.deployed_artifact_generation_verified === true,
    ancestry_verified: options.ancestry_verified === true,
    provider_quorum_verified: options.provider_quorum_verified === true,
    production_source_finality_authority_ready: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

function findIntent(
  rootDir: string,
  attempt: BuyVoidExecutionAttemptStateV1,
): BuyVoidFulfillmentJournalIntentV1 | null {
  const reservation = attempt.reservation;
  const matches = listBuyVoidFulfillmentJournalClaimsV1(rootDir).filter(
    (value) =>
      value.claim?.request_id === reservation.request_id &&
      value.claim?.canonical_payment_identity ===
        reservation.canonical_payment_identity &&
      value.claim?.instruction_id === reservation.instruction_id &&
      value.request_key_sha256 === reservation.request_key_sha256 &&
      value.payment_key_sha256 === reservation.payment_key_sha256,
  );
  return matches.length === 1 ? matches[0] : null;
}

function reconstructRequest(
  attempt: BuyVoidExecutionAttemptStateV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): BuyVoidRequestV1 | null {
  const binding = intent.verification_binding;
  const instruction = intent.claim?.unsigned_instruction;
  const sourceChain = normalizeChain(binding?.source_chain);
  const txHash = text(binding?.payment_transaction_hash).toLowerCase();
  const receiveAddress = normalizeAddress(binding?.receive_address);
  const deliveryAddress = normalizeAddress(binding?.delivery_address);
  const requestUsdc = unitsToDecimal6(binding?.requested_usdc_units);
  const quotedVoid = unitsToDecimal6(binding?.quoted_void_units);

  if (
    !sourceChain ||
    !/^0x[0-9a-f]{64}$/.test(txHash) ||
    !receiveAddress ||
    !deliveryAddress ||
    !requestUsdc ||
    !quotedVoid ||
    instruction?.source_chain !== sourceChain ||
    text(instruction?.payment_transaction_hash).toLowerCase() !== txHash ||
    normalizeAddress(instruction?.delivery_address) !== deliveryAddress ||
    text(instruction?.confirmed_block_number) !==
      text(binding?.confirmed_block_number) ||
    text(instruction?.confirmation_count) !==
      text(binding?.confirmation_count_at_claim) ||
    attempt.reservation.request_id !== intent.claim.request_id
  ) {
    return null;
  }

  return {
    request_id: intent.claim.request_id,
    source_chain: sourceChain,
    tx_hash: txHash,
    delivery_address: deliveryAddress,
    receive_address: receiveAddress,
    usdc_amount: requestUsdc,
    quoted_void: quotedVoid,
  };
}

export function readBuyVoidSourceFinalityExecutionPolicyV1(
  env: NodeJS.ProcessEnv = process.env,
): BuyVoidSourceFinalityExecutionPolicyDecisionV1 {
  const names = VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_POLICY_ENVS_V1;
  const required = [
    names.base_rpc_url,
    names.base_rpc_identity,
    names.ethereum_rpc_url,
    names.ethereum_rpc_identity,
    names.total_timeout_ms,
  ];
  const missing = required.filter((name) => !text(env[name]));
  if (missing.length) {
    return {
      ok: false,
      status: "held",
      reason: "source_finality_execution_policy_not_configured",
      missing_envs: [...missing].sort(),
    };
  }

  const server = readBuyVoidCanonicalPresaleServerPolicyV1(env);
  if (server.ok === false) {
    return {
      ok: false,
      status: "held",
      reason: `source_finality_server_policy_${server.reason}`,
      missing_envs: server.missing_envs,
    };
  }

  const totalTimeout = positiveBounded(
    env[names.total_timeout_ms],
    MAX_TOTAL_TIMEOUT_MS,
  );
  const requestTimeout = text(env[names.request_timeout_ms])
    ? positiveBounded(env[names.request_timeout_ms], MAX_REQUEST_TIMEOUT_MS)
    : "8000";
  const maxResponseBytes = text(env[names.max_response_bytes])
    ? positiveBounded(env[names.max_response_bytes], MAX_RESPONSE_BYTES)
    : "262144";
  const baseUrl = normalizeRpcUrl(env[names.base_rpc_url]);
  const ethereumUrl = normalizeRpcUrl(env[names.ethereum_rpc_url]);
  const baseIdentity = text(env[names.base_rpc_identity]);
  const ethereumIdentity = text(env[names.ethereum_rpc_identity]);

  if (
    !totalTimeout ||
    !requestTimeout ||
    !maxResponseBytes ||
    !baseUrl ||
    !ethereumUrl ||
    !SAFE_ID.test(baseIdentity) ||
    !SAFE_ID.test(ethereumIdentity)
  ) {
    return {
      ok: false,
      status: "held",
      reason: "source_finality_execution_policy_invalid",
      missing_envs: [],
    };
  }

  const verification = server.policy.verification_policy;
  const fulfillment = server.policy.fulfillment_policy;
  const makeRail = (
    sourceChain: "base" | "ethereum",
    rpcUrl: string,
    rpcIdentity: string,
  ): BuyVoidSourceFinalityExecutionRailV1 | null => {
    const usdc = normalizeAddress(
      verification.usdc_contract_by_chain[sourceChain],
    );
    const receive = normalizeAddress(
      verification.receive_address_by_chain[sourceChain],
    );
    const confirmations = text(
      fulfillment.min_confirmations_by_chain[sourceChain],
    );
    if (!usdc || !receive || !positiveBounded(confirmations, 1_000_000)) {
      return null;
    }
    return {
      source_chain: sourceChain,
      evm_chain_id: sourceChain === "base" ? "8453" : "1",
      rpc_url: rpcUrl,
      rpc_url_fingerprint_sha256: sha256(rpcUrl),
      rpc_identity: rpcIdentity,
      finality_adapter_id:
        sourceChain === "base" ? BASE_ADAPTER_ID : ETHEREUM_ADAPTER_ID,
      min_confirmations: confirmations,
      usdc_contract: usdc,
      receive_address: receive,
      timeout_ms: requestTimeout,
      max_response_bytes: maxResponseBytes,
    };
  };

  const base = makeRail("base", baseUrl, baseIdentity);
  const ethereum = makeRail("ethereum", ethereumUrl, ethereumIdentity);
  if (!base || !ethereum) {
    return {
      ok: false,
      status: "held",
      reason: "source_finality_execution_server_rail_invalid",
      missing_envs: [],
    };
  }

  const authorityPolicy: BuyVoidSourceFinalityStaticPolicyV2 = {
    schema: "void_buy_void_source_finality_static_policy_v2",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2,
    version: 2,
    rail_order: ["base", "ethereum"],
    rails: [
      {
        source_chain: base.source_chain,
        evm_chain_id: base.evm_chain_id,
        usdc_contract: base.usdc_contract,
        receive_address: base.receive_address,
        rpc_identity: base.rpc_identity,
        rpc_url_fingerprint_sha256: base.rpc_url_fingerprint_sha256,
        finality_adapter_id: base.finality_adapter_id,
        min_confirmations: base.min_confirmations,
      },
      {
        source_chain: ethereum.source_chain,
        evm_chain_id: ethereum.evm_chain_id,
        usdc_contract: ethereum.usdc_contract,
        receive_address: ethereum.receive_address,
        rpc_identity: ethereum.rpc_identity,
        rpc_url_fingerprint_sha256: ethereum.rpc_url_fingerprint_sha256,
        finality_adapter_id: ethereum.finality_adapter_id,
        min_confirmations: ethereum.min_confirmations,
      },
    ],
    economics: { ...VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2 },
  };

  return {
    ok: true,
    status: "configured",
    policy: {
      base,
      ethereum,
      authority_policy_generation: authorityPolicy,
      total_timeout_ms: totalTimeout,
    },
    missing_envs: [],
  };
}

function readyObservation(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, any>;
  return (
    result.ok === true &&
    result.reviewed_source_files_verified === true &&
    result.authenticated_transport_identity_verified === true &&
    result.total_operation_deadline_verified === true &&
    result.source_generation_verified === true &&
    result.deployed_artifact_generation_verified === true &&
    result.ancestry_verified === true &&
    result.provider_quorum_verified === true &&
    result.production_source_finality_authority_ready === true
  );
}

export async function runBuyVoidSourceFinalityExecutionPreflightV1(
  input: {
    root_dir: string;
    attempt_id: string;
    env?: NodeJS.ProcessEnv;
  },
  dependencies: BuyVoidSourceFinalityExecutionPreflightDependenciesV1 = {},
): Promise<BuyVoidSourceFinalityExecutionPreflightDecisionV1> {
  const env = input.env || process.env;
  const attemptId = text(input.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    return held("source_finality_execution_attempt_id_invalid");
  }
  const processIdentity = processSourceIdentityVerified(env);
  if (!processIdentity) {
    return held("source_finality_process_source_identity_unavailable", {
      attempt_id: attemptId,
    });
  }

  const policy = readBuyVoidSourceFinalityExecutionPolicyV1(env);
  if (policy.ok === false) {
    return held(policy.reason, {
      attempt_id: attemptId,
      process_source_identity_verified: true,
    });
  }

  const attempt = readBuyVoidExecutionAttemptV1({
    root_dir: input.root_dir,
    attempt_id: attemptId,
  });
  if (!attempt) {
    return held("source_finality_execution_attempt_not_found", {
      attempt_id: attemptId,
      process_source_identity_verified: true,
    });
  }
  const intent = findIntent(input.root_dir, attempt);
  if (!intent) {
    return held("source_finality_execution_intent_not_found_or_ambiguous", {
      attempt_id: attemptId,
      process_source_identity_verified: true,
    });
  }
  const request = reconstructRequest(attempt, intent);
  if (!request) {
    return held("source_finality_execution_request_reconstruction_failed", {
      attempt_id: attemptId,
      process_source_identity_verified: true,
    });
  }

  const sourceChain = normalizeChain(request.source_chain) as
    | "base"
    | "ethereum";
  const rail = policy.policy[sourceChain];
  const sourcePolicy: BuyVoidSourceChainFinalityRpcPolicyV1 = {
    enabled: true,
    source_chain: sourceChain,
    chain_id: rail.evm_chain_id,
    rpc_url: rail.rpc_url,
    rpc_url_fingerprint_sha256: rail.rpc_url_fingerprint_sha256,
    rpc_identity: rail.rpc_identity,
    finality_adapter_id: rail.finality_adapter_id,
    min_confirmations: rail.min_confirmations,
    usdc_contract: rail.usdc_contract,
    receive_address: rail.receive_address,
    timeout_ms: rail.timeout_ms,
    max_response_bytes: rail.max_response_bytes,
  };

  const observe =
    dependencies.observe_source_finality ||
    ((value) => observeBuyVoidSourceFinalityGenerationProvenanceV4(value));
  let observation: unknown;
  try {
    observation = await observe({
      request,
      policy: {
        source_finality_policy: sourcePolicy,
        authority_policy_generation:
          policy.policy.authority_policy_generation,
        total_timeout_ms: policy.policy.total_timeout_ms,
      },
    });
  } catch {
    return held("source_finality_execution_observer_failed", {
      attempt_id: attemptId,
      source_chain: sourceChain,
      process_source_identity_verified: true,
    });
  }

  const record =
    observation && typeof observation === "object" && !Array.isArray(observation)
      ? (observation as Record<string, any>)
      : {};
  const flags = {
    attempt_id: attemptId,
    source_chain: sourceChain,
    process_source_identity_verified: true,
    reviewed_source_files_verified:
      record.reviewed_source_files_verified === true,
    authenticated_transport_identity_verified:
      record.authenticated_transport_identity_verified === true,
    total_operation_deadline_verified:
      record.total_operation_deadline_verified === true,
    source_generation_verified: record.source_generation_verified === true,
    deployed_artifact_generation_verified:
      record.deployed_artifact_generation_verified === true,
    ancestry_verified: record.ancestry_verified === true,
    provider_quorum_verified: record.provider_quorum_verified === true,
  } as const;

  if (!readyObservation(observation)) {
    const upstreamReason =
      record.ok === false && typeof record.reason === "string"
        ? record.reason.slice(0, 160)
        : "production_source_finality_authority_not_ready";
    return held(`source_finality_execution_${upstreamReason}`, flags);
  }

  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
    version: 1,
    ...flags,
    reviewed_source_files_verified: true,
    authenticated_transport_identity_verified: true,
    total_operation_deadline_verified: true,
    source_generation_verified: true,
    deployed_artifact_generation_verified: true,
    ancestry_verified: true,
    provider_quorum_verified: true,
    production_source_finality_authority_ready: true,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
