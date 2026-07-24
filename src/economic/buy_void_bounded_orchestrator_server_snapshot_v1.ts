import fs from "node:fs";
import path from "node:path";
import {
  listBuyVoidFulfillmentJournalClaimsV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  listBuyVoidExecutionAttemptsV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  readBuyVoidBroadcastOutcomeStateV1,
} from "./buy_void_broadcast_outcome_journal_v1.js";
import {
  listBuyVoidConfirmedStatesV1,
} from "./buy_void_confirmed_state_journal_v1.js";
import type {
  BuyVoidBoundedAutoFulfillmentSnapshotV1,
} from "./buy_void_bounded_auto_fulfillment_orchestrator_v1.js";

export const VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_V1 =
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_V1";

export const VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_AUTHORITY_V1 = {
  request_id_only_selector: true,
  client_supplied_snapshot_forbidden: true,
  server_controlled_root_dir: true,
  server_controlled_request_dir: true,
  public_request_base_read: true,
  append_only_operator_event_read: true,
  fulfillment_claim_journal_read: true,
  execution_attempt_journal_read: true,
  broadcast_outcome_journal_read: true,
  confirmed_state_journal_read: true,
  filesystem_write: false,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
  background_loop: false,
  startup_execution: false,
} as const;

export type BuyVoidBoundedOrchestratorServerSnapshotDependenciesV1 = {
  list_claims?: (rootDir: string) => unknown[];
  list_attempts?: (rootDir: string) => unknown[];
  read_broadcast?: (input: {
    root_dir: string;
    attempt_id: string;
  }) => unknown | null;
  list_confirmed?: (rootDir: string) => unknown[];
};

export type BuyVoidBoundedOrchestratorServerSnapshotEvidenceV1 = {
  request_file: string;
  operator_event_files: string[];
  operator_event_count: number;
  fulfilled_event_count: number;
  claim_count: number;
  attempt_count: number;
  confirmed_state_count: number;
  selected_attempt_number: number | null;
  confirmed_state_present: boolean;
  public_status_source: "request_base" | "operator_event";
};

export type BuyVoidBoundedOrchestratorServerSnapshotDecisionV1 =
  | {
      ok: true;
      status: "derived";
      snapshot: BuyVoidBoundedAutoFulfillmentSnapshotV1;
      evidence: BuyVoidBoundedOrchestratorServerSnapshotEvidenceV1;
    }
  | {
      ok: false;
      status: "held";
      reason: string;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_ATTEMPT_ID = /^[0-9a-f]{64}$/;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_OPERATOR_EVENTS = 1000;

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidBoundedOrchestratorServerSnapshotDecisionV1 {
  return {
    ok: false,
    status: "held",
    reason,
    ...(detail ? { detail } : {}),
  };
}

function objectValue(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : null;
}

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function normalizedLower(value: unknown): string {
  return normalized(value).toLowerCase();
}

function exactRoot(value: unknown, reason: string): string {
  const raw = normalized(value);
  if (!raw || !path.isAbsolute(raw)) throw new Error(reason);
  return path.resolve(raw);
}

function readJsonObject(
  filePath: string,
  rootDir: string,
): Record<string, any> {
  const resolvedRoot = path.resolve(rootDir);
  const resolved = path.resolve(filePath);
  const relative = path.relative(resolvedRoot, resolved);

  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error("server_snapshot_path_outside_root");
  }

  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink()) {
    throw new Error("server_snapshot_symlink_forbidden");
  }
  if (!stat.isFile()) {
    throw new Error("server_snapshot_regular_file_required");
  }
  if (stat.size > MAX_JSON_BYTES) {
    throw new Error("server_snapshot_json_too_large");
  }

  const parsed = JSON.parse(fs.readFileSync(resolved, "utf8"));
  const value = objectValue(parsed);
  if (!value) throw new Error("server_snapshot_json_object_required");
  return value;
}

function escapedRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requestProjection(input: {
  request_dir: string;
  request_id: string;
}): {
  request_file: string;
  request: Record<string, any>;
  events: Array<{
    filename: string;
    value: Record<string, any>;
    marked_at_ms: number;
  }>;
  effective_status: string;
  fulfilled_event_count: number;
  public_status_source: "request_base" | "operator_event";
} {
  const requestFile = path.join(
    input.request_dir,
    `${input.request_id}.json`,
  );
  const request = readJsonObject(requestFile, input.request_dir);

  if (normalized(request.request_id) !== input.request_id) {
    throw new Error("public_request_id_mismatch");
  }

  let effectiveStatus = normalizedLower(request.status);
  if (!effectiveStatus) {
    throw new Error("public_request_status_missing");
  }

  const prefix = `operator-event-${input.request_id}-`;
  const pattern = new RegExp(
    `^${escapedRegex(prefix)}([0-9]+)\\.json$`,
  );
  const names = fs.readdirSync(input.request_dir)
    .filter((name) => pattern.test(name))
    .sort();

  if (names.length > MAX_OPERATOR_EVENTS) {
    throw new Error("operator_event_hard_cap_exceeded");
  }

  const events = names.map((filename) => {
    const value = readJsonObject(
      path.join(input.request_dir, filename),
      input.request_dir,
    );
    if (normalized(value.request_id) !== input.request_id) {
      throw new Error("operator_event_request_id_mismatch");
    }
    const marked = Number(value.marked_at_ms);
    if (!Number.isSafeInteger(marked) || marked < 0) {
      throw new Error("operator_event_marked_at_invalid");
    }
    return {
      filename,
      value,
      marked_at_ms: marked,
    };
  }).sort((left, right) =>
    left.marked_at_ms - right.marked_at_ms ||
    left.filename.localeCompare(right.filename)
  );

  let source: "request_base" | "operator_event" = "request_base";
  let fulfilledEventCount = 0;

  for (const event of events) {
    const prior = normalizedLower(event.value.prior_status);
    const next = normalizedLower(event.value.operator_status);

    if (prior && prior !== effectiveStatus) {
      throw new Error("operator_event_status_chain_conflict");
    }
    if (!next) continue;

    effectiveStatus = next;
    source = "operator_event";
    if (next === "fulfilled") fulfilledEventCount += 1;
  }

  return {
    request_file: requestFile,
    request,
    events,
    effective_status: effectiveStatus,
    fulfilled_event_count: fulfilledEventCount,
    public_status_source: source,
  };
}

function claimForRequest(
  values: unknown[],
  requestId: string,
): Record<string, any>[] {
  return values
    .map(objectValue)
    .filter((value): value is Record<string, any> => Boolean(value))
    .filter((intent) =>
      normalized(intent.claim?.request_id) === requestId
    );
}

function attemptsForRequest(
  values: unknown[],
  requestId: string,
): Record<string, any>[] {
  return values
    .map(objectValue)
    .filter((value): value is Record<string, any> => Boolean(value))
    .filter((attempt) =>
      normalized(attempt.reservation?.request_id) === requestId
    );
}

function confirmedForRequest(
  values: unknown[],
  requestId: string,
): Record<string, any>[] {
  return values
    .map(objectValue)
    .filter((value): value is Record<string, any> => Boolean(value))
    .filter((state) => normalized(state.request_id) === requestId);
}

function attemptNumber(value: Record<string, any>): number {
  const number = Number(value.reservation?.attempt_number);
  return Number.isSafeInteger(number) && number >= 1
    ? number
    : -1;
}

function defaultDependencies():
  Required<BuyVoidBoundedOrchestratorServerSnapshotDependenciesV1> {
  return {
    list_claims: (rootDir) =>
      listBuyVoidFulfillmentJournalClaimsV1(rootDir),
    list_attempts: (rootDir) =>
      listBuyVoidExecutionAttemptsV1(rootDir),
    read_broadcast: (input) =>
      readBuyVoidBroadcastOutcomeStateV1(input),
    list_confirmed: (rootDir) =>
      listBuyVoidConfirmedStatesV1(rootDir),
  };
}

