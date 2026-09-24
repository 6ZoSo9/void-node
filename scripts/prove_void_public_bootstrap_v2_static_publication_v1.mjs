#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  loadVoidPublicBootstrapV2StaticV1,
  VOID_PUBLIC_BOOTSTRAP_V2_STATIC_V1,
} from "../ops/public/void-public-bootstrap-v2-static-v1.mjs";
import {
  validateBootstrapRecordV2,
} from "./lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_V2_STATIC_PUBLICATION_V1_PROOF_GREEN";
const MANIFEST_ID =
  "voidpbm1_3896e80bc7520fe3fdca28a2f4a72a38014d8ba088e99d2c603407bff9b6aa93";
const RECORD_ID =
  "voidpbr2_8e1a7fb974c7d47caa94149b5926dd77486e8059cf5a956e807c323d331258fe";
const MANIFEST_SHA256 =
  "a5e59908768dbd2b462958526a24479b08197c148d3d8235661543b539762bc6";
const NIMO_ONION =
  "r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion";

const sourceManifest = fs.readFileSync("public/bootstrap/v1.json");
const mirroredManifest = fs.readFileSync(
  `public/void/bootstrap/v2/manifests/${MANIFEST_ID}.json`,
);
assert.equal(mirroredManifest.equals(sourceManifest), true);
assert.equal(mirroredManifest.length, 1166);
assert.equal(
  crypto.createHash("sha256").update(mirroredManifest).digest("hex"),
  MANIFEST_SHA256,
);

const recordPath = `public/void/bootstrap/v2/records/${RECORD_ID}.json`;
const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
assert.equal(record.record_id, RECORD_ID);
assert.equal(record.manifest.manifest_id, MANIFEST_ID);
assert.equal(record.manifest.sha256, MANIFEST_SHA256);
assert.equal(record.manifest.size_bytes, 1166);
assert.equal(record.expires_at, JSON.parse(sourceManifest).expires_at);
assert.deepEqual(
  record.mirrors,
  [
    {
      transport: "https",
      base_url: "https://seed.nullfeed.org/void/bootstrap/v2",
      failure_domain: "seed-nullfeed-https",
    },
    {
      transport: "https",
      base_url: "https://nullfeed.org/void/bootstrap/v2",
      failure_domain: "nullfeed-public-https",
    },
    {
      transport: "tor_http",
      base_url: `http://${NIMO_ONION}/void/bootstrap/v2`,
      failure_domain: "public-node-tor",
    },
  ],
);
const validated = validateBootstrapRecordV2(record, {
  nowMs: Date.parse(record.generated_at),
});
assert.equal(validated.record_id, RECORD_ID);
assert.equal(validated.mirrors.length, 3);

const loadedManifest = loadVoidPublicBootstrapV2StaticV1(
  `/void/bootstrap/v2/manifests/${MANIFEST_ID}.json`,
);
assert.equal(loadedManifest.kind, "manifest");
assert.equal(loadedManifest.id, MANIFEST_ID);
assert.equal(loadedManifest.body.equals(sourceManifest), true);

const loadedRecord = loadVoidPublicBootstrapV2StaticV1(
  `/void/bootstrap/v2/records/${RECORD_ID}.json`,
);
assert.equal(loadedRecord.kind, "record");
assert.equal(loadedRecord.id, RECORD_ID);
assert.equal(
  loadedRecord.body.equals(fs.readFileSync(recordPath)),
  true,
);

for (const invalid of [
  "/void/bootstrap/v2/latest.json",
  "/void/bootstrap/v2/manifests/latest.json",
  "/void/bootstrap/v2/records/latest.json",
  "/void/bootstrap/v2/records/voidpbr2_NOT_CANONICAL.json",
  "/void/bootstrap/v2/../../bootstrap/v1.json",
]) {
  assert.equal(loadVoidPublicBootstrapV2StaticV1(invalid), null, invalid);
}

const seedSource = fs.readFileSync("ops/public/public-seed-adapter-v1.mjs", "utf8");
const frontdoorSource = fs.readFileSync("ops/public/void-public-frontdoor-v1.mjs", "utf8");
const torSource = fs.readFileSync("tools/void-tor-onion-public-node-v1.mjs", "utf8");
for (const source of [seedSource, frontdoorSource]) {
  assert(source.includes("serveVoidPublicBootstrapV2StaticV1"));
}
assert(torSource.includes('const root = resolve(process.cwd(), "public");'));
assert(torSource.includes("safeResolveStatic"));

console.log(MARKER);
console.log(`marker=${VOID_PUBLIC_BOOTSTRAP_V2_STATIC_V1}`);
console.log(`manifest_id=${MANIFEST_ID}`);
console.log(`manifest_sha256=${MANIFEST_SHA256}`);
console.log("manifest_size_bytes=1166");
console.log(`record_id=${RECORD_ID}`);
console.log("mirror_count=3");
console.log("https_mirror_count=2");
console.log("tor_mirror_count=1");
console.log("record_expires_with_manifest=true");
console.log("mutable_latest_alias_allowed=false");
console.log("seed_adapter_static_wiring_required=true");
console.log("frontdoor_static_wiring_required=true");
console.log("tor_public_tree_static_wiring_present=true");
console.log("network_calls_performed=false");
console.log("signature_generated=false");
console.log("production_private_key_read=false");
console.log("runtime_activation_performed=false");
