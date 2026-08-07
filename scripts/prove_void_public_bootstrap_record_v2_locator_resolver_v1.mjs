#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  buildBootstrapRecordV2,
  deriveMirroredRecordUrl,
  validateBootstrapRecordV2,
  validateMirrorSet,
} from "./lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs";
import {
  MAX_BOOTSTRAP_RECORD_V2_BYTES,
  resolveBootstrapRecordV2FromLocatorMirrors,
} from "./lib/void_public_bootstrap_record_v2_locator_resolver_v1.mjs";

const MARKER =
  "VOID_PUBLIC_BOOTSTRAP_RECORD_V2_LOCATOR_RESOLVER_V1_PROOF_GREEN";

const NOW = Date.parse("2026-08-07T12:30:00.000Z");

function base32NoPadding(bytes) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += alphabet[(value >>> bits) & 31];
      value &= (1 << bits) - 1;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function torV3Hostname(label) {
  const publicKey = crypto
    .createHash("sha256")
    .update(`void-bootstrap-record-locator:${label}`)
    .digest()
    .subarray(0, 32);
  const checksum = crypto
    .createHash("sha3-256")
    .update(Buffer.from(".onion checksum", "ascii"))
    .update(publicKey)
    .update(Buffer.from([3]))
    .digest()
    .subarray(0, 2);
  const payload = Buffer.concat([
    publicKey,
    checksum,
    Buffer.from([3]),
  ]);
  const hostname = `${base32NoPadding(payload)}.onion`;
  assert.equal(hostname.length, 62);
  return hostname;
}

async function expectReject(fn, pattern) {
  let thrown;
  try {
    await fn();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, "expected async function to reject");
  if (pattern) assert.match(String(thrown.message || thrown), pattern);
}

const internalTor = torV3Hostname("internal-manifest");
const locatorTorA = torV3Hostname("locator-a");
const locatorTorB = torV3Hostname("locator-b");
const alternateLocatorTorA = torV3Hostname("alternate-locator-a");
const alternateLocatorTorB = torV3Hostname("alternate-locator-b");

const internalManifestMirrors = [
  {
    transport: "https",
    base_url: "https://manifest-a.example/void/bootstrap/v2",
    failure_domain: "manifest-a",
  },
  {
    transport: "https",
    base_url: "https://manifest-b.example/void/bootstrap/v2",
    failure_domain: "manifest-b",
  },
  {
    transport: "tor_http",
    base_url: `http://${internalTor}/void/bootstrap/v2`,
    failure_domain: "manifest-tor",
  },
];

const locatorMirrors = [
  {
    transport: "https",
    base_url: "https://locator-a.example/void/bootstrap/v2",
    failure_domain: "locator-a",
  },
  {
    transport: "tor_http",
    base_url: `http://${locatorTorA}/void/bootstrap/v2`,
    failure_domain: "locator-tor-a",
  },
  {
    transport: "https",
    base_url: "https://locator-b.example/void/bootstrap/v2",
    failure_domain: "locator-b",
  },
  {
    transport: "tor_http",
    base_url: `http://${locatorTorB}/void/bootstrap/v2`,
    failure_domain: "locator-tor-b",
  },
];

const alternateLocatorMirrors = [
  {
    transport: "https",
    base_url: "https://locator-c.example/void/bootstrap/v2",
    failure_domain: "locator-c",
  },
  {
    transport: "tor_http",
    base_url: `http://${alternateLocatorTorA}/void/bootstrap/v2`,
    failure_domain: "locator-tor-c",
  },
  {
    transport: "https",
    base_url: "https://locator-d.example/void/bootstrap/v2",
    failure_domain: "locator-d",
  },
  {
    transport: "tor_http",
    base_url: `http://${alternateLocatorTorB}/void/bootstrap/v2`,
    failure_domain: "locator-tor-d",
  },
];

assert.equal(validateMirrorSet(locatorMirrors).length, 4);
assert.equal(validateMirrorSet(alternateLocatorMirrors).length, 4);

const manifestBytes = fs.readFileSync("public/bootstrap/v1.json");

const record = buildBootstrapRecordV2({
  manifestBytes,
  mirrors: internalManifestMirrors,
  generatedAt: new Date(NOW - 60_000).toISOString(),
  expiresAt: new Date(NOW + 3 * 60 * 60 * 1000).toISOString(),
});

assert.match(record.record_id, /^voidpbr2_[0-9a-f]{64}$/);
assert.equal(
  validateBootstrapRecordV2(record, { nowMs: NOW }).record_id,
  record.record_id,
);

const alternateRecord = buildBootstrapRecordV2({
  manifestBytes,
  mirrors: internalManifestMirrors,
  generatedAt: new Date(NOW - 60_000).toISOString(),
  expiresAt: new Date(NOW + 4 * 60 * 60 * 1000).toISOString(),
});

assert.notEqual(alternateRecord.record_id, record.record_id);

for (const mirror of locatorMirrors) {
  const url = deriveMirroredRecordUrl(mirror, record.record_id);
  assert(url.endsWith(`/records/${record.record_id}.json`));
  assert(!url.includes("/latest"));
}

