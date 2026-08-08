import crypto from "node:crypto";

import {
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
} from "./buy_void_crash_consistent_saga_runtime_v1.js";

export const VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1 =
  "VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1";

export const VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_COMMAND_PATH_V1 =
  "/__void/operator/buy-void-runtime-v1/command";

export const VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1 = {
  request_id_only_business_selector: true,
  loopback_runtime_only: true,
  crash_consistent_saga_runtime_only: true,
  candidate_reservation_ceiling_required: true,
  dry_run_first: true,
  claim_payment_apply_forbidden: true,
  reserve_inventory_apply_possible: true,
  reserve_execution_attempt_apply_possible: true,
  prepare_transaction_apply_forbidden: true,
  one_business_stage_per_invocation: true,
  automatic_stage_chaining: false,
  exact_saga_id_echo_required_before_apply: true,
  exact_runtime_confirmation_echo_required: true,
  exact_saga_confirmation_echo_required: true,
  exact_action_confirmation_echo_required: true,
  exact_delegated_confirmation_echo_required_when_present: true,
  exact_server_policy_fingerprint_echo_required: true,
  caller_runtime_root_forbidden: true,
  caller_request_directory_forbidden: true,
  caller_payment_policy_forbidden: true,
  caller_inventory_policy_forbidden: true,
  caller_execution_policy_forbidden: true,
  caller_wallet_forbidden: true,
  caller_rpc_url_forbidden: true,
  caller_signer_forbidden: true,
  caller_broadcaster_forbidden: true,
  caller_private_service_socket_forbidden: true,
  caller_receipt_forbidden: true,
  caller_raw_transaction_forbidden: true,
  direct_journal_mutation: false,
  rpc_call: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_decrement: false,
  public_fulfilled_closeout: false,
  money_movement: false,
  background_loop: false,
  startup_execution: false,
} as const;

const DEFAULT_HTTP_PORT = 4100;
const HTTP_PORT_ENV = "HTTP_PORT";
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_ECHO = /^[A-Za-z0-9._:+/-]{1,320}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export type BuyVoidProductionCandidateReservationOperatorArgsV1 = {
  request_id: string;
  apply: boolean;
  saga_id: string;
  runtime_confirmation: string;
  saga_confirmation: string;
  action_confirmation: string;
  policy_fingerprint_sha256: string;
  delegated_confirmation: string;
};

export type BuyVoidProductionCandidateReservationRuntimeResponseV1 = {
  status_code: number;
  body: Record<string, any>;
};

export type BuyVoidProductionCandidateReservationOperatorDependenciesV1 = {
  post_runtime?: (
    body: Readonly<Record<string, unknown>>,
  ) => Promise<BuyVoidProductionCandidateReservationRuntimeResponseV1>;
  env?: NodeJS.ProcessEnv;
};

type DryRequirementsV1 = {
  request_id: string;
  saga_id: string;
  next_action: string;
  runtime_confirmation: string;
  saga_confirmation: string;
  action_confirmation: string;
  delegated_confirmation: string | null;
  policy_fingerprint_sha256: string;
  derived_snapshot_sha256: string;
  snapshot_evidence_sha256: string;
  derived_snapshot: Record<string, any>;
  snapshot_evidence: Record<string, any>;
};

