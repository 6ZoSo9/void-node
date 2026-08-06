#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildTorQualificationReceiptV1,
  qualifyTorSeedV1,
  validateObservationV1,
} from "./qualify_void_public_seed_tor_v1.mjs";
import { renderTorSeedV1 } from "./install_void_public_seed_tor_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_TOR_V1_PROOF";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

function encodeBase32(bytes) {
  let acc = 0; let bits = 0; let output = "";
  for (const byte of bytes) {
    acc = acc * 256 + byte; bits += 8;
    while (bits >= 5) { bits -= 5; const divisor = 2 ** bits; output += BASE32[Math.floor(acc / divisor) & 31]; acc %= divisor; }
  }
  if (bits > 0) output += BASE32[(acc * (2 ** (5 - bits))) & 31];
  return output;
}

function onionV3() {
  const publicKey = crypto.randomBytes(32);
  const checksum = crypto.createHash("sha3-256").update(Buffer.from(".onion checksum")).update(publicKey).update(Buffer.from([3])).digest().subarray(0, 2);
  return `${encodeBase32(Buffer.concat([publicKey, checksum, Buffer.from([3])]))}.onion`;
}

function response(onion, body, { remoteDns = true } = {}) {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  return {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "x-void-public-seed-gateway": "v1" },
    body: bytes,
    socks: {
      remote_dns: remoteDns,
      address_type: "domain",
      requested_hostname: onion,
      requested_port: 80,
    },
  };
}

const onion = onionV3();
let observationIndex = 0;
let phase = 0;
const request = async (_profile, route) => {
  const head = 1000 + observationIndex;
  let result;
  if (route === "/__void/ready.json") {
    phase = 1;
    result = response(onion, { ready: true, head, gap: 0, txroot_live: 1 });
  } else if (route === "/blocks/latest/number2.json" && phase === 1) {
    phase = 2;
    result = response(onion, { number: head });
  } else if (route === `/blocks/range?from=${head}&to=${head}` && phase === 2) {
    result = response(onion, [{ number: head }]);
    phase = 0;
    observationIndex += 1;
  } else {
    throw new Error(`unexpected proof request ${route}`);
  }
  return result;
};
let clockIndex = 0;
const receipt = await qualifyTorSeedV1({
  onionHostname: onion,
  sourceSha: "a".repeat(40),
  socksHost: "127.0.0.1",
  socksPort: 19051,
  virtualPort: 80,
  samples: 3,
  intervalMs: 30_000,
  timeoutMs: 5_000,
  maxBytes: 1_000_000,
  request,
  sleep: async () => {},
  clock: () => new Date(Date.UTC(2026, 7, 6, 12, 0, 0) + clockIndex++ * 30_000).toISOString(),
});
assert.match(receipt.qualification_id, /^voidptq1_[0-9a-f]{64}$/);
assert.equal(receipt.transport.socks_remote_dns, true);
assert.equal(receipt.transport.dns_required, false);
assert.equal(receipt.transport.registrar_required, false);
assert.equal(receipt.transport.certificate_authority_required, false);
assert.equal(receipt.transport.cloud_account_required, false);
assert.equal(receipt.transport.tailnet_required, false);
assert.equal(receipt.maximum_head, 1002);
assert.deepEqual(new Set(Object.values(receipt.authority)), new Set([false]));
console.log("[PASS] content-addressed exact-green Tor qualification");

