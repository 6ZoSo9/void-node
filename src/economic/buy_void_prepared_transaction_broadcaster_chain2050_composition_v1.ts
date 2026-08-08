import path from "node:path";
import {
  createBuyVoidPreparedTransactionChain2050TransportV1,
  type BuyVoidPreparedTransactionChain2050TransportDependenciesV1,
  type BuyVoidPreparedTransactionChain2050TransportPolicyV1,
} from "./buy_void_prepared_transaction_chain2050_transport_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_AUTHORITY_V1 =
  {
    source_only_contract: true,
    server_controlled_paths_required: true,
    server_controlled_rpc_policy_required: true,
    private_broadcaster_service_reused: true,
    private_chain2050_transport_reused: true,
    chain2050_transport_factory_read_only_probe_when_invoked: true,
    service_created_but_not_started: true,
    service_start: false,
    application_private_material_access: false,
    application_wallet_access: false,
    application_signing: false,
    raw_signed_transaction_application_visibility: false,
    raw_signed_transaction_composition_visibility: false,
    runtime_route_mount: false,
    background_loop: false,
    startup_execution: false,
    automatic_retry: false,
    transaction_broadcast_during_composition: false,
    money_movement_during_composition: false,
  } as const;

const SHA256 = /^[0-9a-f]{64}$/;

type BroadcasterServiceV1 = {
  start: () => Promise<{
    socket_path: string;
    custody_store_dir: string;
    state_dir: string;
    raw_signed_transaction_ipc_output: false;
    direct_cli_activation: false;
  }>;
  stop: () => Promise<void>;
  authority: Readonly<Record<string, unknown>>;
};

type BroadcasterServiceModuleV1 = {
  createPreparedTransactionBroadcasterServiceV1: (
    options: Readonly<{
      socket_path: string;
      custody_store_dir: string;
      state_dir: string;
      expected_signer_fingerprint_sha256: string;
      transport: unknown;
    }>,
  ) => BroadcasterServiceV1;
};

export type BuyVoidPreparedTransactionBroadcasterChain2050CompositionPolicyV1 = {
  socket_path: string;
  custody_store_dir: string;
  state_dir: string;
  expected_signer_fingerprint_sha256: string;
  rpc: BuyVoidPreparedTransactionChain2050TransportPolicyV1;
};

export type BuyVoidPreparedTransactionBroadcasterChain2050CompositionDependenciesV1 = {
  chain_transport?: BuyVoidPreparedTransactionChain2050TransportDependenciesV1;
  load_service_module?: () => Promise<BroadcasterServiceModuleV1>;
};

export type BuyVoidPreparedTransactionBroadcasterChain2050CompositionReadyV1 = {
  ok: true;
  status: "ready";
  marker:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_V1;
  version: 1;
  chain_id: "2050";
  rpc_url_fingerprint_sha256: string;
  service: BroadcasterServiceV1;
  service_started: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  authority:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_AUTHORITY_V1;
};

export type BuyVoidPreparedTransactionBroadcasterChain2050CompositionHeldV1 = {
  ok: false;
  status: "held";
  marker:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_V1;
  version: 1;
  reason: string;
  service_started: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  authority:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_AUTHORITY_V1;
};

export type BuyVoidPreparedTransactionBroadcasterChain2050CompositionDecisionV1 =
  | BuyVoidPreparedTransactionBroadcasterChain2050CompositionReadyV1
  | BuyVoidPreparedTransactionBroadcasterChain2050CompositionHeldV1;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function absoluteNonRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) return "";
  const resolved = path.resolve(raw);
  return resolved === path.parse(resolved).root ? "" : resolved;
}

function held(
  reason: string,
): BuyVoidPreparedTransactionBroadcasterChain2050CompositionHeldV1 {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_V1,
    version: 1,
    reason,
    service_started: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_AUTHORITY_V1,
  };
}

async function defaultServiceModule(): Promise<BroadcasterServiceModuleV1> {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<BroadcasterServiceModuleV1>;
  return dynamicImport(
    "../../tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs",
  );
}

export async function createBuyVoidPreparedTransactionBroadcasterChain2050CompositionV1(
  policy: Readonly<BuyVoidPreparedTransactionBroadcasterChain2050CompositionPolicyV1>,
  dependencies: BuyVoidPreparedTransactionBroadcasterChain2050CompositionDependenciesV1 = {},
): Promise<BuyVoidPreparedTransactionBroadcasterChain2050CompositionDecisionV1> {
  const socketPath = absoluteNonRoot(policy?.socket_path);
  const custodyStore = absoluteNonRoot(policy?.custody_store_dir);
  const stateDir = absoluteNonRoot(policy?.state_dir);
  const signerFingerprint = text(
    policy?.expected_signer_fingerprint_sha256,
  ).toLowerCase();

  if (!socketPath || !custodyStore || !stateDir) {
    return held("broadcaster_chain2050_composition_paths_invalid");
  }
  if (!SHA256.test(signerFingerprint)) {
    return held("broadcaster_chain2050_composition_signer_fingerprint_invalid");
  }
  if (
    socketPath === custodyStore ||
    socketPath === stateDir ||
    custodyStore === stateDir
  ) {
    return held("broadcaster_chain2050_composition_paths_must_be_distinct");
  }

  const chainTransport =
    await createBuyVoidPreparedTransactionChain2050TransportV1(
      policy.rpc,
      dependencies.chain_transport,
    );
  if (!chainTransport.ok) {
    return held("broadcaster_chain2050_composition_transport_not_ready");
  }

  let serviceModule: BroadcasterServiceModuleV1;
  try {
    serviceModule = await (
      dependencies.load_service_module || defaultServiceModule
    )();
  } catch {
    return held("broadcaster_chain2050_composition_service_module_load_failed");
  }

  if (
    !serviceModule ||
    typeof serviceModule.createPreparedTransactionBroadcasterServiceV1 !==
      "function"
  ) {
    return held("broadcaster_chain2050_composition_service_factory_missing");
  }

  let service: BroadcasterServiceV1;
  try {
    service =
      serviceModule.createPreparedTransactionBroadcasterServiceV1({
        socket_path: socketPath,
        custody_store_dir: custodyStore,
        state_dir: stateDir,
        expected_signer_fingerprint_sha256: signerFingerprint,
        transport: chainTransport.transport,
      });
  } catch {
    return held("broadcaster_chain2050_composition_service_create_failed");
  }

  if (
    !service ||
    typeof service.start !== "function" ||
    typeof service.stop !== "function"
  ) {
    return held("broadcaster_chain2050_composition_service_invalid");
  }

  return {
    ok: true,
    status: "ready",
    marker:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_V1,
    version: 1,
    chain_id: "2050",
    rpc_url_fingerprint_sha256:
      chainTransport.rpc_url_fingerprint_sha256,
    service,
    service_started: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_AUTHORITY_V1,
  };
}
