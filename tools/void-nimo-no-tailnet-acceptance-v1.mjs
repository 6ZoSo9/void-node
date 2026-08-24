#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import process from "node:process";
import { spawnSync } from "node:child_process";

export const VOID_NIMO_NO_TAILNET_ACCEPTANCE_V1 =
  "void_nimo_no_tailnet_acceptance_v1";

const HOLD_EXIT = 2;
const DEFAULT_HTTP_BASE = "http://127.0.0.1:4100";
const NETWORK_ENV_KEYS = Object.freeze([
  "BOOTSTRAP_ADDRS",
  "VOID_FOLLOWER_AUTOSTART_PEERS",
  "VOID_FOLLOWER_LEGACY_V2FS_ORIGINS",
  "VOID_MAIN_BASE",
  "VOID_DRIFT_PEER",
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

function textContainsTailnetV1(raw) {
  const text = String(raw || "").toLowerCase();
  if (!text) return false;
  if (text.includes("tailscale") || text.includes(".ts.net")) return true;
  const ips = text.match(/(?:\d{1,3}\.){3}\d{1,3}/g) || [];
  return ips.some((ip) => isTailnetCgnatIpv4V1(ip));
}

export function assertNoTailnetMachineV1({
  interfaces = [],
  processText = "",
  tailscaleBinaryPresent = false,
  environment = {},
} = {}) {
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

  for (const key of NETWORK_ENV_KEYS) {
    if (textContainsTailnetV1(environment[key])) {
      fail(`${key} contains Tailnet/Tailscale transport state`);
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

  for (const endpoint of manifest.sync_endpoints) {
    const item = plainObject(endpoint, "bootstrap sync endpoint");
    if (item.enabled !== true || item.temporary !== false) {
      fail("bootstrap endpoint is disabled or temporary");
    }
    if (!endpointHostPublicEnoughV1(item.base)) {
      fail(`bootstrap endpoint is not acceptable public HTTPS: ${item.base}`);
    }
  }

  return Object.freeze({ stable: true, endpoint_count: manifest.sync_endpoints.length });
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
  if (!Number.isSafeInteger(head.number) || head.number <= 0) {
    fail("head snapshot number must be a positive safe integer");
  }
  return head.number;
}

export function validatePeersSnapshotV1(raw) {
  const peers = plainObject(raw, "peer snapshot");
  if (!Array.isArray(peers.connected) || peers.connected.length < 1) {
    fail("no connected P2P peer is present");
  }
  if (!Array.isArray(peers.verifiedPeers) || peers.verifiedPeers.length < 1) {
    fail("no verified P2P peer is present");
  }
  return Object.freeze({
    connected_count: peers.connected.length,
    verified_count: peers.verifiedPeers.length,
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
  return JSON.parse(fs.readFileSync("public/bootstrap/v1.json", "utf8"));
}

function runCanonicalResolver() {
  const result = runReadOnly(
    process.execPath,
    ["scripts/resolve_void_public_bootstrap_v1.mjs", "--verify-only"],
    {
      env: {
        ...process.env,
        VOID_PUBLIC_BOOTSTRAP_ALLOW_HOLD: "0",
      },
    },
  );
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].map((value) => String(value || "").trim()).filter(Boolean).join(" | ");
    fail(`canonical public bootstrap resolver failed: ${detail || `status=${result.status}`}`);
  }
  return String(result.stdout || "").trim();
}

async function fetchJson(url, maxBytes = 2 * 1024 * 1024) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { redirect: "error", signal: controller.signal });
    if (!response.ok) fail(`${url} returned HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxBytes) fail(`${url} exceeded response ceiling`);
    return JSON.parse(bytes.toString("utf8"));
  } finally {
    clearTimeout(timer);
  }
}

async function preflight() {
  const source = assertRepoLease();
  const machine = assertMachineNoTailnetProduction();
  const manifest = validateBootstrapManifestNoTailnetV1(localManifest(), { requireStable: true });
  runCanonicalResolver();

  console.log("=== VOID NIMO NO-TAILNET PREFLIGHT V1 ===");
  console.log(`source_head=${source}`);
  console.log(`tailscale_binary_present=${machine.tailscale_binary_present}`);
  console.log(`tailscaled_process_present=${machine.tailscaled_process_present}`);
  console.log(`tailnet_address_present=${machine.tailnet_address_present}`);
  console.log(`public_sync_endpoint_count=${manifest.endpoint_count}`);
  console.log("tailnet_required=false");
  console.log("private_configuration_required=false");
  console.log("VOID_NIMO_NO_TAILNET_PREFLIGHT_V1_GREEN");
}

async function postSync() {
  const source = assertRepoLease();
  const machine = assertMachineNoTailnetProduction();
  const manifest = validateBootstrapManifestNoTailnetV1(localManifest(), { requireStable: true });
  runCanonicalResolver();

  const base = String(process.env.VOID_NIMO_LOCAL_HTTP_BASE || DEFAULT_HTTP_BASE).replace(/\/$/, "");
  const health = plainObject(await fetchJson(`${base}/health`), "health snapshot");
  if (health.ok !== true) fail("local health is not green");
  const ready = validateReadySnapshotV1(await fetchJson(`${base}/__void/ready.json`));
  const head = validateHeadSnapshotV1(await fetchJson(`${base}/blocks/latest/number2.json`));
  const peers = validatePeersSnapshotV1(await fetchJson(`${base}/p2p/peers`));
  if (Number.isSafeInteger(ready.head) && ready.head !== head) fail("ready/head mismatch");

  console.log("=== VOID NIMO NO-TAILNET POST-SYNC V1 ===");
  console.log(`source_head=${source}`);
  console.log(`tailscale_binary_present=${machine.tailscale_binary_present}`);
  console.log(`tailnet_address_present=${machine.tailnet_address_present}`);
  console.log(`public_sync_endpoint_count=${manifest.endpoint_count}`);
  console.log(`head=${head}`);
  console.log("gap=0");
  console.log("txroot_live=1");
  console.log(`connected_peer_count=${peers.connected_count}`);
  console.log(`verified_peer_count=${peers.verified_count}`);
  console.log("tailnet_required=false");
  console.log("private_configuration_required=false");
  console.log("VOID_NIMO_NO_TAILNET_POST_SYNC_V1_GREEN");
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
