import path from "node:path";

import {
  createBuyVoidPreparedTransactionChain2050TransportV1,
  type BuyVoidPreparedTransactionChain2050TransportPolicyV1,
} from "./buy_void_prepared_transaction_chain2050_transport_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1 =
  "buyVoidStartPreparedTransactionBroadcasterSubmissionV1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1 = {
  source_only_contract: true,
  direct_cli_activation: false,
  runtime_route_mount: false,
  startup_execution: false,
  automatic_start: false,
  explicit_apply_required: true,
  exact_activation_confirmation_required: true,
  server_controlled_paths_required: true,
  server_controlled_rpc_policy_required: true,
  expected_chain_id: 2050,
  private_broadcaster_service_reused: true,
  private_chain2050_transport_reused: true,
  service_submission_enabled: true,
  inspection_submission_supported: true,
  read_only_rpc_probe_possible_when_factory_invoked: true,
  service_start_possible_only_when_applied: true,
  filesystem_socket_and_state_mutation_when_started: true,
  raw_signed_transaction_ipc_input: false,
  raw_signed_transaction_ipc_output: false,
  application_private_material_access: false,
  application_wallet_access: false,
  application_signing: false,
  transaction_broadcast_during_activation: false,
  money_movement_during_activation: false,
  transaction_broadcast_possible_when_submit_once_invoked: true,
  money_movement_possible_when_submit_once_invoked: true,
  automatic_resubmission: false,
  production_activation_performed_by_source_merge: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;

type PrivateBroadcasterServiceV1 = {
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

type PrivateBroadcasterServiceModuleV1 = {
  createPreparedTransactionBroadcasterServiceV1: (
    options: Readonly<{
      socket_path: string;
      custody_store_dir: string;
      state_dir: string;
      expected_signer_fingerprint_sha256: string;
      submission_enabled: true;
      transport: unknown;
    }>,
  ) => PrivateBroadcasterServiceV1;
};

export type BuyVoidPreparedTransactionBroadcasterSubmissionActivationPolicyV1 = {
  socket_path: string;
  custody_store_dir: string;
  state_dir: string;
  expected_signer_fingerprint_sha256: string;
  rpc: BuyVoidPreparedTransactionChain2050TransportPolicyV1;
};

export type RunBuyVoidPreparedTransactionBroadcasterSubmissionActivationInputV1 = {
  policy: Readonly<BuyVoidPreparedTransactionBroadcasterSubmissionActivationPolicyV1>;
  apply?: boolean;
  confirmation?: unknown;
};

export type BuyVoidPreparedTransactionBroadcasterSubmissionActivationDependenciesV1 = {
  create_chain_transport?: typeof createBuyVoidPreparedTransactionChain2050TransportV1;
  load_service_module?: () => Promise<PrivateBroadcasterServiceModuleV1>;
};

export type BuyVoidPreparedTransactionBroadcasterSubmissionActivationDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      service_started: false;
      chain_id: "2050";
      rpc_url_fingerprint_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1;
      submission_enabled: true;
      submit_once_allowed: false;
      inspection_submission_supported: true;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1;
    }
  | {
      ok: true;
      status: "started";
      applied: true;
      service_started: true;
      chain_id: "2050";
      rpc_url_fingerprint_sha256: string;
      submission_enabled: true;
      submit_once_allowed: true;
      inspection_submission_supported: true;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      service: PrivateBroadcasterServiceV1;
      authority:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      reason: string;
      service_started: false;
      submission_enabled: true;
      submit_once_allowed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1;
    };

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
  applied: boolean,
  reason: string,
): Extract<
  BuyVoidPreparedTransactionBroadcasterSubmissionActivationDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    applied,
    reason,
    service_started: false,
    submission_enabled: true,
    submit_once_allowed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1,
  };
}

async function defaultServiceModule(): Promise<PrivateBroadcasterServiceModuleV1> {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<PrivateBroadcasterServiceModuleV1>;
  return dynamicImport(
    "../../tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs",
  );
}

