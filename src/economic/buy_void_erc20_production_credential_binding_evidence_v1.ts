import crypto from "node:crypto";

export const VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_V1 =
  "VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_V1";

export const
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_MATERIAL_V1 = {
  marker: VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_V1,
  version: 1,
  deployment_scope:
    "mainnet0_precision_canonical_buy_void_fulfillment_wallet",
  observed_source_head: "c4a8a0c5129f4d771f3fb21b4e0a05041bb1735e",
  credential_id: "buy-void-native-fulfillment-wallet-v1",
  expected_wallet_address: "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  derived_wallet_address: "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  wallet_address_fingerprint_sha256:
    "68dd42774ebc792bb79b509ec651a9d560005d9ac0a54f7b50ce2e288ee3e498",
  credential_source_mode: "600",
  credential_source_size_bytes: 67,
  fixed_loadcredential_binding_count: 2,
  exact_wallet_binding: true,
  credential_read_performed: true,
  wallet_address_derivation_performed: true,
  private_key_output: false,
  signing_performed: false,
  rpc_call_performed: false,
  transaction_broadcast_performed: false,
  inventory_funding_performed: false,
  money_movement_performed: false,
} as const;

function canonicalJson(value: unknown): string {
  const visit = (candidate: unknown): unknown => {
    if (Array.isArray(candidate)) return candidate.map(visit);
    if (candidate && typeof candidate === "object") {
      return Object.fromEntries(
        Object.entries(candidate as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, visit(nested)]),
      );
    }
    return candidate;
  };
  return JSON.stringify(visit(value));
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export const
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1 =
    sha256(
      canonicalJson(
        VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_MATERIAL_V1,
      ),
    );

export const VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1 = {
  ...VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_MATERIAL_V1,
  evidence_id_sha256:
    VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  interpretation: {
    canonical_production_scope_only: true,
    clone_local_credential_binding_inferred: false,
    content_address_is_not_a_signature: true,
    dependency_injection_authorized: false,
    delivery_runtime_enable_authorized: false,
    transaction_authorized: false,
    inventory_funding_authorized: false,
  },
} as const;
