import crypto from "node:crypto";
import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1,
} from "./buy_void_epoch2_fulfillment_access_list_v1.js";

// Public, source-only generation selector. This is NOT a signer-control
// signature, installed systemd credential, or permission to enable checkout.
export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_V1 =
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_V1";

export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_MATERIAL_V1 =
  Object.freeze({
    marker: VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_V1,
    version: 1,
    chain_id: 2050,
    execution_epoch: 2,
    production_rpc_url: VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1,
    fulfillment_contract: VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
    immutable_fulfiller: VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
    credential_id: "buy-void-epoch2-fulfiller-v1",
    historical_epoch1_credential_reuse: false,
    installed_credential_verified: false,
    signer_control_verified: false,
    runtime_apply_authorized: false,
    public_payment_acceptance_authorized: false,
  } as const);

export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1 =
  crypto.createHash("sha256").update(
    JSON.stringify(VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_MATERIAL_V1),
    "utf8",
  ).digest("hex");

export function buyVoidEpoch2CredentialSourceBindingMatchesV1(
  credentialSourceId: unknown,
  fulfillmentContract: unknown,
  rpcUrl: unknown,
  fulfiller: unknown,
): boolean {
  return typeof credentialSourceId === "string" &&
    credentialSourceId === VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1 &&
    typeof fulfillmentContract === "string" &&
    fulfillmentContract.toLowerCase() ===
      VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 &&
    rpcUrl === VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1 &&
    typeof fulfiller === "string" &&
    fulfiller.toLowerCase() ===
      VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1;
}
