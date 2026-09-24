import crypto from "node:crypto";

import {
  verifyBuyVoidHistoryCarrierRootV1,
  verifyBuyVoidHistoryCarrierSuccessorV1,
  verifyBuyVoidHistoryCarrierTxIntentBindingV1,
  type BuyVoidHistoryCarrierCommitPlanV1,
} from "./buy_void_history_carrier_v1.js";
import {
  publishBuyVoidHistoryCarrierRootSuccessorV1,
  readBuyVoidHistoryCarrierRootAuthoritySnapshotV1,
  type BuyVoidHistoryCarrierAuthorityPublishReceiptV1,
  type BuyVoidHistoryCarrierAuthoritySnapshotV1,
} from "./buy_void_history_carrier_root_authority_v1.js";

export const VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1 =
  "VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1";

export const VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1 =
  "publishBuyVoidHistoryCarrierSuccessorV1";

export const VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_gate: true,
    production_authority_required: true,
    exact_predecessor_required: true,
    exact_transition_kind_required: true,
    exact_page_set_required: true,
    tx_intent_binding_revalidated: true,
    carrier_root_revalidated: true,
    dry_run_required_before_apply: true,
    exact_confirmation_required: true,
    publication_fingerprint_required: true,
    default_publisher_reuses_durable_carrier_authority: true,
    duplicate_publication_idempotent: true,
    reservation_transition_supported: true,
    paid_unreservable_obligation_transition_supported: true,
    history_refresh_transition_supported: true,
    segmented_successor_witness_producer_mounted: false,
    reservation_lifecycle_mount: false,
    paid_unreservable_obligation_lifecycle_mount: false,
    terminal_closeout_refresh_mount: false,
    runtime_activation_ready: false,
    runtime_enablement: false,
    apply_enablement: false,
    public_activation: false,
    service_action: false,
    credential_content_read: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_mutation: false,
    treasury_or_liquidity_action: false,
    funds_movement: false,
    automatic_retry: false,
  });

export type BuyVoidHistoryCarrierSuccessorPublicationTransitionV1 =
  | "reservation"
  | "paid_unreservable_obligation"
  | "history_refresh";

export type BuyVoidHistoryCarrierSuccessorPublicationDependenciesV1 = {
  read_authority_snapshot?:
    typeof readBuyVoidHistoryCarrierRootAuthoritySnapshotV1;
  publish_successor?:
    typeof publishBuyVoidHistoryCarrierRootSuccessorV1;
};

export type BuyVoidHistoryCarrierSuccessorPublicationInputV1 = {
  authority_root: string;
  transition: BuyVoidHistoryCarrierSuccessorPublicationTransitionV1;
  expected_current_carrier_root_sha256: string;
  plan: BuyVoidHistoryCarrierCommitPlanV1;
  apply?: boolean;
  confirmation?: unknown;
  publication_fingerprint_sha256?: unknown;
  dependencies?: BuyVoidHistoryCarrierSuccessorPublicationDependenciesV1;
};

export type BuyVoidHistoryCarrierSuccessorPublicationDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      marker:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1;
      version: 1;
      transition: BuyVoidHistoryCarrierSuccessorPublicationTransitionV1;
      carrier_generation: number;
      carrier_root_sha256: string;
      tx_intent_sha256: string;
      new_page_count: number;
      publication_fingerprint_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1;
      mutation_performed: false;
      runtime_activation_authorized: false;
      apply_activation_authorized: false;
      public_activation_authorized: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1;
    }
  | {
      ok: true;
      status: "created" | "duplicate";
      applied: true;
      marker:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1;
      version: 1;
      transition: BuyVoidHistoryCarrierSuccessorPublicationTransitionV1;
      carrier_generation: number;
      carrier_root_sha256: string;
      tx_intent_sha256: string;
      new_page_count: number;
      publication_fingerprint_sha256: string;
      receipt: BuyVoidHistoryCarrierAuthorityPublishReceiptV1;
      mutation_performed: boolean;
      runtime_activation_authorized: false;
      apply_activation_authorized: false;
      public_activation_authorized: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      marker:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1;
      version: 1;
      stage:
        | "input"
        | "authority"
        | "plan"
        | "confirmation"
        | "publish"
        | "post_publish";
      reason: string;
      mutation_performed: boolean;
      runtime_activation_authorized: false;
      apply_activation_authorized: false;
      public_activation_authorized: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
      authority:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1;
    };

