import { types as utilTypes } from "node:util";
import {
  decideBuyVoidAutoFulfillmentV1,
  type BuyVoidAutoFulfillmentDecisionV1,
  type BuyVoidAutoFulfillmentPolicyV1,
  type BuyVoidRequestV1,
} from "./buy_void_auto_fulfillment_v1.js";
import {
  claimBuyVoidFulfillmentJournalV1,
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalDecisionV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidVerifiedPaymentDecisionV2,
  type BuyVoidVerifiedPaymentPolicyV2,
} from "./buy_void_verified_payment_v2.js";
import {
  type BuyVoidPaymentObservationReadyV1,
  type BuyVoidPaymentRpcObserverPolicyV1,
  type BuyVoidPaymentRpcTransportV1,
} from "./buy_void_payment_rpc_observer_v1.js";
import {
  observeBuyVoidCanonicalRailPaymentV1,
} from "./buy_void_canonical_payment_rpc_rail_guard_v1.js";

export const VOID_BUY_VOID_AUTO_CLAIM_WORKER_V1 =
  "VOID_BUY_VOID_AUTO_CLAIM_WORKER_V1";

export const VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1 =
  "buyVoidAutoClaimPayment";

export const VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1 = {
  one_request_per_run: true,
  disabled_by_policy_default: true,
  dry_by_default: true,
  exact_confirmation_required: true,
  server_controlled_policy: true,
  rpc_read_via_observer: true,
  canonical_payment_rpc_rail_guard_required: true,
  noncanonical_chain_id_reaches_rpc: false,
  request_and_policy_snapshot_once: true,
  caller_accessor_or_proxy_authority: false,
  post_observation_caller_mutation_authority: false,
  filesystem_read_via_claim_journal: true,
  filesystem_write_on_apply: true,
  request_journal_write: false,
  inventory_decrement: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  background_loop: false,
  money_movement: false,
} as const;

export type BuyVoidAutoClaimWorkerPolicyV1 = {
  enabled: boolean;
  accepted_request_status:
    "payment_submitted_pending_manual_review";
  max_void_amount_units: string | number;
};

export type BuyVoidAutoClaimRequestV1 =
  BuyVoidRequestV1 & {
    status?: unknown;
  };

export type BuyVoidAutoClaimRequestStatePatchV1 = {
  status: "payment_verified_fulfillment_claimed";
  payment_verified_at_ms: number;
  canonical_payment_identity: string;
  fulfillment_instruction_id: string;
  fulfillment_claim_status: "claimed";
  automatic_delivery_started: false;
  signing_performed: false;
  transaction_broadcast: false;
};

export type BuyVoidAutoClaimWorkerDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      observer: BuyVoidPaymentObservationReadyV1;
      verification: BuyVoidVerifiedPaymentDecisionV2 & {
        ok: true;
      };
      admission: BuyVoidAutoFulfillmentDecisionV1 & {
        ok: true;
      };
      required_confirmation:
        typeof VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1;
    }
  | {
      ok: true;
      status: "claimed" | "duplicate";
      applied: true;
      mutation_performed: boolean;
      observer: BuyVoidPaymentObservationReadyV1;
      verification: BuyVoidVerifiedPaymentDecisionV2 & {
        ok: true;
      };
      journal: BuyVoidFulfillmentJournalDecisionV1 & {
        ok: true;
      };
      request_state_patch: BuyVoidAutoClaimRequestStatePatchV1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      mutation_performed: false;
      stage:
        | "worker_policy"
        | "payment_observation"
        | "payment_verification"
        | "fulfillment_admission"
        | "claim_journal";
      reason: string;
      detail?: Record<string, unknown>;
    };

