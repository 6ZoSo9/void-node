import {
  buyVoidConfirmedCloseoutRuntimeRootDirV1,
} from "./buy_void_confirmed_closeout_runtime_v1.js";
import {
  listBuyVoidConfirmedStatesV1,
} from "./buy_void_confirmed_state_journal_v1.js";

export const VOID_BUY_VOID_MANUAL_FULFILLED_CONFIRMED_STATE_GATE_V1 =
  "VOID_BUY_VOID_MANUAL_FULFILLED_CONFIRMED_STATE_GATE_V1";

export type BuyVoidManualFulfilledConfirmedStateGateResultV1 =
  | {
      ok: true;
      status_code: 200;
      body: Record<string, any>;
    }
  | {
      ok: false;
      status_code: 409 | 503;
      body: Record<string, unknown>;
    };

export default async function evaluateBuyVoidManualFulfilledConfirmedStateGateV1(
  found: any,
  id: string,
  operator_status: string,
  note: string,
  void_delivery_tx_hash: string,
  __voidReadBuyVoidOperatorEventsV1: () => Promise<any[]>,
  __voidApplyBuyVoidOperatorEventsV1: (
    requests: any[],
    events: any[],
  ) => any[],
  __voidWriteBuyVoidOperatorEventV1: (
    event: Record<string, any>,
  ) => Promise<unknown>,
): Promise<BuyVoidManualFulfilledConfirmedStateGateResultV1> {

  let effective_prior_status = "";
  try {
    const projected_request =
      __voidApplyBuyVoidOperatorEventsV1(
        [found],
        await __voidReadBuyVoidOperatorEventsV1(),
      )[0] || found;
    effective_prior_status = String(
      projected_request?.effective_status || found.status || "",
    )
      .trim()
      .toLowerCase();
  } catch (error: any) {
    return {
      ok: false,
      status_code: 503,
      body: {
        schema: "void_buy_void_operator_mark_v1",
        ok: false,
        error: "operator_event_projection_read_failed",
        request_id: id,
        operator_status,
        void_delivery_tx_hash,
        message: String(error?.message || error).slice(0, 240),
      },
    };
  }

  let canonical_confirmed_state: any = null;
  if (operator_status === "fulfilled") {
    if (effective_prior_status === "fulfilled") {
      return {
        ok: false,
        status_code: 409,
        body: {
          schema: "void_buy_void_operator_mark_v1",
          ok: false,
          error: "manual_fulfilled_already_recorded",
          request_id: id,
          operator_status,
          void_delivery_tx_hash,
          prior_status: effective_prior_status,
        },
      };
    }

    if (!["payment_verified", "reviewed"].includes(effective_prior_status)) {
      return {
        ok: false,
        status_code: 409,
        body: {
          schema: "void_buy_void_operator_mark_v1",
          ok: false,
          error: "manual_fulfilled_requires_verified_public_status",
          request_id: id,
          operator_status,
          void_delivery_tx_hash,
          prior_status: effective_prior_status,
          allowed_prior_statuses: ["payment_verified", "reviewed"],
        },
      };
    }

    let confirmed_states: any[] = [];
    try {
      confirmed_states = listBuyVoidConfirmedStatesV1(
        buyVoidConfirmedCloseoutRuntimeRootDirV1(),
      );
    } catch (error: any) {
      return {
        ok: false,
        status_code: 503,
        body: {
          schema: "void_buy_void_operator_mark_v1",
          ok: false,
          error: "canonical_confirmed_state_read_failed",
          request_id: id,
          operator_status,
          void_delivery_tx_hash,
          canonical_confirmed_state_required: true,
          message: String(error?.message || error).slice(0, 240),
        },
      };
    }

    const normalized_delivery_tx_hash = void_delivery_tx_hash
      .trim()
      .toLowerCase();
    const expected_delivery_address = String(
      found?.delivery_address || "",
    )
      .trim()
      .toLowerCase();

    const matching_confirmed_states = confirmed_states.filter(
      (state: any) => {
        const state_request_id = String(state?.request_id || "").trim();
        const confirmation_request_id = String(
          state?.confirmation?.request_id || "",
        ).trim();
        const buyer_request_id = String(
          state?.buyer_status?.request_id || "",
        ).trim();
        const allocation_request_id = String(
          state?.allocation_status?.request_id || "",
        ).trim();
        const confirmation_tx = String(
          state?.confirmation?.void_delivery_tx_hash || "",
        )
          .trim()
          .toLowerCase();
        const receipt_tx = String(
          state?.fulfillment_receipt?.void_delivery_tx_hash || "",
        )
          .trim()
          .toLowerCase();
        const buyer_tx = String(
          state?.buyer_status?.void_delivery_tx_hash || "",
        )
          .trim()
          .toLowerCase();
        const confirmation_delivery_address = String(
          state?.confirmation?.delivery_address || "",
        )
          .trim()
          .toLowerCase();
        const receipt_delivery_address = String(
          state?.fulfillment_receipt?.delivery_address || "",
        )
          .trim()
          .toLowerCase();
        const buyer_delivery_address = String(
          state?.buyer_status?.delivery_address || "",
        )
          .trim()
          .toLowerCase();
        const state_payment_identity = String(
          state?.canonical_payment_identity || "",
        ).trim();
        const confirmation_payment_identity = String(
          state?.confirmation?.canonical_payment_identity || "",
        ).trim();
        const allocation_payment_identity = String(
          state?.allocation_status?.canonical_payment_identity || "",
        ).trim();

        return (
          state?.schema === "void_buy_void_confirmed_state_v1" &&
          state?.marker ===
            "VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1" &&
          state?.confirmation?.schema ===
            "void_buy_void_confirmed_fulfillment_record_v1" &&
          state?.confirmation?.marker ===
            "VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1" &&
          state?.buyer_status?.schema ===
            "void_buy_void_buyer_fulfilled_status_v1" &&
          state?.allocation_status?.schema ===
            "void_buy_void_allocation_fulfilled_status_v1" &&
          state?.fulfillment_receipt?.schema ===
            "void_buy_void_fulfillment_receipt_v1" &&
          /^[0-9a-f]{64}$/.test(String(state?.state_id || "")) &&
          /^[0-9a-f]{64}$/.test(
            String(state?.projection_fingerprint || ""),
          ) &&
          state_request_id === id &&
          confirmation_request_id === id &&
          buyer_request_id === id &&
          allocation_request_id === id &&
          confirmation_tx === normalized_delivery_tx_hash &&
          receipt_tx === normalized_delivery_tx_hash &&
          buyer_tx === normalized_delivery_tx_hash &&
          /^0x[0-9a-f]{40}$/.test(expected_delivery_address) &&
          confirmation_delivery_address === expected_delivery_address &&
          receipt_delivery_address === expected_delivery_address &&
          buyer_delivery_address === expected_delivery_address &&
          state_payment_identity.length > 0 &&
          confirmation_payment_identity === state_payment_identity &&
          allocation_payment_identity === state_payment_identity &&
          state?.confirmation?.status === "fulfilled_confirmed" &&
          state?.confirmation?.buyer_fulfilled === true &&
          state?.confirmation?.automatic_fulfillment_completed === true &&
          state?.confirmation?.payment_claim_persisted === true &&
          state?.confirmation?.delivery_confirmation_observed === true &&
          state?.confirmation?.signing_authorized_by_this_module ===
            false &&
          state?.confirmation
            ?.transaction_broadcast_authorized_by_this_module === false &&
          state?.confirmation?.money_movement_authorized_by_this_module ===
            false &&
          state?.buyer_status?.status === "fulfilled_confirmed" &&
          state?.buyer_status?.buyer_fulfilled === true &&
          state?.allocation_status?.status === "fulfilled_confirmed" &&
          state?.allocation_status?.allocation_fulfilled === true &&
          state?.fulfillment_receipt?.status === "confirmed" &&
          state?.signing_authorized_by_this_module === false &&
          state?.transaction_broadcast_authorized_by_this_module ===
            false &&
          state?.money_movement_authorized_by_this_module === false
        );
      },
    );

    if (matching_confirmed_states.length !== 1) {
      return {
        ok: false,
        status_code: 409,
        body: {
          schema: "void_buy_void_operator_mark_v1",
          ok: false,
          error:
            matching_confirmed_states.length > 1
              ? "manual_fulfilled_confirmed_state_ambiguous"
              : "manual_fulfilled_requires_canonical_confirmed_state",
          request_id: id,
          operator_status,
          void_delivery_tx_hash,
          prior_status: effective_prior_status,
          canonical_confirmed_state_required: true,
          canonical_confirmed_state_match_count:
            matching_confirmed_states.length,
        },
      };
    }

    canonical_confirmed_state = matching_confirmed_states[0];
  }

  const event = {
    schema: "void_buy_void_operator_mark_v1",
    ok: true,
    request_id: id,
    operator_status,
    note,
    marked_at_ms: Date.now(),
    prior_status: effective_prior_status,
    tx_hash: found.tx_hash || "",
    void_delivery_tx_hash:
      operator_status === "fulfilled"
        ? String(
            canonical_confirmed_state
              ?.fulfillment_receipt
              ?.void_delivery_tx_hash || "",
          )
            .trim()
            .toLowerCase()
        : "",
    canonical_confirmed_state_id:
      operator_status === "fulfilled"
        ? String(canonical_confirmed_state?.state_id || "")
        : "",
    canonical_confirmed_state_fingerprint:
      operator_status === "fulfilled"
        ? String(
            canonical_confirmed_state?.projection_fingerprint || "",
          )
        : "",
    fulfillment_receipt_required: operator_status === "fulfilled",
    usdc_amount: found.usdc_amount,
    quoted_void: found.quoted_void,
  };

  await __voidWriteBuyVoidOperatorEventV1(event);
  return {
    ok: true,
    status_code: 200,
    body: event,
  };
}
