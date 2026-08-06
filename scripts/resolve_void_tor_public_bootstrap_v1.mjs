#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  contentId,
  requestOnionJson,
  validateTorNativeEndpoints,
} from "./lib/void_tor_native_bootstrap_transport_v1.mjs";

const MARKER = "VOID_TOR_PUBLIC_BOOTSTRAP_RESOLVER_V1";
const SCHEMA = "void_public_bootstrap_v1";
const NETWORK = "VOID Network";
const CHAIN_ID = 2050;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MANIFEST_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "status",
  "generated_at",
  "expires_at",
  "sync_endpoints",
  "onion_endpoints",
  "private_tailnet_endpoints_published",
  "authority",
  "notes",
  "manifest_id",
]);
const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function boundedInteger(raw, fallback, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function parseArgs(argv) {
  const values = {
    manifestFile: process.env.VOID_TOR_BOOTSTRAP_MANIFEST_FILE || "",
    expectedManifestId: process.env.VOID_TOR_BOOTSTRAP_EXPECTED_MANIFEST_ID || "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value after ${argument}`);
      return argv[index];
    };
    if (argument === "--manifest-file") values.manifestFile = next();
    else if (argument === "--expected-manifest-id") values.expectedManifestId = next();
    else throw new Error(`unexpected argument ${argument}`);
  }
  if (!values.manifestFile) throw new Error("Tor bootstrap manifest file is required");
  if (!/^voidpbm1_[0-9a-f]{64}$/.test(values.expectedManifestId)) {
    throw new Error("expected Tor bootstrap manifest ID is required and must be content-addressed");
  }
  return values;
}

function readManifestFile(rawPath) {
  const target = path.resolve(String(rawPath));
  const status = fs.lstatSync(target);
  if (status.isSymbolicLink() || !status.isFile()) {
    throw new Error("Tor bootstrap manifest must be one regular non-symlink file");
  }
  if (fs.realpathSync(target) !== target) {
    throw new Error("Tor bootstrap manifest path must already be canonical");
  }
  if (status.size < 2 || status.size > MAX_MANIFEST_BYTES) {
    throw new Error("Tor bootstrap manifest size is invalid");
  }
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(target, "utf8")); }
  catch (error) { throw new Error(`Tor bootstrap manifest JSON is invalid: ${error.message}`); }
  return { target, manifest };
}

function validateAuthority(raw) {
  const authority = exactKeys(raw, AUTHORITY_KEYS, "Tor bootstrap authority");
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) throw new Error(`Tor bootstrap authority ${key} must be false`);
  }
}

function validateManifest(rawManifest, expectedManifestId, nowMs = Date.now()) {
  const manifest = exactKeys(structuredClone(rawManifest), MANIFEST_KEYS, "Tor bootstrap manifest");
  if (
    manifest.schema !== SCHEMA ||
    manifest.network !== NETWORK ||
    !Number.isSafeInteger(manifest.chain_id) ||
    manifest.chain_id !== CHAIN_ID
  ) {
    throw new Error("Tor bootstrap manifest network contract mismatch");
  }
  if (manifest.status !== "stable_tor_seed") {
    throw new Error("Tor bootstrap manifest status must be stable_tor_seed");
  }
  if (manifest.private_tailnet_endpoints_published !== false) {
    throw new Error("Tor bootstrap manifest violates the private-Tailnet boundary");
  }
  validateAuthority(manifest.authority);
  if (!Array.isArray(manifest.sync_endpoints) || manifest.sync_endpoints.length !== 0) {
    throw new Error("Tor bootstrap manifest must not require clearnet synchronization endpoints");
  }
  if (typeof manifest.notes !== "string" || manifest.notes.length > 4096) {
    throw new Error("Tor bootstrap manifest notes are invalid");
  }
  const generatedAt = Date.parse(String(manifest.generated_at));
  const expiresAt = Date.parse(String(manifest.expires_at));
  if (!Number.isFinite(generatedAt) || !Number.isFinite(expiresAt)) {
    throw new Error("Tor bootstrap manifest timestamps are invalid");
  }
  if (generatedAt > nowMs + 5 * 60 * 1000) throw new Error("Tor bootstrap manifest is from the future");
  if (expiresAt <= nowMs) throw new Error("Tor bootstrap manifest is expired");
  const validity = expiresAt - generatedAt;
  if (validity < 60 * 60 * 1000 || validity > 7 * 24 * 60 * 60 * 1000) {
    throw new Error("Tor bootstrap manifest validity must be from one hour through seven days");
  }
  const computed = contentId("voidpbm1_", manifest, "manifest_id");
  if (manifest.manifest_id !== computed) throw new Error("Tor bootstrap manifest ID does not match its content");
  if (manifest.manifest_id !== expectedManifestId) {
    throw new Error("Tor bootstrap manifest does not match the expected trust-root ID");
  }
  const endpoints = validateTorNativeEndpoints(manifest.onion_endpoints, nowMs);
  return Object.freeze({ manifest, endpoints });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { target, manifest } = readManifestFile(args.manifestFile);
  const validated = validateManifest(manifest, args.expectedManifestId);
  const socksHost = process.env.VOID_TOR_SOCKS_HOST || "127.0.0.1";
  const socksPort = boundedInteger(process.env.VOID_TOR_SOCKS_PORT, 9050, 1024, 65535);
  const timeoutMs = boundedInteger(process.env.VOID_TOR_BOOTSTRAP_TIMEOUT_MS, 30_000, 1_000, 60_000);
  const maxLive = boundedInteger(process.env.VOID_TOR_BOOTSTRAP_MAX_LIVE_SEEDS, 4, 1, 8);
  const live = [];
  const failures = [];

  for (const endpoint of validated.endpoints) {
    if (live.length >= maxLive) break;
    try {
      const sample = await requestOnionJson({
        base: endpoint.base,
        socksHost,
        socksPort,
        timeoutMs,
      });
      const head = Number(sample.head);
      if (
        sample.ready !== true ||
        !Number.isSafeInteger(head) ||
        head < endpoint.qualified_head ||
        Number(sample.gap) !== 0 ||
        Number(sample.txroot_live) !== 1
      ) {
        throw new Error("Tor seed live readiness is not exact-green or is below its qualified head");
      }
      live.push(endpoint.base);
      console.error(`tor_seed_live=${endpoint.base} head=${head} qualification_id=${endpoint.qualification_id}`);
    } catch (error) {
      failures.push(`${endpoint.base}: ${error?.message || String(error)}`);
    }
  }

  if (live.length === 0) {
    throw new Error(`no pinned Tor seed is currently exact-green: ${failures.join(" | ")}`);
  }

  console.error(`marker=${MARKER}`);
  console.error("manifest_source=local_content_addressed_tor_root");
  console.error(`manifest=${target}`);
  console.error(`manifest_id=${validated.manifest.manifest_id}`);
  console.error(`live_seed_count=${live.length}`);
  console.error("dns_resolution_required=false");
  console.error("domain_registrar_required=false");
  console.error("certificate_authority_required=false");
  console.error("cloud_provider_required=false");
  console.error("tailnet_required=false");
  console.error("private_mutation_routes_exposed=false");
  console.error(`${MARKER}_GREEN`);
  process.stdout.write(`${live.join(",")}\n`);
}

main().catch((error) => fail(error?.stack || String(error)));