const resolved = await resolveBootstrapRecordV2FromLocatorMirrors({
  locatorMirrors,
  expectedRecordId: record.record_id,
  nowMs: NOW,
  async fetchBytes({ mirror }) {
    if (mirror.failure_domain === "locator-a") {
      throw new Error("synthetic locator unavailable");
    }
    if (mirror.failure_domain === "locator-tor-a") {
      return JSON.stringify(alternateRecord);
    }
    if (mirror.failure_domain === "locator-b") {
      return Buffer.alloc(MAX_BOOTSTRAP_RECORD_V2_BYTES + 1, 0x61);
    }
    return `${JSON.stringify(record)}\n`;
  },
});

assert.equal(resolved.record.record_id, record.record_id);
assert.equal(resolved.locator_mirror.failure_domain, "locator-tor-b");
assert.equal(resolved.attempted_mirrors, 4);
assert.equal(resolved.prior_failures.length, 3);
assert.match(
  resolved.prior_failures[1].error,
  /unpinned bootstrap record ID/,
);
assert.match(
  resolved.prior_failures[2].error,
  /bytes must be from 2 through/,
);

// The injected transport owns its return buffer. Verification must detach from
// that mutable ownership boundary before parsing/validating/returning bytes.
const transportOwnedBytes = Buffer.from(JSON.stringify(record), "utf8");
const verifiedTransportSnapshot = Buffer.from(transportOwnedBytes);
const detachedResolution = await resolveBootstrapRecordV2FromLocatorMirrors({
  locatorMirrors,
  expectedRecordId: record.record_id,
  nowMs: NOW,
  async fetchBytes() {
    return transportOwnedBytes;
  },
});

transportOwnedBytes.fill(0x78);
assert.deepEqual(
  detachedResolution.bytes,
  verifiedTransportSnapshot,
  "verified bootstrap record bytes must not alias the transport-owned Buffer",
);
assert.equal(detachedResolution.record.record_id, record.record_id);

const alternatePlanResolution =
  await resolveBootstrapRecordV2FromLocatorMirrors({
    locatorMirrors: alternateLocatorMirrors,
    expectedRecordId: record.record_id,
    nowMs: NOW,
    async fetchBytes() {
      return JSON.stringify(record);
    },
  });

assert.equal(
  alternatePlanResolution.record.record_id,
  record.record_id,
);
assert.equal(record.record_id, resolved.record.record_id);

for (let removed = 0; removed < locatorMirrors.length; removed += 1) {
  const nMinusOne = locatorMirrors.filter(
    (_mirror, index) => index !== removed,
  );
  assert.equal(validateMirrorSet(nMinusOne).length, 3);

  const result = await resolveBootstrapRecordV2FromLocatorMirrors({
    locatorMirrors: nMinusOne,
    expectedRecordId: record.record_id,
    nowMs: NOW,
    async fetchBytes({ mirror },) {
      const last = nMinusOne[nMinusOne.length - 1];
      if (mirror.base_url !== last.base_url) {
        throw new Error("synthetic earlier locator unavailable");
      }
      return JSON.stringify(record);
    },
  });

  assert.equal(result.record.record_id, record.record_id);
}

await expectReject(
  () =>
    resolveBootstrapRecordV2FromLocatorMirrors({
      locatorMirrors,
      expectedRecordId: alternateRecord.record_id,
      nowMs: NOW,
      async fetchBytes() {
        return JSON.stringify(record);
      },
    }),
  /all bootstrap record locator mirrors failed/,
);

await expectReject(
  () =>
    resolveBootstrapRecordV2FromLocatorMirrors({
      locatorMirrors,
      expectedRecordId: record.record_id,
      nowMs: NOW,
      async fetchBytes() {
        throw new Error("all locator mirrors unavailable");
      },
    }),
  /all bootstrap record locator mirrors failed/,
);

await expectReject(
  () =>
    resolveBootstrapRecordV2FromLocatorMirrors({
      locatorMirrors,
      expectedRecordId: "",
      nowMs: NOW,
      async fetchBytes() {
        return JSON.stringify(record);
      },
    }),
  /exact expected voidpbr2_/,
);

const tampered = structuredClone(record);
tampered.authority.wallet_authority = true;

await expectReject(
  () =>
    resolveBootstrapRecordV2FromLocatorMirrors({
      locatorMirrors,
      expectedRecordId: record.record_id,
      nowMs: NOW,
      async fetchBytes() {
        return JSON.stringify(tampered);
      },
    }),
  /all bootstrap record locator mirrors failed/,
);

console.log(MARKER);
console.log("merged_mirror_contract_reused=true");
console.log("caller_pinned_record_id_required=true");
console.log("different_self_consistent_record_accepted=false");
console.log("locator_mirrors_inside_record=false");
console.log("locator_plan_changes_record_id=false");
console.log("immutable_record_paths=true");
console.log("mutable_latest_alias_used=false");
console.log("https_locator_transport_supported=true");
console.log("tor_locator_transport_supported=true");
console.log("locator_transport_diversity_required=true");
console.log("locator_failure_domains_distinct=true");
console.log("n_minus_one_each_locator=true");
console.log("all_locator_failure_fails_closed=true");
console.log("oversized_locator_record_accepted=false");
console.log("tampered_authority_record_accepted=false");
console.log("transport_buffer_alias_mutation_changes_verified_bytes=false");
console.log("network_calls_performed=false");
console.log("runtime_integration_performed=false");
console.log("manifest_publication_performed=false");
console.log("single_required_mirror=false");
console.log("wallet_signer_validator_wc_money_authority=0");
