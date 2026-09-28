#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const file =
  "ops/nimo/void_nimo_epoch2_signed_artifact_metadata_census_v1.sh";
const source = fs.readFileSync(file, "utf8");

for (const required of [
  'MARKER="VOID_NIMO_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1"',
  'EXPECTED_HOST="${VOID_EXPECTED_NIMO_HOSTNAME:-Nimo}"',
  'EXPECTED_AUTHORITY_UUID="fb57fcbe-83b1-4a69-9701-7aec4cf5396f"',
  'test "$(hostname)" = "$EXPECTED_HOST"',
  'test "$(git branch --show-current)" = "main"',
  'test -z "$(git status --porcelain)"',
  'findmnt "$AUTHORITY_MOUNT"',
  'test -d "$AUTHORITY_MOUNT/backups"',
  'authority_backup_symlink_requires_review',
  'authority_backup_file_owner_mismatch',
  'declare -a authority_files=()',
  'declare -a explicit_files=("${files[@]}" "${authority_files[@]}")',
  '--confirmation discoverVoidSignedArtifactCandidates',
  'scanned_file_content_read=false',
  'credential_content_access=false',
  'wallet_access=false',
  'private_key_access=false',
  'transaction_signing=false',
  'transaction_broadcast=false',
  'authoritative_chain2050_write=false',
  'pending_legacy_signed_transaction_census_complete=false',
  'receipt_set_sha256=',
]) {
  assert.ok(source.includes(required), required);
}

for (const forbidden of [
  '--root "$AUTHORITY_MOUNT"',
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'cast send',
  'systemctl',
  'openssl ',
  'gpg ',
  'age ',
  'keystore_decrypted=true',
  'private_key_access=true',
  'transaction_signing=true',
  'transaction_broadcast=true',
  'authoritative_chain2050_write=true',
  'pending_legacy_signed_transaction_census_complete=true',
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

assert.match(
  source,
  /find -P "\$AUTHORITY_MOUNT\/backups" -type f -print0 \| sort -z/,
);
assert.match(
  source,
  /node "\$TOOL"[\s\S]*--file "\$\{explicit_files\[j\]\}"/,
);

console.log(
  "VOID_NIMO_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1_PROOF_GREEN",
);
console.log("nimo_downloads_void_owned_scope=true");
console.log("authority_backup_metadata_only_scope=true");
console.log("authority_backup_symlinks_fail_closed=true");
console.log("scanned_file_content_read=false");
console.log("credential_content_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("pending_legacy_signed_transaction_census_complete=false");
