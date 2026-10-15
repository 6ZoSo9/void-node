#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_AUTHORITY_V1,
  VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1,
  VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_SOURCE_BLOBS_V1,
  gitBlobSha1,
  parseListenerRows,
  selfTestVoidPublicParticipantDesignatedHostCensusV1,
} from "../tools/void-public-participant-designated-host-census-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(
  ROOT,
  "tools/void-public-participant-designated-host-census-v1.mjs",
);
const WORKFLOW = path.join(
  ROOT,
  ".github/workflows/void-public-participant-designated-host-census-v1.yml",
);

for (const [relative, expected] of Object.entries(
  VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_SOURCE_BLOBS_V1,
)) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  assert.equal(gitBlobSha1(bytes), expected, relative);
}

selfTestVoidPublicParticipantDesignatedHostCensusV1();

const rows = parseListenerRows(
  'LISTEN 0 511 127.0.0.1:8082 0.0.0.0:* users:(("node",pid=4321,fd=20))\n',
);
assert.equal(rows.length, 1);
assert.equal(rows[0].local, "127.0.0.1:8082");
assert.match(rows[0].process, /pid=4321/u);

const source = fs.readFileSync(TARGET, "utf8");
for (const required of [
  "VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1",
  'const EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"',
  'const HOST = "127.0.0.1"',
  "const PORT = 8082",
  '"/__void/public-app/status.json"',
  '"/__void/participant/session/v1/status.json"',
  '"/__void/participant/account-read/v1/status.json"',
  '"PARTICIPANT_LOOPBACK_SURFACE_OBSERVED_HOST_GATES_REMAIN"',
  '"PARTICIPANT_SURFACE_DEFAULT_OFF_OR_UNOBSERVED"',
  '"PARTICIPANT_SURFACE_INVALID_HOLD"',
  "publicDiscoveryShapeQualified",
  "body.agent_paid_work_generic_proxy === false",
  "body.participant_handoff_public === true",
  "running_loaded_source_bytes_proven: false",
  "final_generation_bracket_verified",
  "exactObjectKeys",
  "body.session_ttl_ms === 900000",
  "stableVisibleRegular: true",
  "bounded_file_too_large",
  "continuous_listener_ownership_proven: false",
  "listener_final",
  "process_final",
  "systemd_service_binding_verified: false",
  "binding_registry_path_custody_verified: false",
  "session_state_path_custody_verified: false",
  "live_role_rpc_target_verified: false",
  "startup_restart_rollback_verified: false",
  "public_external_reachability_verified: false",
  "real_agent_login_verified: false",
  "production_session_issuance_authorized: false",
  "runtime_activation_authorized: false",
]) {
  assert.equal(source.includes(required), true, required);
}

for (const forbidden of [
  "/environ",
  "systemctl",
  "VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE",
  "VOID_PUBLIC_PARTICIPANT_BINDING_REGISTRY_FILE",
  "VOID_PUBLIC_PARTICIPANT_ROLE_RPC_URL",
  "VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE",
  "/challenge",
  "/login",
  "/logout",
  "authorization",
  "set-cookie",
  "fs.write",
  "writeFile",
  "renameSync",
  "unlinkSync",
  "fetch(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

for (const [key, expected] of Object.entries({
  read_only: true,
  loopback_get_only: true,
  process_environment_access: false,
  final_process_listener_bracket_required: true,
  continuous_listener_ownership_proven: false,
  session_or_challenge_mutation: false,
  bearer_token_access: false,
  account_data_access: false,
  wallet_or_signer_access: false,
  work_credit_mutation: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_mutation: false,
  service_action: false,
  systemd_mutation: false,
  tailscale_or_dns_mutation: false,
  filesystem_write: false,
  production_session_issuance_authorized: false,
  runtime_activation_authorized: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const workflow = fs.readFileSync(WORKFLOW, "utf8");
const pullAt = workflow.indexOf("  pull_request:\n");
const pushAt = workflow.indexOf("  push:\n");
const dispatchAt = workflow.indexOf("  workflow_dispatch:\n");
assert.ok(pullAt >= 0 && pushAt > pullAt && dispatchAt > pushAt);
const pullTrigger = workflow.slice(pullAt, pushAt);
const pushTrigger = workflow.slice(pushAt, dispatchAt);
assert.match(pushTrigger, /branches: \[main\]/u);
for (const relative of [
  "tools/void-public-participant-designated-host-census-v1.mjs",
  "scripts/prove_void_public_participant_designated_host_census_v1.mjs",
  "docs/operators/void-public-participant-designated-host-census-v1.md",
  ".github/workflows/void-public-participant-designated-host-census-v1.yml",
  ...Object.keys(VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_SOURCE_BLOBS_V1),
]) {
  const needle = `- "${relative}"`;
  assert.ok(pullTrigger.includes(needle), "pull trigger missing " + relative);
  assert.ok(pushTrigger.includes(needle), "main push trigger missing " + relative);
}

const proofSha = crypto.createHash("sha256")
  .update(fs.readFileSync(TARGET))
  .digest("hex");

console.log("VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1_PROOF_GREEN");
console.log("marker=" + VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1);
console.log("tool_sha256=" + proofSha);
console.log("reviewed_source_blobs_bound=true");
console.log("loopback_get_only=true");
console.log("process_environment_access=false");
console.log("participant_status_route_only=true");
console.log("account_or_bearer_data_read=false");
console.log("running_loaded_source_bytes_proven=false");
console.log("final_generation_bracket_required=true");
console.log("restart_after_middle_snapshot_fails_closed=true");
console.log("bounded_file_preallocation_limit=true");
console.log("exact_session_ttl_required=true");
console.log("closed_status_schema_required=true");
console.log("composition_status_values_closed=true");
console.log("joint_invalid_surface_holds=true");
console.log("transitive_participant_contracts_bound=true");
console.log("main_push_trigger_closure=true");
console.log("continuous_listener_ownership_proven=false");
console.log("systemd_service_binding_verified=false");
console.log("session_state_path_custody_verified=false");
console.log("live_role_rpc_target_verified=false");
console.log("startup_restart_rollback_verified=false");
console.log("public_external_reachability_verified=false");
console.log("runtime_activation_authorized=false");
console.log("production_session_issuance_authorized=false");
console.log("funds_movement=false");