const SHA256 = /^[0-9a-f]{64}$/u;
const POOL_ID = "buy-void-presale-v1";

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("non_canonical_number");
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("non_canonical_value");
}

function held(
  applied: boolean,
  stage: Extract<
    BuyVoidHistoryCarrierSuccessorPublicationDecisionV1,
    { ok: false }
  >["stage"],
  reason: string,
  options: {
    mutation_performed?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<
  BuyVoidHistoryCarrierSuccessorPublicationDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    applied,
    marker:
      VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1,
    version: 1,
    stage,
    reason,
    mutation_performed:
      options.mutation_performed === true,
    runtime_activation_authorized: false,
    apply_activation_authorized: false,
    public_activation_authorized: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
    authority:
      VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1,
  };
}

function transition(
  value: unknown,
): BuyVoidHistoryCarrierSuccessorPublicationTransitionV1 | null {
  return value === "reservation" ||
    value === "paid_unreservable_obligation" ||
    value === "history_refresh"
    ? value
    : null;
}

function validateAuthoritySnapshot(
  snapshot: BuyVoidHistoryCarrierAuthoritySnapshotV1,
  expectedCurrent: string,
):
  | { ok: true }
  | { ok: false; reason: string } {
  if (
    snapshot.mode !== "production" ||
    snapshot.pool_id !== POOL_ID ||
    !SHA256.test(snapshot.authority_id) ||
    !Number.isSafeInteger(snapshot.carrier_generation) ||
    snapshot.carrier_generation < 1 ||
    snapshot.verified_generation_count !==
      snapshot.carrier_generation ||
    !SHA256.test(snapshot.current_generation_record_id) ||
    snapshot.page_publication_complete !== true ||
    snapshot.missing_page_digests.length !== 0 ||
    snapshot.runtime_activation_authorized !== false ||
    snapshot.apply_activation_authorized !== false ||
    snapshot.public_activation_authorized !== false
  ) {
    return {
      ok: false,
      reason:
        "history_carrier_successor_authority_snapshot_invalid",
    };
  }
  if (
    snapshot.current_carrier_root_sha256 !== expectedCurrent ||
    snapshot.current_root.carrier_root_sha256 !== expectedCurrent
  ) {
    return {
      ok: false,
      reason:
        "history_carrier_successor_current_root_changed",
    };
  }
  return { ok: true };
}