export type BuyVoidProductionCandidateReservationOperatorDecisionV1 =
  | {
      ok: true;
      status: "planned";
      applied: false;
      marker: typeof VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1;
      version: 1;
      request_id: string;
      saga_id: string;
      next_action: "reserve_inventory" | "reserve_execution_attempt";
      required_runtime_confirmation: string;
      required_saga_confirmation: string;
      required_action_confirmation: string;
      required_delegated_confirmation: string | null;
      required_policy_fingerprint_sha256: string;
      derived_snapshot_sha256: string;
      snapshot_evidence_sha256: string;
      derived_snapshot: Record<string, any>;
      snapshot_evidence: Record<string, any>;
      runtime_request_count: 1;
      mutation_performed: false;
      rpc_call_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1;
    }
  | {
      ok: true;
      status: "applied_one_stage";
      applied: true;
      marker: typeof VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1;
      version: 1;
      request_id: string;
      saga_id: string;
      applied_action: "reserve_inventory" | "reserve_execution_attempt";
      rerun_required: true;
      runtime_request_count: 2;
      inventory_decrement_performed: false;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      public_fulfilled_closeout_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1;
    }
  | {
      ok: true;
      status: "candidate_ready";
      applied: false;
      marker: typeof VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1;
      version: 1;
      request_id: string;
      saga_id: string;
      next_action: "prepare_transaction";
      execution_attempt_id: string;
      candidate_evidence_id_sha256: string;
      derived_snapshot_sha256: string;
      snapshot_evidence_sha256: string;
      derived_snapshot: Record<string, any>;
      snapshot_evidence: Record<string, any>;
      runtime_request_count: 1;
      preparation_invoked: false;
      mutation_performed: false;
      rpc_call_performed: false;
      credential_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      applied: false;
      marker: typeof VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1;
      version: 1;
      reason: string;
      request_id: string | null;
      saga_id: string | null;
      next_action: string | null;
      runtime_request_count: number;
      mutation_performed: false;
      rpc_call_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1;
    };

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function objectValue(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : null;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function digest(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function held(input: {
  reason: string;
  request_id?: string | null;
  saga_id?: string | null;
  next_action?: string | null;
  runtime_request_count?: number;
}): Extract<BuyVoidProductionCandidateReservationOperatorDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    applied: false,
    marker: VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1,
    version: 1,
    reason: input.reason,
    request_id: input.request_id ?? null,
    saga_id: input.saga_id ?? null,
    next_action: input.next_action ?? null,
    runtime_request_count: input.runtime_request_count ?? 0,
    mutation_performed: false,
    rpc_call_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1,
  };
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function parseBuyVoidProductionCandidateReservationOperatorArgsV1(
  argv: string[],
): BuyVoidProductionCandidateReservationOperatorArgsV1 {
  const values: BuyVoidProductionCandidateReservationOperatorArgsV1 = {
    request_id: "",
    apply: false,
    saga_id: "",
    runtime_confirmation: "",
    saga_confirmation: "",
    action_confirmation: "",
    policy_fingerprint_sha256: "",
    delegated_confirmation: "",
  };
  const seen = new Set<string>();
  const valueFlags = new Map<string, keyof typeof values>([
    ["--request-id", "request_id"],
    ["--saga-id", "saga_id"],
    ["--runtime-confirm", "runtime_confirmation"],
    ["--saga-confirm", "saga_confirmation"],
    ["--action-confirm", "action_confirmation"],
    ["--policy-fingerprint-sha256", "policy_fingerprint_sha256"],
    ["--delegated-confirm", "delegated_confirmation"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--apply") {
      if (seen.has(flag)) throw new Error(`${flag} may be supplied only once`);
      seen.add(flag);
      values.apply = true;
      continue;
    }
    const field = valueFlags.get(flag);
    if (!field) throw new Error(`unknown argument: ${flag}`);
    if (seen.has(flag)) throw new Error(`${flag} may be supplied only once`);
    seen.add(flag);
    const value = requireValue(argv, index, flag);
    if (field === "apply") throw new Error("internal_argument_mapping_error");
    (values[field] as string) = value;
    index += 1;
  }

  if (!SAFE_REQUEST_ID.test(values.request_id)) {
    throw new Error("--request-id is required and must be a safe request ID");
  }
  return values;
}

function runtimePort(env: NodeJS.ProcessEnv): number {
  const raw = text(env[HTTP_PORT_ENV]);
  if (!raw) return DEFAULT_HTTP_PORT;
  if (!/^[0-9]{1,5}$/.test(raw)) throw new Error("HTTP_PORT is invalid");
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("HTTP_PORT is invalid");
  }
  return port;
}

export function buyVoidProductionCandidateReservationRuntimeEndpointV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `http://127.0.0.1:${runtimePort(env)}${
    VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_COMMAND_PATH_V1
  }`;
}

