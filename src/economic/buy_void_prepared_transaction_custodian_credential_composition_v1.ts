import path from "node:path";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_AUTHORITY_V1,
  createBuyVoidPreparedTransactionCredentialSignerV1,
  type BuyVoidPreparedTransactionCredentialSignerDependenciesV1,
} from "./buy_void_prepared_transaction_credential_signer_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_AUTHORITY_V1 =
  {
    source_only_contract: true,
    existing_custodian_service_reused: true,
    existing_fixed_systemd_credential_signer_reused: true,
    server_controlled_socket_path: true,
    server_controlled_custody_store: true,
    server_controlled_credentials_directory: true,
    server_controlled_expected_wallet: true,
    signer_idempotency_cache_inside_custody_store: true,
    credential_read_at_composition: false,
    credential_signing_at_composition: false,
    service_created_but_not_started: true,
    service_start: false,
    application_private_material_access: false,
    application_wallet_access: false,
    raw_signed_transaction_application_visibility: false,
    raw_signed_transaction_ipc_output: false,
    runtime_route_mount: false,
    background_loop: false,
    startup_execution: false,
    rpc_call: false,
    transaction_broadcast: false,
    automatic_retry: false,
    money_movement: false,
  } as const;

type CustodianServiceV1 = {
  start: () => Promise<{
    socket_path: string;
    store_dir: string;
    transaction_broadcast_interface: false;
  }>;
  stop: () => Promise<void>;
  authority: Readonly<Record<string, unknown>>;
};

type CustodianServiceModuleV1 = {
  createPreparedTransactionCustodianServiceV1: (
    options: Readonly<{
      socket_path: string;
      store_dir: string;
      signer: {
        prepare_once: (
          request: Readonly<Record<string, unknown>>,
        ) => Promise<unknown>;
      };
      expected_signer_fingerprint_sha256: string;
    }>,
  ) => CustodianServiceV1;
};

export type BuyVoidPreparedTransactionCustodianCredentialCompositionPolicyV1 = {
  socket_path: string;
  custody_store_dir: string;
  credentials_directory: string;
  expected_wallet_address: string;
};

export type BuyVoidPreparedTransactionCustodianCredentialCompositionDependenciesV1 = {
  credential_signer?:
    BuyVoidPreparedTransactionCredentialSignerDependenciesV1;
  load_service_module?: () => Promise<CustodianServiceModuleV1>;
};

export type BuyVoidPreparedTransactionCustodianCredentialCompositionReadyV1 = {
  ok: true;
  status: "ready";
  marker:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_V1;
  version: 1;
  service: CustodianServiceV1;
  service_started: false;
  signer_fingerprint_sha256: string;
  signer_state_relative_path: "credential-signer-idempotency-v1";
  credential_read_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  signer_authority:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_AUTHORITY_V1;
  authority:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_AUTHORITY_V1;
};

export type BuyVoidPreparedTransactionCustodianCredentialCompositionHeldV1 = {
  ok: false;
  status: "held";
  marker:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_V1;
  version: 1;
  reason: string;
  service_started: false;
  credential_read_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  authority:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_AUTHORITY_V1;
};

export type BuyVoidPreparedTransactionCustodianCredentialCompositionDecisionV1 =
  | BuyVoidPreparedTransactionCustodianCredentialCompositionReadyV1
  | BuyVoidPreparedTransactionCustodianCredentialCompositionHeldV1;

function absoluteNonRoot(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) return "";
  const resolved = path.resolve(raw);
  return resolved === path.parse(resolved).root ? "" : resolved;
}

function held(
  reason: string,
): BuyVoidPreparedTransactionCustodianCredentialCompositionHeldV1 {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_V1,
    version: 1,
    reason,
    service_started: false,
    credential_read_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_AUTHORITY_V1,
  };
}

async function defaultServiceModule(): Promise<CustodianServiceModuleV1> {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<CustodianServiceModuleV1>;
  return dynamicImport(
    "../../tools/buy-void-prepared-transaction-custodian-service-v1.mjs",
  );
}

export async function createBuyVoidPreparedTransactionCustodianCredentialCompositionV1(
  policy: Readonly<BuyVoidPreparedTransactionCustodianCredentialCompositionPolicyV1>,
  dependencies:
    BuyVoidPreparedTransactionCustodianCredentialCompositionDependenciesV1 = {},
): Promise<BuyVoidPreparedTransactionCustodianCredentialCompositionDecisionV1> {
  const socketPath = absoluteNonRoot(policy?.socket_path);
  const custodyStore = absoluteNonRoot(policy?.custody_store_dir);
  const credentialsDirectory = absoluteNonRoot(
    policy?.credentials_directory,
  );
  const wallet = String(policy?.expected_wallet_address || "").trim();

  if (!socketPath || !custodyStore || !credentialsDirectory || !wallet) {
    return held("custodian_credential_composition_policy_invalid");
  }
  if (
    socketPath === custodyStore ||
    socketPath === credentialsDirectory ||
    custodyStore === credentialsDirectory
  ) {
    return held("custodian_credential_composition_paths_must_be_distinct");
  }

  const signerState = path.join(
    custodyStore,
    "credential-signer-idempotency-v1",
  );

  let signer;
  try {
    signer = createBuyVoidPreparedTransactionCredentialSignerV1(
      {
        credentials_directory: credentialsDirectory,
        expected_wallet_address: wallet,
        idempotency_state_dir: signerState,
      },
      dependencies.credential_signer,
    );
  } catch {
    return held("custodian_credential_composition_signer_create_failed");
  }

  let serviceModule: CustodianServiceModuleV1;
  try {
    serviceModule = await (
      dependencies.load_service_module || defaultServiceModule
    )();
  } catch {
    return held("custodian_credential_composition_service_module_load_failed");
  }

  if (
    !serviceModule ||
    typeof serviceModule.createPreparedTransactionCustodianServiceV1 !==
      "function"
  ) {
    return held("custodian_credential_composition_service_factory_missing");
  }

  let service: CustodianServiceV1;
  try {
    service =
      serviceModule.createPreparedTransactionCustodianServiceV1({
        socket_path: socketPath,
        store_dir: custodyStore,
        signer: signer as any,
        expected_signer_fingerprint_sha256:
          signer.signer_fingerprint_sha256,
      });
  } catch {
    return held("custodian_credential_composition_service_create_failed");
  }

  if (
    !service ||
    typeof service.start !== "function" ||
    typeof service.stop !== "function"
  ) {
    return held("custodian_credential_composition_service_invalid");
  }

  return {
    ok: true,
    status: "ready",
    marker:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_V1,
    version: 1,
    service,
    service_started: false,
    signer_fingerprint_sha256:
      signer.signer_fingerprint_sha256,
    signer_state_relative_path:
      "credential-signer-idempotency-v1",
    credential_read_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    signer_authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_AUTHORITY_V1,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_AUTHORITY_V1,
  };
}
