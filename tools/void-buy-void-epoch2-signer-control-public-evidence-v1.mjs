#!/usr/bin/env node
import crypto from "node:crypto";
import { verifyMessage } from "ethers";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_PUBLIC_EVIDENCE_V1";
export const STATUS = "SIGNER_OFFCHAIN_CONTROL_PROVEN";
export const EVIDENCE_PATH =
  "ops/mainnet0/evidence/buy-void-epoch2-signer-control-public-evidence-v1.json";
export const EVIDENCE_ID_SHA256 =
  "a0228229b4432e54c02f970a5047fc1a16c703e2072057f245624e0d2c3b3d57";

const SOURCE_HEAD = "5bc76c0c1410f8db2f3e759a94a2a3184ab800de";
const SOURCE_TREE = "118fa8680937d88db1e8a83a393408123e01f03c";
const BUNDLE_SHA = "666e392f30afb2f7aec885dc6d7350596ccda5415132436d478de695a90995d5";
const RECEIPT_SHA = "b38f6f44a7d92e06dea2b7a6b7571cb2dd9b049fc2952eefc7b9af7f837f93b3";
const VERIFICATION_SHA =
  "866ea9e7cde4b6b44b035f8013dd256ae5416f70aee3126671561e05763efe06";
const MESSAGE_SHA = "0492a0ae6b2a3fcbd18c907dc2a847b7f16be07ac49840a420182342b4017dad";
const FULFILLER = "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const PRESALE = "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const RPC = "http://127.0.0.1:18553/";

const TOP_KEYS = Object.freeze([
  "accepted_source_head","accepted_source_tree","immutable_fulfiller",
  "interpretation","marker","receipt","signing_message_sha256",
  "source_bundle_sha256","source_receipt_sha256",
  "source_verification_sha256","status","version",
]);
const RECEIPT_KEYS = Object.freeze(["challenge","signature"]);
const CHALLENGE_KEYS = Object.freeze([
  "chain_id","execution_epoch","expires_at_ms","immutable_fulfiller",
  "issued_at_ms","marker","nonce","presale_contract","production_rpc_url",
  "purpose","source_head","version","void_token",
]);
const INTERPRETATION_KEYS = Object.freeze([
  "funds_movement_authorized","live_payment_signing_authorized",
  "public_presale_activation_authorized","runtime_credential_installed_verified",
  "runtime_source_binding_proven","signer_offchain_control_proven",
  "systemd_credential_identity_proven","transaction_sign_or_broadcast_authorized",
  "wc_void_market_activation_authorized",
]);
const HEX64 = /^[0-9a-f]{64}$/u;
const HEX40 = /^[0-9a-f]{40}$/u;
const NONCE = /^0x[0-9a-f]{64}$/u;
const SIG = /^0x[0-9a-fA-F]{130}$/u;

