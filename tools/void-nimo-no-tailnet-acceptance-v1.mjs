#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { objectWithId, sha256Hex } from "../scripts/lib/void_public_seed_common_v1.mjs";

export const VOID_NIMO_NO_TAILNET_ACCEPTANCE_V1 =
  "void_nimo_no_tailnet_acceptance_v1";

const HOLD_EXIT = 2;
const DEFAULT_HTTP_BASE = "http://127.0.0.1:4100";
const HTTP_PROXY_ENV_KEYS = Object.freeze([
  "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy",
]);
const MAX_MANIFEST_BYTES = 1024 * 1024;
const TARGET_SAMPLE_COUNT = 3;
const TARGET_SAMPLE_INTERVAL_MS = 1000;
const HTTP_MAX_BYTES = 2 * 1024 * 1024;
const HTTP_MAX_READS = 1024;
const HTTP_DEADLINE_MS = 10_000;
const HTTP_CLEANUP_MS = 250;
const PEER_ID = /^[0-9a-f]{32}$/;
const MAX_CONNECTED_PEERS = 4096;
const MAX_VERIFIED_PEERS = 128;
const MANUAL_BOOTSTRAP_ENV_KEYS = Object.freeze([
  "BOOTSTRAP_ADDRS",
  "BOOTSTRAP",
  "VOID_FOLLOWER_AUTOSTART_PEERS",
  "VOID_FOLLOWER_AUTOSTART_PEER",
  "VOID_FOLLOWER_LEGACY_V2FS_ORIGINS",
  "VOID_MAIN_BASE",
  "VOID_DRIFT_PEER",
  "VOID_PUBLIC_SEED_CLIENT_PEERS",
  "VOID_TOR_PUBLIC_SEED_CLIENT_PEERS",
  "VOID_SITE_BUNDLE_PEERS",
  "VOID_DATANET_SITE_BUNDLE_PEERS",
  "VOID_DATANET_PEERS",
]);

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function fail(message) {
  throw new Error(message);
}

export function assertNoManualBootstrapOverridesV1(environment) {
  // This is the checker's input environment, not an attestation of the node's
  // effective configuration. Reject presence without reading address values.
  for (const key of MANUAL_BOOTSTRAP_ENV_KEYS) {
    if (Object.hasOwn(environment, key)) fail(`${key} manual bootstrap override must be absent`);
  }
}

function canonicalLocalHttpBase(environment) {
  // Compare the original spelling; URL normalization must not admit aliases,
  // userinfo, alternate ports or paths. Empty overrides are invalid, not defaults.
  if (Object.hasOwn(environment, "VOID_NIMO_LOCAL_HTTP_BASE") &&
      environment.VOID_NIMO_LOCAL_HTTP_BASE !== DEFAULT_HTTP_BASE) {
    fail("VOID_NIMO_LOCAL_HTTP_BASE must be exactly http://127.0.0.1:4100 or absent");
  }
  // Inspect presence only: proxy values can contain credentials. Do not copy,
  // parse or log them, and do not depend on runtime-specific NO_PROXY behavior.
  if (HTTP_PROXY_ENV_KEYS.some(key => Object.hasOwn(environment, key))) {
    fail("local HTTP observations require HTTP proxy environment keys to be absent");
  }
  return DEFAULT_HTTP_BASE;
}

function positiveHead(value, label) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    fail(`${label} must be a positive safe integer JSON number`);
  }
  return value;
}

function ipv4Parts(raw) {
  if (net.isIP(raw) !== 4) return;
  const parts = raw.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return;
  return parts;
}

export function isTailnetCgnatIpv4V1(raw) {
  const parts = ipv4Parts(String(raw || ""));
  return Boolean(parts && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127);
}

function isNonPublicIpv4V1(raw) {
  const parts = ipv4Parts(raw);
  if (!parts) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true;
  return false;
}

export function assertNoTailnetMachineV1({
  interfaces = [],
  processText = "",
  tailscaleBinaryPresent = false,
  environment = {},
} = {}) {
  assertNoManualBootstrapOverridesV1(environment);
  if (tailscaleBinaryPresent) fail("tailscale executable is present");
  if (/\btailscaled\b/i.test(String(processText))) fail("tailscaled process is present");

  if (!Array.isArray(interfaces)) fail("interfaces must be an array");
  for (const record of interfaces) {
    const item = plainObject(record, "interface record");
    const ifname = String(item.ifname || "");
    if (/^tailscale/i.test(ifname)) fail(`Tailnet interface present: ${ifname}`);
    const addressInfo = Array.isArray(item.addr_info) ? item.addr_info : [];
    for (const address of addressInfo) {
      const local = String(address?.local || "");
      if (isTailnetCgnatIpv4V1(local)) {
        fail(`Tailnet/CGNAT local address present: ${local}`);
      }
    }
  }

  return Object.freeze({
    tailscale_binary_present: false,
    tailscaled_process_present: false,
    tailscale_interface_present: false,
    tailnet_address_present: false,
    private_tailnet_env_present: false,
  });
}

