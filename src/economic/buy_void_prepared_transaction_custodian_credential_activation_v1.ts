import {
  createBuyVoidPreparedTransactionCustodianCredentialCompositionV1,
  type BuyVoidPreparedTransactionCustodianCredentialCompositionDependenciesV1,
  type BuyVoidPreparedTransactionCustodianCredentialCompositionPolicyV1,
} from "./buy_void_prepared_transaction_custodian_credential_composition_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1 =
  "buyVoidStartPreparedTransactionCustodianCredentialServiceV1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1 =
  {
    source_only_contract: true,
    direct_cli_activation: false,
    runtime_route_mount: false,
    startup_execution: false,
    background_loop: false,
    automatic_start: false,
    explicit_apply_required: true,
    exact_activation_confirmation_required: true,
    existing_custodian_credential_composition_reused: true,
    existing_fixed_systemd_credential_signer_reused: true,
    server_controlled_socket_path: true,
    server_controlled_custody_store: true,
    server_controlled_credentials_directory: true,
    server_controlled_expected_wallet: true,
    service_start_possible_only_when_explicitly_applied: true,
    filesystem_socket_and_state_mutation_when_started: true,
    credential_read_at_activation: false,
    signing_at_activation: false,
    rpc_call_at_activation: false,
    transaction_broadcast_at_activation: false,
    money_movement_at_activation: false,
    private_prepare_signing_capability_after_start: true,
    credential_read_possible_only_on_later_prepare_once: true,
    signing_possible_only_on_later_prepare_once: true,
    transaction_broadcast_interface: false,
    raw_signed_transaction_application_visibility: false,
    raw_signed_transaction_ipc_output: false,
    application_private_key_access: false,
    application_wallet_access: false,
    automatic_retry: false,
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

export type RunBuyVoidPreparedTransactionCustodianCredentialActivationInputV1 = {
  policy: Readonly<BuyVoidPreparedTransactionCustodianCredentialCompositionPolicyV1>;
  apply?: boolean;
  confirmation?: unknown;
};

export type BuyVoidPreparedTransactionCustodianCredentialActivationDependenciesV1 = {
  create_composition?:
    typeof createBuyVoidPreparedTransactionCustodianCredentialCompositionV1;
  composition_dependencies?:
    BuyVoidPreparedTransactionCustodianCredentialCompositionDependenciesV1;
};

export type BuyVoidPreparedTransactionCustodianCredentialActivationDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      service_started: false;
      private_prepare_signing_capability_started: false;
      signer_fingerprint_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1;
      credential_read_performed: false;
      signing_performed: false;
      rpc_call_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1;
    }
  | {
      ok: true;
      status: "started";
      applied: true;
      service_started: true;
      private_prepare_signing_capability_started: true;
      signer_fingerprint_sha256: string;
      credential_read_performed: false;
      signing_performed: false;
      rpc_call_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      service: CustodianServiceV1;
      authority:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      reason: string;
      service_started: false;
      private_prepare_signing_capability_started: false;
      credential_read_performed: false;
      signing_performed: false;
      rpc_call_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1;
    };

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function held(
  applied: boolean,
  reason: string,
): Extract<
  BuyVoidPreparedTransactionCustodianCredentialActivationDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    applied,
    reason,
    service_started: false,
    private_prepare_signing_capability_started: false,
    credential_read_performed: false,
    signing_performed: false,
    rpc_call_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1,
  };
}

export async function runBuyVoidPreparedTransactionCustodianCredentialActivationV1(
  input: Readonly<RunBuyVoidPreparedTransactionCustodianCredentialActivationInputV1>,
  dependencies:
    BuyVoidPreparedTransactionCustodianCredentialActivationDependenciesV1 = {},
): Promise<BuyVoidPreparedTransactionCustodianCredentialActivationDecisionV1> {
  const apply = input?.apply === true;

  if (
    apply &&
    text(input?.confirmation) !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1
  ) {
    return held(
      true,
      "custodian_credential_activation_confirmation_required",
    );
  }

  const createComposition =
    dependencies.create_composition ||
    createBuyVoidPreparedTransactionCustodianCredentialCompositionV1;

  let composition;
  try {
    composition = await createComposition(
      input?.policy,
      dependencies.composition_dependencies,
    );
  } catch {
    return held(
      apply,
      "custodian_credential_activation_composition_failed",
    );
  }

  if (!composition.ok) {
    return held(
      apply,
      `custodian_credential_activation_${composition.reason}`,
    );
  }

  if (
    composition.service_started !== false ||
    composition.credential_read_performed !== false ||
    composition.signing_performed !== false ||
    composition.transaction_broadcast_performed !== false ||
    composition.money_movement_performed !== false ||
    !composition.service ||
    typeof composition.service.start !== "function" ||
    typeof composition.service.stop !== "function"
  ) {
    return held(
      apply,
      "custodian_credential_activation_composition_boundary_invalid",
    );
  }

  if (!apply) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      service_started: false,
      private_prepare_signing_capability_started: false,
      signer_fingerprint_sha256:
        composition.signer_fingerprint_sha256,
      required_confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
      credential_read_performed: false,
      signing_performed: false,
      rpc_call_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority:
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1,
    };
  }

  try {
    await composition.service.start();
  } catch {
    return held(
      true,
      "custodian_credential_activation_service_start_failed",
    );
  }

  return {
    ok: true,
    status: "started",
    applied: true,
    service_started: true,
    private_prepare_signing_capability_started: true,
    signer_fingerprint_sha256:
      composition.signer_fingerprint_sha256,
    credential_read_performed: false,
    signing_performed: false,
    rpc_call_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    service: composition.service as CustodianServiceV1,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1,
  };
}
