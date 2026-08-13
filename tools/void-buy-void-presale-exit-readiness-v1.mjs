export const VOID_BUY_VOID_PRESALE_EXIT_READINESS_V1 =
  "VOID_BUY_VOID_PRESALE_EXIT_READINESS_V1";

export const VOID_BUY_VOID_PRESALE_EXIT_READINESS_AUTHORITY_V1 =
  Object.freeze({
    read_only_classification: true,
    request_intake_mutation: false,
    inventory_mutation: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    money_movement: false,
    market_activation: false,
  });

const SAFE_POOL_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const SNAPSHOT_KEYS = Object.freeze([
  "available_void_units",
  "committed_void_units",
  "intake_enabled",
  "inventory_policy_version",
  "marker",
  "pool_capacity_void_units",
  "pool_id",
  "presale_open",
  "reservation_count",
  "schema",
  "sold_out",
]);

function fail(reason) {
  return Object.freeze({
    marker: VOID_BUY_VOID_PRESALE_EXIT_READINESS_V1,
    ok: false,
    status: "HOLD",
    accept_new_requests: false,
    reason,
    authority: VOID_BUY_VOID_PRESALE_EXIT_READINESS_AUTHORITY_V1,
  });
}

function parseNonNegativeInteger(value) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    return null;
  }
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function hasExactKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected);
}

export function classifyBuyVoidPresaleExitReadinessV1(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return fail("invalid_inventory_snapshot");
  }
  if (!hasExactKeys(snapshot, SNAPSHOT_KEYS)) {
    return fail("inventory_snapshot_shape_mismatch");
  }
  if (
    snapshot.schema !== "void_buy_void_inventory_aggregate_v1" ||
    snapshot.marker !== "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1"
  ) {
    return fail("inventory_snapshot_contract_mismatch");
  }
  if (
    typeof snapshot.pool_id !== "string" ||
    typeof snapshot.inventory_policy_version !== "string" ||
    !SAFE_POOL_ID.test(snapshot.pool_id) ||
    !SAFE_POOL_ID.test(snapshot.inventory_policy_version)
  ) {
    return fail("inventory_policy_identity_invalid");
  }
  if (
    typeof snapshot.intake_enabled !== "boolean" ||
    typeof snapshot.presale_open !== "boolean" ||
    typeof snapshot.sold_out !== "boolean" ||
    !Number.isSafeInteger(snapshot.reservation_count) ||
    snapshot.reservation_count < 0
  ) {
    return fail("inventory_snapshot_values_invalid");
  }

  const capacity = parseNonNegativeInteger(snapshot.pool_capacity_void_units);
  const committed = parseNonNegativeInteger(snapshot.committed_void_units);
  const available = parseNonNegativeInteger(snapshot.available_void_units);
  if (capacity === null || capacity === 0n || committed === null || available === null) {
    return fail("inventory_amount_invalid");
  }
  if (committed > capacity || available > capacity || committed + available !== capacity) {
    return fail("inventory_accounting_mismatch");
  }
  if (snapshot.sold_out !== (available === 0n)) {
    return fail("sold_out_flag_mismatch");
  }

  const base = {
    marker: VOID_BUY_VOID_PRESALE_EXIT_READINESS_V1,
    ok: true,
    pool_id: snapshot.pool_id,
    inventory_policy_version: snapshot.inventory_policy_version,
    pool_capacity_void_units: capacity.toString(),
    committed_void_units: committed.toString(),
    available_void_units: available.toString(),
    reservation_count: snapshot.reservation_count,
    authority: VOID_BUY_VOID_PRESALE_EXIT_READINESS_AUTHORITY_V1,
  };

  if (!snapshot.presale_open) {
    return Object.freeze({
      ...base,
      status: "CLOSED",
      accept_new_requests: false,
      reason: "presale_policy_closed",
    });
  }
  if (snapshot.sold_out) {
    return Object.freeze({
      ...base,
      status: "SOLD_OUT",
      accept_new_requests: false,
      reason: "inventory_exhausted",
    });
  }
  if (!snapshot.intake_enabled) {
    return Object.freeze({
      ...base,
      status: "HOLD",
      accept_new_requests: false,
      reason: "request_intake_disabled",
    });
  }
  return Object.freeze({
    ...base,
    status: "OPEN",
    accept_new_requests: true,
    reason: "inventory_available",
  });
}