function endpointHostPublicEnoughV1(base) {
  let url;
  try {
    url = new URL(String(base));
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    return false;
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return false;
  }
  if (hostname.endsWith(".ts.net") || hostname.includes("tailscale")) return false;
  if (net.isIP(hostname) === 4 && isNonPublicIpv4V1(hostname)) return false;
  if (net.isIP(hostname) === 6 && (hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe8") || hostname.startsWith("fe9") || hostname.startsWith("fea") || hostname.startsWith("feb"))) {
    return false;
  }
  return true;
}

export function validateBootstrapManifestNoTailnetV1(
  rawManifest,
  { requireStable = true } = {},
) {
  const manifest = plainObject(structuredClone(rawManifest), "bootstrap manifest");
  if (manifest.schema !== "void_public_bootstrap_v1") fail("bootstrap manifest schema mismatch");
  if (manifest.network !== "VOID Network" || manifest.chain_id !== 2050) {
    fail("bootstrap manifest network/chain mismatch");
  }
  if (manifest.private_tailnet_endpoints_published !== false) {
    fail("bootstrap manifest publishes private Tailnet endpoints");
  }

  const authority = plainObject(manifest.authority, "bootstrap manifest authority");
  for (const [key, value] of Object.entries(authority)) {
    if (value !== false) fail(`bootstrap authority ${key} must be false`);
  }

  if (!Array.isArray(manifest.sync_endpoints)) fail("sync_endpoints must be an array");

  if (manifest.status === "hold_no_stable_seed") {
    if (manifest.sync_endpoints.length !== 0) fail("hold manifest must not publish sync endpoints");
    if (requireStable) fail("stable public HTTPS seed is not published");
    return Object.freeze({ stable: false, endpoint_count: 0 });
  }

  if (manifest.status !== "stable_https_seed") fail("bootstrap manifest status is unsupported");
  if (manifest.sync_endpoints.length < 1) fail("stable manifest has no sync endpoints");
  if (!/^voidpbm1_[0-9a-f]{64}$/.test(manifest.manifest_id || "") ||
      objectWithId("voidpbm1_", manifest, "manifest_id").manifest_id !== manifest.manifest_id) {
    fail("bootstrap manifest content ID mismatch");
  }
  const expiresAt = Date.parse(manifest.expires_at);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) fail("bootstrap manifest is expired or has invalid expiry");
  let targetHead = 0;

  for (const endpoint of manifest.sync_endpoints) {
    const item = plainObject(endpoint, "bootstrap sync endpoint");
    if (item.enabled !== true || item.temporary !== false) {
      fail("bootstrap endpoint is disabled or temporary");
    }
    if (!endpointHostPublicEnoughV1(item.base)) {
      fail(`bootstrap endpoint is not acceptable public HTTPS: ${item.base}`);
    }
    targetHead = Math.max(targetHead, positiveHead(item.qualified_head, "enabled endpoint qualified_head"));
  }

  return Object.freeze({ stable: true, endpoint_count: manifest.sync_endpoints.length,
    manifest_id: manifest.manifest_id, target_head: targetHead, expires_at_ms: expiresAt });
}

export function validateReadySnapshotV1(raw) {
  const ready = plainObject(raw, "ready snapshot");
  if (ready.ready !== true) fail("ready snapshot is not ready");
  if (ready.gap !== 0) fail("ready snapshot gap is not zero");
  if (ready.txroot_live !== 1) fail("ready snapshot txroot_live is not 1");
  if (Array.isArray(ready.reasons) && ready.reasons.length !== 0) {
    fail("ready snapshot has reasons");
  }
  return ready;
}

export function validateHeadSnapshotV1(raw) {
  const head = plainObject(raw, "head snapshot");
  return positiveHead(head.number, "head snapshot number");
}