const good = response(onion, { ready: true, head: 7, gap: 0, txroot_live: 1 });
const latest = response(onion, { number: 7 });
const range = response(onion, [{ number: 7 }]);
assert.throws(() => validateObservationV1({
  onionHostname: onion,
  readyResponse: { ...good, socks: { ...good.socks, remote_dns: false } },
  headResponse: latest,
  rangeResponse: range,
  observedAt: "2026-08-06T12:00:00.000Z",
}), /remote name resolution/);
assert.throws(() => buildTorQualificationReceiptV1({
  sourceSha: "a".repeat(40), onionHostname: onion, virtualPort: 80, socksHost: "127.0.0.1", socksPort: 19051,
  observations: [
    { observed_at: "2026-08-06T12:00:00.000Z", head: 7 },
    { observed_at: "2026-08-06T12:00:00.000Z", head: 8 },
    { observed_at: "2026-08-06T12:01:00.000Z", head: 9 },
  ],
}), /strictly ordered/);
console.log("[PASS] DNS-leak and observation-order rejection");

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-tor-seed-proof-"));
try {
  const fakeTor = path.join(temporary, "tor");
  fs.writeFileSync(fakeTor, "#!/usr/bin/env bash\nexit 0\n", { mode: 0o700 });
  const options = {
    repoRoot: ROOT,
    nodePath: process.execPath,
    torPath: fakeTor,
    configRoot: path.join(temporary, "config"),
    dataRoot: path.join(temporary, "data"),
    stateRoot: path.join(temporary, "state"),
    gatewayPort: 4111,
    socksPort: 19051,
    virtualPort: 80,
  };
  const rendered = renderTorSeedV1(options);
  assert.match(rendered.torrc, /SocksPort 127\.0\.0\.1:19051 IsolateSOCKSAuth/);
  assert.match(rendered.torrc, /HiddenServiceVersion 3/);
  assert.match(rendered.torrc, /HiddenServicePort 80 127\.0\.0\.1:4111/);
  assert.doesNotMatch(rendered.torrc, /DNSPort|TransPort|0\.0\.0\.0|100\./);
  const combined = `${rendered.gatewayUnit}\n${rendered.torUnit}`;
  assert.doesNotMatch(combined, /WorkingDirectory=|cloudflare|tailscale|--token|0\.0\.0\.0/iu);
  assert.match(combined, /ProtectSystem=strict/);
  assert.match(combined, /ProtectHome=read-only/);
  const gateway = path.join(temporary, "void-public-seed-tor-gateway-v1.service");
  const tor = path.join(temporary, "void-public-seed-tor-v1.service");
  fs.writeFileSync(gateway, rendered.gatewayUnit);
  fs.writeFileSync(tor, rendered.torUnit);
  if (childProcess.spawnSync("bash", ["-lc", "command -v systemd-analyze >/dev/null"], { encoding: "utf8" }).status === 0) {
    const verified = childProcess.spawnSync("systemd-analyze", ["verify", gateway, tor], { encoding: "utf8" });
    assert.equal(verified.status, 0, verified.stderr || verified.stdout);
  }
  console.log("[PASS] Tor v3 loopback-only systemd render");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

for (const relative of [
  "scripts/install_void_public_seed_tor_v1.mjs",
  "scripts/qualify_void_public_seed_tor_v1.mjs",
  "scripts/prove_void_public_seed_tor_v1.mjs",
]) {
  const source = fs.readFileSync(path.join(ROOT, relative), "utf8");
  assert.doesNotMatch(source, /catch\s*\{\s*\}/);
  assert.doesNotMatch(source, /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/);
}
const installer = fs.readFileSync(path.join(ROOT, "scripts/install_void_public_seed_tor_v1.mjs"), "utf8");
assert.match(installer, /activate-void-public-seed-tor-v1/);
assert.match(installer, /disable", "--now"/);
assert.match(installer, /onion_identity_preserved=true/);
assert.doesNotMatch(installer, /rmSync\([^\n]*hidden|unlinkSync\([^\n]*hostname/);
console.log("[PASS] fail-closed activation and identity preservation");

console.log(`${MARKER}_GREEN`);
console.log("tor_v3=true");
console.log("onion_identity_persistent=true");
console.log("socks_remote_dns=true");
console.log("dns_required=false");
console.log("registrar_required=false");
console.log("certificate_authority_required=false");
console.log("cloud_account_required=false");
console.log("tailnet_required=false");
console.log("manifest_published=false");
console.log("services_started=false");
console.log("wallet_signer_validator_wc_money_authority=0");