function validatePlan(
  wantedTransition:
    BuyVoidHistoryCarrierSuccessorPublicationTransitionV1,
  snapshot: BuyVoidHistoryCarrierAuthoritySnapshotV1,
  plan: BuyVoidHistoryCarrierCommitPlanV1,
):
  | {
      ok: true;
      carrier_root: Extract<
        BuyVoidHistoryCarrierCommitPlanV1,
        { status: "planned" }
      >["carrier_root"];
      tx_intent: Extract<
        BuyVoidHistoryCarrierCommitPlanV1,
        { status: "planned" }
      >["tx_intent"];
      new_pages: Extract<
        BuyVoidHistoryCarrierCommitPlanV1,
        { status: "planned" }
      >["new_pages"];
    }
  | { ok: false; reason: string } {
  if (!plan || plan.status !== "planned") {
    return {
      ok: false,
      reason:
        "history_carrier_successor_planned_transition_required",
    };
  }

  let root;
  let binding;
  try {
    root = verifyBuyVoidHistoryCarrierRootV1(
      plan.carrier_root,
    );
    verifyBuyVoidHistoryCarrierSuccessorV1(
      snapshot.current_root,
      root,
    );
    binding =
      verifyBuyVoidHistoryCarrierTxIntentBindingV1(
        plan.tx_intent,
        root,
      );
  } catch {
    return {
      ok: false,
      reason:
        "history_carrier_successor_plan_verification_failed",
    };
  }

  if (
    root.previous_carrier_root_sha256 !==
      snapshot.current_carrier_root_sha256 ||
    root.carrier_generation !==
      snapshot.carrier_generation + 1 ||
    root.pool_id !== POOL_ID ||
    root.committing_record_kind !== wantedTransition ||
    binding.intent.tx_intent_sha256 !==
      plan.tx_intent.tx_intent_sha256
  ) {
    return {
      ok: false,
      reason:
        "history_carrier_successor_plan_binding_invalid",
    };
  }

  if (
    wantedTransition === "history_refresh" &&
    root.committing_record_void_units !== "0"
  ) {
    return {
      ok: false,
      reason:
        "history_carrier_successor_refresh_units_nonzero",
    };
  }
  if (
    wantedTransition !== "history_refresh" &&
    BigInt(root.committing_record_void_units) <= 0n
  ) {
    return {
      ok: false,
      reason:
        "history_carrier_successor_primary_units_invalid",
    };
  }

  const wantedPages =
    [...plan.tx_intent.new_page_digests].sort();
  const suppliedPages =
    plan.new_pages
      .map((page) => page.sha256)
      .sort();
  if (
    canonicalJson(wantedPages) !==
      canonicalJson(suppliedPages)
  ) {
    return {
      ok: false,
      reason:
        "history_carrier_successor_page_set_invalid",
    };
  }

  return {
    ok: true,
    carrier_root: root,
    tx_intent: binding.intent,
    new_pages: plan.new_pages,
  };
}

function publicationFingerprint(input: {
  authority_id: string;
  transition:
    BuyVoidHistoryCarrierSuccessorPublicationTransitionV1;
  current_carrier_root_sha256: string;
  carrier_root_sha256: string;
  tx_intent_sha256: string;
  new_page_digests: string[];
}): string {
  return sha256(
    canonicalJson({
      marker:
        VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1,
      version: 1,
      authority_id: input.authority_id,
      transition: input.transition,
      current_carrier_root_sha256:
        input.current_carrier_root_sha256,
      carrier_root_sha256:
        input.carrier_root_sha256,
      tx_intent_sha256:
        input.tx_intent_sha256,
      new_page_digests:
        [...input.new_page_digests].sort(),
    }),
  );
}

