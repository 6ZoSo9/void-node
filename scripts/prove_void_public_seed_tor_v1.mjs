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
import {
  managedPathV1,
  renderTorSeedV1,
  validateLocalReadyV1,
  writeManagedFileV1,
} from "./install_void_public_seed_tor_v1.mjs";

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

let remoteRequestCount = 0;
await assert.rejects(
  () => qualifyTorSeedV1({
    onionHostname: onion,
    sourceSha: "a".repeat(40),
    socksHost: "192.0.2.10",
    socksPort: 19051,
    virtualPort: 80,
    samples: 3,
    intervalMs: 30_000,
    timeoutMs: 5_000,
    maxBytes: 1_000_000,
    request: async () => {
      remoteRequestCount += 1;
      throw new Error("remote request must not execute");
    },
  }),
  /numeric loopback/,
);
assert.equal(remoteRequestCount, 0);
console.log("[PASS] remote SOCKS proxy rejected before network access");

async function rejectTypeConfusedQualificationV1({
  readyBody = { ready: true, head: 7, gap: 0, txroot_live: 1 },
  latestBody = { number: 7 },
  rangeBody = [{ number: 7 }],
  expectedRequests,
}) {
  let requestCount = 0;
  await assert.rejects(
    () => qualifyTorSeedV1({
      onionHostname: onion,
      sourceSha: "a".repeat(40),
      socksHost: "127.0.0.1",
      socksPort: 19051,
      virtualPort: 80,
      samples: 3,
      intervalMs: 30_000,
      timeoutMs: 5_000,
      maxBytes: 1_000_000,
      request: async (_profile, route) => {
        requestCount += 1;
        if (route === "/__void/ready.json") return response(onion, readyBody);
        if (route === "/blocks/latest/number2.json") return response(onion, latestBody);
        if (route === "/blocks/range?from=7&to=7") return response(onion, rangeBody);
        throw new Error(`unexpected type-confusion route ${route}`);
      },
      sleep: async () => {},
      clock: () => "2026-08-06T12:00:00.000Z",
    }),
    /exact-green|must be an integer|exact qualified head/,
  );
  assert.equal(requestCount, expectedRequests);
}

await rejectTypeConfusedQualificationV1({
  readyBody: { ready: true, head: "7", gap: "0", txroot_live: "1" },
  expectedRequests: 1,
});
await rejectTypeConfusedQualificationV1({
  latestBody: { number: "7" },
  expectedRequests: 3,
});
await rejectTypeConfusedQualificationV1({
  rangeBody: [{ number: "7" }],
  expectedRequests: 3,
});
console.log("[PASS] type-confused live Tor responses cannot produce a qualification receipt");

const good = response(onion, { ready: true, head: 7, gap: 0, txroot_live: 1 });
const latest = response(onion, { number: 7 });
const range = response(onion, [{ number: 7 }]);
assert.throws(() => validateObservationV1({
  onionHostname: onion,
  readyResponse: { ...good, socks: { ...good.socks, remote_dns: false } },
  headResponse: latest,
  rangeResponse: range,
  virtualPort: 80,
  observedAt: "2026-08-06T12:00:00.000Z",
}), /remote name resolution/);
assert.throws(() => buildTorQualificationReceiptV1({
  sourceSha: "a".repeat(40), onionHostname: onion, virtualPort: 80, socksHost: "127.0.0.1", socksPort: 19051,
  observations: [
    { observed_at: "2026-08-06T12:00:00.000Z", head: 7 },
    { observed_at: "2026-08-06T12:00:00.000Z", head: 8 },
    { observed_at: "2026-08-06T12:01:00.000Z", head: 9 },
  ],
  generatedAt: "2026-08-06T12:01:30.000Z",
}), /strictly ordered/);

const freshObservations = [
  { observed_at: "2026-08-06T12:00:00.000Z", head: 7 },
  { observed_at: "2026-08-06T12:00:30.000Z", head: 8 },
  { observed_at: "2026-08-06T12:01:00.000Z", head: 9 },
];
assert.throws(() => buildTorQualificationReceiptV1({
  sourceSha: "a".repeat(40),
  onionHostname: onion,
  virtualPort: 80,
  socksHost: "127.0.0.1",
  socksPort: 19051,
  observations: freshObservations.map((item, index) =>
    index === 0 ? { ...item, extra: true } : item),
  generatedAt: "2026-08-06T12:01:30.000Z",
}), /keys mismatch/);
assert.throws(() => buildTorQualificationReceiptV1({
  sourceSha: "a".repeat(40),
  onionHostname: onion,
  virtualPort: 80,
  socksHost: "127.0.0.1",
  socksPort: 19051,
  observations: freshObservations.map((item, index) =>
    index === 0 ? { ...item, head: "7" } : item),
  generatedAt: "2026-08-06T12:01:30.000Z",
}), /must be an integer/);
assert.throws(() => buildTorQualificationReceiptV1({
  sourceSha: "a".repeat(40),
  onionHostname: onion,
  virtualPort: 80,
  socksHost: "127.0.0.1",
  socksPort: 19051,
  observations: freshObservations,
  generatedAt: "2026-08-06T12:10:00.000Z",
}), /stale/);
console.log("[PASS] DNS-leak, closed observation, freshness, and ordering rejection");