export function canonicalJson(value) {
  if (value === null || typeof value === "boolean" ||
      typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("unsafe_number");
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (!value || typeof value !== "object") throw new Error("unsupported_value");
  return "{" + Object.keys(value).sort().map(
    key => JSON.stringify(key) + ":" + canonicalJson(value[key]),
  ).join(",") + "}";
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactObject(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function signingMessage(c) {
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

export function classifyEpoch2SignerControlPublicEvidenceV1(record) {
  const bad = reason => Object.freeze({
    ok:false,status:"HOLD",reason,
    evidence_id_sha256:null,signer_address:null,
    signer_offchain_control_proven:false,
    systemd_credential_identity_proven:false,
    runtime_source_binding_proven:false,
    runtime_credential_installed_verified:false,
    live_payment_signing_authorized:false,
    transaction_sign_or_broadcast_authorized:false,
    public_presale_activation_authorized:false,
    wc_void_market_activation_authorized:false,
    funds_movement_authorized:false,
  });
  try {
    if (!exactObject(record, TOP_KEYS) ||
        record.marker !== MARKER || record.version !== 1 ||
        record.status !== STATUS ||
        record.source_bundle_sha256 !== BUNDLE_SHA ||
        record.source_receipt_sha256 !== RECEIPT_SHA ||
        record.source_verification_sha256 !== VERIFICATION_SHA ||
        record.signing_message_sha256 !== MESSAGE_SHA ||
        record.accepted_source_head !== SOURCE_HEAD ||
        record.accepted_source_tree !== SOURCE_TREE ||
        record.immutable_fulfiller !== FULFILLER ||
        !HEX64.test(record.source_bundle_sha256) ||
        !HEX64.test(record.source_receipt_sha256) ||
        !HEX64.test(record.source_verification_sha256) ||
        !HEX64.test(record.signing_message_sha256) ||
        !HEX40.test(record.accepted_source_head)) {
      return bad("evidence_header_invalid");
    }
    const receipt = record.receipt;
    if (!exactObject(receipt, RECEIPT_KEYS) ||
        typeof receipt.signature !== "string" || !SIG.test(receipt.signature) ||
        !exactObject(receipt.challenge, CHALLENGE_KEYS)) {
      return bad("receipt_shape_invalid");
    }
    const c = receipt.challenge;
    if (c.marker !== "VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_V1" ||
        c.version !== 1 ||
        c.purpose !== "OFFCHAIN_PROOF_OF_CONTROL_ONLY" ||
        c.chain_id !== 2050 || c.execution_epoch !== 2 ||
        c.production_rpc_url !== RPC || c.presale_contract !== PRESALE ||
        c.void_token !== TOKEN || c.immutable_fulfiller !== FULFILLER ||
        c.source_head !== SOURCE_HEAD || !NONCE.test(c.nonce) ||
        c.nonce === "0x" + "0".repeat(64) ||
        !Number.isSafeInteger(c.issued_at_ms) ||
        !Number.isSafeInteger(c.expires_at_ms) ||
        c.issued_at_ms < 1_700_000_000_000 ||
        c.expires_at_ms <= c.issued_at_ms ||
        c.expires_at_ms - c.issued_at_ms > 600_000) {
      return bad("challenge_invalid");
    }
    const receiptSha = sha256(Buffer.from(canonicalJson(receipt) + "\n","utf8"));
    if (receiptSha !== RECEIPT_SHA) return bad("receipt_hash_invalid");
    const message = signingMessage(c);
    const messageSha = sha256(Buffer.from(message,"utf8"));
    if (messageSha !== MESSAGE_SHA) return bad("signing_message_hash_invalid");
    let signer;
    try { signer = verifyMessage(message, receipt.signature).toLowerCase(); }
    catch { return bad("signature_recovery_failed"); }
    if (signer !== FULFILLER) return bad("wrong_fulfiller");
    const interpretation = record.interpretation;
    if (!exactObject(interpretation, INTERPRETATION_KEYS) ||
        interpretation.signer_offchain_control_proven !== true ||
        interpretation.systemd_credential_identity_proven !== false ||
        interpretation.runtime_source_binding_proven !== false ||
        interpretation.runtime_credential_installed_verified !== false ||
        interpretation.live_payment_signing_authorized !== false ||
        interpretation.transaction_sign_or_broadcast_authorized !== false ||
        interpretation.public_presale_activation_authorized !== false ||
        interpretation.wc_void_market_activation_authorized !== false ||
        interpretation.funds_movement_authorized !== false) {
      return bad("interpretation_invalid");
    }
    const evidenceId = sha256(Buffer.from(canonicalJson(record),"utf8"));
    if (evidenceId !== EVIDENCE_ID_SHA256) return bad("evidence_id_invalid");
    return Object.freeze({
      ok:true,status:STATUS,reason:null,
      evidence_id_sha256:evidenceId,signer_address:signer,
      signer_offchain_control_proven:true,
      systemd_credential_identity_proven:false,
      runtime_source_binding_proven:false,
      runtime_credential_installed_verified:false,
      live_payment_signing_authorized:false,
      transaction_sign_or_broadcast_authorized:false,
      public_presale_activation_authorized:false,
      wc_void_market_activation_authorized:false,
      funds_movement_authorized:false,
    });
  } catch {
    return bad("evidence_unclassified_invalid");
  }
}