export function runBuyVoidHistoryCarrierSuccessorPublicationV1(
  input: BuyVoidHistoryCarrierSuccessorPublicationInputV1,
): BuyVoidHistoryCarrierSuccessorPublicationDecisionV1 {
  const applied = input?.apply === true;
  const authorityRoot = text(input?.authority_root);
  const wantedTransition = transition(input?.transition);
  const expectedCurrent =
    text(
      input?.expected_current_carrier_root_sha256,
    ).toLowerCase();

  if (
    !authorityRoot ||
    !wantedTransition ||
    !SHA256.test(expectedCurrent)
  ) {
    return held(
      applied,
      "input",
      "history_carrier_successor_input_invalid",
    );
  }

  const deps = {
    read_authority_snapshot:
      input.dependencies?.read_authority_snapshot ||
      readBuyVoidHistoryCarrierRootAuthoritySnapshotV1,
    publish_successor:
      input.dependencies?.publish_successor ||
      publishBuyVoidHistoryCarrierRootSuccessorV1,
  };

  let snapshot: BuyVoidHistoryCarrierAuthoritySnapshotV1;
  try {
    snapshot =
      deps.read_authority_snapshot({
        authority_root: authorityRoot,
      });
  } catch (error) {
    return held(
      applied,
      "authority",
      "history_carrier_successor_authority_read_failed",
      {
        detail: {
          error_class:
            text((error as Error)?.name || "Error"),
        },
      },
    );
  }

  const authorityCheck =
    validateAuthoritySnapshot(
      snapshot,
      expectedCurrent,
    );
  if (authorityCheck.ok === false) {
    return held(
      applied,
      "authority",
      authorityCheck.reason,
    );
  }

  const planCheck =
    validatePlan(
      wantedTransition,
      snapshot,
      input.plan,
    );
  if (planCheck.ok === false) {
    return held(
      applied,
      "plan",
      planCheck.reason,
    );
  }

  const fingerprint =
    publicationFingerprint({
      authority_id: snapshot.authority_id,
      transition: wantedTransition,
      current_carrier_root_sha256:
        snapshot.current_carrier_root_sha256,
      carrier_root_sha256:
        planCheck.carrier_root.carrier_root_sha256,
      tx_intent_sha256:
        planCheck.tx_intent.tx_intent_sha256,
      new_page_digests:
        planCheck.tx_intent.new_page_digests,
    });

  if (!applied) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      marker:
        VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1,
      version: 1,
      transition: wantedTransition,
      carrier_generation:
        planCheck.carrier_root.carrier_generation,
      carrier_root_sha256:
        planCheck.carrier_root.carrier_root_sha256,
      tx_intent_sha256:
        planCheck.tx_intent.tx_intent_sha256,
      new_page_count: planCheck.new_pages.length,
      publication_fingerprint_sha256: fingerprint,
      required_confirmation:
        VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1,
      mutation_performed: false,
      runtime_activation_authorized: false,
      apply_activation_authorized: false,
      public_activation_authorized: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
      authority:
        VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1,
    };
  }

  if (
    text(input.confirmation) !==
      VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1 ||
    text(input.publication_fingerprint_sha256).toLowerCase() !==
      fingerprint
  ) {
    return held(
      true,
      "confirmation",
      "history_carrier_successor_exact_confirmation_required",
      {
        detail: {
          required_confirmation:
            VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1,
          required_publication_fingerprint_sha256:
            fingerprint,
        },
      },
    );
  }

  let receipt: BuyVoidHistoryCarrierAuthorityPublishReceiptV1;
  try {
    receipt =
      deps.publish_successor({
        authority_root: authorityRoot,
        expected_current_carrier_root_sha256:
          expectedCurrent,
        next_root: planCheck.carrier_root,
        tx_intent: planCheck.tx_intent,
        new_pages:
          planCheck.new_pages.map((page) => ({
            sha256: page.sha256,
            bytes: Buffer.from(page.bytes),
          })),
      });
  } catch (error) {
    return held(
      true,
      "publish",
      "history_carrier_successor_publish_failed",
      {
        detail: {
          error_class:
            text((error as Error)?.name || "Error"),
        },
      },
    );
  }

  if (
    (receipt.status !== "created" &&
      receipt.status !== "duplicate") ||
    receipt.carrier_root_sha256 !==
      planCheck.carrier_root.carrier_root_sha256 ||
    receipt.carrier_generation !==
      planCheck.carrier_root.carrier_generation ||
    receipt.snapshot.current_carrier_root_sha256 !==
      planCheck.carrier_root.carrier_root_sha256 ||
    receipt.snapshot.current_generation_record_id !==
      receipt.generation_record_id ||
    receipt.snapshot.carrier_generation !==
      receipt.carrier_generation ||
    receipt.snapshot.page_publication_complete !== true ||
    receipt.runtime_activation_authorized !== false ||
    receipt.apply_activation_authorized !== false ||
    receipt.public_activation_authorized !== false ||
    receipt.transaction_broadcast !== false ||
    receipt.chain2050_write !== false ||
    receipt.funds_movement !== false
  ) {
    return held(
      true,
      "post_publish",
      "history_carrier_successor_publish_receipt_invalid",
      {
        mutation_performed:
          receipt.mutation_performed === true,
      },
    );
  }

  return {
    ok: true,
    status: receipt.status,
    applied: true,
    marker:
      VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1,
    version: 1,
    transition: wantedTransition,
    carrier_generation:
      planCheck.carrier_root.carrier_generation,
    carrier_root_sha256:
      planCheck.carrier_root.carrier_root_sha256,
    tx_intent_sha256:
      planCheck.tx_intent.tx_intent_sha256,
    new_page_count: planCheck.new_pages.length,
    publication_fingerprint_sha256: fingerprint,
    receipt,
    mutation_performed:
      receipt.mutation_performed === true,
    runtime_activation_authorized: false,
    apply_activation_authorized: false,
    public_activation_authorized: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1,
  };
}