export function validateQualifiedTargetSnapshotV1(rawReady, rawHead, target) {
  positiveHead(target, "qualified target");
  const ready = validateReadySnapshotV1(rawReady);
  const readyHead = positiveHead(ready.head, "readiness head");
  const head = validateHeadSnapshotV1(rawHead);
  if (readyHead !== head) fail("ready/head mismatch");
  if (head < target) fail(`local head ${head} is below qualified target ${target}`);
  return head;
}

function peerRecord(raw, fields, label) {
  const record = plainObject(raw, label);
  const prototype = Object.getPrototypeOf(record);
  if (prototype !== null && prototype !== Object.prototype) fail(`${label} must be a plain object`);
  const keys = Object.keys(record);
  if (keys.length !== fields.length || fields.some(key => !Object.hasOwn(record, key))) {
    fail(`${label} fields do not match the peer snapshot contract`);
  }
  return record;
}

function peerText(value, label) {
  if (typeof value !== "string" || value.length < 1 || value.length > 512 || /[\s\u0000-\u001f\u007f]/u.test(value)) {
    fail(`${label} must be bounded nonempty address text`);
  }
}

function peerAddressList(value, minimum, maximum, label) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    fail(`${label} address count is invalid`);
  }
  const seen = new Set();
  for (const address of value) {
    peerText(address, label);
    if (seen.has(address)) fail(`${label} contains duplicate addresses`);
    seen.add(address);
  }
}

export function validatePeersSnapshotV1(raw) {
  const peers = plainObject(raw, "peer snapshot");
  if (peers.ok !== true) fail("peer snapshot ok must be true");
  if (!Array.isArray(peers.connected) || peers.connected.length < 1) {
    fail("no connected P2P peer is present");
  }
  if (!Array.isArray(peers.verifiedPeers) || peers.verifiedPeers.length < 1) {
    fail("no verified P2P peer is present");
  }
  if (peers.connected.length > MAX_CONNECTED_PEERS || peers.verifiedPeers.length > MAX_VERIFIED_PEERS) {
    fail("peer snapshot record count exceeds admission ceiling");
  }
  const connectedIds = new Set(), verifiedIds = new Set(), verifiedAddresses = new Set();
  for (const rawPeer of peers.connected) {
    const peer = peerRecord(rawPeer, ["id", "addr", "listens", "outbound"], "connected peer");
    if (typeof peer.id !== "string" || peer.id.length !== 32 || !PEER_ID.test(peer.id)) fail("connected peer id is invalid");
    if (connectedIds.has(peer.id)) fail("duplicate connected peer id");
    peerText(peer.addr, "connected peer addr");
    peerAddressList(peer.listens, 0, 32, "connected peer listens");
    if (typeof peer.outbound !== "boolean") fail("connected peer outbound must be a boolean");
    connectedIds.add(peer.id);
  }
  for (const rawPeer of peers.verifiedPeers) {
    const peer = peerRecord(rawPeer, ["node_id", "addresses", "last_authenticated_at_ms"], "verified peer");
    if (typeof peer.node_id !== "string" || peer.node_id.length !== 32 || !PEER_ID.test(peer.node_id)) fail("verified peer node_id is invalid");
    if (verifiedIds.has(peer.node_id)) fail("duplicate verified peer node_id");
    peerAddressList(peer.addresses, 1, 8, "verified peer addresses");
    for (const address of peer.addresses) {
      if (verifiedAddresses.has(address)) fail("verified peer address has ambiguous identity ownership");
      verifiedAddresses.add(address);
    }
    if (typeof peer.last_authenticated_at_ms !== "number" ||
        !Number.isSafeInteger(peer.last_authenticated_at_ms) || peer.last_authenticated_at_ms < 0) {
      fail("verified peer last_authenticated_at_ms must be a nonnegative safe integer");
    }
    verifiedIds.add(peer.node_id);
  }
  let verifiedConnected = 0;
  for (const id of connectedIds) if (verifiedIds.has(id)) verifiedConnected += 1;
  if (verifiedConnected < 1) fail("no connected peer has a matching verified record");
  return Object.freeze({
    connected_count: connectedIds.size,
    verified_count: verifiedIds.size,
    verified_connected_count: verifiedConnected,
  });
}

function runReadOnly(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    ...options,
  });
  return result;
}

function commandPresent(name) {
  const result = runReadOnly("/bin/sh", ["-lc", `command -v ${name} 2>/dev/null || true`]);
  return Boolean(String(result.stdout || "").trim());
}

