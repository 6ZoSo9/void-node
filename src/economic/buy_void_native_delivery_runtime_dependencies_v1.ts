import path from "node:path";
import {
  createBuyVoidNativeChain2050BroadcasterV1,
  VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
} from "./buy_void_native_chain2050_broadcaster_v1.js";
import {
  createBuyVoidNativeFulfillmentWalletCredentialSignerV1,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1,
} from "./buy_void_native_fulfillment_wallet_credential_signer_v1.js";
import type {
  BuyVoidNativeDeliveryBroadcasterV1,
  BuyVoidNativeDeliverySignerV1,
} from "./buy_void_native_delivery_sign_broadcast_adapter_v1.js";
import {
  buyVoidChain2050DurabilityRootDirV1,
  wrapBuyVoidChain2050DurabilityBroadcasterV1,
} from "./buy_void_chain2050_durability_gate_v1.js";
import "./buy_void_chain2050_durability_runtime_v1.js";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_V1 =
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_V1";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_GLOBAL_V1 =
  "__void_buy_void_native_delivery_runtime_dependencies_v1";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCY_STATUS_GLOBAL_V1 =
  "__void_buy_void_native_delivery_runtime_dependency_status_v1";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_AUTHORITY_V1 = {
  disabled_by_default: true,
  startup_only: true,
  automatic_retry: false,
  background_loop: false,
  systemd_credential_only: true,
  fixed_credential_id: true,
  node_private_key_reuse: false,
  request_secret_input: false,
  environment_private_key: false,
  signer_dependency_assignment: true,
  broadcaster_dependency_assignment: true,
  startup_chain_identity_probe: true,
  per_broadcast_chain_identity_probe: true,
  loopback_chain2050_rpc_only: true,
  transaction_signing_at_startup: false,
  transaction_broadcast_at_startup: false,
  money_movement_at_startup: false,
  runtime_enablement: false,
  service_restart: false,
} as const;

export const VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCY_ENVS_V1 = {
  injector_enabled:
    "VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED",
  credentials_directory: "CREDENTIALS_DIRECTORY",
  expected_wallet_address:
    "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
  rpc_url: "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
} as const;

const DURABILITY_GATE_ENABLE_ENV =
  "VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_ENABLED";

export type BuyVoidNativeDeliveryRuntimeDependenciesV1 = {
  signer: BuyVoidNativeDeliverySignerV1;
  broadcaster: BuyVoidNativeDeliveryBroadcasterV1;
};

export type ConfigureBuyVoidNativeDeliveryRuntimeDependenciesInputV1 = {
  enabled: boolean;
  credentials_directory: string;
  expected_wallet_address: string;
  rpc_url: string;
  target_global?: Record<string, any>;
  durability_gate?: {
    enabled: boolean;
    root_dir: string;
  };
};

export type BuyVoidNativeDeliveryRuntimeDependenciesReadyV1 = {
  ok: true;
  marker: typeof VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_V1;
  version: 1;
  status: "ready";
  credential_id:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1;
  signer_marker:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1;
  broadcaster_marker:
    typeof VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1;
  wallet_address_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
  dependencies: BuyVoidNativeDeliveryRuntimeDependenciesV1;
  authority:
    typeof VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_AUTHORITY_V1;
};

export type BuyVoidNativeDeliveryRuntimeDependenciesHeldV1 = {
  ok: false;
  marker: typeof VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_V1;
  version: 1;
  status: "disabled" | "initializing" | "held";
  reason: string;
  credential_id:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1;
  signer_configured: false;
  broadcaster_configured: false;
  wallet_address_fingerprint_sha256: string | null;
  rpc_url_fingerprint_sha256: string | null;
  authority:
    typeof VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_AUTHORITY_V1;
  detail?: Record<string, unknown>;
};

export type BuyVoidNativeDeliveryRuntimeDependenciesDecisionV1 =
  | BuyVoidNativeDeliveryRuntimeDependenciesReadyV1
  | BuyVoidNativeDeliveryRuntimeDependenciesHeldV1;