export function deriveBuyVoidBoundedOrchestratorServerSnapshotV1(input: {
  root_dir: string;
  request_dir: string;
  request_id: string;
  dependencies?: BuyVoidBoundedOrchestratorServerSnapshotDependenciesV1;
}): BuyVoidBoundedOrchestratorServerSnapshotDecisionV1 {
  const requestId = normalized(input?.request_id);
  if (!SAFE_REQUEST_ID.test(requestId)) {
    return held("invalid_request_id");
  }

  let rootDir = "";
  let requestDir = "";
  try {
    rootDir = exactRoot(
      input?.root_dir,
      "server_controlled_root_dir_required",
    );
    requestDir = exactRoot(
      input?.request_dir,
      "server_controlled_request_dir_required",
    );
  } catch (error) {
    return held(String((error as Error)?.message || error));
  }

  let projection;
  try {
    projection = requestProjection({
      request_dir: requestDir,
      request_id: requestId,
    });
  } catch (error) {
    return held("public_request_projection_failed", {
      error_class: normalized(
        (error as { name?: unknown })?.name || "Error",
      ).slice(0, 80),
      reason: normalized((error as Error)?.message || error),
    });
  }

  const dependencies = {
    ...defaultDependencies(),
    ...(input.dependencies || {}),
  };

  let claims: Record<string, any>[];
  let attempts: Record<string, any>[];
  let confirmedStates: Record<string, any>[];

  try {
    claims = claimForRequest(
      dependencies.list_claims(rootDir),
      requestId,
    );
    attempts = attemptsForRequest(
      dependencies.list_attempts(rootDir),
      requestId,
    );
    confirmedStates = confirmedForRequest(
      dependencies.list_confirmed(rootDir),
      requestId,
    );
  } catch (error) {
    return held("server_journal_read_failed", {
      error_class: normalized(
        (error as { name?: unknown })?.name || "Error",
      ).slice(0, 80),
    });
  }

  if (claims.length > 1) {
    return held("multiple_claims_for_request", {
      claim_count: claims.length,
    });
  }
  if (confirmedStates.length > 1) {
    return held("multiple_confirmed_states_for_request", {
      confirmed_state_count: confirmedStates.length,
    });
  }

  const claim = claims[0] || null;
  const canonicalPaymentIdentity = normalized(
    claim?.claim?.canonical_payment_identity,
  );

  if (!claim && attempts.length > 0) {
    return held("attempt_exists_without_claim");
  }
  if (!claim && confirmedStates.length > 0) {
    return held("confirmed_state_exists_without_claim");
  }

  for (const attempt of attempts) {
    const attemptPayment = normalized(
      attempt.reservation?.canonical_payment_identity,
    );
    if (
      canonicalPaymentIdentity &&
      attemptPayment !== canonicalPaymentIdentity
    ) {
      return held("attempt_payment_identity_mismatch", {
        attempt_id: normalized(
          attempt.reservation?.attempt_id,
        ),
      });
    }
  }

  attempts.sort((left, right) =>
    attemptNumber(left) - attemptNumber(right) ||
    normalized(left.reservation?.attempt_id).localeCompare(
      normalized(right.reservation?.attempt_id),
    )
  );

  for (let index = 1; index < attempts.length; index += 1) {
    if (
      attemptNumber(attempts[index - 1]) ===
      attemptNumber(attempts[index])
    ) {
      return held("duplicate_attempt_number_for_request");
    }
  }

  const attempt = attempts[attempts.length - 1] || null;
  const attemptId = normalized(attempt?.reservation?.attempt_id);
  const attemptStatus = normalizedLower(attempt?.status) || "missing";

  if (attempt && !SAFE_ATTEMPT_ID.test(attemptId)) {
    return held("invalid_selected_attempt_id");
  }

  let broadcast: Record<string, any> | null = null;
  if (attempt) {
    try {
      broadcast = objectValue(
        dependencies.read_broadcast({
          root_dir: rootDir,
          attempt_id: attemptId,
        }),
      );
    } catch (error) {
      return held("broadcast_outcome_read_failed", {
        attempt_id: attemptId,
        error_class: normalized(
          (error as { name?: unknown })?.name || "Error",
        ).slice(0, 80),
      });
    }
  }

  const validAttemptStatuses = new Set([
    "reserved",
    "prepared",
    "broadcast",
    "confirmed",
    "failed_retryable",
    "failed_terminal",
  ]);
  if (attempt && !validAttemptStatuses.has(attemptStatus)) {
    return held("unsupported_attempt_status", {
      attempt_id: attemptId,
      attempt_status: attemptStatus,
    });
  }

  const rawBroadcastStatus = normalizedLower(broadcast?.status);
  const broadcastStatus =
    rawBroadcastStatus === "prepared_no_outcome" ||
    !rawBroadcastStatus
      ? "none"
      : rawBroadcastStatus;

  const validBroadcastStatuses = new Set([
    "none",
    "not_broadcast",
    "broadcast_unknown",
    "broadcast_accepted",
    "reverted",
    "confirmed",
  ]);
  if (!validBroadcastStatuses.has(broadcastStatus)) {
    return held("unsupported_broadcast_status", {
      attempt_id: attemptId,
      broadcast_status: broadcastStatus,
    });
  }

  if (
    attempt &&
    ["broadcast", "confirmed"].includes(attemptStatus) &&
    !broadcast
  ) {
    return held("broadcast_outcome_missing_for_attempt_status", {
      attempt_id: attemptId,
      attempt_status: attemptStatus,
    });
  }

  const confirmedState = confirmedStates[0] || null;
  if (confirmedState) {
    if (
      normalized(confirmedState.canonical_payment_identity) !==
      canonicalPaymentIdentity
    ) {
      return held("confirmed_state_payment_identity_mismatch");
    }
    if (!attempt) {
      return held("confirmed_state_exists_without_attempt");
    }

    const confirmedTx = normalizedLower(
      confirmedState.fulfillment_receipt?.void_delivery_tx_hash,
    );
    const attemptTx = normalizedLower(
      attempt.confirmation?.void_delivery_tx_hash,
    );
    if (
      confirmedTx &&
      attemptTx &&
      confirmedTx !== attemptTx
    ) {
      return held("confirmed_delivery_transaction_mismatch");
    }
  }

  if (
    projection.effective_status === "fulfilled" &&
    !confirmedState
  ) {
    return held("fulfilled_public_status_without_confirmed_state");
  }
  if (
    projection.fulfilled_event_count > 1
  ) {
    return held("multiple_fulfilled_operator_events", {
      fulfilled_event_count: projection.fulfilled_event_count,
    });
  }

  const snapshot: BuyVoidBoundedAutoFulfillmentSnapshotV1 = {
    request_id: requestId,
    ...(canonicalPaymentIdentity
      ? { canonical_payment_identity: canonicalPaymentIdentity }
      : {}),
    public_status: projection.effective_status,
    claim_status: claim ? "claimed" : "missing",
    ...(attemptId ? { attempt_id: attemptId } : {}),
    attempt_status: attempt
      ? attemptStatus as
          BuyVoidBoundedAutoFulfillmentSnapshotV1["attempt_status"]
      : "missing",
    broadcast_status: broadcastStatus as
      BuyVoidBoundedAutoFulfillmentSnapshotV1["broadcast_status"],
  };

  return {
    ok: true,
    status: "derived",
    snapshot,
    evidence: {
      request_file: projection.request_file,
      operator_event_files: projection.events.map(
        (event) => event.filename,
      ),
      operator_event_count: projection.events.length,
      fulfilled_event_count:
        projection.fulfilled_event_count,
      claim_count: claims.length,
      attempt_count: attempts.length,
      confirmed_state_count: confirmedStates.length,
      selected_attempt_number: attempt
        ? attemptNumber(attempt)
        : null,
      confirmed_state_present: Boolean(confirmedState),
      public_status_source:
        projection.public_status_source,
    },
  };
}