function loadInterfaces() {
  const result = runReadOnly("ip", ["-j", "address", "show"]);
  if (result.status !== 0) fail(`ip address inspection failed: ${String(result.stderr || "").trim()}`);
  return JSON.parse(result.stdout);
}

function processList() {
  const result = runReadOnly("ps", ["-eo", "comm=,args="]);
  if (result.status !== 0) fail("process inspection failed");
  return String(result.stdout || "");
}

function assertRepoLease() {
  const top = runReadOnly("git", ["rev-parse", "--show-toplevel"]);
  if (top.status !== 0) fail("current directory is not a Git repository");
  const root = String(top.stdout || "").trim();
  if (root !== process.cwd()) fail("run from the repository root");

  const branch = runReadOnly("git", ["branch", "--show-current"]);
  const head = runReadOnly("git", ["rev-parse", "HEAD"]);
  const originMain = runReadOnly("git", ["rev-parse", "origin/main"]);
  const status = runReadOnly("git", ["status", "--porcelain=v1", "--untracked-files=all"]);
  if ([branch, head, originMain, status].some((result) => result.status !== 0)) {
    fail("repository lease inspection failed");
  }
  if (String(branch.stdout).trim() !== "main") fail("acceptance requires branch main");
  if (String(head.stdout).trim() !== String(originMain.stdout).trim()) {
    fail("local HEAD does not equal origin/main");
  }
  if (String(status.stdout).trim() !== "") fail("repository must be clean");
  return String(head.stdout).trim();
}

function assertMachineNoTailnetProduction() {
  return assertNoTailnetMachineV1({
    interfaces: loadInterfaces(),
    processText: processList(),
    tailscaleBinaryPresent: commandPresent("tailscale") || commandPresent("tailscaled"),
    environment: process.env,
  });
}

function localManifest() {
  const fd = fs.openSync("public/bootstrap/v1.json", fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 || before.size <= 0 || before.size > MAX_MANIFEST_BYTES) {
      fail("bootstrap manifest must be one bounded regular file");
    }
    const bytes = Buffer.alloc(before.size + 1);
    let total = 0, eof = false;
    for (let reads = 0; reads < 64; reads += 1) {
      const count = fs.readSync(fd, bytes, total, bytes.length - total, total);
      if (count === 0) { eof = true; break; }
      total += count;
      if (total > before.size) fail("bootstrap manifest grew during read");
    }
    const after = fs.fstatSync(fd);
    if (!eof || total !== before.size ||
        ["dev", "ino", "mode", "nlink", "size", "mtimeMs", "ctimeMs"].some(key => before[key] !== after[key])) {
      fail("bootstrap manifest changed during bounded read");
    }
    const raw = bytes.subarray(0, total);
    const decision = validateBootstrapManifestNoTailnetV1(JSON.parse(raw.toString("utf8")));
    return Object.freeze({ ...decision, manifest_sha256: sha256Hex(raw) });
  } finally {
    fs.closeSync(fd);
  }
}

function runCanonicalResolver(binding) {
  assertNoManualBootstrapOverridesV1(process.env);
  const result = runReadOnly(
    process.execPath,
    ["scripts/resolve_void_public_bootstrap_v1.mjs", "--verify-only"],
    {
      timeout: 60_000,
      killSignal: "SIGKILL",
      env: {
        ...process.env,
        VOID_PUBLIC_BOOTSTRAP_ALLOW_HOLD: "0",
        VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE: "0",
      },
    },
  );
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].map((value) => String(value || "").trim()).filter(Boolean).join(" | ");
    fail(`canonical public bootstrap resolver failed: ${detail || `status=${result.status}`}`);
  }
  const lines = `${result.stdout || ""}\n${result.stderr || ""}`.split(/\r?\n/);
  const ids = lines.filter(line => line.startsWith("manifest_id="));
  if (ids.length !== 1 || ids[0] !== `manifest_id=${binding.manifest_id}`) {
    fail("resolver-admitted manifest identity differs from the local target generation");
  }
  for (const expected of ["VOID_PUBLIC_BOOTSTRAP_RESOLVER_V1_VERIFY_GREEN",
    "manifest_source=remote_https", "status=stable_https_seed", "trust_material_verified=true",
    "live_seed_probe_performed=false"]) {
    if (lines.filter(line => line === expected).length !== 1) fail(`resolver result lacks exact ${expected}`);
  }
}

function revalidateLocalBinding(binding) {
  const current = localManifest();
  if (current.manifest_sha256 !== binding.manifest_sha256 || current.manifest_id !== binding.manifest_id ||
      current.target_head !== binding.target_head) fail("bootstrap target generation changed during observation");
}

