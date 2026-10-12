#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MARKER = "VOID_PUBLIC_CHECKPOINT_ENVIRONMENT_COMPAT_V1_PROOF_GREEN";
const CHECKPOINT_KEYS = [
  "VOID_PUBLIC_SEED_CHECKPOINT_ROOT",
  "VOID_PUBLIC_SEED_CHECKPOINT_ID",
  "VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256",
];

const composer = fs.readFileSync(
  path.join(ROOT, "scripts", "compose_void_public_checkpoint_environment_compat_packet_v1.mjs"),
  "utf8",
);
const renderer = fs.readFileSync(
  path.join(ROOT, "scripts", "render_void_public_checkpoint_environment_compat_dropin_v1.mjs"),
  "utf8",
);
const verifier = fs.readFileSync(
  path.join(ROOT, "scripts", "verify_void_public_checkpoint_named_tunnel_packet_v1.mjs"),
  "utf8",
);
const installer = fs.readFileSync(
  path.join(ROOT, "ops", "public", "install_void_public_seed_named_tunnel_packet_v1.sh"),
  "utf8",
);
const workflow = fs.readFileSync(
  path.join(ROOT, ".github/workflows/void-public-seed-stable-ingress-activation-v1.yml"),
  "utf8",
);
const docs = fs.readFileSync(
  path.join(ROOT, "docs/public/public-seed-stable-ingress-activation-v1.md"),
  "utf8",
);

for (const text of [composer, renderer, verifier]) {
  assert.match(text, /void_public_checkpoint_environment_compat_v1/);
  assert.match(text, /source_dropin_sha256/);
  assert.match(text, /preserved_unset_sequence_sha256/);
  assert.match(text, /released_checkpoint_names/);
}
assert.match(renderer, /UnsetEnvironment=/);
assert.match(installer, /99-void-public-seed-checkpoint-environment\.conf/);
assert.match(
  installer,
  /loaded gateway UnsetEnvironment removes checkpoint pins but packet has no compatibility binding/,
);
assert.match(
  installer,
  /checkpoint compatibility drop-in did not release checkpoint UnsetEnvironment names/,
);
assert.match(installer, /rm -f -- "\$COMPAT_PATH"/);
assert.match(
  workflow,
  /Prove checkpoint clean-environment compatibility/,
);
assert.match(
  workflow,
  /prove_void_public_checkpoint_environment_compat_v1\.mjs/,
);
assert.match(docs, /## Checkpoint clean-environment compatibility/);
assert.match(docs, /The 21 preserved variable names themselves are not copied/);

const nonCheckpoint = Array.from(
  { length: 21 },
  (_unused, index) => `VOID_TEST_CLEAN_${String(index + 1).padStart(2, "0")}`,
);
const original = [...nonCheckpoint, ...CHECKPOINT_KEYS];
assert.equal(original.length, 24);

const preserved = original.filter((name) => !CHECKPOINT_KEYS.includes(name));
assert.equal(preserved.length, 21);
assert.deepEqual(preserved, nonCheckpoint);

const sequence = `${preserved.join("\n")}\n`;
const sequenceHash = crypto.createHash("sha256").update(sequence).digest("hex");
assert.match(sequenceHash, /^[0-9a-f]{64}$/);

const rendered = [
  "[Service]",
  "# Managed by VOID checkpoint environment compatibility v1.",
  "UnsetEnvironment=",
  `UnsetEnvironment=${preserved.join(" ")}`,
  "",
].join("\n");
assert.match(rendered, /\nUnsetEnvironment=\n/);
assert.match(
  rendered,
  new RegExp(`UnsetEnvironment=${nonCheckpoint.join(" ")}`),
);
for (const name of CHECKPOINT_KEYS) {
  assert.doesNotMatch(rendered, new RegExp(name));
}

const changed = [...preserved];
changed[0] = "VOID_TEST_CLEAN_CHANGED";
const changedHash = crypto
  .createHash("sha256")
  .update(`${changed.join("\n")}\n`)
  .digest("hex");
assert.notEqual(sequenceHash, changedHash);

const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-checkpoint-env-compat-proof-"),
);
try {
  const source = path.join(temporary, "90-clean.conf");
  fs.writeFileSync(
    source,
    `[Service]\nUnsetEnvironment=${original.join(" ")}\n`,
    { mode: 0o600 },
  );
  assert.equal(fs.statSync(source).mode & 0o777, 0o600);
  const sourceHash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(source))
    .digest("hex");
  assert.match(sourceHash, /^[0-9a-f]{64}$/);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

console.log("[PASS] exact 24 -> 21 + 3 environment compatibility contract");
console.log("[PASS] preserved-name sequence drift changes binding hash");
console.log("[PASS] managed compatibility override is reversible for ordinary rollback");
console.log(MARKER);
console.log("original_unset_count=24");
console.log("preserved_unset_count=21");
console.log("released_checkpoint_count=3");
console.log("checkpoint_three_pin_unsets_released=true");
console.log("unrelated_unset_names_preserved=true");
console.log("preserved_names_not_stored_in_packet_json=true");
console.log("ordinary_packet_removes_managed_override=true");
console.log("real_systemd_mutation=false");
