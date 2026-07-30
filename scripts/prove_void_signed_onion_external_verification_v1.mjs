#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const fail = (message) => { throw new Error(message); };
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256Pattern = /^[a-f0-9]{64}$/;

const record = readJson("public/public-node/void-signed-onion-external-verification-v1.json");
const index = readJson("public/public-node/index.json");
const bindingPath = "public/public-node/evidence/void-node-onion-binding-v1-nimo-verified.json";
const descriptorPath = "public/public-node/evidence/void-tor-onion-transport-v1-nimo-verified.json";

if (record.marker !== "VOID_SIGNED_ONION_EXTERNAL_VERIFICATION_V1") fail("record marker mismatch");
if (record.status !== "independently_verified") fail("record status mismatch");
if (record.verifier.repository_access !== false) fail("repository access boundary mismatch");
if (record.verifier.precision_access !== false) fail("Precision access boundary mismatch");
if (record.verifier.tailscale_access !== false) fail("Tailscale access boundary mismatch");
if (record.verifier.private_key_access !== false) fail("private-key access boundary mismatch");
if (record.verification.ed25519_signature_verified !== true) fail("signature proof missing");
if (record.verification.onion_v3_checksum_verified !== true) fail("onion proof missing");
if (record.verification.independent_external_tor_verification !== true) fail("external proof missing");

for (const [key, expected] of Object.entries({
  read_only: true,
  transaction_submission: false,
  p2p_listener: false,
  mcp_listener: false,
  wallet_or_signer_access: false,
  work_credit_write: false,
  void_settlement: false,
  node_runtime_mutation: false,
  operator_control: false,
})) {
  if (record.authority[key] !== expected) fail(`authority.${key} mismatch`);
}

for (const [key, expected] of Object.entries({
  machine_id_commitment_published: false,
  local_paths_published: false,
  tor_log_published: false,
  private_key_path_published: false,
  private_key_content_published: false,
})) {
  if (record.privacy[key] !== expected) fail(`privacy.${key} mismatch`);
}

for (const key of [
  "binding_sha256",
  "descriptor_sha256",
  "public_key_fingerprint_sha256",
]) {
  if (!sha256Pattern.test(record.endpoint[key])) fail(`endpoint.${key} invalid`);
}
for (const key of [
  "original_receipt_sha256",
  "original_receipt_bundle_sha256",
  "nimo_public_node_index_snapshot_sha256",
]) {
  if (!sha256Pattern.test(record.evidence[key])) fail(`evidence.${key} invalid`);
}

const routeMatches = index.routes.filter(
  (value) => value && typeof value === "object"
    && value.id === "void_signed_onion_external_verification_v1",
);
if (routeMatches.length !== 1) fail("public index route count mismatch");
const route = routeMatches[0];
if (
  route.route !== "/public-node/void-signed-onion-external-verification-v1.json"
  || route.html_route !== "/public-node/void-signed-onion-external-verification-v1.html"
  || route.read_only !== true
  || route.independent_external_tor_verification !== true
  || route.transaction_submission_enabled !== false
  || route.wallet_or_signer_required !== false
) {
  fail("public index route boundary mismatch");
}

const publicFiles = [
  "public/public-node/void-signed-onion-external-verification-v1.json",
  "public/public-node/void-signed-onion-external-verification-v1.html",
  bindingPath,
  descriptorPath,
];
for (const path of publicFiles) {
  const text = readFileSync(path, "utf8");
  for (const forbidden of [
    "/home/zoso/",
    "machine_id_sha256",
    "socks_endpoint",
    "system_services_preexisting",
    "system_services_postinstall",
    "NODE_PRIVKEY_PATH",
    "BEGIN PRIVATE KEY",
  ]) {
    if (text.includes(forbidden)) {
      fail(`public file contains forbidden value: path=${path} value=${forbidden}`);
    }
  }
}

const verifier = spawnSync(
  process.execPath,
  [
    "tools/verify_void_signed_onion_external_v1.mjs",
    "--binding-a", bindingPath,
    "--binding-b", bindingPath,
    "--descriptor-a", descriptorPath,
    "--descriptor-b", descriptorPath,
    "--expected-node-id", record.endpoint.node_id,
    "--expected-onion-hostname", new URL(record.endpoint.onion_uri).hostname,
    "--expected-binding-sha256", record.endpoint.binding_sha256,
    "--expected-public-key-fingerprint", record.endpoint.public_key_fingerprint_sha256,
    "--expected-expires-at", record.endpoint.expires_at,
  ],
  { encoding: "utf8" },
);
if (verifier.status !== 0) {
  process.stderr.write(verifier.stderr || "");
  fail("independent cryptographic re-verification failed");
}
const summary = JSON.parse(verifier.stdout);
if (
  summary.status !== "green"
  || summary.descriptor_sha256 !== record.endpoint.descriptor_sha256
  || summary.ed25519_signature_verified !== true
  || summary.onion_v3_checksum_verified !== true
) {
  fail("cryptographic re-verification summary mismatch");
}

console.log("VOID_SIGNED_ONION_EXTERNAL_VERIFICATION_V1_PROOF_GREEN");
console.log("marker=VOID_SIGNED_ONION_EXTERNAL_VERIFICATION_V1");
console.log(`binding_sha256=${record.endpoint.binding_sha256}`);
console.log(`descriptor_sha256=${record.endpoint.descriptor_sha256}`);
console.log("independent_external_tor_verification=true");
console.log("ed25519_signature_verified=true");
console.log("onion_v3_checksum_verified=true");
console.log("public_safe_sanitization=true");
console.log("read_only=true");
console.log("runtime_mutation=false");
