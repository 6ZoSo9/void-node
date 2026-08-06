#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import process from "node:process";
import {
  BOOTSTRAP_SCHEMA,
  CHAIN_ID,
  NETWORK,
  assertPlainObject,
  assertSafeInteger,
  isPublicIpAddress,
  isTemporarySeedHostname,
  normalizeHostname,
  normalizePublicSeedBase,
  objectWithId,
  parseJsonBytes,
  probePublicSeedSample,
  resolvePublicDns,
} from "./lib/void_public_seed_qualification_v1.mjs";
import {
  classifyVoidPublicBootstrapManifestMediaTypeV1,
} from "./lib/void_public_bootstrap_manifest_media_type_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_RESOLVER_V1";
const DEFAULT_MANIFEST =
  "https://raw.githubusercontent.com/6ZoSo9/void-node/main/public/bootstrap/v1.json";
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_QUALIFICATION_AGE_MS = 2 * 60 * 60 * 1000;
const ALLOW_LOOPBACK_FIXTURE =
  process.env.VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE === "1";
const ALLOW_HOLD =
  process.argv.includes("--allow-hold") ||
  process.env.VOID_PUBLIC_BOOTSTRAP_ALLOW_HOLD === "1";

const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);
const HOLD_MANIFEST_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "status",
  "generated_at",
  "sync_endpoints",
  "onion_endpoints",
  "private_tailnet_endpoints_published",
  "authority",
  "notes",
  "manifest_id",
]);
const STABLE_MANIFEST_KEYS = Object.freeze([
  ...HOLD_MANIFEST_KEYS,
  "expires_at",
]);
const ENDPOINT_KEYS = Object.freeze([
  "transport",
  "base",
  "priority",
  "enabled",
  "temporary",
  "qualification_id",
  "qualified_at",
  "qualified_head",
]);

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function normalizeConnectedAddress(address) {
  const value = String(address || "").split("%")[0].toLowerCase();
  if (value.startsWith("::ffff:") && net.isIP(value.slice(7)) === 4) {
    return value.slice(7);
  }
  return value;
}

function positiveInteger(raw, fallback, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function exactKeys(value, expected, label) {
  const object = assertPlainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    const unexpected = actual.filter((key) => !wanted.includes(key));
    const missing = wanted.filter((key) => !actual.includes(key));
    throw new Error(
      `${label} keys mismatch; unexpected=${unexpected.join(",") || "none"}; missing=${missing.join(",") || "none"}`,
    );
  }
  return object;
}

function terminalManifestError(message) {
  const error = new Error(message);
  error.terminalManifestResponse = true;
  return error;
}

function localHoldFileArgument(argv = process.argv.slice(2)) {
  const indexes = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--local-hold-file") indexes.push(index);
  }
  if (indexes.length > 1) {
    throw new Error("--local-hold-file may be supplied only once");
  }
  if (indexes.length === 0) return "";
  const index = indexes[0];
  const value = String(argv[index + 1] || "").trim();
  if (!value || value.startsWith("--")) {
    throw new Error("--local-hold-file requires a path");
  }
  return value;
}

const TIMEOUT_MS = positiveInteger(
  process.env.VOID_PUBLIC_BOOTSTRAP_TIMEOUT_MS,
  DEFAULT_TIMEOUT_MS,
  1_000,
  60_000,
);
const MAX_LIVE_SEEDS = positiveInteger(
  process.env.VOID_PUBLIC_BOOTSTRAP_MAX_LIVE_SEEDS,
  4,
  1,
  8,
);

function normalizeManifestUrl(raw) {
  let url;
  try {
    url = new URL(String(raw));
  } catch (error) {
    void error;
    throw new Error("manifest URL is invalid");
  }
  if (String(raw).length > 2048) throw new Error("manifest URL is too long");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("manifest URL must not contain credentials, query, or fragment");
  }

  const hostname = normalizeHostname(url.hostname);
  const loopbackFixture =
    ALLOW_LOOPBACK_FIXTURE &&
    url.protocol === "http:" &&
    ["127.0.0.1", "localhost", "::1"].includes(hostname);
  if (!loopbackFixture && url.protocol !== "https:") {
    throw new Error("manifest URL must use HTTPS");
  }
  if (!loopbackFixture) {
    if (net.isIP(hostname)) throw new Error("manifest URL must use a DNS hostname");
    if (!hostname.includes(".")) {
      throw new Error("manifest hostname must be fully qualified");
    }
    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".home") ||
      hostname.endsWith(".lan") ||
      isTemporarySeedHostname(hostname)
    ) {
      throw new Error("manifest hostname is private, local, or temporary");
    }
  }
  return Object.freeze({ url, hostname, loopbackFixture });
}

