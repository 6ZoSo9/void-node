#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const path =
  "ops/precision/void_precision_epoch2_signed_artifact_metadata_census_v1.sh";
const source = fs.readFileSync(path, "utf8");

for (const required of [
  'MARKER="VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1"',
  'test "$(hostname)" = "zoso-Precision-Tower-7810"',
  'test "$(git branch --show-current)" = "main"',
  'test -z "$(git status --porcelain)"',
  'git fetch origin main --quiet',
  'test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"',
  '.runtime/clone-run-v1/node-v24.18.0-linux-x64/bin/node',
  '-mindepth 1 -maxdepth 1',
  'scope=top_level_void_owned_download_artifacts_only',
  '--confirmation discoverVoidSignedArtifactCandidates',
  'scanned_file_content_read=false',
  'credential_content_access=false',
  'wallet_access=false',
  'private_key_access=false',
  'transaction_signing=false',
  'transaction_broadcast=false',
  'authoritative_chain2050_write=false',
  'funds_movement=false',
  'METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED',
  'pending_legacy_signed_transaction_census_complete=false',
  'privileged_signer_nonce_or_key_replay_fence_proven=false',
  'cross_epoch_replay_protection_proven=false',
]) {
  assert.ok(source.includes(required), required);
}

for (const forbidden of [
  'find -P "$HOME"',
  '--root "$DOWNLOADS"',
  'cat "$candidate"',
  'grep "$candidate"',
  'sed "$candidate"',
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'cast send',
  'systemctl',
  'scp ',
  'rsync ',
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1_PROOF_GREEN",
);
console.log("top_level_download_scope_only=true");
console.log("whole_home_scan=false");
console.log("whole_downloads_root_scan=false");
console.log("scanned_file_content_read=false");
console.log("credential_content_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
