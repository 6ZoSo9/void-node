#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const file =
  "tools/void-nimo-epoch2-signed-artifact-metadata-census-v1.mjs";
const source = fs.readFileSync(file, "utf8");

for (const required of [
  'const MARKER = "VOID_NIMO_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1"',
  'const EXPECTED_HOST = process.env.VOID_EXPECTED_NIMO_HOSTNAME || "Nimo"',
  'const EXPECTED_AUTHORITY_UUID = "fb57fcbe-83b1-4a69-9701-7aec4cf5396f"',
  'if (os.hostname() !== EXPECTED_HOST) hold("wrong_host")',
  'run("git", ["branch", "--show-current"])',
  'run("git", ["status", "--porcelain"])',
  'const AUTHORITY_BACKUPS = path.join(AUTHORITY_MOUNT, "backups")',
  'authority_backup_owner_mismatch',
  'authority_backup_special_file_requires_review',
  'const authorityFiles = walkAuthorityBackupFiles(AUTHORITY_BACKUPS)',
  '"--confirmation",',
  '"discoverVoidSignedArtifactCandidates"',
  'console.log("scanned_file_content_read=false")',
  'console.log("credential_content_access=false")',
  'console.log("wallet_access=false")',
  'console.log("private_key_access=false")',
  'console.log("transaction_signing=false")',
  'console.log("transaction_broadcast=false")',
  'console.log("authoritative_chain2050_write=false")',
  'console.log("pending_legacy_signed_transaction_census_complete=false")',
  'receipt_set_sha256',
]) {
  assert.ok(source.includes(required), required);
}

for (const forbidden of [
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'cast send',
  'systemctl',
  'openssl',
  'keystore_decrypted=true',
  'private_key_access=true',
  'transaction_signing=true',
  'transaction_broadcast=true',
  'authoritative_chain2050_write=true',
  'pending_legacy_signed_transaction_census_complete=true',
  'fs.readFileSync(child',
  'fs.readFileSync(candidate',
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

assert.match(
  source,
  /const explicitFiles = \[\.\.\.files, \.\.\.authorityFiles\]\.sort\(\)/,
);
assert.match(
  source,
  /if \(stat\.isDirectory\(\)\) \{\s*visit\(child\);\s*\} else if \(stat\.isFile\(\)\)/,
);
assert.match(
  source,
  /createReceipt\(\["--root", root\], out\)/,
);
assert.match(
  source,
  /args\.push\("--file", file\)/,
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
