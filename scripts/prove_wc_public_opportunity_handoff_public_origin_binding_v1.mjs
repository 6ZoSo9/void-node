#!/usr/bin/env node
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256,
  loadReviewedVoidPublicNodeIdentityTrustV1,
  reviewedVoidPublicNodeIdentityTrustEntryV1,
  verifyReviewedVoidNodePublicOriginBindingV1,
} from "../tools/lib/void-public-node-identity-trust-v1.mjs";
import {
  signVoidNodePublicOriginBindingV1,
} from "../tools/lib/void-node-public-origin-binding-v1.mjs";

const MARKER =
  "VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_PUBLIC_ORIGIN_BINDING_V1_PROOF_GREEN";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HANDOFF = resolve(ROOT, "tools/wc-public-opportunity-handoff-v1.mjs");
const TRUSTED_NODE_ID = "9d89483769e469e0473b489dc50dba96";
const TRUSTED_FINGERPRINT =
  "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b";
const NOW_MS = Date.parse("2030-06-01T00:00:00.000Z");

const registry = loadReviewedVoidPublicNodeIdentityTrustV1();
assert.equal(
  registry.sha256,
  VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256,
);
assert.equal(registry.entries.length, 1);
assert.equal(registry.entries[0].node_id, TRUSTED_NODE_ID);
assert.equal(
  registry.entries[0].public_key_fingerprint_sha256,
  TRUSTED_FINGERPRINT,
);
assert.equal(registry.authority.verification_only, true);
assert.equal(registry.authority.work_credit_authority_granted, false);
assert.equal(registry.authority.wallet_or_signer_access, false);
assert.equal(registry.authority.funds_movement_authority_granted, false);

const trusted = reviewedVoidPublicNodeIdentityTrustEntryV1(TRUSTED_NODE_ID);
assert.equal(trusted.entry.node_id, TRUSTED_NODE_ID);
assert.equal(
  trusted.entry.public_key_fingerprint_sha256,
  TRUSTED_FINGERPRINT,
);
assert.throws(
  () => reviewedVoidPublicNodeIdentityTrustEntryV1(
    "0123456789abcdef0123456789abcdef",
  ),
  /not present in the reviewed public node identity trust registry/u,
);

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const forgedTrustedNodeBinding = signVoidNodePublicOriginBindingV1({
  privateKey,
  publicKey,
  nodeId: TRUSTED_NODE_ID,
  origin: "https://public.example",
  issuedAt: "2030-01-01T00:00:00.000Z",
  expiresAt: "2030-12-31T00:00:00.000Z",
});
assert.throws(
  () => verifyReviewedVoidNodePublicOriginBindingV1(
    forgedTrustedNodeBinding,
    {
      expectedOrigin: "https://public.example",
      expectedNodeId: TRUSTED_NODE_ID,
      nowMs: NOW_MS,
    },
  ),
  /independent trust pin/u,
  "same-origin self-signing must not replace the reviewed fingerprint root",
);

const handoffSource = readFileSync(HANDOFF, "utf8");
for (const marker of [
  'from "./lib/void-public-node-identity-trust-v1.mjs"',
  "VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS[0]",
  "loadReviewedVoidPublicNodeIdentityTrustV1()",
  "verifyReviewedVoidNodePublicOriginBindingV1",
  'selectedUrl.protocol === "https:"',
  'trust_mode: "signed_public_origin_binding"',
  'trust_mode: "development_self_report_only"',
  "public_copy_ready: true",
  "public_copy_ready: false",
]) {
  assert.equal(
    handoffSource.includes(marker),
    true,
    `missing handoff trust marker: ${marker}`,
  );
}
for (const forbidden of [
  '"trust-registry"',
  '"trusted-fingerprint"',
  '"binding-public-key"',
]) {
  assert.equal(
    handoffSource.includes(forbidden),
    false,
    `caller-selectable trust input must remain absent: ${forbidden}`,
  );
}

console.log(MARKER);
console.log(
  `trust_registry_sha256=${VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256}`,
);
console.log(`trusted_node_id=${TRUSTED_NODE_ID}`);
console.log("fixed_reviewed_trust_source=true");
console.log("caller_selectable_trust_root=false");
console.log("same_origin_self_signing_rejected=true");
console.log("public_https_requires_signed_binding=true");
console.log("private_http_development_self_report_only=true");
console.log("work_credit_mutation=false");
console.log("wallet_or_signer_access=false");
console.log("funds_movement=false");