async function requestManifestOne(normalized, address) {
  const family = net.isIP(address);
  if (!family) throw new Error(`manifest address is invalid: ${address}`);
  if (!normalized.loopbackFixture && !isPublicIpAddress(address)) {
    throw new Error(`manifest address is not public: ${address}`);
  }

  const transport = normalized.url.protocol === "https:" ? https : http;
  return await new Promise((resolve, reject) => {
    let settled = false;
    const failOnce = (error) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    const request = transport.request(
      normalized.url,
      {
        method: "GET",
        agent: false,
        family,
        autoSelectFamily: false,
        ...(normalized.url.protocol === "https:"
          ? { servername: normalized.hostname }
          : {}),
        headers: {
          accept: "application/json",
          connection: "close",
          "user-agent": "void-node/public-bootstrap-resolver-v1",
        },
        lookup(_hostname, _options, callback) {
          callback(null, address, family);
        },
      },
      (response) => {
        const connected = normalizeConnectedAddress(response.socket?.remoteAddress);
        const expected = normalizeConnectedAddress(address);
        if (!connected || connected !== expected) {
          response.destroy();
          failOnce(
            new Error(
              `manifest request connected to unexpected address ${connected || "unknown"}; expected ${expected}`,
            ),
          );
          return;
        }
        if (!normalized.loopbackFixture && !isPublicIpAddress(connected)) {
          response.destroy();
          failOnce(new Error(`manifest request connected to non-public address ${connected}`));
          return;
        }

        const status = Number(response.statusCode || 0);
        if (status >= 300 && status < 400) {
          response.destroy();
          failOnce(terminalManifestError(`manifest request redirected with HTTP ${status}`));
          return;
        }
        if (status !== 200) {
          response.destroy();
          failOnce(terminalManifestError(`manifest request returned HTTP ${status}`));
          return;
        }
        const mediaDecision =
          classifyVoidPublicBootstrapManifestMediaTypeV1({
            hostname: normalized.hostname,
            pathname: normalized.url.pathname,
            content_type: response.headers["content-type"],
          });
        if (!mediaDecision.ok) {
          response.destroy();
          failOnce(
            terminalManifestError(
              "manifest response media type is not allowed",
            ),
          );
          return;
        }

        const advertised = Number(response.headers["content-length"] || 0);
        if (Number.isFinite(advertised) && advertised > MAX_MANIFEST_BYTES) {
          response.destroy();
          failOnce(terminalManifestError("manifest advertised an oversized response"));
          return;
        }

        const chunks = [];
        let total = 0;
        response.on("data", (chunk) => {
          if (settled) return;
          total += chunk.length;
          if (total > MAX_MANIFEST_BYTES) {
            response.destroy();
            failOnce(terminalManifestError("manifest exceeded the response limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("aborted", () => {
          failOnce(new Error("manifest response was aborted"));
        });
        response.on("error", failOnce);
        response.on("end", () => {
          if (settled) return;
          settled = true;
          resolve(parseJsonBytes(Buffer.concat(chunks, total), "bootstrap manifest"));
        });
      },
    );

    request.setTimeout(TIMEOUT_MS, () => {
      request.destroy(new Error(`manifest request timed out after ${TIMEOUT_MS} ms`));
    });
    request.on("error", failOnce);
    request.end();
  });
}

async function fetchManifest(rawUrl) {
  const normalized = normalizeManifestUrl(rawUrl);
  const addresses = await resolvePublicDns(normalized.hostname, {
    allowLoopbackFixture: normalized.loopbackFixture,
  });
  const errors = [];
  for (const address of addresses) {
    try {
      return await requestManifestOne(normalized, address);
    } catch (error) {
      errors.push(`${address}: ${error?.message || String(error)}`);
      if (error?.terminalManifestResponse === true) throw error;
    }
  }
  throw new Error(`manifest failed on every pinned address: ${errors.join(" | ")}`);
}

function assertAuthorityBoundary(rawAuthority, label) {
  const authority = exactKeys(rawAuthority, AUTHORITY_KEYS, label);
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) {
      throw new Error(`${label} ${key} must be false`);
    }
  }
}

function parseTime(value, label) {
  const time = Date.parse(String(value));
  if (!Number.isFinite(time)) throw new Error(`${label} is invalid`);
  return time;
}

function verifyManifestId(manifest) {
  if (!/^voidpbm1_[0-9a-f]{64}$/.test(String(manifest.manifest_id || ""))) {
    throw new Error("manifest ID is missing or malformed");
  }
  const expected = objectWithId("voidpbm1_", manifest, "manifest_id").manifest_id;
  if (manifest.manifest_id !== expected) {
    throw new Error("manifest ID does not match its content");
  }
}

function manifestUrls() {
  const configured = String(
    process.env.VOID_PUBLIC_BOOTSTRAP_MANIFEST_URLS ||
      process.env.VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL ||
      DEFAULT_MANIFEST,
  );
  const urls = [
    ...new Set(configured.split(",").map((value) => value.trim()).filter(Boolean)),
  ];
  if (urls.length === 0) {
    throw new Error("no bootstrap manifest URL is configured");
  }
  if (urls.length > 4) {
    throw new Error("at most four bootstrap manifest mirrors are supported");
  }
  return urls;
}

function validateManifest(rawManifest, nowMs = Date.now()) {
  const manifest = assertPlainObject(
    structuredClone(rawManifest),
    "bootstrap manifest",
  );
  const status = String(manifest.status || "");
  exactKeys(
    manifest,
    status === "stable_https_seed" ? STABLE_MANIFEST_KEYS : HOLD_MANIFEST_KEYS,
    "bootstrap manifest",
  );
  if (manifest.schema !== BOOTSTRAP_SCHEMA) {
    throw new Error("unexpected manifest schema");
  }
  if (manifest.network !== NETWORK || Number(manifest.chain_id) !== CHAIN_ID) {
    throw new Error("manifest network or chain ID mismatch");
  }
  verifyManifestId(manifest);
  if (manifest.private_tailnet_endpoints_published !== false) {
    throw new Error("manifest violates the private-Tailnet boundary");
  }
  assertAuthorityBoundary(manifest.authority, "manifest authority");
  const generatedAt = parseTime(manifest.generated_at, "manifest generated_at");
  if (generatedAt > nowMs + 5 * 60 * 1000) {
    throw new Error("manifest is from the future");
  }
  if (!Array.isArray(manifest.sync_endpoints)) {
    throw new Error("manifest sync_endpoints must be an array");
  }
  if (!Array.isArray(manifest.onion_endpoints)) {
    throw new Error("manifest onion_endpoints must be an array");
  }
  if (manifest.onion_endpoints.length !== 0) {
    throw new Error("manifest onion_endpoints are unsupported in client v1");
  }
  if (typeof manifest.notes !== "string" || manifest.notes.length > 4096) {
    throw new Error("manifest notes must be a bounded string");
  }

  if (status === "hold_no_stable_seed") {
    if (manifest.sync_endpoints.length !== 0) {
      throw new Error("hold manifest must not publish synchronization endpoints");
    }
    return Object.freeze({ manifest, hold: true, endpoints: [] });
  }
  if (status !== "stable_https_seed") {
    throw new Error(`unsupported manifest status ${status || "missing"}`);
  }

  const expiresAt = parseTime(manifest.expires_at, "manifest expires_at");
  if (expiresAt <= nowMs) throw new Error("manifest is expired");
  const validity = expiresAt - generatedAt;
  if (validity < 60 * 60 * 1000 || validity > 7 * 24 * 60 * 60 * 1000) {
    throw new Error("manifest validity must be from one hour through seven days");
  }
  if (manifest.sync_endpoints.length === 0 || manifest.sync_endpoints.length > 8) {
    throw new Error("stable manifest requires from one through eight endpoints");
  }

  const seen = new Set();
  const endpoints = [];
  for (const [index, rawEndpoint] of manifest.sync_endpoints.entries()) {
    const endpoint = exactKeys(
      rawEndpoint,
      ENDPOINT_KEYS,
      `manifest endpoint ${index + 1}`,
    );
    if (typeof endpoint.enabled !== "boolean") {
      throw new Error("seed enabled flag must be boolean");
    }
    if (endpoint.enabled !== true) continue;
    if (endpoint.transport !== "https") {
      throw new Error("enabled seed transport must be HTTPS");
    }
    if (endpoint.temporary !== false) {
      throw new Error("enabled seed must declare temporary=false");
    }
    const normalized = normalizePublicSeedBase(endpoint.base, {
      allowLoopbackFixture: ALLOW_LOOPBACK_FIXTURE,
    });
    if (seen.has(normalized.base)) {
      throw new Error(`duplicate seed endpoint ${normalized.base}`);
    }
    seen.add(normalized.base);
    if (!/^voidpsq1_[0-9a-f]{64}$/.test(String(endpoint.qualification_id || ""))) {
      throw new Error("seed qualification ID is missing or malformed");
    }
    const qualifiedAt = parseTime(endpoint.qualified_at, "seed qualified_at");
    if (qualifiedAt > nowMs + 5 * 60 * 1000) {
      throw new Error("seed qualification is from the future");
    }
    if (nowMs - qualifiedAt > MAX_QUALIFICATION_AGE_MS) {
      throw new Error("seed qualification is stale");
    }
    const qualifiedHead = assertSafeInteger(
      endpoint.qualified_head,
      "seed qualified_head",
      { min: 1 },
    );
    const priority = assertSafeInteger(endpoint.priority, "seed priority", {
      min: 0,
      max: 1_000_000,
    });
    endpoints.push({
      base: normalized.base,
      priority,
      qualifiedHead,
      qualificationId: endpoint.qualification_id,
    });
  }
  if (endpoints.length === 0) {
    throw new Error("stable manifest has no enabled HTTPS seed");
  }
  endpoints.sort(
    (left, right) =>
      left.priority - right.priority || left.base.localeCompare(right.base),
  );
  return Object.freeze({ manifest, hold: false, endpoints });
}

function readLocalHoldManifest(path) {
  const target = String(path || "").trim();
  if (!target) throw new Error("local hold manifest path is empty");
  const linkStatus = fs.lstatSync(target);
  if (linkStatus.isSymbolicLink()) {
    throw new Error("local hold manifest must not be a symlink");
  }
  if (!linkStatus.isFile()) {
    throw new Error("local hold manifest must be a regular file");
  }
  if (linkStatus.size < 2 || linkStatus.size > MAX_MANIFEST_BYTES) {
    throw new Error("local hold manifest size is invalid");
  }
  const manifest = parseJsonBytes(
    fs.readFileSync(target),
    "local hold manifest",
  );
  const validated = validateManifest(manifest);
  if (!validated.hold) {
    throw new Error("local fallback accepts only hold_no_stable_seed manifests");
  }
  return Object.freeze({ target: fs.realpathSync(target), ...validated });
}

function emitHold({ source, manifest, manifestId }) {
  console.error(`marker=${MARKER}`);
  console.error(`manifest_source=${source}`);
  console.error(`manifest=${manifest}`);
  console.error(`manifest_id=${manifestId}`);
  console.error("status=hold_no_stable_seed");
  console.error("tailnet_required=false");
  console.error(`${MARKER}_HOLD`);
}

async function main() {
  const localHoldFile = localHoldFileArgument();
  if (localHoldFile) {
    const validated = readLocalHoldManifest(localHoldFile);
    emitHold({
      source: "local_hold_file",
      manifest: validated.target,
      manifestId: validated.manifest.manifest_id,
    });
    if (ALLOW_HOLD) return;
    throw new Error("local manifest is in hold_no_stable_seed state");
  }

  const errors = [];
  for (const manifestUrl of manifestUrls()) {
    try {
      const validated = validateManifest(await fetchManifest(manifestUrl));
      if (validated.hold) {
        emitHold({
          source: "remote_https",
          manifest: manifestUrl,
          manifestId: validated.manifest.manifest_id,
        });
        if (ALLOW_HOLD) return;
        throw new Error("manifest is in hold_no_stable_seed state");
      }

      const live = [];
      for (const endpoint of validated.endpoints) {
        if (live.length >= MAX_LIVE_SEEDS) break;
        try {
          const sample = await probePublicSeedSample(endpoint.base, {
            allowLoopbackFixture: ALLOW_LOOPBACK_FIXTURE,
            timeoutMs: TIMEOUT_MS,
          });
          const liveHead = Math.max(
            Number(sample.ready_head),
            Number(sample.head),
          );
          if (!Number.isSafeInteger(liveHead) || liveHead < endpoint.qualifiedHead) {
            throw new Error(
              `live head ${liveHead} is below qualified head ${endpoint.qualifiedHead}`,
            );
          }
          live.push(endpoint.base);
          console.error(
            `seed_live=${endpoint.base} head=${liveHead} qualification_id=${endpoint.qualificationId}`,
          );
        } catch (error) {
          errors.push(`${endpoint.base}: ${error?.message || String(error)}`);
        }
      }
      if (live.length === 0) {
        throw new Error(
          "no qualified manifest endpoint is currently exact-green",
        );
      }

      console.error(`marker=${MARKER}`);
      console.error("manifest_source=remote_https");
      console.error(`manifest=${manifestUrl}`);
      console.error(`manifest_id=${validated.manifest.manifest_id}`);
      console.error(`live_seed_count=${live.length}`);
      console.error("tailnet_required=false");
      console.error("private_mutation_routes_exposed=false");
      console.error(`${MARKER}_GREEN`);
      process.stdout.write(`${live.join(",")}\n`);
      return;
    } catch (error) {
      errors.push(`${manifestUrl}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(errors.join(" | "));
}

main().catch((error) => {
  fail(error?.stack || String(error));
});