function held(
  stage: BuyVoidAutoClaimWorkerDecisionV1 extends infer _T
    ? "worker_policy"
      | "payment_observation"
      | "payment_verification"
      | "fulfillment_admission"
      | "claim_journal"
    : never,
  applied: boolean,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidAutoClaimWorkerDecisionV1 {
  return {
    ok: false,
    status: "held",
    applied,
    mutation_performed: false,
    stage,
    reason,
    ...(detail ? { detail } : {}),
  };
}

const AUTO_CLAIM_SNAPSHOT_MAX_DEPTH_V1 = 12;
const AUTO_CLAIM_SNAPSHOT_MAX_NODES_V1 = 4096;
const AUTO_CLAIM_SNAPSHOT_MAX_KEYS_V1 = 4096;
const AUTO_CLAIM_SNAPSHOT_MAX_ARRAY_ITEMS_V1 = 4096;
const AUTO_CLAIM_SNAPSHOT_MAX_TEXT_CODE_UNITS_V1 = 256 * 1024;

type AutoClaimSnapshotBudgetV1 = {
  nodes: number;
  keys: number;
};

function snapshotAutoClaimPlainDataV1(
  value: unknown,
  label: string,
  budget: AutoClaimSnapshotBudgetV1,
  active: WeakSet<object>,
  depth: number,
): any {
  if (depth > AUTO_CLAIM_SNAPSHOT_MAX_DEPTH_V1) {
    throw new Error(label + "_depth_exceeded");
  }
  budget.nodes += 1;
  if (budget.nodes > AUTO_CLAIM_SNAPSHOT_MAX_NODES_V1) {
    throw new Error(label + "_node_count_exceeded");
  }

  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(label + "_number_invalid");
    }
    return value;
  }
  if (typeof value === "string") {
    if (value.length > AUTO_CLAIM_SNAPSHOT_MAX_TEXT_CODE_UNITS_V1) {
      throw new Error(label + "_text_too_large");
    }
    return value;
  }
  if (!value || typeof value !== "object") {
    throw new Error(label + "_value_invalid");
  }
  if (utilTypes.isProxy(value)) {
    throw new Error(label + "_proxy_forbidden");
  }
  if (active.has(value)) {
    throw new Error(label + "_cycle_forbidden");
  }

  active.add(value);
  try {
    if (Array.isArray(value)) {
      if (
        Object.getPrototypeOf(value) !== Array.prototype ||
        value.length > AUTO_CLAIM_SNAPSHOT_MAX_ARRAY_ITEMS_V1
      ) {
        throw new Error(label + "_array_invalid");
      }
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const own = Reflect.ownKeys(descriptors);
      if (
        own.some((key) => typeof key !== "string") ||
        own.length !== value.length + 1
      ) {
        throw new Error(label + "_array_shape_invalid");
      }
      const out: any[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (
          !descriptor ||
          descriptor.enumerable !== true ||
          !Object.hasOwn(descriptor, "value")
        ) {
          throw new Error(label + "_array_accessor_or_hole_forbidden");
        }
        out.push(
          snapshotAutoClaimPlainDataV1(
            descriptor.value,
            label,
            budget,
            active,
            depth + 1,
          ),
        );
      }
      return Object.freeze(out);
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(label + "_prototype_invalid");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const own = Reflect.ownKeys(descriptors);
    if (own.some((key) => typeof key !== "string")) {
      throw new Error(label + "_symbol_key_forbidden");
    }
    budget.keys += own.length;
    if (budget.keys > AUTO_CLAIM_SNAPSHOT_MAX_KEYS_V1) {
      throw new Error(label + "_key_count_exceeded");
    }
    const out: Record<string, unknown> = Object.create(null);
    for (const key of own as string[]) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value") ||
        key === "toJSON"
      ) {
        throw new Error(label + "_accessor_or_tojson_forbidden");
      }
      Object.defineProperty(out, key, {
        value: snapshotAutoClaimPlainDataV1(
          descriptor.value,
          label,
          budget,
          active,
          depth + 1,
        ),
        enumerable: true,
        writable: false,
        configurable: false,
      });
    }
    return Object.freeze(out);
  } finally {
    active.delete(value);
  }
}

function snapshotAutoClaimJsonObjectV1<T>(
  value: unknown,
  label: string,
): Readonly<T> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(label + "_invalid");
  }
  return snapshotAutoClaimPlainDataV1(
    value,
    label,
    { nodes: 0, keys: 0 },
    new WeakSet<object>(),
    0,
  ) as Readonly<T>;
}

