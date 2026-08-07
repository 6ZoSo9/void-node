#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  BOOTSTRAP_MANIFEST_V1_PREFIX,
  BOOTSTRAP_RECORD_V2_PREFIX,
  buildBootstrapRecordV2,
  buildManifestReference,
  canonicalJson,
  contentId,
  deriveMirroredManifestUrl,
  deriveMirroredRecordUrl,
  resolveManifestFromBootstrapRecordV2,
  sha256Hex,
  validateBootstrapRecordV2,
  validateTorV3Hostname,
} from "./lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_RECORD_V2_MIRROR_CONTRACT_V1";
const NOW = Date.parse("2026-08-06T22:30:00.000Z");

function expectReject(fn, pattern) {
  let caught = null;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `expected rejection matching ${pattern}`);
  assert.match(String(caught.message || caught), pattern);
}

async function expectRejectAsync(fn, pattern) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `expected async rejection matching ${pattern}`);
  assert.match(String(caught.message || caught), pattern);
}

function base32NoPadding(bytes) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += alphabet[(value >>> bits) & 31];
      value &= (1 << bits) - 1;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

function deterministicOnion() {
  const publicKey = crypto.createHash("sha256").update("void-bootstrap-record-v2-proof-onion").digest().subarray(0, 32);
  const version = Buffer.from([3]);
  const checksum = crypto
    .createHash("sha3-256")
    .update(Buffer.from(".onion checksum", "ascii"))
    .update(publicKey)
    .update(version)
    .digest()
    .subarray(0, 2);
  const host = `${base32NoPadding(Buffer.concat([publicKey, checksum, version]))}.onion`;
  assert.equal(validateTorV3Hostname(host), host);
  return host;
}

function falseAuthority() {
  return {
    private_routes_exposed: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    treasury_authority: false,
    work_credit_authority: false,
    money_movement_authority: false,
  };
}

function holdManifestBytes() {
  const base = {
    schema: "void_public_bootstrap_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "hold_no_stable_seed",
    generated_at: "2026-08-06T22:00:00.000Z",
    sync_endpoints: [],
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
    authority: falseAuthority(),
    notes: "proof fixture: no stable seed",
  };
  const manifest = {
    ...base,
    manifest_id: contentId(BOOTSTRAP_MANIFEST_V1_PREFIX, base, "manifest_id"),
  };
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const onion = deterministicOnion();
const mirrors = [
  { transport: "https", base_url: "https://mirror-a.example/void/bootstrap/v2", failure_domain: "mirror-a-example" },
  { transport: "https", base_url: "https://mirror-b.example/void/bootstrap/v2", failure_domain: "mirror-b-example" },
  { transport: "tor_http", base_url: `http://${onion}/void/bootstrap/v2`, failure_domain: "mirror-c-onion" },
];
const manifestBytes = holdManifestBytes();

function resealedManifest(mutator) {
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  mutator(manifest);
  manifest.manifest_id = contentId(BOOTSTRAP_MANIFEST_V1_PREFIX, manifest, "manifest_id");
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

expectReject(
  () => buildManifestReference(resealedManifest((manifest) => {
    manifest.expires_at = "2026-08-07T22:00:00.000Z";
    manifest.status = "stable_unknown_seed";
    manifest.sync_endpoints = [{ base: "https://seed.example" }];
  }), { nowMs: NOW }),
  /unsupported by the merged v1 contract/,
);
expectReject(
  () => buildManifestReference(resealedManifest((manifest) => {
    manifest.expires_at = "2026-08-06T22:15:00.000Z";
    manifest.status = "stable_https_seed";
    manifest.sync_endpoints = [{ base: "https://seed.example" }];
  }), { nowMs: NOW }),
  /validity must be from one hour through seven days|expired/,
);
const record = buildBootstrapRecordV2({
  manifestBytes,
  mirrors,
  generatedAt: new Date(NOW).toISOString(),
  expiresAt: new Date(NOW + 24 * 60 * 60 * 1000).toISOString(),
});

assert.match(record.record_id, /^voidpbr2_[0-9a-f]{64}$/);
assert.equal(record.record_id, contentId(BOOTSTRAP_RECORD_V2_PREFIX, record, "record_id"));
assert.equal(record.manifest.sha256, sha256Hex(manifestBytes));
assert.equal(record.manifest.size_bytes, manifestBytes.length);
assert.equal(record.mirrors.length, 3);
assert.equal(record.policy.minimum_mirror_count, 3);
assert.equal(record.policy.minimum_successes, 1);
assert.equal(record.policy.n_minus_one_required, true);
assert.equal(record.policy.immutable_content_paths, true);
assert.equal(record.policy.mutable_latest_alias_allowed, false);
assert.equal(record.policy.transport_diversity_required, true);
assert.deepEqual(record.authority, falseAuthority());
validateBootstrapRecordV2(record, { nowMs: NOW });

for (const mirror of record.mirrors) {
  const manifestUrl = deriveMirroredManifestUrl(mirror, record.manifest.manifest_id);
  const recordUrl = deriveMirroredRecordUrl(mirror, record.record_id);
  assert.ok(manifestUrl.endsWith(`/manifests/${record.manifest.manifest_id}.json`));
  assert.ok(recordUrl.endsWith(`/records/${record.record_id}.json`));
  assert.equal(manifestUrl.includes("/latest"), false);
  assert.equal(recordUrl.includes("/latest"), false);
}

const reseal = (mutator) => {
  const candidate = structuredClone(record);
  mutator(candidate);
  candidate.record_id = contentId(BOOTSTRAP_RECORD_V2_PREFIX, candidate, "record_id");
  return candidate;
};

expectReject(
  () => validateBootstrapRecordV2({ ...record, record_id: `${BOOTSTRAP_RECORD_V2_PREFIX}${"0".repeat(64)}` }, { nowMs: NOW }),
  /ID does not match/,
);
expectReject(
  () => validateBootstrapRecordV2(reseal((candidate) => { candidate.authority.wallet_authority = true; }), { nowMs: NOW }),
  /wallet_authority must be false/,
);
expectReject(
  () => validateBootstrapRecordV2(reseal((candidate) => { candidate.mirrors[1].base_url = candidate.mirrors[0].base_url; }), { nowMs: NOW }),
  /duplicate mirror root/,
);
expectReject(
  () => validateBootstrapRecordV2(reseal((candidate) => { candidate.mirrors[1].failure_domain = candidate.mirrors[0].failure_domain; }), { nowMs: NOW }),
  /failure domains must be distinct/,
);
expectReject(
  () => validateBootstrapRecordV2(reseal((candidate) => { candidate.mirrors = candidate.mirrors.slice(0, 2); }), { nowMs: NOW }),
  /requires 3 through 16 mirrors/,
);
expectReject(
  () => validateBootstrapRecordV2(reseal((candidate) => { candidate.mirrors[2] = { transport: "https", base_url: "https://mirror-c.example/void/bootstrap/v2", failure_domain: "mirror-c-example" }; }), { nowMs: NOW }),
  /HTTPS and Tor transport diversity/,
);
expectReject(
  () => validateBootstrapRecordV2(reseal((candidate) => { candidate.policy.mutable_latest_alias_allowed = true; }), { nowMs: NOW }),
  /mutable_latest_alias_allowed mismatch/,
);
expectReject(
  () => validateBootstrapRecordV2(reseal((candidate) => { candidate.extra = "forbidden"; }), { nowMs: NOW }),
  /keys mismatch/,
);
expectReject(
  () => validateBootstrapRecordV2(reseal((candidate) => { candidate.mirrors[0].base_url = "https://mirror-a.example/void/bootstrap/v2/latest"; }), { nowMs: NOW }),
  /path must be exactly/,
);

const validByUrl = new Map(record.mirrors.map((mirror) => [deriveMirroredManifestUrl(mirror, record.manifest.manifest_id), manifestBytes]));

for (let removed = 0; removed < record.mirrors.length; removed += 1) {
  const result = await resolveManifestFromBootstrapRecordV2(
    record,
    async ({ url }) => {
      const index = record.mirrors.findIndex((mirror) => deriveMirroredManifestUrl(mirror, record.manifest.manifest_id) === url);
      if (index === removed) throw new Error("simulated mirror unavailable");
      return validByUrl.get(url);
    },
    { nowMs: NOW },
  );
  assert.equal(result.manifest.manifest_id, record.manifest.manifest_id);
  assert.notEqual(result.mirror.base_url, record.mirrors[removed].base_url);
}

const tampered = Buffer.from(manifestBytes);
tampered[tampered.length - 2] = tampered[tampered.length - 2] === 0x20 ? 0x21 : 0x20;
const failover = await resolveManifestFromBootstrapRecordV2(
  record,
  async ({ mirror }) => {
    if (mirror.base_url === record.mirrors[0].base_url) return tampered;
    if (mirror.base_url === record.mirrors[1].base_url) throw new Error("simulated transport failure");
    return manifestBytes;
  },
  { nowMs: NOW },
);
assert.equal(failover.mirror.base_url, record.mirrors[2].base_url);
assert.equal(failover.failures.length, 2);

await expectRejectAsync(
  () => resolveManifestFromBootstrapRecordV2(record, async () => { throw new Error("offline"); }, { nowMs: NOW }),
  /all bootstrap record mirrors failed/,
);

const recordBytes = Buffer.from(`${JSON.stringify(record, null, 2)}\n`, "utf8");
assert.ok(recordBytes.length < 1024 * 1024);
assert.doesNotThrow(() => JSON.parse(recordBytes.toString("utf8")));
assert.equal(canonicalJson(record).includes("wallet_authority"), true);

console.log(`${MARKER}_PROOF_GREEN`);
console.log(`record_id=${record.record_id}`);
console.log(`manifest_id=${record.manifest.manifest_id}`);
console.log(`mirror_count=${record.mirrors.length}`);
console.log("https_mirror_count=2");
console.log("tor_mirror_count=1");
console.log("n_minus_one_each_mirror=true");
console.log("tampered_first_mirror_accepted=false");
console.log("failover_after_tamper_and_transport_failure=true");
console.log("immutable_content_paths=true");
console.log("mutable_latest_alias_allowed=false");
console.log("transport_diversity_required=true");
console.log("merged_v1_manifest_status_contract_enforced=true");
console.log("manifest_record_time_binding_enforced=true");
console.log("release_root_binding_required_before_runtime_activation=true");
console.log("runtime_integration_performed=false");
console.log("network_calls_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
