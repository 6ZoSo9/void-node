import crypto from "node:crypto";
import { verifyMessage } from "ethers";

import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1,
} from "./buy_void_epoch2_fulfillment_access_list_v1.js";

// Off-chain proof that a signer *currently controls* the exact immutable
// Epoch-2 fulfiller address. It cannot grant the runtime access to a key.
export const VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_V1 =
  "VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_V1";
export const VOID_BUY_VOID_EPOCH2_TOKEN_V1 =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
export const VOID_BUY_VOID_EPOCH2_CONTROL_MAX_AGE_MS_V1 = 600_000;

export type BuyVoidEpoch2SignerControlChallengeV1 = {
  marker: typeof VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_V1;
  version: 1;
  purpose: "OFFCHAIN_PROOF_OF_CONTROL_ONLY";
  chain_id: 2050;
  execution_epoch: 2;
  production_rpc_url: typeof VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1;
  presale_contract: typeof VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1;
  void_token: typeof VOID_BUY_VOID_EPOCH2_TOKEN_V1;
  immutable_fulfiller: typeof VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1;
  source_head: string;
  nonce: string;
  issued_at_ms: number;
  expires_at_ms: number;
};

export type BuyVoidEpoch2SignerControlDecisionV1 = {
  ok: boolean;
  status: "CONTROL_SIGNATURE_VERIFIED" | "HOLD";
  reason: string | null;
  signing_message_sha256: string | null;
  signer_address: string | null;
  private_credential_read: false;
  runtime_credential_installed_verified: false;
  live_payment_signing_authorized: false;
  service_change_authorized: false;
  presale_activation_authorized: false;
  transaction_sign_or_broadcast: false;
  funds_movement: false;
};

const SHA1 = /^[0-9a-f]{40}$/u;
const NONCE = /^0x[0-9a-f]{64}$/u;
const SIG = /^0x[0-9a-fA-F]{130}$/u;
const KEYS = [
  "marker", "version", "purpose", "chain_id", "execution_epoch",
  "production_rpc_url", "presale_contract", "void_token",
  "immutable_fulfiller", "source_head", "nonce", "issued_at_ms",
  "expires_at_ms",
] as const;

function plainExact(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== KEYS.length ||
      keys.some((key) => typeof key !== "string" ||
        !KEYS.includes(key as (typeof KEYS)[number]))) return false;
  return keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return Boolean(descriptor &&
      Object.prototype.hasOwnProperty.call(descriptor, "value") &&
      descriptor.enumerable && !descriptor.get && !descriptor.set);
  });
}

function validChallenge(
  value: unknown,
  expectedSourceHead: string,
  nowMs: number,
): value is BuyVoidEpoch2SignerControlChallengeV1 {
  if (!plainExact(value) || !SHA1.test(expectedSourceHead) ||
      !Number.isSafeInteger(nowMs)) return false;
  const c = value;
  if (c.marker !== VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_V1 ||
      c.version !== 1 ||
      c.purpose !== "OFFCHAIN_PROOF_OF_CONTROL_ONLY" ||
      c.chain_id !== 2050 ||
      c.execution_epoch !== 2 ||
      c.production_rpc_url !== VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1 ||
      c.presale_contract !== VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 ||
      c.void_token !== VOID_BUY_VOID_EPOCH2_TOKEN_V1 ||
      c.immutable_fulfiller !== VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1 ||
      c.source_head !== expectedSourceHead ||
      typeof c.nonce !== "string" || !NONCE.test(c.nonce) ||
      c.nonce === "0x" + "0".repeat(64) ||
      typeof c.issued_at_ms !== "number" ||
      typeof c.expires_at_ms !== "number" ||
      !Number.isSafeInteger(c.issued_at_ms) ||
      !Number.isSafeInteger(c.expires_at_ms) ||
      c.issued_at_ms < 1_700_000_000_000 ||
      c.expires_at_ms < c.issued_at_ms ||
      c.expires_at_ms - c.issued_at_ms >
        VOID_BUY_VOID_EPOCH2_CONTROL_MAX_AGE_MS_V1 ||
      nowMs < c.issued_at_ms || nowMs > c.expires_at_ms) return false;
  return true;
}