function snapshotAutoClaimInvocationV1(
  input: unknown,
): Readonly<{
  request: BuyVoidAutoClaimRequestV1;
  root_dir: string;
  worker_policy: BuyVoidAutoClaimWorkerPolicyV1;
  observer_policy: BuyVoidPaymentRpcObserverPolicyV1;
  verification_policy: BuyVoidVerifiedPaymentPolicyV2;
  fulfillment_policy: BuyVoidAutoFulfillmentPolicyV1;
  apply: boolean;
  confirmation: unknown;
  now_ms: number | undefined;
  transport: BuyVoidPaymentRpcTransportV1 | undefined;
}> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    utilTypes.isProxy(input)
  ) {
    throw new Error("auto_claim_invocation_invalid");
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("auto_claim_invocation_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const allowed = new Set([
    "request",
    "root_dir",
    "worker_policy",
    "observer_policy",
    "verification_policy",
    "fulfillment_policy",
    "apply",
    "confirmation",
    "now_ms",
    "transport",
  ]);
  const required = [
    "request",
    "root_dir",
    "worker_policy",
    "observer_policy",
    "verification_policy",
    "fulfillment_policy",
  ];
  const own = Reflect.ownKeys(descriptors);
  if (
    own.some((key) => typeof key !== "string" || !allowed.has(key)) ||
    required.some((key) => !Object.hasOwn(descriptors, key))
  ) {
    throw new Error("auto_claim_invocation_invalid");
  }
  const read = (key: string): unknown => {
    const descriptor = descriptors[key];
    if (!descriptor) return undefined;
    if (
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      throw new Error("auto_claim_invocation_accessor_forbidden");
    }
    return descriptor.value;
  };

  const rootDir = read("root_dir");
  const apply = read("apply");
  const confirmation = read("confirmation");
  const nowMs = read("now_ms");
  const transport = read("transport");
  if (
    typeof rootDir !== "string" ||
    rootDir.trim().length < 1 ||
    (apply !== undefined && typeof apply !== "boolean") ||
    (confirmation !== undefined && typeof confirmation !== "string") ||
    (nowMs !== undefined &&
      (!Number.isSafeInteger(nowMs) || Number(nowMs) <= 0))
  ) {
    throw new Error("auto_claim_invocation_invalid");
  }

  if (transport !== undefined) {
    if (
      !transport ||
      typeof transport !== "object" ||
      utilTypes.isProxy(transport)
    ) {
      throw new Error("auto_claim_transport_invalid");
    }
    const transportPrototype = Object.getPrototypeOf(transport);
    if (transportPrototype && utilTypes.isProxy(transportPrototype)) {
      throw new Error("auto_claim_transport_invalid");
    }
    const callDescriptor =
      Object.getOwnPropertyDescriptor(transport, "call") ||
      (
        transportPrototype
          ? Object.getOwnPropertyDescriptor(transportPrototype, "call")
          : undefined
      );
    if (
      !callDescriptor ||
      !Object.hasOwn(callDescriptor, "value") ||
      typeof callDescriptor.value !== "function"
    ) {
      throw new Error("auto_claim_transport_invalid");
    }
  }

  return Object.freeze({
    request: snapshotAutoClaimJsonObjectV1<BuyVoidAutoClaimRequestV1>(
      read("request"),
      "auto_claim_request",
    ) as BuyVoidAutoClaimRequestV1,
    root_dir: rootDir,
    worker_policy:
      snapshotAutoClaimJsonObjectV1<BuyVoidAutoClaimWorkerPolicyV1>(
        read("worker_policy"),
        "auto_claim_worker_policy",
      ) as BuyVoidAutoClaimWorkerPolicyV1,
    observer_policy:
      snapshotAutoClaimJsonObjectV1<BuyVoidPaymentRpcObserverPolicyV1>(
        read("observer_policy"),
        "auto_claim_observer_policy",
      ) as BuyVoidPaymentRpcObserverPolicyV1,
    verification_policy:
      snapshotAutoClaimJsonObjectV1<BuyVoidVerifiedPaymentPolicyV2>(
        read("verification_policy"),
        "auto_claim_verification_policy",
      ) as BuyVoidVerifiedPaymentPolicyV2,
    fulfillment_policy:
      snapshotAutoClaimJsonObjectV1<BuyVoidAutoFulfillmentPolicyV1>(
        read("fulfillment_policy"),
        "auto_claim_fulfillment_policy",
      ) as BuyVoidAutoFulfillmentPolicyV1,
    apply: apply === true,
    confirmation,
    now_ms: nowMs as number | undefined,
    transport: transport as BuyVoidPaymentRpcTransportV1 | undefined,
  });
}

