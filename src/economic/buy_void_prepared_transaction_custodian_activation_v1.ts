import {
  createBuyVoidPreparedTransactionCustodianCredentialCompositionV1,
  type BuyVoidPreparedTransactionCustodianCredentialCompositionPolicyV1,
  type BuyVoidPreparedTransactionCustodianCredentialCompositionReadyV1,
} from "./buy_void_prepared_transaction_custodian_credential_composition_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_CONFIRMATION_V1 =
  "buyVoidStartPreparedTransactionCustodianV1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_AUTHORITY_V1 =
  {
    source_only_contract: true,
    direct_cli_activation: false,
    runtime_route_mount: false,
    startup_execution: false,
    automatic_start: false,
    explicit_apply_required: true,
    exact_activation_confirmation_required: true,
    existing_credential_composition_reused: true,
    existing_custodian_service_reused: true,
    fixed_systemd_credential_signer_reused: true,
    service_start_possible_only_when_applied: true,
    filesystem_socket_and_store_mutation_when_started: true,
    credential_read_during_activation: false,
    signing_during_activation: false,
    prepare_once_called_during_activation: false,
    broadcaster_service_start: false,
    rpc_call: false,
    transaction_submission: false,
    transaction_broadcast: false,
    automatic_retry: false,
    money_movement: false,
  } as const;

type CustodianServiceV1 =
  BuyVoidPreparedTransactionCustodianCredentialCompositionReadyV1["service"];

export type RunBuyVoidPreparedTransactionCustodianActivationInputV1 = {
  policy: Readonly<
    BuyVoidPreparedTransactionCustodianCredentialCompositionPolicyV1
  >;
  apply?: boolean;
  confirmation?: unknown;
};

export type BuyVoidPreparedTransactionCustodianActivationDependenciesV1 = {
  create_composition?:
    typeof createBuyVoidPreparedTransactionCustodianCredentialCompositionV1;
};

export type BuyVoidPreparedTransactionCustodianActivationDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      service_started: false;
      service_start_attempted: false;
      signer_fingerprint_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_CONFIRMATION_V1;
      credential_read_performed: false;
      signing_performed: false;
      prepare_once_called: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_AUTHORITY_V1;
    }
  | {
      ok: true;
      status: "started";
      applied: true;
      service_started: true;
      service_start_attempted: true;
      signer_fingerprint_sha256: string;
      credential_read_performed: false;
      signing_performed: false;
      prepare_once_called: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      service: CustodianServiceV1;
      authority:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      reason: string;
      service_started: false;
      service_start_attempted: boolean;
      service_cleanup_attempted: boolean;
      service_cleanup_succeeded: boolean;
      filesystem_mutation_possible: boolean;
      credential_read_performed: false;
      signing_performed: false;
      prepare_once_called: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_AUTHORITY_V1;
    };

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function held(
  applied: boolean,
  reason: string,
  options: {
    service_start_attempted?: boolean;
    service_cleanup_attempted?: boolean;
    service_cleanup_succeeded?: boolean;
    filesystem_mutation_possible?: boolean;
  } = {},
): Extract<
  BuyVoidPreparedTransactionCustodianActivationDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    applied,
    reason,
    service_started: false,
    service_start_attempted: options.service_start_attempted === true,
    service_cleanup_attempted: options.service_cleanup_attempted === true,
    service_cleanup_succeeded: options.service_cleanup_succeeded === true,
    filesystem_mutation_possible: options.filesystem_mutation_possible === true,
    credential_read_performed: false,
    signing_performed: false,
    prepare_once_called: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_AUTHORITY_V1,
  };
}

export async function runBuyVoidPreparedTransactionCustodianActivationV1(
  input: Readonly<RunBuyVoidPreparedTransactionCustodianActivationInputV1>,
  dependencies: BuyVoidPreparedTransactionCustodianActivationDependenciesV1 = {},
): Promise<BuyVoidPreparedTransactionCustodianActivationDecisionV1> {
  const apply = input?.apply === true;

  if (
    apply &&
    text(input?.confirmation) !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_CONFIRMATION_V1
  ) {
    return held(
      true,
      "prepared_transaction_custodian_activation_confirmation_required",
    );
  }

  const createComposition =
    dependencies.create_composition ||
    createBuyVoidPreparedTransactionCustodianCredentialCompositionV1;

  let composition;
  try {
    composition = await createComposition(input?.policy);
  } catch {
    return held(
      apply,
      "prepared_transaction_custodian_activation_composition_failed",
    );
  }

  if (!composition.ok) {
    return held(
      apply,
      `prepared_transaction_custodian_activation_composition_held:${composition.reason}`,
    );
  }

  if (!apply) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      service_started: false,
      service_start_attempted: false,
      signer_fingerprint_sha256:
        composition.signer_fingerprint_sha256,
      required_confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_CONFIRMATION_V1,
      credential_read_performed: false,
      signing_performed: false,
      prepare_once_called: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority:
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_AUTHORITY_V1,
    };
  }

  try {
    await composition.service.start();
  } catch {
    let cleanupSucceeded = false;
    try {
      await composition.service.stop();
      cleanupSucceeded = true;
    } catch {
      // Cleanup is best-effort only; the held result exposes whether it succeeded.
    }
    return held(
      true,
      "prepared_transaction_custodian_activation_service_start_failed",
      {
        service_start_attempted: true,
        service_cleanup_attempted: true,
        service_cleanup_succeeded: cleanupSucceeded,
        filesystem_mutation_possible: true,
      },
    );
  }

  return {
    ok: true,
    status: "started",
    applied: true,
    service_started: true,
    service_start_attempted: true,
    signer_fingerprint_sha256:
      composition.signer_fingerprint_sha256,
    credential_read_performed: false,
    signing_performed: false,
    prepare_once_called: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    service: composition.service,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_AUTHORITY_V1,
  };
}