function message(c: BuyVoidEpoch2SignerControlChallengeV1): string {
  // Stable fixed-field string; never use untrusted JSON serialization.
  return [
    "VOID:EPOCH2:BUY_VOID:FULFILLER_CONTROL:V1",
    "purpose=OFFCHAIN_PROOF_OF_CONTROL_ONLY",
    "chain_id=2050",
    "execution_epoch=2",
    "production_rpc_url=" + c.production_rpc_url,
    "presale_contract=" + c.presale_contract,
    "void_token=" + c.void_token,
    "immutable_fulfiller=" + c.immutable_fulfiller,
    "source_head=" + c.source_head,
    "nonce=" + c.nonce,
    "issued_at_ms=" + String(c.issued_at_ms),
    "expires_at_ms=" + String(c.expires_at_ms),
  ].join("\n");
}

export function buildBuyVoidEpoch2SignerControlChallengeV1(input: {
  source_head: string;
  nonce: string;
  issued_at_ms: number;
  expires_at_ms: number;
}): {
  ok: true;
  challenge: BuyVoidEpoch2SignerControlChallengeV1;
  signing_message: string;
  signing_message_sha256: string;
} | { ok: false; status: "HOLD"; reason: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, status: "HOLD", reason: "input_invalid" };
  }
  const candidate: BuyVoidEpoch2SignerControlChallengeV1 = {
    marker: VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_V1,
    version: 1,
    purpose: "OFFCHAIN_PROOF_OF_CONTROL_ONLY",
    chain_id: 2050,
    execution_epoch: 2,
    production_rpc_url: VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1,
    presale_contract: VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
    void_token: VOID_BUY_VOID_EPOCH2_TOKEN_V1,
    immutable_fulfiller: VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
    source_head: input.source_head,
    nonce: input.nonce,
    issued_at_ms: input.issued_at_ms,
    expires_at_ms: input.expires_at_ms,
  };
  if (!validChallenge(candidate, input.source_head, input.issued_at_ms)) {
    return { ok: false, status: "HOLD", reason: "challenge_invalid" };
  }
  const signing = message(candidate);
  return {
    ok: true,
    challenge: candidate,
    signing_message: signing,
    signing_message_sha256:
      crypto.createHash("sha256").update(signing, "utf8").digest("hex"),
  };
}

function held(reason: string, digest: string | null = null):
  BuyVoidEpoch2SignerControlDecisionV1 {
  return {
    ok: false,
    status: "HOLD",
    reason,
    signing_message_sha256: digest,
    signer_address: null,
    private_credential_read: false,
    runtime_credential_installed_verified: false,
    live_payment_signing_authorized: false,
    service_change_authorized: false,
    presale_activation_authorized: false,
    transaction_sign_or_broadcast: false,
    funds_movement: false,
  };
}

// Verify only the EIP-191 off-chain signature of the hardcoded E2 fulfiller.
// A correct signature is not a systemd LoadCredential, key provenance, signer
// custody, transaction authorization, sale-opening, or a replay-consumption
// receipt. A separate current-generation live credential ceremony is required.
export function verifyBuyVoidEpoch2SignerControlV1(input: {
  challenge: unknown;
  signature: unknown;
  expected_source_head: string;
  now_ms: number;
}): BuyVoidEpoch2SignerControlDecisionV1 {
  if (!input || !validChallenge(
    input.challenge, input.expected_source_head, input.now_ms,
  )) return held("epoch2_signer_control_challenge_invalid");
  const challenge = input.challenge;
  const signing = message(challenge);
  const digest =
    crypto.createHash("sha256").update(signing, "utf8").digest("hex");
  const signature =
    typeof input.signature === "string" ? input.signature.trim() : "";
  const loweredSignature = signature.toLowerCase();
  if (loweredSignature === digest || loweredSignature === "0x" + digest) {
    return held(
      "epoch2_signer_control_message_digest_is_not_signature",
      digest,
    );
  }
  if (!SIG.test(signature)) {
    return held("epoch2_signer_control_signature_invalid", digest);
  }
  let signer: string;
  try {
    signer = verifyMessage(signing, signature).toLowerCase();
  } catch {
    return held("epoch2_signer_control_signature_recovery_failed", digest);
  }
  if (signer !== VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1) {
    return held("epoch2_signer_control_wrong_fulfiller", digest);
  }
  return {
    ok: true,
    status: "CONTROL_SIGNATURE_VERIFIED",
    reason: null,
    signing_message_sha256: digest,
    signer_address: signer,
    private_credential_read: false,
    runtime_credential_installed_verified: false,
    live_payment_signing_authorized: false,
    service_change_authorized: false,
    presale_activation_authorized: false,
    transaction_sign_or_broadcast: false,
    funds_movement: false,
  };
}