async function defaultPostRuntime(
  env: NodeJS.ProcessEnv,
  body: Readonly<Record<string, unknown>>,
): Promise<BuyVoidProductionCandidateReservationRuntimeResponseV1> {
  const endpoint = buyVoidProductionCandidateReservationRuntimeEndpointV1(env);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const responseText = await response.text();
    if (Buffer.byteLength(responseText, "utf8") > MAX_RESPONSE_BYTES) {
      throw new Error("runtime_response_too_large");
    }
    const parsed = objectValue(JSON.parse(responseText));
    if (!parsed) throw new Error("runtime_response_object_required");
    return { status_code: response.status, body: parsed };
  } finally {
    clearTimeout(timer);
  }
}

function dryRequirements(
  response: BuyVoidProductionCandidateReservationRuntimeResponseV1,
  requestId: string,
): DryRequirementsV1 | null {
  const body = response.body;
  if (
    response.status_code !== 200 ||
    body.ok !== true ||
    body.status !== "dry_run" ||
    body.applied !== false ||
    text(body.request_id) !== requestId ||
    body.candidate_reservation_only !== true ||
    body.preparation_invoked !== false ||
    body.rpc_call_performed !== false
  ) {
    return null;
  }
  const sagaId = text(body.saga_id);
  const nextAction = text(body.next_action);
  const runtimeConfirmation = text(body.required_runtime_confirmation);
  const sagaConfirmation = text(body.required_saga_confirmation);
  const actionConfirmation = text(body.required_action_confirmation);
  const delegatedConfirmation = body.required_delegated_confirmation == null
    ? null
    : text(body.required_delegated_confirmation);
  const policyFingerprint = text(body.required_policy_fingerprint_sha256).toLowerCase();
  const snapshotHash = text(body.derived_snapshot_sha256).toLowerCase();
  const evidenceHash = text(body.snapshot_evidence_sha256).toLowerCase();
  const snapshot = objectValue(body.derived_snapshot);
  const evidence = objectValue(body.snapshot_evidence);
  if (
    !SAFE_ECHO.test(sagaId) ||
    !SAFE_ECHO.test(runtimeConfirmation) ||
    !SAFE_ECHO.test(sagaConfirmation) ||
    !SAFE_ECHO.test(actionConfirmation) ||
    (delegatedConfirmation !== null && !SAFE_ECHO.test(delegatedConfirmation)) ||
    !SHA256.test(policyFingerprint) ||
    !SHA256.test(snapshotHash) ||
    !SHA256.test(evidenceHash) ||
    !snapshot ||
    !evidence ||
    digest(snapshot) !== snapshotHash ||
    digest(evidence) !== evidenceHash
  ) {
    return null;
  }
  return {
    request_id: requestId,
    saga_id: sagaId,
    next_action: nextAction,
    runtime_confirmation: runtimeConfirmation,
    saga_confirmation: sagaConfirmation,
    action_confirmation: actionConfirmation,
    delegated_confirmation: delegatedConfirmation,
    policy_fingerprint_sha256: policyFingerprint,
    derived_snapshot_sha256: snapshotHash,
    snapshot_evidence_sha256: evidenceHash,
    derived_snapshot: snapshot,
    snapshot_evidence: evidence,
  };
}

function candidateAttempt(
  dry: DryRequirementsV1,
): string | null {
  const snapshot = dry.derived_snapshot;
  const evidence = dry.snapshot_evidence;
  const attemptId = text(snapshot.attempt_id).toLowerCase();
  if (
    dry.next_action !== "prepare_transaction" ||
    text(snapshot.request_id) !== dry.request_id ||
    text(snapshot.claim_status) !== "claimed" ||
    text(snapshot.attempt_status) !== "reserved" ||
    text(snapshot.broadcast_status) !== "none" ||
    !SHA256.test(attemptId) ||
    Number(evidence.claim_count) !== 1 ||
    Number(evidence.attempt_count) !== 1 ||
    Number(evidence.selected_attempt_number) !== 1 ||
    Number(evidence.confirmed_state_count) !== 0 ||
    evidence.confirmed_state_present !== false
  ) {
    return null;
  }
  return attemptId;
}