assert.equal(validateLocalReadyV1({
  ready: true,
  head: 7,
  gap: 0,
  txroot_live: 1,
}), 7);
for (const head of [undefined, "7", Number.NaN, 0]) {
  assert.throws(() => validateLocalReadyV1({
    ready: true,
    head,
    gap: 0,
    txroot_live: 1,
  }), /positive integer/);
}
console.log("[PASS] strict positive local readiness head");

const pathSafetyRoot = fs.mkdtempSync(
  path.join(os.homedir(), ".void-tor-seed-path-safety-"),
);
let outsideRoot = null;
try {
  outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-tor-seed-outside-"));
  const escape = path.join(pathSafetyRoot, "escape");
  fs.symlinkSync(outsideRoot, escape, "dir");
  assert.throws(
    () => managedPathV1(path.join(escape, "config"), ROOT, "test root"),
    /beneath HOME/,
  );

  const victim = path.join(pathSafetyRoot, "victim.txt");
  const link = path.join(pathSafetyRoot, "managed.txt");
  fs.writeFileSync(victim, "original\n", { mode: 0o600 });
  fs.symlinkSync(victim, link);
  assert.throws(
    () => writeManagedFileV1(link, "changed\n", 0o600, "test managed file"),
    /non-symlink regular file/,
  );
  assert.equal(fs.readFileSync(victim, "utf8"), "original\n");
  console.log("[PASS] managed path and symlink-target escape rejection");
} finally {
  fs.rmSync(pathSafetyRoot, { recursive: true, force: true });
  if (outsideRoot) fs.rmSync(outsideRoot, { recursive: true, force: true });
}

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
const writeRenderSource = /function writeRender[\s\S]*?\n}\n\nasync function fetchReady/.exec(installer)?.[0];
assert.ok(writeRenderSource, "writeRender source not found");
assert.doesNotMatch(writeRenderSource, /"enable"/);
assert.match(writeRenderSource, /disableAutoStartV1\(\{ stop: true \}\)/);
assert.ok(
  writeRenderSource.indexOf("disableAutoStartV1") <
    writeRenderSource.indexOf("prepareOwnedRoot"),
  "existing units must be disabled and stopped before managed file mutation",
);
assert.match(writeRenderSource, /writeManagedFileV1/);
const activateSource = /async function activate[\s\S]*?\n}\n\nasync function main/.exec(installer)?.[0];
assert.ok(activateSource, "activate source not found");
assert.match(activateSource, /"enable"/);
assert.ok(
  activateSource.indexOf("try {") < activateSource.indexOf("fetchReady"),
  "activation cleanup must cover readiness failures",
);
assert.ok(
  activateSource.indexOf("try {") < activateSource.indexOf("portAvailable"),
  "activation cleanup must cover port failures",
);
assert.match(activateSource, /disableAutoStartV1\(\{ stop: true \}\)/);
const mainSource = /async function main[\s\S]*?\n}\n\nconst invoked/.exec(installer)?.[0];
assert.ok(mainSource, "main source not found");
assert.ok(
  mainSource.indexOf("VOID_PUBLIC_SEED_TOR_CONFIRM") <
    mainSource.indexOf("writeRender(options, rendered)"),
  "activation confirmation must precede installation mutation",
);
assert.match(installer, /"disable", "--now"/);
assert.match(installer, /onion_identity_preserved=true/);
assert.doesNotMatch(installer, /rmSync\([^\n]*hidden|unlinkSync\([^\n]*hostname/);
console.log("[PASS] fail-closed activation and identity preservation");

console.log(`${MARKER}_GREEN`);
console.log("tor_v3=true");
console.log("onion_identity_persistent=true");
console.log("socks_proxy_loopback_preflight=true");
console.log("activation_confirmation_precedes_mutation=true");
console.log("activation_cleanup_covers_prestart_failures=true");
console.log("install_auto_start_enabled=false");
console.log("install_services_stopped=true");
console.log("managed_path_symlink_escape_rejected=true");
console.log("managed_file_symlink_target_rejected=true");
console.log("strict_positive_local_head_required=true");
console.log("remote_numeric_response_types_strict=true");
console.log("type_confused_qualification_receipt_emitted=false");
console.log("qualification_observations_fresh=true");
console.log("socks_remote_dns=true");
console.log("dns_required=false");
console.log("registrar_required=false");
console.log("certificate_authority_required=false");
console.log("cloud_account_required=false");
console.log("tailnet_required=false");
console.log("manifest_published=false");
console.log("services_started=false");
console.log("wallet_signer_validator_wc_money_authority=0");