const GLOBAL_MARK =
  "__void_buy_void_native_delivery_runtime_dependencies_initializer_v1";

function target(
  input?: Record<string, any>,
): Record<string, any> {
  return input || (globalThis as any);
}

function safeDetail(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const source = value as Record<string, unknown>;
  const allowed = [
    "error_class",
    "mode",
    "size_bytes",
    "expected_wallet_address_fingerprint_sha256",
    "error_code",
    "http_status",
    "observed_chain_id",
  ];
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key];
    }
  }
  return Object.keys(result).length ? result : undefined;
}

function held(
  reason: string,
  options: {
    status?: "disabled" | "initializing" | "held";
    wallet_address_fingerprint_sha256?: string | null;
    rpc_url_fingerprint_sha256?: string | null;
    detail?: Record<string, unknown>;
  } = {},
): BuyVoidNativeDeliveryRuntimeDependenciesHeldV1 {
  return {
    ok: false,
    marker: VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_V1,
    version: 1,
    status: options.status || "held",
    reason,
    credential_id:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
    signer_configured: false,
    broadcaster_configured: false,
    wallet_address_fingerprint_sha256:
      options.wallet_address_fingerprint_sha256 || null,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 || null,
    authority:
      VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_AUTHORITY_V1,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function installStatus(
  destination: Record<string, any>,
  decision: BuyVoidNativeDeliveryRuntimeDependenciesDecisionV1,
): void {
  destination[
    VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCY_STATUS_GLOBAL_V1
  ] = "dependencies" in decision
    ? {
        marker: decision.marker,
        version: decision.version,
        status: decision.status,
        credential_id: decision.credential_id,
        signer_marker: decision.signer_marker,
        broadcaster_marker: decision.broadcaster_marker,
        signer_configured: true,
        broadcaster_configured: true,
        wallet_address_fingerprint_sha256:
          decision.wallet_address_fingerprint_sha256,
        rpc_url_fingerprint_sha256:
          decision.rpc_url_fingerprint_sha256,
        authority: decision.authority,
      }
    : decision;
}

export function buyVoidNativeDeliveryRuntimeDependencyStatusV1():
  Record<string, unknown> {
  const value = (globalThis as any)[
    VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCY_STATUS_GLOBAL_V1
  ];
  return value && typeof value === "object"
    ? value
    : held("dependency_initializer_not_run", { status: "disabled" });
}

export async function configureBuyVoidNativeDeliveryRuntimeDependenciesV1(
  input: ConfigureBuyVoidNativeDeliveryRuntimeDependenciesInputV1,
): Promise<BuyVoidNativeDeliveryRuntimeDependenciesDecisionV1> {
  const destination = target(input?.target_global);
  delete destination[
    VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_GLOBAL_V1
  ];

  if (input?.enabled !== true) {
    const decision = held("dependency_injector_disabled", {
      status: "disabled",
    });
    installStatus(destination, decision);
    return decision;
  }

  const signerDecision =
    createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
      credentials_directory: input.credentials_directory,
      expected_wallet_address: input.expected_wallet_address,
    });
  if ("reason" in signerDecision) {
    const detail = safeDetail(signerDecision.detail);
    const decision = held(
      `signer_${signerDecision.reason}`,
      {
        wallet_address_fingerprint_sha256:
          signerDecision.wallet_address_fingerprint_sha256,
        ...(detail ? { detail } : {}),
      },
    );
    installStatus(destination, decision);
    return decision;
  }

  const broadcasterDecision =
    await createBuyVoidNativeChain2050BroadcasterV1({
      rpc_url: input.rpc_url,
      expected_chain_id: 2050,
    });
  if ("reason" in broadcasterDecision) {
    const detail = safeDetail(broadcasterDecision.detail);
    const decision = held(
      `broadcaster_${broadcasterDecision.reason}`,
      {
        wallet_address_fingerprint_sha256:
          signerDecision.wallet_address_fingerprint_sha256,
        rpc_url_fingerprint_sha256:
          broadcasterDecision.rpc_url_fingerprint_sha256,
        ...(detail ? { detail } : {}),
      },
    );
    installStatus(destination, decision);
    return decision;
  }

  let broadcaster: BuyVoidNativeDeliveryBroadcasterV1 =
    broadcasterDecision.broadcaster;
  if (input.durability_gate?.enabled === true) {
    try {
      broadcaster = wrapBuyVoidChain2050DurabilityBroadcasterV1({
        broadcaster,
        root_dir: pathResolveDurabilityRoot(input.durability_gate.root_dir),
      });
    } catch (error) {
      const decision = held("chain2050_durability_gate_initialization_failed", {
        wallet_address_fingerprint_sha256:
          signerDecision.wallet_address_fingerprint_sha256,
        rpc_url_fingerprint_sha256:
          broadcasterDecision.rpc_url_fingerprint_sha256,
        detail: {
          error_class: String((error as Error)?.name || "Error").slice(0, 80),
        },
      });
      installStatus(destination, decision);
      return decision;
    }
  }

  const dependencies: BuyVoidNativeDeliveryRuntimeDependenciesV1 = {
    signer: signerDecision.signer,
    broadcaster,
  };

  destination[
    VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_GLOBAL_V1
  ] = dependencies;

  const decision: BuyVoidNativeDeliveryRuntimeDependenciesReadyV1 = {
    ok: true,
    marker: VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_V1,
    version: 1,
    status: "ready",
    credential_id:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
    signer_marker:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1,
    broadcaster_marker:
      VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
    wallet_address_fingerprint_sha256:
      signerDecision.wallet_address_fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      broadcasterDecision.rpc_url_fingerprint_sha256,
    dependencies,
    authority:
      VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_AUTHORITY_V1,
  };
  installStatus(destination, decision);
  return decision;
}

