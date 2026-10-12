import {
  createBuyVoidErc20DeliveryDependencyBootstrapV1,
} from "./buy_void_erc20_delivery_dependency_bootstrap_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "./buy_void_erc20_production_credential_binding_evidence_v1.js";

export const VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_V1 =
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_V1";

export const VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLE_ENV_V1 =
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED";
export const VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID_ENV_V1 =
  "VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID";
export const VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ENABLE_ENV_V1 =
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED";

const GLOBAL_DEPENDENCIES =
  "__void_buy_void_delivery_runtime_dependencies_v1";
const GLOBAL_STATUS =
  "__void_buy_void_erc20_delivery_dependency_injection_status_v1";

export const VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_AUTHORITY_V1 = {
  disabled_by_default: true,
  exact_enable_value_required: true,
  exact_credential_binding_evidence_id_required: true,
  delivery_runtime_exact_disabled_value_required: true,
  configured_wallet_must_match_credential_evidence: true,
  canonical_production_evidence_scoped: true,
  clone_local_credential_binding_inferred: false,
  composition_time_credential_read: false,
  composition_time_wallet_access: false,
  composition_time_rpc_call: false,
  composition_time_signing: false,
  composition_time_transaction_broadcast: false,
  composition_time_money_movement: false,
  composition_time_submission_guard_write: false,
  dependency_global_write_when_enabled_and_valid: true,
  dependency_global_write_forbidden_when_delivery_runtime_not_exactly_disabled: true,
  delivery_runtime_enable_independent: false,
  automatic_retry: false,
  background_loop: false,
} as const;

type InjectionStatusV1 = {
  marker: typeof VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_V1;
  version: 1;
  ok: boolean;
  status: "disabled" | "held" | "injected";
  enabled: boolean;
  injected: boolean;
  reason: string | null;
  enable_env:
    typeof VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLE_ENV_V1;
  evidence_id_env:
    typeof VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID_ENV_V1;
  delivery_runtime_enable_env:
    typeof VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ENABLE_ENV_V1;
  required_delivery_runtime_enable_value: "0";
  required_evidence_id_sha256: string;
  canonical_production_evidence_ready: true;
  canonical_production_wallet_address: string;
  credential_read_performed: false;
  rpc_call_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  submission_guard_write_performed: false;
  authority:
    typeof VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_AUTHORITY_V1;
};

function disabledOrHeld(
  status: "disabled" | "held",
  reason: string,
): InjectionStatusV1 {
  return {
    marker: VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_V1,
    version: 1,
    ok: status === "disabled",
    status,
    enabled: false,
    injected: false,
    reason,
    enable_env:
      VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLE_ENV_V1,
    evidence_id_env:
      VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID_ENV_V1,
    delivery_runtime_enable_env:
      VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ENABLE_ENV_V1,
    required_delivery_runtime_enable_value: "0",
    required_evidence_id_sha256:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
    canonical_production_evidence_ready: true,
    canonical_production_wallet_address:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
        .derived_wallet_address,
    credential_read_performed: false,
    rpc_call_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    submission_guard_write_performed: false,
    authority:
      VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_AUTHORITY_V1,
  };
}

function compose(): InjectionStatusV1 {
  if (
    String(
      process.env[
        VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLE_ENV_V1
      ] || "",
    ) !== "1"
  ) {
    return disabledOrHeld(
      "disabled",
      "erc20_delivery_dependency_injection_disabled",
    );
  }

  if (
    String(
      process.env[
        VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ENABLE_ENV_V1
      ] || "",
    ) !== "0"
  ) {
    return disabledOrHeld(
      "held",
      "delivery_runtime_exact_disabled_value_required",
    );
  }

  if (
    String(
      process.env[
        VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID_ENV_V1
      ] || "",
    ).trim() !==
    VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1
  ) {
    return disabledOrHeld(
      "held",
      "credential_binding_evidence_id_mismatch",
    );
  }

  const configuredWallet =
    String(process.env.VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS || "")
      .trim()
      .toLowerCase();
  const evidenceWallet =
    String(
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
        .derived_wallet_address,
    ).toLowerCase();
  if (!configuredWallet || configuredWallet !== evidenceWallet) {
    return disabledOrHeld(
      "held",
      "credential_binding_wallet_mismatch",
    );
  }

  const globalState: any = globalThis as any;
  if (globalState[GLOBAL_DEPENDENCIES] !== undefined) {
    return disabledOrHeld(
      "held",
      "delivery_runtime_dependency_global_already_populated",
    );
  }

  const decision = createBuyVoidErc20DeliveryDependencyBootstrapV1({
    enabled: true,
    credentials_directory:
      String(process.env.CREDENTIALS_DIRECTORY || "").trim(),
    fulfillment_wallet_address: configuredWallet,
    void_token_address:
      String(process.env.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS || "").trim(),
    submission_guard_root_dir:
      String(process.env.VOID_BUY_VOID_RUNTIME_DIR || "").trim(),
    rpc_url:
      String(process.env.VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL || "").trim(),
    request_timeout_ms:
      process.env.VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS,
    max_response_bytes:
      process.env.VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES,
  });

  if ("reason" in decision) {
    return disabledOrHeld(
      "held",
      "erc20_delivery_dependency_bootstrap_not_ready:" + decision.reason,
    );
  }

  globalState[GLOBAL_DEPENDENCIES] = decision.dependencies;

  return {
    marker: VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_V1,
    version: 1,
    ok: true,
    status: "injected",
    enabled: true,
    injected: true,
    reason: null,
    enable_env:
      VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLE_ENV_V1,
    evidence_id_env:
      VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID_ENV_V1,
    delivery_runtime_enable_env:
      VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ENABLE_ENV_V1,
    required_delivery_runtime_enable_value: "0",
    required_evidence_id_sha256:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
    canonical_production_evidence_ready: true,
    canonical_production_wallet_address:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
        .derived_wallet_address,
    credential_read_performed: false,
    rpc_call_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    submission_guard_write_performed: false,
    authority:
      VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_AUTHORITY_V1,
  };
}

const globalState: any = globalThis as any;
if (globalState[GLOBAL_STATUS] === undefined) {
  globalState[GLOBAL_STATUS] = compose();
}

export function buyVoidErc20DeliveryDependencyInjectionStatusV1():
  InjectionStatusV1 {
  return globalState[GLOBAL_STATUS] as InjectionStatusV1;
}