function decimalToUnits(
  value: unknown,
  decimals = 6,
): bigint | null {
  const raw = String(value ?? "").trim();
  if (!raw || !/^[0-9]+(?:\.[0-9]+)?$/.test(raw)) {
    return null;
  }

  const [whole, fraction = ""] = raw.split(".");
  if (fraction.length > decimals) return null;

  try {
    return (
      BigInt(whole) * 10n ** BigInt(decimals) +
      BigInt(fraction.padEnd(decimals, "0") || "0")
    );
  } catch {
    return null;
  }
}

function parsePositiveInteger(value: unknown): bigint | null {
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function validateWorkerPolicy(
  request: BuyVoidAutoClaimRequestV1,
  policy: BuyVoidAutoClaimWorkerPolicyV1,
): BuyVoidAutoClaimWorkerDecisionV1 | null {
  if (policy?.enabled !== true) {
    return held("worker_policy", false, "auto_claim_worker_disabled");
  }

  if (
    policy.accepted_request_status !==
    "payment_submitted_pending_manual_review"
  ) {
    return held(
      "worker_policy",
      false,
      "invalid_auto_claim_request_status_policy",
    );
  }

  const requestStatus = String(request?.status || "").trim();
  if (requestStatus !== policy.accepted_request_status) {
    return held(
      "worker_policy",
      false,
      "request_not_pending_payment_review",
      {
        expected_status: policy.accepted_request_status,
        observed_status: requestStatus,
      },
    );
  }

  const requestVoidUnits = decimalToUnits(
    request?.quoted_void,
    6,
  );
  const maximum = parsePositiveInteger(
    policy.max_void_amount_units,
  );
  if (
    requestVoidUnits === null ||
    requestVoidUnits <= 0n ||
    maximum === null
  ) {
    return held(
      "worker_policy",
      false,
      "invalid_auto_claim_amount_policy",
    );
  }
  if (requestVoidUnits > maximum) {
    return held(
      "worker_policy",
      false,
      "auto_claim_amount_exceeds_policy",
      {
        request_void_amount_units:
          requestVoidUnits.toString(),
        max_void_amount_units: maximum.toString(),
      },
    );
  }

  return null;
}

export async function runBuyVoidAutoClaimWorkerV1(input: {
  request: BuyVoidAutoClaimRequestV1;
  root_dir: string;
  worker_policy: BuyVoidAutoClaimWorkerPolicyV1;
  observer_policy: BuyVoidPaymentRpcObserverPolicyV1;
  verification_policy: BuyVoidVerifiedPaymentPolicyV2;
  fulfillment_policy: BuyVoidAutoFulfillmentPolicyV1;
  apply?: boolean;
  confirmation?: unknown;
  now_ms?: number;
  transport?: BuyVoidPaymentRpcTransportV1;
}): Promise<BuyVoidAutoClaimWorkerDecisionV1> {
  let snapshot: ReturnType<typeof snapshotAutoClaimInvocationV1>;
  try {
    snapshot = snapshotAutoClaimInvocationV1(input);
  } catch {
    return held(
      "worker_policy",
      false,
      "auto_claim_input_snapshot_invalid",
    );
  }

  const workerHold = validateWorkerPolicy(
    snapshot.request,
    snapshot.worker_policy,
  );
  if (workerHold) return workerHold;

  if (
    snapshot.apply &&
    String(snapshot.confirmation || "") !==
      VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1
  ) {
    return held(
      "worker_policy",
      true,
      "explicit_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
      },
    );
  }

  const observation = await observeBuyVoidCanonicalRailPaymentV1({
    request: snapshot.request,
    policy: snapshot.observer_policy,
    ...(snapshot.transport ? { transport: snapshot.transport } : {}),
  });
  if ("reason" in observation) {
    const detail =
      "detail" in observation &&
      observation.detail &&
      typeof observation.detail === "object"
        ? observation.detail as Record<string, unknown>
        : "expected_chain_id" in observation &&
            observation.expected_chain_id
          ? {
              expected_chain_id:
                observation.expected_chain_id,
            }
          : undefined;
    return held(
      "payment_observation",
      snapshot.apply,
      observation.reason,
      detail,
    );
  }

  const chain = String(snapshot.request.source_chain || "")
    .trim()
    .toLowerCase();
  const verificationPolicy: BuyVoidVerifiedPaymentPolicyV2 = {
    ...snapshot.verification_policy,
    current_block_number_by_chain: {
      ...(snapshot.verification_policy
        ?.current_block_number_by_chain || {}),
      [chain]: observation.current_block_number,
    },
  };

  const verification = buildBuyVoidVerifiedPaymentEventV2({
    request: snapshot.request,
    receipt: observation.receipt,
    policy: verificationPolicy,
  });
  if ("reason" in verification) {
    return held(
      "payment_verification",
      snapshot.apply,
      verification.reason,
      verification.detail,
    );
  }

  if (!snapshot.apply) {
    let priorClaims;
    try {
      priorClaims = listBuyVoidFulfillmentJournalClaimsV1(
        snapshot.root_dir,
      ).map((intent) => intent.claim);
    } catch (error) {
      return held(
        "claim_journal",
        false,
        "claim_journal_read_failed",
        {
          error_class: String(
            (error as { name?: unknown })?.name || "Error",
          ).slice(0, 80),
        },
      );
    }

    const admission = decideBuyVoidAutoFulfillmentV1({
      request: snapshot.request,
      verified_payment_event: verification.event,
      policy: snapshot.fulfillment_policy,
      prior_claims: priorClaims,
    });
    if ("reason" in admission) {
      return held(
        "fulfillment_admission",
        false,
        admission.reason,
        admission.detail,
      );
    }

    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      observer: observation,
      verification,
      admission,
      required_confirmation:
        VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
    };
  }

  let journal: BuyVoidFulfillmentJournalDecisionV1;
  try {
    journal = claimBuyVoidFulfillmentJournalV1({
      root_dir: snapshot.root_dir,
      request: snapshot.request,
      verified_payment_event: verification.event,
      policy: snapshot.fulfillment_policy,
      now_ms: snapshot.now_ms,
    });
  } catch (error) {
    return held(
      "claim_journal",
      true,
      "claim_journal_write_failed",
      {
        error_class: String(
          (error as { name?: unknown })?.name || "Error",
        ).slice(0, 80),
      },
    );
  }
  if ("reason" in journal) {
    return held(
      "claim_journal",
      true,
      journal.reason,
      journal.detail,
    );
  }

  return {
    ok: true,
    status:
      journal.status === "duplicate"
        ? "duplicate"
        : "claimed",
    applied: true,
    mutation_performed: journal.new_claim,
    observer: observation,
    verification,
    journal,
    request_state_patch: {
      status: "payment_verified_fulfillment_claimed",
      payment_verified_at_ms: journal.intent.created_at_ms,
      canonical_payment_identity:
        journal.claim.canonical_payment_identity,
      fulfillment_instruction_id:
        journal.claim.instruction_id,
      fulfillment_claim_status: "claimed",
      automatic_delivery_started: false,
      signing_performed: false,
      transaction_broadcast: false,
    },
  };
}
