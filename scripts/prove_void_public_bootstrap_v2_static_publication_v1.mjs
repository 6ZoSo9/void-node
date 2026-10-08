#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  loadVoidPublicBootstrapV2StaticV1,
  VOID_PUBLIC_BOOTSTRAP_V2_STATIC_V1,
} from "../ops/public/void-public-bootstrap-v2-static-v1.mjs";
import {
  buildManifestReference,
  validateBootstrapRecordV2,
} from "./lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_V2_STATIC_PUBLICATION_V1_PROOF_GREEN";
const HISTORICAL_MANIFEST_ID =
  "voidpbm1_3896e80bc7520fe3fdca28a2f4a72a38014d8ba088e99d2c603407bff9b6aa93";
const HISTORICAL_RECORD_ID =
  "voidpbr2_8e1a7fb974c7d47caa94149b5926dd77486e8059cf5a956e807c323d331258fe";
const HISTORICAL_MANIFEST_SHA256 =
  "a5e59908768dbd2b462958526a24479b08197c148d3d8235661543b539762bc6";
const NIMO_ONION =
  "r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion";

const sourceManifest = fs.readFileSync("public/bootstrap/v1.json");
const sourceManifestJson = JSON.parse(sourceManifest.toString("utf8"));
assert.equal(
  typeof sourceManifestJson.manifest_id,
  "string",
  "current alias manifest_id must be a string",
);
const currentValidationTime = Date.parse(sourceManifestJson.generated_at);
assert.ok(
  Number.isFinite(currentValidationTime),
  "current alias generated_at must be a valid deterministic validation time",
);
const currentManifestReference = buildManifestReference(sourceManifest, {
  nowMs: currentValidationTime,
});
const currentManifestId = currentManifestReference.manifest_id;
assert.equal(
  sourceManifestJson.manifest_id,
  currentManifestId,
  "current alias manifest_id is not derived from its exact content",
);
assert.equal(currentManifestReference.size_bytes, sourceManifest.length);
const currentManifestSha256 = currentManifestReference.sha256;

for (const invalidManifestId of [
  `voidpbm1_${"0".repeat(64)}`,
  [currentManifestId],
  { id: currentManifestId },
  7,
  null,
]) {
  const mutated = structuredClone(sourceManifestJson);
  mutated.manifest_id = invalidManifestId;
  const bytes = Buffer.from(`${JSON.stringify(mutated, null, 2)}\n`);
  assert.throws(
    () => buildManifestReference(bytes, { nowMs: currentValidationTime }),
    /bootstrap manifest ID does not match its content/,
  );
}

const currentMirrorPath =
  `public/void/bootstrap/v2/manifests/${currentManifestId}.json`;
const currentMirroredManifest = fs.readFileSync(currentMirrorPath);
assert.equal(currentMirroredManifest.equals(sourceManifest), true);

const loadedCurrentManifest = loadVoidPublicBootstrapV2StaticV1(
  `/void/bootstrap/v2/manifests/${currentManifestId}.json`,
);
assert.equal(loadedCurrentManifest.kind, "manifest");
assert.equal(loadedCurrentManifest.id, currentManifestId);
assert.equal(loadedCurrentManifest.body.equals(sourceManifest), true);

const historicalManifest = fs.readFileSync(
  `public/void/bootstrap/v2/manifests/${HISTORICAL_MANIFEST_ID}.json`,
);
assert.equal(historicalManifest.length, 1166);
assert.equal(
  crypto.createHash("sha256").update(historicalManifest).digest("hex"),
  HISTORICAL_MANIFEST_SHA256,
);

const recordPath =
  `public/void/bootstrap/v2/records/${HISTORICAL_RECORD_ID}.json`;
const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
assert.equal(record.record_id, HISTORICAL_RECORD_ID);
assert.equal(record.manifest.manifest_id, HISTORICAL_MANIFEST_ID);
assert.equal(record.manifest.sha256, HISTORICAL_MANIFEST_SHA256);
assert.equal(record.manifest.size_bytes, 1166);
assert.equal(
  record.expires_at,
  JSON.parse(historicalManifest.toString("utf8")).expires_at,
);
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
assert.equal(validated.record_id, HISTORICAL_RECORD_ID);
assert.equal(validated.mirrors.length, 3);

