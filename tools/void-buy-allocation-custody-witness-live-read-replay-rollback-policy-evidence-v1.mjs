#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1,
} from "./void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackIndependenceV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_independence_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_only_collector: true,
    designated_host_read_only_observation: true,
    fixed_root_owned_policy_path: true,
    root_owned_nonwritable_parent_chain_required: true,
    root_owned_read_only_policy_file_required: true,
    descriptor_bound_policy_read: true,
    canonical_policy_control_required: true,
    canonical_parent_rollback_classifier_required: true,
    live_replay_storage_reobservation_required: true,
    double_storage_census_required: true,
    policy_file_double_read_stability_required: true,
    installation_storage_rebound: false,
    live_policy_observation_proven: false,
    policy_file_installation_proven: false,
    verification_clock_authority_proven: false,
    policy_generation_monotonicity_proven: false,
    live_policy_enforcement_proven: false,
    live_rollback_test_performed: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    filesystem_write: false,
    mount_mutation: false,
    storage_bootstrap: false,
    backup_mutation: false,
    snapshot_mutation: false,
    service_mutation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const CONTROL_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_rollback_control_v1";
const CONTROL_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_CONTROL_V1";
const RECEIPT_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_evidence_receipt_v1";
const POLICY_PATH =
  "/etc/void/buy-void-allocation-custody-witness-live-read-replay-rollback-controls-v1.json";
const MAX_POLICY_BYTES = 64 * 1024;
const MAX_POLICY_TTL_MS = 5 * 60 * 1000;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const SAFE_ID = /^[A-Za-z0-9._:@/-]{1,200}$/u;

const CONTROL_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "host_id",
  "policy_generation",
  "policy_ttl_ms",
  "journal",
  "high_water",
  "hostwide_snapshot_can_revert_both",
  "hostwide_backup_can_revert_both",
  "hostwide_restore_can_revert_both",
  "shared_rollback_controller",
  "coordinated_rollback_without_second_control",
]);

const POLICY_OBSERVATION_KEYS = Object.freeze([
  "path",
  "bytes",
  "sha256",
  "uid",
  "gid",
  "mode",
  "nlink",
  "dev",
  "ino",
  "mtime_ns",
  "ctime_ns",
  "control",
]);

const CONTROL_DOMAIN_KEYS = Object.freeze([
  "role",
  "snapshot_enabled",
  "snapshot_domain_id",
  "backup_enabled",
  "backup_domain_id",
  "backup_target_id",
  "restore_domain_id",
  "rollback_controller_id",
  "restore_credential_domain_id",
  "hostwide_snapshot_member",
  "hostwide_backup_member",
  "automatic_restore_allowed",
  "restore_requires_manual_approval",
  "restore_requires_separate_credential",
  "restore_second_control_required",
]);

function fail(code) {
  throw new Error(code);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {