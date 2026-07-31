#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
  webcrypto,
} from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import {
  bindingSigningBytes,
  canonicalJson,
  fetchBoundedJson,
  intersectReadOnlyCapabilities,
  normalizeEndpoint,
  permissionOrigin,
  verifySignedOnionBinding,
} from "../integrations/browser/void-browser-agent-access-kit-v1/core.mjs";

const ROOT = process.cwd();
const EXTENSION = path.join(
  ROOT,
  "integrations/browser/void-browser-agent-access-kit-v1",
);

function base32(bytes) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let accumulator = 0;
  let bits = 0;
  let output = "";
  for (const byte of bytes) {
    accumulator = accumulator * 256 + byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      const divisor = 2 ** bits;
      output += alphabet[Math.floor(accumulator / divisor) & 31];
      accumulator %= divisor;
    }
  }
  if (bits > 0) output += alphabet[(accumulator << (5 - bits)) & 31];
  return output;
}

function onionHostname() {
  const publicKey = randomBytes(32);
  const version = Buffer.from([3]);
  const checksum = createHash("sha3-256")
    .update(Buffer.from(".onion checksum", "ascii"))
    .update(publicKey)
    .update(version)
    .digest()
    .subarray(0, 2);
  return `${base32(Buffer.concat([publicKey, checksum, version]))}.onion`;
}

function fixture(nowMs) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const der = publicKey.export({ type: "spki", format: "der" });
  const hostname = onionHostname();
  const binding = {
    marker: "VOID_NODE_ONION_BINDING_V1",
    version: 1,
    status: "active",
    issued_at: new Date(nowMs - 60_000).toISOString(),
    expires_at: new Date(nowMs + 60_000).toISOString(),
    node: {
      node_id: "0123456789abcdef0123456789abcdef",
      key_type: "ed25519",
      public_key_pem: pem,
      public_key_fingerprint_sha256: createHash("sha256").update(der).digest("hex"),
      node_id_attestation: "signed-by-existing-void-node-key-v1",
    },
    transport: {
      protocol: "tor-v3",
      onion_hostname: hostname,
      uri: `http://${hostname}`,
      virtual_port: 80,
      address_role: "transport-endpoint",
    },
    surface: {
      id: "void-public-node-static-read-only-v1",
      methods: ["GET", "HEAD"],
      binding_paths: [
        "/.well-known/void-node-onion-binding-v1.json",
        "/public-node/transports/tor-v1-binding.json",
      ],
      descriptor_paths: [
        "/.well-known/void-tor-onion-transport-v1.json",
        "/public-node/transports/tor-v1.json",
      ],
    },
    authority: {
      read_only: true,
      transaction_submission: false,
      p2p_listener: false,
      mcp_listener: false,
      wallet_or_signer_access: false,
      work_credit_write: false,
      void_settlement: false,
      node_runtime_mutation: false,
      operator_control: false,
    },
    signature: {
      domain: "VOID_NODE_ONION_BINDING_V1",
      algorithm: "ed25519",
      encoding: "base64",
      canonicalization: "void-canonical-json-v1",
      value: "",
    },
  };
  binding.signature.value = sign(
    null,
    Buffer.from(bindingSigningBytes(binding)),
    privateKey,
  ).toString("base64");
  return binding;
}

function catalog() {
  return {
    marker: "VOID_AI_AGENT_CAPABILITY_NEGOTIATION_V1",
    network: { chain_id: 2050, name: "VOID Mainnet-0" },
    authority: {
      mutation_authority_granted: false,
      payment_submission_active: false,
      work_credit_awards_active: false,
      buy_void_automatic_fulfillment_active: false,
    },
    capabilities: [
      {
        id: "public_discovery",
        enabled: true,
        state: "live",
        access: "anonymous",
        authority: "read_only",
        http_methods: ["GET", "HEAD"],
        paths: ["/.well-known/void-agent-discovery.json"],
      },
      {
        id: "wallet_treasury_or_ledger_mutation",
        enabled: false,
        state: "guarded",
        access: "not_published",
        authority: "not_granted",
        http_methods: [],
        paths: [],
      },
    ],
  };
}

async function rejects(action, pattern) {
  await assert.rejects(action, pattern);
}

for (const relative of [
  "manifest.json",
  "trust-pins.json",
  "core.mjs",
  "popup.html",
  "popup.css",
  "popup.mjs",
  "README.md",
]) {
  assert.ok(fs.statSync(path.join(EXTENSION, relative)).isFile());
}

const manifest = JSON.parse(fs.readFileSync(path.join(EXTENSION, "manifest.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ["storage"]);
assert.equal(manifest.background, undefined);
assert.equal(manifest.content_scripts, undefined);
assert.deepEqual(manifest.optional_host_permissions, ["http://*/*", "https://*/*"]);

assert.equal(normalizeEndpoint("https://node.example/"), "https://node.example");
assert.equal(permissionOrigin("https://node.example/"), "https://node.example/*");
assert.throws(() => normalizeEndpoint("https://user:pass@node.example/"), /credentials/);
assert.throws(() => normalizeEndpoint("https://node.example/path"), /path/);
assert.throws(() => normalizeEndpoint("file:///tmp/void"), /protocol/);

const nowMs = Date.parse("2026-07-31T12:00:00.000Z");
const binding = fixture(nowMs);
const endpoint = `http://${binding.transport.onion_hostname}`;
const bindingSha256 = createHash("sha256")
  .update(Buffer.from(`${JSON.stringify(binding)}\n`))
  .digest("hex");
const trustPins = {
  marker: "VOID_BROWSER_AGENT_TRUST_PINS_V1",
  version: 1,
  network: { chain_id: 2050, identity: "mainnet0" },
  source: {
    repository: "6ZoSo9/void-node",
    base_commit: "3c5ae398366a959c198096f2051ae37cd64e4e7e",
    profile_path: "config/void-tor-agent-access-client-v1.json",
  },
  trust: {
    onion_hostname: binding.transport.onion_hostname,
    node_id: binding.node.node_id,
    public_key_fingerprint_sha256: binding.node.public_key_fingerprint_sha256,
    binding_sha256: bindingSha256,
    binding_expires_at: binding.expires_at,
  },
};
const verified = await verifySignedOnionBinding(binding, endpoint, {
  cryptoImpl: webcrypto,
  nowMs,
  trustPins,
  observedBindingSha256: bindingSha256,
});
assert.equal(verified.endpoint_is_onion, true);
assert.equal(verified.signed_onion_hostname, binding.transport.onion_hostname);
assert.equal(verified.authority.read_only, true);
assert.equal(verified.authority.operator_control, false);

const tampered = structuredClone(binding);
tampered.transport.uri = "http://tampered.invalid";
await rejects(
  () => verifySignedOnionBinding(tampered, endpoint, {
    cryptoImpl: webcrypto,
    nowMs,
    trustPins,
    observedBindingSha256: bindingSha256,
  }),
  /transport profile|signature/,
);

const elevated = structuredClone(binding);
elevated.authority.operator_control = true;
await rejects(
  () => verifySignedOnionBinding(elevated, endpoint, {
    cryptoImpl: webcrypto,
    nowMs,
    trustPins,
    observedBindingSha256: bindingSha256,
  }),
  /authority.operator_control/,
);

const expired = structuredClone(binding);
await rejects(
  () => verifySignedOnionBinding(expired, endpoint, {
    cryptoImpl: webcrypto,
    nowMs: nowMs + 120_000,
    trustPins,
    observedBindingSha256: bindingSha256,
  }),
  /expired/,
);

const intersection = intersectReadOnlyCapabilities(catalog());
assert.deepEqual(intersection.granted, ["public_discovery"]);
assert.deepEqual(intersection.not_granted, [{
  id: "wallet_treasury_or_ledger_mutation",
  reason: "not_explicitly_live_anonymous_read_only",
}]);

const mutatingCatalog = catalog();
mutatingCatalog.authority.payment_submission_active = true;
assert.throws(
  () => intersectReadOnlyCapabilities(mutatingCatalog),
  /authority boundary/,
);

const staticTrustPins = JSON.parse(
  fs.readFileSync(path.join(EXTENSION, "trust-pins.json"), "utf8"),
);
assert.deepEqual(staticTrustPins, {
  marker: "VOID_BROWSER_AGENT_TRUST_PINS_V1",
  version: 1,
  network: { chain_id: 2050, identity: "mainnet0" },
  source: {
    repository: "6ZoSo9/void-node",
    base_commit: "3c5ae398366a959c198096f2051ae37cd64e4e7e",
    profile_path: "config/void-tor-agent-access-client-v1.json",
  },
  trust: {
    onion_hostname: "r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion",
    node_id: "9d89483769e469e0473b489dc50dba96",
    public_key_fingerprint_sha256: "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b",
    binding_sha256: "f625a192b3f97a29513603b2a433e4acc86f15fb81f9fa536cc44541e5873521",
    binding_expires_at: "2027-01-26T08:39:09.089Z",
  },
});

const server = http.createServer((request, response) => {
  if (request.url === "/ok") {
    const body = Buffer.from(canonicalJson({ ok: true }));
    response.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(body.length),
    });
    response.end(body);
    return;
  }
  if (request.url === "/large") {
    const body = Buffer.alloc(2048, 0x61);
    response.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(body.length),
    });
    response.end(body);
    return;
  }
  response.writeHead(302, { location: "/ok" });
  response.end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  assert.deepEqual(await fetchBoundedJson(`${origin}/ok`, { maximum: 128 }), { ok: true });
  await rejects(() => fetchBoundedJson(`${origin}/large`, { maximum: 128 }), /too large/);
  await rejects(() => fetchBoundedJson(`${origin}/redirect`, { maximum: 128 }), /request failed/);
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

const source = ["core.mjs", "popup.mjs"].map((name) => (
  fs.readFileSync(path.join(EXTENSION, name), "utf8")
)).join("\n");
for (const forbidden of [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /XMLHttpRequest/,
  /private[_-]?key/i,
  /mnemonic/i,
  /seed[_-]?phrase/i,
]) {
  assert.equal(forbidden.test(source), false, `forbidden source pattern: ${forbidden}`);
}

console.log("VOID_BROWSER_AGENT_ACCESS_KIT_V1_PROOF_GREEN");
console.log("manifest_v3=true");
console.log("content_scripts=false");
console.log("background_service=false");
console.log("origin_permission_user_gesture=true");
console.log("signed_onion_binding_verified=true");
console.log("canonical_void_identity_pinned=true");
console.log("ed25519_webcrypto_verified=true");
console.log("capability_intersection_fail_closed=true");
console.log("redirects_rejected=true");
console.log("response_size_bounded=true");
console.log("mutation=false");
console.log("payment_execution=false");
console.log("fund_movement=false");