const loadedHistoricalRecord = loadVoidPublicBootstrapV2StaticV1(
  `/void/bootstrap/v2/records/${HISTORICAL_RECORD_ID}.json`,
);
assert.equal(loadedHistoricalRecord.kind, "record");
assert.equal(loadedHistoricalRecord.id, HISTORICAL_RECORD_ID);
assert.equal(
  loadedHistoricalRecord.body.equals(fs.readFileSync(recordPath)),
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

// Read-only production handler proof: all hostile writes stay under OS temp.
const staticFixtureRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-bootstrap-v2-static-reader-"),
);
const fixtureDir = path.join(staticFixtureRoot, "manifests");
const fixtureFile = path.join(fixtureDir, currentManifestId + ".json");
const readFixture = () => loadVoidPublicBootstrapV2StaticV1(
  "/void/bootstrap/v2/manifests/" + currentManifestId + ".json",
  { rootDir: staticFixtureRoot },
);
try {
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(fixtureFile, sourceManifest, { mode: 0o600 });
  assert.equal(readFixture().body.equals(sourceManifest), true);

  const moved = fixtureFile + ".held";
  fs.renameSync(fixtureFile, moved);
  fs.symlinkSync(moved, fixtureFile);
  assert.throws(readFixture, /bootstrap_v2_static_not_regular/);
  fs.unlinkSync(fixtureFile);
  fs.renameSync(moved, fixtureFile);

  const linked = fixtureFile + ".linked";
  fs.linkSync(fixtureFile, linked);
  assert.throws(readFixture, /bootstrap_v2_static_not_regular/);
  fs.unlinkSync(linked);

  fs.writeFileSync(fixtureFile, Buffer.alloc(1024 * 1024 + 1, 0x61));
  assert.throws(readFixture, /bootstrap_v2_static_size_invalid/);
  fs.writeFileSync(fixtureFile, sourceManifest);

  // A same-size replacement inode during open must never be consumed.
  const originalOpen = fs.openSync;
  let replaced = false;
  try {
    fs.openSync = function (name, ...args) {
      if (!replaced && typeof name === "string" &&
          name.startsWith("/proc/self/fd/") &&
          name.endsWith("/" + currentManifestId + ".json")) {
        replaced = true;
        fs.renameSync(fixtureFile, moved);
        fs.writeFileSync(fixtureFile, sourceManifest);
      }
      return originalOpen.call(this, name, ...args);
    };
    assert.throws(readFixture, /bootstrap_v2_static_descriptor_replaced/);
    assert.equal(replaced, true);
  } finally {
    fs.openSync = originalOpen;
    fs.rmSync(fixtureFile, { force: true });
    if (fs.existsSync(moved)) fs.renameSync(moved, fixtureFile);
  }

  // A concurrent append is detected after at most preflight bytes + 1.
  const originalRead = fs.readSync;
  let consumed = 0;
  let largestBuffer = 0;
  let appended = false;
  try {
    fs.readSync = function (fd, buffer, offset, length, position) {
      if (!appended) {
        appended = true;
        fs.appendFileSync(fixtureFile, Buffer.alloc(2 * 1024 * 1024));
      }
      largestBuffer = Math.max(largestBuffer, buffer.length);
      const n = originalRead.call(this, fd, buffer, offset, length, position);
      consumed += n;
      return n;
    };
    assert.throws(readFixture, /bootstrap_v2_static_size_changed_during_read/);
    assert.equal(appended, true);
    assert.equal(largestBuffer, sourceManifest.length + 1);
    assert.equal(consumed, sourceManifest.length + 1);
  } finally {
    fs.readSync = originalRead;
    fs.writeFileSync(fixtureFile, sourceManifest);
  }

  // A symlinked parent, including a swap after descriptor pinning, holds.
  const parentMoved = fixtureDir + ".held";
  fs.renameSync(fixtureDir, parentMoved);
  fs.symlinkSync(parentMoved, fixtureDir);
  assert.throws(readFixture);
  fs.unlinkSync(fixtureDir);
  fs.renameSync(parentMoved, fixtureDir);

  let swappedParent = false;
  try {
    fs.readSync = function (fd, buffer, offset, length, position) {
      if (!swappedParent) {
        swappedParent = true;
        fs.renameSync(fixtureDir, parentMoved);
        fs.symlinkSync(parentMoved, fixtureDir);
      }
      return originalRead.call(this, fd, buffer, offset, length, position);
    };
    assert.throws(readFixture, /bootstrap_v2_static_file_or_path_changed/);
    assert.equal(swappedParent, true);
  } finally {
    fs.readSync = originalRead;
    if (swappedParent) {
      fs.unlinkSync(fixtureDir);
      fs.renameSync(parentMoved, fixtureDir);
    }
  }
  assert.equal(readFixture().body.equals(sourceManifest), true);
} finally {
  fs.rmSync(staticFixtureRoot, { recursive: true, force: true });
}

const seedSource = fs.readFileSync(
  "ops/public/public-seed-adapter-v1.mjs",
  "utf8",
);
const frontdoorSource = fs.readFileSync(
  "ops/public/void-public-frontdoor-v1.mjs",
  "utf8",
);
const torSource = fs.readFileSync(
  "tools/void-tor-onion-public-node-v1.mjs",
  "utf8",
);
for (const source of [seedSource, frontdoorSource]) {
  assert(source.includes("serveVoidPublicBootstrapV2StaticV1"));
}
assert(torSource.includes('const root = resolve(process.cwd(), "public");'));
assert(torSource.includes("safeResolveStatic"));

console.log(MARKER);
console.log(`marker=${VOID_PUBLIC_BOOTSTRAP_V2_STATIC_V1}`);
console.log(`manifest_id=${currentManifestId}`);
console.log(`manifest_sha256=${currentManifestSha256}`);
console.log(`manifest_size_bytes=${sourceManifest.length}`);
console.log(`historical_manifest_id=${HISTORICAL_MANIFEST_ID}`);
console.log(`historical_record_id=${HISTORICAL_RECORD_ID}`);
console.log("current_manifest_reference_strict=true");
console.log("manifest_id_negative_controls=5");
console.log("current_alias_has_immutable_mirror=true");
console.log("historical_record_preserved=true");
console.log("mirror_count=3");
console.log("https_mirror_count=2");
console.log("tor_mirror_count=1");
console.log("mutable_latest_alias_allowed=false");
console.log("static_reader_descriptor_bound=true");
console.log("static_reader_leaf_symlink_and_hardlink_rejected=true");
console.log("static_reader_same_size_inode_replacement_rejected=true");
console.log("static_reader_growth_read_at_most_initial_size_plus_one=true");
console.log("static_reader_parent_swap_rejected=true");
console.log("seed_adapter_static_wiring_required=true");
console.log("frontdoor_static_wiring_required=true");
console.log("tor_public_tree_static_wiring_present=true");
console.log("network_calls_performed=false");
console.log("signature_generated=false");
console.log("production_private_key_read=false");
console.log("runtime_activation_performed=false");
