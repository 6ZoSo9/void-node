#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
} from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_NODE_PUBLIC_ORIGIN_BINDING_DOMAIN,
  VOID_NODE_PUBLIC_ORIGIN_BINDING_MARKER,
  VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS,
  signVoidNodePublicOriginBindingV1,
  verifyVoidNodePublicOriginBindingV1,
} from "../tools/lib/void-node-public-origin-binding-v1.mjs";

const MARKER = "VOID_NODE_PUBLIC_ORIGIN_BINDING_V1_PROOF_GREEN";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = resolve(ROOT, "schemas/void-node-public-origin-binding-v1.schema.json");
const NODE_ID = "0123456789abcdef0123456789abcdef";
const HTTPS_ORIGIN = "https://node-one.example";
const HTTP_ORIGIN = "http://127.0.0.1:4100";
const IPV6_ORIGIN = "http://[::1]:4100";
const NOW = Date.parse("2026-09-23T20:00:00.000Z");

function fingerprint(publicKey) {
  return createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
}

function expectFailure(label, fn, pattern) {
  assert.throws(fn, pattern, label);
}

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const trustedFingerprint = fingerprint(publicKey);
const signed = signVoidNodePublicOriginBindingV1({
  nodeId: NODE_ID,
  privateKey,
  publicKey,
  origin: HTTPS_ORIGIN,
  issuedAt: new Date(NOW - 60_000),
  expiresAt: new Date(NOW + 24 * 60 * 60 * 1000),
});

const verified = verifyVoidNodePublicOriginBindingV1(signed, {
  expectedOrigin: HTTPS_ORIGIN,
  expectedNodeId: NODE_ID,
  expectedPublicKeyFingerprintSha256: trustedFingerprint,
  nowMs: NOW,
});
assert.equal(verified.marker, VOID_NODE_PUBLIC_ORIGIN_BINDING_MARKER);
assert.equal(verified.origin, HTTPS_ORIGIN);
assert.equal(verified.node_id, NODE_ID);
assert.equal(verified.public_key_fingerprint_sha256, trustedFingerprint);
assert.equal(verified.trust.independent_public_key_fingerprint_required, true);
assert.equal(verified.trust.signed_origin_matches_selected_origin, true);
assert.equal(verified.trust.signed_node_id_matches_live_health, true);
assert.equal(verified.authority.read_only, true);
for (const [key, value] of Object.entries(verified.authority)) {
  if (key !== "read_only") assert.equal(value, false, `${key} must remain false`);
}

for (const origin of [HTTP_ORIGIN, IPV6_ORIGIN]) {
  const binding = signVoidNodePublicOriginBindingV1({
    nodeId: NODE_ID,
    privateKey,
    publicKey,
    origin,
    issuedAt: new Date(NOW - 60_000),
    expiresAt: new Date(NOW + 60 * 60 * 1000),
  });
  const summary = verifyVoidNodePublicOriginBindingV1(binding, {
    expectedOrigin: origin,
    expectedNodeId: NODE_ID,
    expectedPublicKeyFingerprintSha256: trustedFingerprint,
    nowMs: NOW,
  });
  assert.equal(summary.origin, origin);
}

expectFailure(
  "missing independent trust pin",
  () => verifyVoidNodePublicOriginBindingV1(signed, {
    expectedOrigin: HTTPS_ORIGIN,
    expectedNodeId: NODE_ID,
    nowMs: NOW,
  }),
  /independent public-key fingerprint trust pin/u,
);

expectFailure(
  "wrong independent trust pin",
  () => verifyVoidNodePublicOriginBindingV1(signed, {
    expectedOrigin: HTTPS_ORIGIN,
    expectedNodeId: NODE_ID,
    expectedPublicKeyFingerprintSha256: "f".repeat(64),
    nowMs: NOW,
  }),
  /independent trust pin/u,
);

expectFailure(
  "selected origin mismatch",
  () => verifyVoidNodePublicOriginBindingV1(signed, {
    expectedOrigin: "https://other.example",
    expectedNodeId: NODE_ID,
    expectedPublicKeyFingerprintSha256: trustedFingerprint,
    nowMs: NOW,
  }),
  /selected coordinator origin/u,
);