async function cancelBodyBounded(body) {
  if (!body) return;
  let timer;
  try {
    await Promise.race([
      Promise.resolve().then(() => body.cancel()).catch(() => undefined),
      new Promise(resolve => { timer = setTimeout(resolve, HTTP_CLEANUP_MS); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  assertNoManualBootstrapOverridesV1(process.env);
  const controller = new AbortController();
  const expiresAt = performance.now() + HTTP_DEADLINE_MS;
  let timer, response, reader, complete = false;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("HTTP request deadline exceeded"));
      controller.abort();
    }, HTTP_DEADLINE_MS);
  });
  const checkDeadline = () => {
    if (performance.now() >= expiresAt || controller.signal.aborted) fail("HTTP request deadline exceeded");
  };
  const withinDeadline = async operation => {
    const value = await Promise.race([operation, deadline]);
    checkDeadline();
    return value;
  };
  try {
    response = await Promise.race([fetch(url, {
      redirect: "error", signal: controller.signal,
      headers: { accept: "application/json", "accept-encoding": "identity" },
    }), deadline]);
    checkDeadline();
    if (response.status !== 200 || response.redirected) fail("HTTP evidence requires unredirected status 200");
    const mediaType = response.headers.get("content-type") || "";
    if (!/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?$/i.test(mediaType.trim())) {
      fail("HTTP evidence requires application/json with optional UTF-8 charset");
    }
    const encoding = response.headers.get("content-encoding");
    if (encoding !== null && encoding.toLowerCase() !== "identity") fail("HTTP content encoding is unsupported");
    const length = response.headers.get("content-length");
    let declared;
    if (length !== null) {
      if (!/^(0|[1-9][0-9]{0,6})$/.test(length)) fail("HTTP content length is noncanonical");
      declared = Number(length);
      if (declared < 1 || declared > HTTP_MAX_BYTES) fail("HTTP declared length exceeds response ceiling or is empty");
    }
    const transfer = response.headers.get("transfer-encoding");
    if (transfer !== null && (transfer.toLowerCase() !== "chunked" || length !== null)) {
      fail("HTTP transfer framing is ambiguous or unsupported");
    }
    if (!response.body) fail("HTTP evidence body is missing");
    reader = response.body.getReader();
    // One fixed retention buffer; chunks are checked before copying. The fetch
    // implementation owns its incoming chunk/socket buffers, outside this cap.
    const bytes = Buffer.alloc(HTTP_MAX_BYTES);
    let total = 0, eof = false;
    for (let reads = 0; reads < HTTP_MAX_READS; reads += 1) {
      checkDeadline();
      const { value, done } = await withinDeadline(reader.read());
      if (done) { eof = true; break; }
      if (!(value instanceof Uint8Array)) fail("HTTP body chunk is not bytes");
      if (value.byteLength > HTTP_MAX_BYTES - total) fail("HTTP streamed body exceeded response ceiling");
      if (declared !== undefined && value.byteLength > declared - total) fail("HTTP body exceeds declared length");
      bytes.set(value, total);
      total += value.byteLength;
    }
    if (!eof) fail("HTTP body exceeded read ceiling");
    if (total === 0 || (declared !== undefined && total !== declared)) fail("HTTP body length mismatch or empty body");
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, total));
    const parsed = JSON.parse(text);
    checkDeadline();
    complete = true;
    return parsed;
  } finally {
    clearTimeout(timer);
    controller.abort();
    if (!complete) await cancelBodyBounded(reader || response?.body);
    try { reader?.releaseLock(); }
    catch (error) { if (complete) throw error; }
  }
}

async function preflight() {
  assertNoManualBootstrapOverridesV1(process.env);
  const base = canonicalLocalHttpBase(process.env);
  const source = assertRepoLease();
  const machine = assertMachineNoTailnetProduction();
  const manifest = localManifest();
  runCanonicalResolver(manifest);
  revalidateLocalBinding(manifest);

  assertNoManualBootstrapOverridesV1(process.env);
  console.log("=== VOID NIMO NO-TAILNET PREFLIGHT V1 ===");
  console.log(`local_http_base=${base}`);
  console.log("local_http_process_bound=false");
  console.log(`source_head=${source}`);
  console.log(`tailscale_binary_present=${machine.tailscale_binary_present}`);
  console.log(`tailscaled_process_present=${machine.tailscaled_process_present}`);
  console.log(`tailnet_address_present=${machine.tailnet_address_present}`);
  console.log(`public_sync_endpoint_count=${manifest.endpoint_count}`);
  console.log(`bootstrap_manifest_id=${manifest.manifest_id}`);
  console.log(`bootstrap_manifest_sha256=${manifest.manifest_sha256}`);
  console.log(`qualified_target_head=${manifest.target_head}`);
  console.log("tailnet_required=false");
  console.log("private_configuration_required=false");
  console.log("VOID_NIMO_NO_TAILNET_PREFLIGHT_V1_GREEN");
}

