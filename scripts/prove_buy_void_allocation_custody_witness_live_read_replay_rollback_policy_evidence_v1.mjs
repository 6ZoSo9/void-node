  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_evidence_high_water_second_control_required",
  );
}

{
  const c = control();
  c.high_water.rollback_controller_id =
    c.journal.rollback_controller_id;
  const held = classify(undefined, policyObservation(c));
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("shared controller unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_evidence_parent_witness_replay_rollback_restore_authority_not_independent",
  );
}

{
  const c = control();
  c.high_water.restore_credential_domain_id =
    c.journal.restore_credential_domain_id;
  const held = classify(undefined, policyObservation(c));
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("shared credential unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_evidence_parent_witness_replay_rollback_restore_authority_not_independent",
  );
}

{
  const bad = installationEvidence();
  bad.normalized.high_water_root.disk_wwn = "changed-wwn";
  const held = classify(bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("forged storage evidence unexpectedly green");
  assert.match(
    held.reason,
    /witness_replay_rollback_policy_evidence_parent_witness_replay_rollback_installation_/u,
  );
}

for (const key of [
  "installation_storage_rebound",
  "live_policy_observation_proven",
  "policy_file_installation_proven",
  "verification_clock_authority_proven",
  "policy_generation_monotonicity_proven",
  "live_policy_enforcement_proven",
  "live_rollback_test_performed",
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "production_gate_ready",
  "filesystem_write",
  "mount_mutation",
  "storage_bootstrap",
  "backup_mutation",
  "snapshot_mutation",
  "service_mutation",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "funds_movement",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

for (const key of [
  "designated_host_read_only_observation",
  "fixed_root_owned_policy_path",
  "root_owned_nonwritable_parent_chain_required",
  "root_owned_read_only_policy_file_required",
  "descriptor_bound_policy_read",
  "canonical_policy_control_required",
  "canonical_parent_rollback_classifier_required",
  "live_replay_storage_reobservation_required",
  "double_storage_census_required",
  "policy_file_double_read_stability_required",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs",
  "utf8",
);
for (const token of [
  POLICY_PATH,
  "O_NOFOLLOW",