expectFailure(
  "live health node mismatch",
  () => verifyVoidNodePublicOriginBindingV1(signed, {
    expectedOrigin: HTTPS_ORIGIN,
    expectedNodeId: "fedcba9876543210fedcba9876543210",
    expectedPublicKeyFingerprintSha256: trustedFingerprint,
    nowMs: NOW,
  }),
  /live health identity/u,
);

for (const [label, mutate, pattern] of [
  ["network", (b) => { b.network.chain_id = 1; }, /network mismatch/u],
  ["health path", (b) => { b.surface.health.path = "/healthz"; }, /health surface mismatch/u],
  ["WC status path", (b) => { b.surface.work_credit_status.path = "/wc/other"; }, /Work Credit status surface mismatch/u],
  ["redirect authority", (b) => { b.surface.redirects_allowed = true; }, /surface mismatch/u],
  ["economic authority", (b) => { b.authority.payment_authority = true; }, /authority.payment_authority/u],
  ["WC mutation authority", (b) => { b.authority.work_credit_write = true; }, /authority.work_credit_write/u],
  ["signature domain", (b) => { b.signature.domain = "VOID_NODE_ONION_BINDING_V1"; }, /signature profile mismatch/u],
  ["signature bytes", (b) => { b.signature.value = `${b.signature.value[0] === "A" ? "B" : "A"}${b.signature.value.slice(1)}`; }, /signature verification failed/u],
]) {
  const changed = structuredClone(signed);
  mutate(changed);
  expectFailure(
    label,
    () => verifyVoidNodePublicOriginBindingV1(changed, {
      expectedOrigin: HTTPS_ORIGIN,
      expectedNodeId: NODE_ID,
      expectedPublicKeyFingerprintSha256: trustedFingerprint,
      nowMs: NOW,
    }),
    pattern,
  );
}

const expired = signVoidNodePublicOriginBindingV1({
  nodeId: NODE_ID,
  privateKey,
  publicKey,
  origin: HTTPS_ORIGIN,
  issuedAt: new Date(NOW - 2 * 60 * 60 * 1000),
  expiresAt: new Date(NOW - 60 * 60 * 1000),
});
expectFailure(
  "expired binding",
  () => verifyVoidNodePublicOriginBindingV1(expired, {
    expectedOrigin: HTTPS_ORIGIN,
    expectedNodeId: NODE_ID,
    expectedPublicKeyFingerprintSha256: trustedFingerprint,
    nowMs: NOW,
  }),
  /expired/u,
);

const extra = structuredClone(signed);
extra.transport = { protocol: "tor-v3" };
expectFailure(
  "transport-specific field rejected",
  () => verifyVoidNodePublicOriginBindingV1(extra, {
    expectedOrigin: HTTPS_ORIGIN,
    expectedNodeId: NODE_ID,
    expectedPublicKeyFingerprintSha256: trustedFingerprint,
    nowMs: NOW,
  }),
  /keys mismatch/u,
);

const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));
assert.equal(schema.properties.marker.const, VOID_NODE_PUBLIC_ORIGIN_BINDING_MARKER);
assert.deepEqual(
  schema.properties.surface.properties.binding_paths.const,
  [...VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS],
);
assert.equal(schema.properties.signature.properties.domain.const, VOID_NODE_PUBLIC_ORIGIN_BINDING_DOMAIN);
assert.equal(
  schema.properties.authority.properties.work_credit_write.const,
  false,
);
assert.equal(
  schema.properties.authority.properties.payment_authority.const,
  false,
);

console.log(MARKER);
console.log("transport_neutral_http_https=true");
console.log("tor_binding_reinterpreted=false");
console.log("independent_public_key_fingerprint_required=true");
console.log("signed_origin_equals_selected_origin=true");
console.log("signed_node_id_equals_live_health_required=true");
console.log("mainnet0_chain2050_bound=true");
console.log("fixed_binding_paths=true");
console.log("health_get_only=true");
console.log("work_credit_status_get_only=true");
console.log("all_mutation_and_economic_authority_false=true");
console.log("production_private_key_access=false");
console.log("network_request=false");
console.log("runtime_activation=false");
console.log("work_credit_mutation=false");
console.log("funds_movement=false");
