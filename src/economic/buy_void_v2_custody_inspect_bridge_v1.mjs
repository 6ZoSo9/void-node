// Unmounted read-only bridge from an authenticated V2 payment preflight to
// the EXISTING custody-V2 inspect-only Unix protocol. Deliberately incapable
// of reserve/recover, payment persistence or public activation.
import {
  stageAuthenticatedBuyVoidVerifiedPaymentV2,
} from "../../dist/economic/buy_void_verified_payment_v2_allocation_stage.js";
import {
  inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1,
} from "../../tools/void-buy-allocation-custody-inspect-client-v1.mjs";

export const VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE =
  "VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE";

export const VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE_AUTHORITY =
  Object.freeze({
    source_only_unmounted: true,
    existing_private_bearer_auth_before_ipc: true,
    canonical_allocation_plan_before_ipc: true,
    payment_instruction_amount_bound_before_ipc: true,
    canonical_first_request_lineage_preflight_before_ipc: true,
    request_history_source_authenticated: false,
    inspect_only_unix_socket_client: true,
    customer_or_payment_fields_sent_to_socket: false,
    reserved_payment_identity_transmitted: false,
    socket_peer_credentials_authenticated: false,
    installed_cross_uid_roles_verified: false,
    custody_reserve_or_recover_enabled: false,
    durable_payment_append: false,
    allocation_write: false,
    payment_acceptance: false,
    presale_activation: false,
    funds_movement: false,
  });

function hold(reason, inspected = false) {
  return Object.freeze({
    marker: VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE,
    ok: false,
    status: "hold",
    reason,
    custody_inspect_reply_validated: inspected,
    socket_peer_credentials_authenticated: false,
    installed_cross_uid_roles_verified: false,
    custody_reserve_or_recover_enabled: false,
    payment_capacity_lock_verified: false,
    durable_payment_append: false,
    allocation_write: false,
    payment_acceptance: false,
    presale_activation: false,
    funds_movement: false,
  });
}

// The caller must supply only qualified server-owned values. HTTP req.body,
// req.query and any caller-named private path are never used by this module.
// A successful socket round-trip is *observation only*, not custody identity.
export async function inspectAuthenticatedBuyVoidV2CustodyBoundary(
  req, res, serverStageInput, serverLineageHistory, serverSocketConfig,
) {
  const staged = stageAuthenticatedBuyVoidVerifiedPaymentV2(
    req, res, serverStageInput, serverLineageHistory,
  );
  if (staged === null) {
    // The transport gate has already returned its private denial.
    // Do not even examine the socket configuration after failed auth.
    return null;
  }
  if (staged.status !== "staged_unmounted" ||
      staged.kind !== "verified_payment_allocation_handoff" ||
      staged.payment_acceptance !== false ||
      staged.mounted_verified_allocation_dispatch !== false ||
      staged.payment_instruction_amount_bound !== true ||
      staged.canonical_first_request_lineage_preflight_verified !== true ||
      staged.request_history_source_authenticated !== false ||
      staged.source_finality_authentication_verified !== false ||
      staged.cross_uid_service_authenticated !== false) {
    return hold("staged_identity_or_authority_unqualified");
  }
  const inspected =
    await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1(serverSocketConfig);
  if (inspected?.ok !== true ||
      inspected.status !== "source_inspected" ||
      inspected.operation_performed !== false ||
      inspected.allocation_write !== false ||
      inspected.socket_peer_credentials_authenticated !== false ||
      inspected.cross_uid_principal_separation_verified !== false ||
      inspected.protected_custody_verified !== false ||
      inspected.payment_acceptance !== false ||
      inspected.production_gate_ready !== false ||
      inspected.funds_movement !== false) {
    return hold("custody_inspection_unqualified");
  }
  // A valid inspect response NEVER approves a reservation or identifies the
  // OS peer. No payment IDs, wallets, prices or customer bytes leave via IPC.
  return hold("custody_inspection_only_no_reservation_authority", true);
}