export async function runBuyVoidPreparedTransactionBroadcasterSubmissionActivationV1(
  input: Readonly<RunBuyVoidPreparedTransactionBroadcasterSubmissionActivationInputV1>,
  dependencies: BuyVoidPreparedTransactionBroadcasterSubmissionActivationDependenciesV1 = {},
): Promise<BuyVoidPreparedTransactionBroadcasterSubmissionActivationDecisionV1> {
  const apply = input?.apply === true;

  if (
    apply &&
    text(input?.confirmation) !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1
  ) {
    return held(true, "broadcaster_submission_activation_confirmation_required");
  }

  const policy = input?.policy;
  const socketPath = absoluteNonRoot(policy?.socket_path);
  const custodyStore = absoluteNonRoot(policy?.custody_store_dir);
  const stateDir = absoluteNonRoot(policy?.state_dir);
  const signerFingerprint = text(
    policy?.expected_signer_fingerprint_sha256,
  ).toLowerCase();

  if (!socketPath || !custodyStore || !stateDir) {
    return held(apply, "broadcaster_submission_activation_paths_invalid");
  }
  if (
    socketPath === custodyStore ||
    socketPath === stateDir ||
    custodyStore === stateDir
  ) {
    return held(
      apply,
      "broadcaster_submission_activation_paths_must_be_distinct",
    );
  }
  if (!SHA256.test(signerFingerprint)) {
    return held(
      apply,
      "broadcaster_submission_activation_signer_fingerprint_invalid",
    );
  }

  const createChainTransport =
    dependencies.create_chain_transport ||
    createBuyVoidPreparedTransactionChain2050TransportV1;

  const chainTransport = await createChainTransport(policy.rpc);
  if (!chainTransport.ok) {
    return held(
      apply,
      "broadcaster_submission_activation_chain_transport_not_ready",
    );
  }

  let serviceModule: PrivateBroadcasterServiceModuleV1;
  try {
    serviceModule = await (
      dependencies.load_service_module || defaultServiceModule
    )();
  } catch {
    return held(
      apply,
      "broadcaster_submission_activation_service_module_load_failed",
    );
  }

  if (
    !serviceModule ||
    typeof serviceModule.createPreparedTransactionBroadcasterServiceV1 !==
      "function"
  ) {
    return held(
      apply,
      "broadcaster_submission_activation_service_factory_missing",
    );
  }

  let service: PrivateBroadcasterServiceV1;
  try {
    service =
      serviceModule.createPreparedTransactionBroadcasterServiceV1({
        socket_path: socketPath,
        custody_store_dir: custodyStore,
        state_dir: stateDir,
        expected_signer_fingerprint_sha256: signerFingerprint,
        submission_enabled: true,
        transport: chainTransport.transport,
      });
  } catch {
    return held(
      apply,
      "broadcaster_submission_activation_service_create_failed",
    );
  }

  if (
    !service ||
    typeof service.start !== "function" ||
    typeof service.stop !== "function"
  ) {
    return held(
      apply,
      "broadcaster_submission_activation_service_invalid",
    );
  }

  if (!apply) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      service_started: false,
      chain_id: "2050",
      rpc_url_fingerprint_sha256:
        chainTransport.rpc_url_fingerprint_sha256,
      required_confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
      submission_enabled: true,
      submit_once_allowed: false,
      inspection_submission_supported: true,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority:
        VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1,
    };
  }

  try {
    await service.start();
  } catch {
    return held(
      true,
      "broadcaster_submission_activation_service_start_failed",
    );
  }

  return {
    ok: true,
    status: "started",
    applied: true,
    service_started: true,
    chain_id: "2050",
    rpc_url_fingerprint_sha256:
      chainTransport.rpc_url_fingerprint_sha256,
    submission_enabled: true,
    submit_once_allowed: true,
    inspection_submission_supported: true,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    service,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1,
  };
}