function pathResolveDurabilityRoot(value: string): string {
  const raw = String(value || "").trim();
  return raw ? path.resolve(raw) : buyVoidChain2050DurabilityRootDirV1();
}

export async function initializeBuyVoidNativeDeliveryRuntimeDependenciesFromProcessV1():
  Promise<BuyVoidNativeDeliveryRuntimeDependenciesDecisionV1> {
  const env =
    VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCY_ENVS_V1;
  const injectorEnabled =
    String(process.env[env.injector_enabled] || "") === "1";
  const durabilityGateEnabled =
    String(process.env[DURABILITY_GATE_ENABLE_ENV] || "") === "1";
  if (injectorEnabled && !durabilityGateEnabled) {
    const decision = held("chain2050_durability_gate_required");
    installStatus(globalThis as any, decision);
    return decision;
  }
  return await configureBuyVoidNativeDeliveryRuntimeDependenciesV1({
    enabled: injectorEnabled,
    credentials_directory:
      String(process.env[env.credentials_directory] || "").trim(),
    expected_wallet_address:
      String(process.env[env.expected_wallet_address] || "").trim(),
    rpc_url: String(process.env[env.rpc_url] || "").trim(),
    durability_gate: {
      enabled: durabilityGateEnabled,
      root_dir: buyVoidChain2050DurabilityRootDirV1(),
    },
  });
}

function scheduleInitialization(): void {
  const state = globalThis as any;
  if (state[GLOBAL_MARK]) return;
  state[GLOBAL_MARK] = true;
  installStatus(
    state,
    held("dependency_initializer_scheduled", {
      status: "initializing",
    }),
  );
  const timer = setTimeout(() => {
    void initializeBuyVoidNativeDeliveryRuntimeDependenciesFromProcessV1()
      .catch((error: unknown) => {
        installStatus(
          state,
          held("dependency_initializer_exception", {
            detail: {
              error_class: String(
                (error as any)?.name || "Error",
              ).slice(0, 80),
            },
          }),
        );
      });
  }, 0);
  timer.unref?.();
}

scheduleInitialization();