function exactEchoes(
  args: BuyVoidProductionCandidateReservationOperatorArgsV1,
  dry: DryRequirementsV1,
): string | null {
  if (!args.apply) return "candidate_reservation_apply_intent_required";
  if (args.saga_id !== dry.saga_id) return "candidate_reservation_exact_saga_id_required";
  if (args.runtime_confirmation !== dry.runtime_confirmation) {
    return "candidate_reservation_exact_runtime_confirmation_required";
  }
  if (args.saga_confirmation !== dry.saga_confirmation) {
    return "candidate_reservation_exact_saga_confirmation_required";
  }
  if (args.action_confirmation !== dry.action_confirmation) {
    return "candidate_reservation_exact_action_confirmation_required";
  }
  if (args.policy_fingerprint_sha256 !== dry.policy_fingerprint_sha256) {
    return "candidate_reservation_exact_server_policy_fingerprint_required";
  }
  if (dry.delegated_confirmation) {
    if (args.delegated_confirmation !== dry.delegated_confirmation) {
      return "candidate_reservation_exact_delegated_confirmation_required";
    }
  } else if (args.delegated_confirmation) {
    return "candidate_reservation_unexpected_delegated_confirmation";
  }
  return null;
}

export async function runBuyVoidProductionCandidateReservationOperatorV1(
  args: Readonly<BuyVoidProductionCandidateReservationOperatorArgsV1>,
  dependencies: BuyVoidProductionCandidateReservationOperatorDependenciesV1 = {},
): Promise<BuyVoidProductionCandidateReservationOperatorDecisionV1> {
  const requestId = text(args?.request_id);
  if (!SAFE_REQUEST_ID.test(requestId)) {
    return held({ reason: "candidate_reservation_request_id_required" });
  }
  const env = dependencies.env || process.env;
  const postRuntime = dependencies.post_runtime ||
    ((body) => defaultPostRuntime(env, body));

  const dryResponse = await postRuntime({
    action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
    request_id: requestId,
    candidate_reservation_only: true,
    apply: false,
  });
  const dry = dryRequirements(dryResponse, requestId);
  if (!dry) {
    return held({
      reason: "candidate_reservation_runtime_dry_run_invalid_or_held",
      request_id: requestId,
      runtime_request_count: 1,
    });
  }

  if (dry.next_action === "claim_payment") {
    return held({
      reason: "candidate_reservation_requires_existing_claim",
      request_id: requestId,
      saga_id: dry.saga_id,
      next_action: dry.next_action,
      runtime_request_count: 1,
    });
  }

  if (dry.next_action === "prepare_transaction") {
    const attemptId = candidateAttempt(dry);
    if (!attemptId) {
      return held({
        reason: "candidate_reservation_candidate_snapshot_not_clean",
        request_id: requestId,
        saga_id: dry.saga_id,
        next_action: dry.next_action,
        runtime_request_count: 1,
      });
    }
    return {
      ok: true,
      status: "candidate_ready",
      applied: false,
      marker: VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1,
      version: 1,
      request_id: requestId,
      saga_id: dry.saga_id,
      next_action: "prepare_transaction",
      execution_attempt_id: attemptId,
      candidate_evidence_id_sha256: digest({
        contract: "void-buy-production-candidate-reservation-evidence-v1",
        request_id: requestId,
        saga_id: dry.saga_id,
        execution_attempt_id: attemptId,
        policy_fingerprint_sha256: dry.policy_fingerprint_sha256,
        derived_snapshot_sha256: dry.derived_snapshot_sha256,
        snapshot_evidence_sha256: dry.snapshot_evidence_sha256,
      }),
      derived_snapshot_sha256: dry.derived_snapshot_sha256,
      snapshot_evidence_sha256: dry.snapshot_evidence_sha256,
      derived_snapshot: dry.derived_snapshot,
      snapshot_evidence: dry.snapshot_evidence,
      runtime_request_count: 1,
      preparation_invoked: false,
      mutation_performed: false,
      rpc_call_performed: false,
      credential_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority:
        VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1,
    };
  }

  if (
    dry.next_action !== "reserve_inventory" &&
    dry.next_action !== "reserve_execution_attempt"
  ) {
    return held({
      reason: "candidate_reservation_next_action_outside_boundary",
      request_id: requestId,
      saga_id: dry.saga_id,
      next_action: dry.next_action,
      runtime_request_count: 1,
    });
  }

  const reservationAction = dry.next_action as
    "reserve_inventory" | "reserve_execution_attempt";
  if (!args.apply) {
    return {
      ok: true,
      status: "planned",
      applied: false,
      marker: VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1,
      version: 1,
      request_id: requestId,
      saga_id: dry.saga_id,
      next_action: reservationAction,
      required_runtime_confirmation: dry.runtime_confirmation,
      required_saga_confirmation: dry.saga_confirmation,
      required_action_confirmation: dry.action_confirmation,
      required_delegated_confirmation: dry.delegated_confirmation,
      required_policy_fingerprint_sha256: dry.policy_fingerprint_sha256,
      derived_snapshot_sha256: dry.derived_snapshot_sha256,
      snapshot_evidence_sha256: dry.snapshot_evidence_sha256,
      derived_snapshot: dry.derived_snapshot,
      snapshot_evidence: dry.snapshot_evidence,
      runtime_request_count: 1,
      mutation_performed: false,
      rpc_call_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority:
        VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1,
    };
  }

  const echoError = exactEchoes(args as BuyVoidProductionCandidateReservationOperatorArgsV1, dry);
  if (echoError) {
    return held({
      reason: echoError,
      request_id: requestId,
      saga_id: dry.saga_id,
      next_action: reservationAction,
      runtime_request_count: 1,
    });
  }

  const applyResponse = await postRuntime({
    action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
    request_id: requestId,
    candidate_reservation_only: true,
    apply: true,
    confirmation: args.runtime_confirmation,
    saga_confirmation: args.saga_confirmation,
    action_confirmation: args.action_confirmation,
    policy_fingerprint_sha256: args.policy_fingerprint_sha256,
    ...(dry.delegated_confirmation
      ? { delegated_confirmation: args.delegated_confirmation }
      : {}),
  });
  const applied = applyResponse.body;
  if (
    applyResponse.status_code !== 200 ||
    applied.ok !== true ||
    applied.status !== "applied" ||
    applied.applied !== true ||
    text(applied.request_id) !== requestId ||
    text(applied.saga_id) !== dry.saga_id ||
    applied.candidate_reservation_only !== true ||
    applied.preparation_invoked !== false ||
    applied.rpc_call_performed !== false ||
    applied.inventory_decrement_performed !== false ||
    applied.wallet_access_performed !== false ||
    applied.signing_performed !== false ||
    applied.transaction_broadcast_performed !== false ||
    applied.public_fulfilled_closeout_performed !== false ||
    applied.money_movement_performed !== false
  ) {
    return held({
      reason: "candidate_reservation_runtime_apply_invalid_or_held",
      request_id: requestId,
      saga_id: dry.saga_id,
      next_action: reservationAction,
      runtime_request_count: 2,
    });
  }

  return {
    ok: true,
    status: "applied_one_stage",
    applied: true,
    marker: VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1,
    version: 1,
    request_id: requestId,
    saga_id: dry.saga_id,
    applied_action: reservationAction,
    rerun_required: true,
    runtime_request_count: 2,
    inventory_decrement_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1,
  };
}
