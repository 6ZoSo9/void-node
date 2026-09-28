#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CENSUS_CLOSEOUT_V1 =
  "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CENSUS_CLOSEOUT_V1";
export const EXPECTED_CLOSEOUT_ID =
  "voidepoch2census1_32bc149b0e7049dbcb22d6fa9485146b29e8ba2652ecfc5db0fa4cf224e31e14";

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
    .join(",") + "}";
}
function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
function fail(reason) {
  throw new Error(reason);
}

export function verifyVoidEconomicEpoch2SignedArtifactCensusCloseoutV1(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("closeout_object_required");
  }
  const { closeout_id: closeoutId, ...body } = input;
  if (
    closeoutId !== "voidepoch2census1_" + sha256(canonical(body)) ||
    closeoutId !== EXPECTED_CLOSEOUT_ID
  ) fail("closeout_id_invalid");

  if (
    input.marker !== VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CENSUS_CLOSEOUT_V1 ||
    input.version !== 1 ||
    input.status !== "SIGNED_ARTIFACT_CENSUS_COMPLETE_REPLAY_FENCE_HOLD" ||
    input.chain_id !== 2050 ||
    input.source_execution_epoch !== 1 ||
    input.successor_execution_epoch !== 2
  ) fail("closeout_identity_invalid");

  const p = input.precision_receipt_bound_sweep;
  if (
    p?.receipt_stamp !== "20260928T162432Z" ||
    p?.receipt_count !== 797 ||
    p?.discovered_file_count !== 53670 ||
    p?.signed_chain2050_transaction_count !== 3 ||
    p?.stale_signed_chain2050_transaction_count !== 3 ||
    p?.requires_operator_followup_count !== 0 ||
    p?.full_receipt_bound_content_sweep_complete !== true
  ) fail("precision_sweep_binding_mismatch");

  const n = input.nimo_receipt_bound_sweep;
  if (
    n?.metadata_receipt_stamp !== "20260928T233909Z" ||
    n?.metadata_receipt_count !== 5 ||
    n?.metadata_receipt_set_sha256 !== "449a1f8757f210b739d87d6aad53f772ccd86014417bd5860db283f1906ec95d" ||
    n?.metadata_discovered_file_count !== 134 ||
    n?.derived_nonsecret_file_count !== 133 ||
    n?.derived_receipt_set_sha256 !== "089fbf5762b02bbec3633d32441e1b90f9bda886e515c97a7b2c26f7626991d3" ||
    n?.content_manifest_sha256 !== "b21f766affc7d76dca33d722a5b70737906960b5e5544ccd5fda45014d6b73f4" ||
    n?.signed_chain2050_transaction_count !== 3 ||
    n?.stale_signed_chain2050_transaction_count !== 3 ||
    n?.requires_operator_followup_count !== 0 ||
    n?.full_receipt_bound_content_sweep_complete !== true ||
    !Array.isArray(n?.transactions) ||
    n.transactions.length !== 3 ||
    n.transactions.some((row) => row.replay_staleness_proven !== true)
  ) fail("nimo_sweep_binding_mismatch");

  const scope = input.controlled_store_scope;
  if (
    scope?.precision_controlled_artifact_lane_complete !== true ||
    scope?.nimo_controlled_artifact_lane_complete !== true ||
    scope?.encrypted_void_authority_backup_lane_complete !== true ||
    scope?.additional_designated_signed_artifact_store_identified !== false
  ) fail("controlled_store_scope_incomplete");

  const d = input.decision;
  if (
    d?.pending_legacy_signed_transaction_census_complete !== true ||
    d?.privileged_signer_nonce_or_key_replay_fence_proven !== false ||
    d?.cross_epoch_replay_protection_proven !== false ||
    d?.migration_authorized !== false ||
    d?.public_activation_authorized !== false ||
    d?.funds_movement_authorized !== false
  ) fail("decision_boundary_drift");

  if (input.authority?.source_only !== true) fail("source_only_required");
  for (const [key,value] of Object.entries(input.authority || {})) {
    if (key === "source_only") continue;
    if (value !== false) fail("authority_must_remain_false:" + key);
  }

  return Object.freeze({
    ok:true,
    status:"CENSUS_COMPLETE_REPLAY_FENCE_HOLD",
    closeout_id:EXPECTED_CLOSEOUT_ID,
    pending_legacy_signed_transaction_census_complete:true,
    privileged_signer_nonce_or_key_replay_fence_proven:false,
    cross_epoch_replay_protection_proven:false,
    migration_authorized:false,
    public_activation_authorized:false,
  });
}
