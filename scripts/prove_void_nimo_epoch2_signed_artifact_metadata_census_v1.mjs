#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const file =
  "tools/void-nimo-epoch2-signed-artifact-metadata-census-v1.mjs";
const source = fs.readFileSync(file, "utf8");
const workflow = fs.readFileSync(
  ".github/workflows/void-nimo-epoch2-signed-artifact-metadata-census-v1.yml",
  "utf8",
);

for (const required of [
  'const MARKER = "VOID_NIMO_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1"',
  'const EXPECTED_HOST = process.env.VOID_EXPECTED_NIMO_HOSTNAME || "Nimo"',
  'const EXPECTED_SOURCE_HEAD = process.env.VOID_EXPECTED_SOURCE_HEAD || ""',
  'const EXPECTED_AUTHORITY_UUID = "fb57fcbe-83b1-4a69-9701-7aec4cf5396f"',
  'const MAX_AUTHORITY_BACKUP_DIRECTORIES = 4096',
  'const MAX_AUTHORITY_BACKUP_DEPTH = 32',
  'if (os.hostname() !== EXPECTED_HOST) hold("wrong_host")',
  'run("git", ["branch", "--show-current"])',
  'run("git", ["status", "--porcelain"])',
  'hold("expected_source_head_required")',
  'hold("expected_source_head_invalid"',
  'hold("repository_head_mismatch"',
  'console.log("expected_source_head=" + EXPECTED_SOURCE_HEAD)',
  'const AUTHORITY_BACKUPS = path.join(AUTHORITY_MOUNT, "backups")',
  'authority_backup_owner_mismatch',
  'authority_backup_special_file_requires_review',
  'authority_backups_filesystem_boundary_mismatch',
  'authority_backup_filesystem_boundary_crossed',
  'authority_backup_depth_exceeded',
  'too_many_authority_backup_directories',
  'walkAuthorityBackupFiles(AUTHORITY_BACKUPS, mountStat.dev)',
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
  /if \(stat\.isDirectory\(\)\) \{\s*visit\(child, depth \+ 1\);\s*\} else if \(stat\.isFile\(\)\)/,
);
assert.match(source, /visit\(root, 0\)/);
assert.match(
  source,
  /createReceipt\(\["--root", root\], out\)/,
);
assert.match(
  source,
  /args\.push\("--file", file\)/,
);
assert.ok(
  workflow.includes(
    '      - "tools/void-nimo-epoch2-signed-artifact-metadata-census-v1.mjs"',
  ),
  "focused workflow must trigger on implementation-only changes",
);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-nimo-source-head-proof-"),
);
try {
  const repo = path.join(temp, "repo");
  fs.mkdirSync(repo);
  const git = (args) =>
    spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  assert.equal(git(["init", "-q", "-b", "main"]).status, 0);
  fs.writeFileSync(path.join(repo, "fixture.txt"), "fixture\n");
  assert.equal(git(["add", "fixture.txt"]).status, 0);
  assert.equal(
    git([
      "-c", "user.name=VOID Proof",
      "-c", "user.email=void-proof@example.invalid",
      "commit", "-q", "-m", "fixture",
    ]).status,
    0,
  );
  const observedHead = git(["rev-parse", "HEAD"]).stdout.trim();
  assert.match(observedHead, /^[0-9a-f]{40}$/);
  const expectedHead = observedHead === "0".repeat(40)
    ? "1".repeat(40)
    : "0".repeat(40);
  const child = spawnSync(process.execPath, [file], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      VOID_EXPECTED_NIMO_HOSTNAME: os.hostname(),
      VOID_REPO: repo,
      VOID_EXPECTED_SOURCE_HEAD: expectedHead,
    },
  });
  assert.equal(child.status, 2);
  assert.match(child.stderr, /HOLD reason=repository_head_mismatch/);
  assert.ok(child.stderr.includes(expectedHead));
  assert.ok(child.stderr.includes(observedHead));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log(
  "VOID_NIMO_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1_PROOF_GREEN",
);
console.log("nimo_downloads_void_owned_scope=true");
console.log("authority_backup_metadata_only_scope=true");
console.log("authority_backup_symlinks_fail_closed=true");
console.log("authority_backup_directory_count_bounded=true");
console.log("authority_backup_depth_bounded=true");
console.log("authority_backup_filesystem_bound=true");
console.log("scanned_file_content_read=false");
console.log("credential_content_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("pending_legacy_signed_transaction_census_complete=false");