// Shared by the ordinary observation CLI and the supervisor that owns a node
// child. The caller owns acquisition/provenance; these checks alone grant none.
export async function collectQualifiedTargetObservationsV1({ readJson, targetHead, boundary }) {
  const observations = [];
  for (let index = 0; index < TARGET_SAMPLE_COUNT; index += 1) {
    if (index > 0) await new Promise(resolve => setTimeout(resolve, TARGET_SAMPLE_INTERVAL_MS));
    await boundary();
    const health = plainObject(await readJson("/health"), "health snapshot");
    if (health.ok !== true) fail("local health is not green");
    const ready = await readJson("/__void/ready.json");
    const latest = await readJson("/blocks/latest/number2.json");
    const head = validateQualifiedTargetSnapshotV1(ready, latest, targetHead);
    const peers = validatePeersSnapshotV1(await readJson("/p2p/peers"));
    await boundary();
    observations.push(Object.freeze({ head, ...peers }));
  }
  return observations;
}

async function postSync() {
  assertNoManualBootstrapOverridesV1(process.env);
  const base = canonicalLocalHttpBase(process.env);
  const source = assertRepoLease();
  const machine = assertMachineNoTailnetProduction();
  const manifest = localManifest();
  runCanonicalResolver(manifest);
  revalidateLocalBinding(manifest);

  const observations = await collectQualifiedTargetObservationsV1({
    readJson: route => fetchJson(`${base}${route}`), targetHead: manifest.target_head,
    boundary: () => revalidateLocalBinding(manifest),
  });
  runCanonicalResolver(manifest);
  revalidateLocalBinding(manifest);
  if (assertRepoLease() !== source) fail("repository generation changed during observation");
  assertMachineNoTailnetProduction();
  const { head, ...peers } = observations.at(-1);

  console.log("=== VOID NIMO NO-TAILNET POST-SYNC V1 ===");
  console.log(`local_http_base=${base}`);
  console.log("local_http_process_bound=false");
  console.log(`source_head=${source}`);
  console.log(`tailscale_binary_present=${machine.tailscale_binary_present}`);
  console.log(`tailnet_address_present=${machine.tailnet_address_present}`);
  console.log(`public_sync_endpoint_count=${manifest.endpoint_count}`);
  console.log(`bootstrap_manifest_id=${manifest.manifest_id}`);
  console.log(`bootstrap_manifest_sha256=${manifest.manifest_sha256}`);
  console.log(`qualified_target_head=${manifest.target_head}`);
  console.log(`target_observation_count=${observations.length}`);
  console.log(`target_observation_interval_ms=${TARGET_SAMPLE_INTERVAL_MS}`);
  console.log(`observed_heads=${JSON.stringify(observations.map(row => row.head))}`);
  console.log(`head=${head}`);
  console.log("gap=0");
  console.log("txroot_live=1");
  console.log(`connected_peer_count=${peers.connected_count}`);
  console.log(`verified_peer_count=${peers.verified_count}`);
  console.log(`verified_connected_peer_count=${peers.verified_connected_count}`);
  console.log("tailnet_required=false");
  console.log("private_configuration_required=false");
  console.log("runtime_session_bound=false");
  console.log("fresh_join_proven=false");
  console.log("public_onboarding_accepted=false");
  console.log("VOID_NIMO_NO_TAILNET_TARGET_OBSERVATIONS_V1_GREEN");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !["--preflight", "--post-sync"].includes(args[0])) {
    console.error("usage: node tools/void-nimo-no-tailnet-acceptance-v1.mjs --preflight|--post-sync");
    process.exit(64);
  }
  try {
    if (args[0] === "--preflight") await preflight();
    else await postSync();
  } catch (error) {
    console.error(`VOID_NIMO_NO_TAILNET_ACCEPTANCE_V1_HOLD: ${error?.message || String(error)}`);
    process.exit(HOLD_EXIT);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
