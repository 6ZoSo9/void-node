#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

import {
  Hold,
  WELL_KNOWN_DISCOVERY_PATH,
  intersectReadOnlyCapabilities,
  validateCanonicalDiscovery,
  validateWellKnownDiscovery,
} from "../../integrations/browser/void-browser-agent-access-kit-v1/core.mjs";
import {
  CLEARWEB_ORIGIN_BINDING_PATH,
} from "../../integrations/browser/void-browser-agent-access-kit-v1/clearweb-origin-binding-v1.mjs";

export const MARKER = "VOID_BROWSER_CLEARWEB_ORIGIN_READINESS_V1";
export const SCHEMA_ID =
  "https://voidchain.io/schemas/void-browser-clearweb-origin-readiness-v1.schema.json";
export const REQUIRED_PHYSICAL_HOST = "zoso-Precision-Tower-7810";
export const READINESS_SCOPE = "offline_binding_signing_only";

const REPOSITORY = "6ZoSo9/void-node";
const MAXIMUM_BODY_BYTES = 1024 * 1024;
const MINIMUM_CERTIFICATE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const MINIMUM_TRUST_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const SHA40 = /^[0-9a-f]{40}$/;
const SHA64 = /^[0-9a-f]{64}$/;
const DNS_LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

const ROUTES = Object.freeze({
  well_known: Object.freeze({
    path: WELL_KNOWN_DISCOVERY_PATH,
    source: "public/.well-known/void-agent-discovery.json",
  }),
  canonical: Object.freeze({
    path: "/public-node/agents/discovery-v1.json",
    source: "public/public-node/agents/discovery-v1.json",
  }),
  capabilities: Object.freeze({
    path: "/public-node/agents/capabilities-v1.json",
    source: "public/public-node/agents/capabilities-v1.json",
  }),
});

const TRUST_PINS_PATH =
  "integrations/browser/void-browser-agent-access-kit-v1/trust-pins.json";
const REQUIRED_SOURCE_PATHS = Object.freeze([
  ".github/workflows/void-browser-clearweb-origin-readiness-v1.yml",
  "docs/operations/void-browser-clearweb-origin-readiness-v1.md",
  "integrations/browser/void-browser-agent-access-kit-v1/clearweb-origin-binding-v1.mjs",
  "integrations/browser/void-browser-agent-access-kit-v1/core.mjs",
  "integrations/browser/void-browser-agent-access-kit-v1/manifest.json",
  "ops/mainnet0/survey_void_browser_clearweb_origin_readiness_v1.mjs",
  ...Object.values(ROUTES).map((route) => route.source),
  "schemas/void-browser-clearweb-origin-readiness-v1.schema.json",
  "scripts/prove_void_browser_clearweb_origin_readiness_v1.mjs",
  TRUST_PINS_PATH,
]);

const AUTHORITY = Object.freeze({
  browser_activation: false,
  clearweb_binding_creation: false,
  private_key_access: false,
  deployment: false,
  service_restart: false,
  dns_or_tls_mutation: false,
  node_runtime_mutation: false,
  transaction_submission: false,
  payment_authority: false,
  wallet_or_signer_access: false,
  work_credit_write: false,
  fund_movement: false,
});

function fail(message) {
  throw new Hold(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  if (!isObject(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys mismatch`);
  }
}

function canonicalTimestamp(value, label) {
  if (typeof value !== "string") fail(`${label} must be a string`);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    fail(`${label} must be canonical ISO-8601`);
  }
  return date;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readRegular(root, relative) {
  const absoluteRoot = fs.realpathSync(root);
  const candidate = path.join(absoluteRoot, relative);
  const metadata = fs.lstatSync(candidate);
  if (metadata.isSymbolicLink() || !metadata.isFile()) {
    fail(`required source is not a regular non-symlink file: ${relative}`);
  }
  const resolved = fs.realpathSync(candidate);
  if (resolved !== candidate || !resolved.startsWith(`${absoluteRoot}${path.sep}`)) {
    fail(`required source escapes repository: ${relative}`);
  }
  return fs.readFileSync(resolved);
}

function git(repoRoot, ...args) {
  try {
    return execFileSync("git", ["-C", repoRoot, ...args], {
      encoding: "utf8",
      env: { ...process.env, LC_ALL: "C" },
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || error.message;
    fail(`read-only Git inspection failed: ${detail}`);
  }
}

export function canonicalClearwebOrigin(value) {
  let parsed;
  try {
    parsed = new URL(String(value || ""));
  } catch {
    fail("origin must be an absolute URL");
  }
  if (
    parsed.protocol !== "https:"
    || parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
    || parsed.port
    || parsed.origin !== value
  ) {
    fail("origin must be one canonical default-port HTTPS origin");
  }
  const labels = parsed.hostname.split(".");
  if (
    parsed.hostname.endsWith(".onion")
    || parsed.hostname.length > 253
    || labels.length < 2
    || labels.some((label) => !DNS_LABEL.test(label))
    || !/^[a-z]{2,63}$/.test(labels.at(-1))
  ) {
    fail("origin must use a public lowercase ASCII DNS hostname");
  }
  return parsed.origin;
}

export function assertPhysicalHost(observedHost) {
  if (observedHost !== REQUIRED_PHYSICAL_HOST) {
    fail(
      `live clearweb readiness survey must run on ${REQUIRED_PHYSICAL_HOST}; `
      + `observed=${observedHost}`,
    );
  }
  return Object.freeze({
    required: true,
    expected_host: REQUIRED_PHYSICAL_HOST,
    observed_host: observedHost,
    exact: true,
  });
}

function verifyRepository(repoRoot, expectedHead, requireRemoteMain) {
  const root = fs.realpathSync(repoRoot);
  if (!SHA40.test(expectedHead)) {
    fail("expected head must be a full lowercase 40-character Git SHA");
  }
  if (git(root, "status", "--porcelain=v1", "--untracked-files=all")) {
    fail(`repository is not clean: ${root}`);
  }
  const head = git(root, "rev-parse", "HEAD");
  if (head !== expectedHead) {
    fail(`repository head mismatch: expected=${expectedHead} actual=${head}`);
  }
  if (requireRemoteMain) {
    const remoteMain = git(root, "rev-parse", "refs/remotes/origin/main");
    if (remoteMain !== expectedHead) {
      fail(
        `origin/main mismatch; fetch before surveying: `
        + `expected=${expectedHead} actual=${remoteMain}`,
      );
    }
  }
  const files = {};
  for (const relative of REQUIRED_SOURCE_PATHS) {
    files[relative] = readRegular(root, relative);
  }
  return Object.freeze({ root, head, files });
}

function validateTrustPins(value, nowMs) {
  exactKeys(value, ["marker", "version", "network", "source", "trust"], "trust pins");
  if (value.marker !== "VOID_BROWSER_AGENT_TRUST_PINS_V1" || value.version !== 1) {
    fail("trust pins marker or version mismatch");
  }
  exactKeys(value.network, ["chain_id", "identity"], "trust pins.network");
  if (value.network.chain_id !== 2050 || value.network.identity !== "mainnet0") {
    fail("trust pins network mismatch");
  }
  exactKeys(value.source, ["repository", "base_commit", "profile_path"], "trust pins.source");
  if (
    value.source.repository !== REPOSITORY
    || !SHA40.test(value.source.base_commit)
    || value.source.profile_path !== "config/void-tor-agent-access-client-v1.json"
  ) {
    fail("trust pins source mismatch");
  }
  exactKeys(value.trust, [
    "onion_hostname",
    "node_id",
    "public_key_fingerprint_sha256",
    "binding_sha256",
    "binding_expires_at",
  ], "trust pins.trust");
  if (!/^[a-z2-7]{56}\.onion$/.test(value.trust.onion_hostname)) {
    fail("trust pins onion hostname is invalid");
  }
  if (!/^[0-9a-f]{32}$/.test(value.trust.node_id)) {
    fail("trust pins node ID is invalid");
  }
  for (const key of ["public_key_fingerprint_sha256", "binding_sha256"]) {
    if (!SHA64.test(value.trust[key])) fail(`trust pins ${key} is invalid`);
  }
  const expires = canonicalTimestamp(
    value.trust.binding_expires_at,
    "trust pins binding expiry",
  );
  if (expires.getTime() - nowMs < MINIMUM_TRUST_LIFETIME_MS) {
    fail("pinned onion identity has less than seven days remaining");
  }
  return value.trust;
}

function routeUrl(origin, routePath) {
  const resolved = new URL(routePath, `${origin}/`);
  if (resolved.origin !== origin || resolved.pathname !== routePath) {
    fail(`route escaped selected origin: ${routePath}`);
  }
  return resolved.href;
}

async function boundedRequest(url, method, fetchImpl, maximum, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method,
      cache: "no-store",
      redirect: "manual",
      credentials: "omit",
      headers: {
        accept: "application/json",
        "cache-control": "no-cache",
      },
      signal: controller.signal,
    });
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maximum) {
      fail(`${method} ${url} exceeds maximum response size`);
    }
    const body = method === "GET"
      ? Buffer.from(await response.arrayBuffer())
      : Buffer.alloc(0);
    if (body.length > maximum) fail(`${method} ${url} exceeds maximum response size`);
    return Object.freeze({
      status: response.status,
      observed_url: response.url,
      content_type: response.headers.get("content-type") || "",
      location: response.headers.get("location"),
      set_cookie: response.headers.has("set-cookie"),
      www_authenticate: response.headers.has("www-authenticate"),
      body,
    });
  } catch (error) {
    if (error instanceof Hold) throw error;
    fail(`${method} ${url} failed: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeTlsOrigin(origin, options = {}) {
  const canonical = canonicalClearwebOrigin(origin);
  const host = new URL(canonical).hostname;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const connector = options.tlsConnect ?? tls.connect;
  return new Promise((resolve, reject) => {
    let settled = false;
    const socket = connector({
      host,
      port: 443,
      servername: host,
      rejectUnauthorized: true,
      ALPNProtocols: ["h2", "http/1.1"],
    });
    const finish = (action) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      action();
    };
    const timer = setTimeout(() => {
      socket.destroy();
      finish(() => reject(new Hold("TLS probe timed out")));
    }, timeoutMs);
    socket.once("error", (error) => {
      finish(() => reject(new Hold(`TLS probe failed: ${error.message}`)));
    });
    socket.once("secureConnect", () => {
      try {
        const certificate = socket.getPeerCertificate();
        const fingerprint = String(certificate.fingerprint256 || "")
          .replaceAll(":", "")
          .toLowerCase();
        if (!socket.authorized || !SHA64.test(fingerprint)) {
          fail("TLS peer is not authorized with a SHA-256 certificate fingerprint");
        }
        const validFrom = new Date(certificate.valid_from).toISOString();
        const validTo = new Date(certificate.valid_to).toISOString();
        const result = Object.freeze({
          servername: host,
          authorized: true,
          protocol: socket.getProtocol(),
          peer_fingerprint_sha256: fingerprint,
          valid_from: validFrom,
          valid_to: validTo,
          alpn_protocol: socket.alpnProtocol || "none",
        });
        socket.end();
        finish(() => resolve(result));
      } catch (error) {
        socket.destroy();
        finish(() => reject(error instanceof Hold ? error : new Hold(error.message)));
      }
    });
  });
}

export async function collectRouteEvidence(origin, options = {}) {
  const canonical = canonicalClearwebOrigin(origin);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") fail("Fetch API is unavailable");
  const maximum = options.maximum ?? MAXIMUM_BODY_BYTES;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const routes = {};
  for (const [name, descriptor] of Object.entries(ROUTES)) {
    const url = routeUrl(canonical, descriptor.path);
    routes[name] = Object.freeze({
      path: descriptor.path,
      get: await boundedRequest(url, "GET", fetchImpl, maximum, timeoutMs),
      head: await boundedRequest(url, "HEAD", fetchImpl, maximum, timeoutMs),
    });
  }
  const bindingUrl = routeUrl(canonical, CLEARWEB_ORIGIN_BINDING_PATH);
  const bindingPath = Object.freeze({
    path: CLEARWEB_ORIGIN_BINDING_PATH,
    get: await boundedRequest(bindingUrl, "GET", fetchImpl, maximum, timeoutMs),
    head: await boundedRequest(bindingUrl, "HEAD", fetchImpl, maximum, timeoutMs),
  });
  return Object.freeze({ routes: Object.freeze(routes), bindingPath });
}

function validateTls(value, origin, nowMs) {
  exactKeys(value, [
    "servername", "authorized", "protocol", "peer_fingerprint_sha256",
    "valid_from", "valid_to", "alpn_protocol",
  ], "TLS evidence");
  if (
    value.servername !== new URL(origin).hostname
    || value.authorized !== true
    || !["TLSv1.2", "TLSv1.3"].includes(value.protocol)
    || !SHA64.test(value.peer_fingerprint_sha256)
    || !["h2", "http/1.1", "none"].includes(value.alpn_protocol)
  ) {
    fail("TLS evidence profile mismatch");
  }
  const validFrom = canonicalTimestamp(value.valid_from, "TLS valid_from");
  const validTo = canonicalTimestamp(value.valid_to, "TLS valid_to");
  if (validFrom.getTime() > nowMs) fail("TLS certificate is not valid yet");
  if (validTo.getTime() - nowMs < MINIMUM_CERTIFICATE_LIFETIME_MS) {
    fail("TLS certificate has less than seven days remaining");
  }
}

function validateResponse(response, expectedUrl, method, expectedStatus) {
  exactKeys(response, [
    "status", "observed_url", "content_type", "location", "set_cookie",
    "www_authenticate", "body",
  ], `${method} response`);
  if (
    response.status !== expectedStatus
    || response.observed_url !== expectedUrl
    || response.location !== null
    || response.set_cookie !== false
    || response.www_authenticate !== false
    || !Buffer.isBuffer(response.body)
    || (method === "HEAD" && response.body.length !== 0)
  ) {
    fail(`${method} ${expectedUrl} response boundary mismatch`);
  }
}

function routeReceipt(name, evidence, origin, sourceBody) {
  const descriptor = ROUTES[name];
  exactKeys(evidence, ["path", "get", "head"], `route evidence ${name}`);
  if (evidence.path !== descriptor.path) fail(`route path mismatch: ${name}`);
  const expectedUrl = routeUrl(origin, descriptor.path);
  validateResponse(evidence.get, expectedUrl, "GET", 200);
  validateResponse(evidence.head, expectedUrl, "HEAD", 200);
  if (!/^application\/json(?:\s*;|$)/i.test(evidence.get.content_type)) {
    fail(`GET ${descriptor.path} is not application/json`);
  }
  if (!evidence.get.body.equals(sourceBody)) {
    fail(`clearweb route differs from canonical source bytes: ${descriptor.path}`);
  }
  let document;
  try {
    document = JSON.parse(evidence.get.body.toString("utf8"));
  } catch {
    fail(`clearweb route is not valid UTF-8 JSON: ${descriptor.path}`);
  }
  return {
    document,
    receipt: Object.freeze({
      path: descriptor.path,
      get_status: 200,
      head_status: 200,
      observed_get_url: evidence.get.observed_url,
      observed_head_url: evidence.head.observed_url,
      content_type: evidence.get.content_type,
      bytes: evidence.get.body.length,
      observed_sha256: sha256(evidence.get.body),
      source_sha256: sha256(sourceBody),
      exact_source_bytes: true,
      redirect: false,
      set_cookie: false,
      www_authenticate: false,
    }),
  };
}

function bindingPathReceipt(evidence, origin) {
  exactKeys(evidence, ["path", "get", "head"], "binding-path evidence");
  if (evidence.path !== CLEARWEB_ORIGIN_BINDING_PATH) {
    fail("binding-path evidence uses the wrong path");
  }
  const expectedUrl = routeUrl(origin, CLEARWEB_ORIGIN_BINDING_PATH);
  for (const [method, response] of [["GET", evidence.get], ["HEAD", evidence.head]]) {
    exactKeys(response, [
      "status", "observed_url", "content_type", "location", "set_cookie",
      "www_authenticate", "body",
    ], `${method} binding-path response`);
    if (
      ![404, 410].includes(response.status)
      || response.observed_url !== expectedUrl
      || response.location !== null
      || response.set_cookie !== false
      || response.www_authenticate !== false
      || !Buffer.isBuffer(response.body)
      || (method === "HEAD" && response.body.length !== 0)
    ) {
      fail(`unsigned clearweb binding path is not safely absent for ${method}`);
    }
  }
  return Object.freeze({
    path: CLEARWEB_ORIGIN_BINDING_PATH,
    get_status: evidence.get.status,
    head_status: evidence.head.status,
    published: false,
    redirect: false,
    set_cookie: false,
    www_authenticate: false,
  });
}

export function evaluateClearwebOriginReadiness(evidence, source, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  exactKeys(evidence, [
    "origin", "observed_at", "physical_presence", "tls", "routes", "binding_path",
  ], "readiness evidence");
  exactKeys(source, [
    "repository", "canonical_head", "repo_clean", "origin_main_exact", "files",
  ], "source context");
  const origin = canonicalClearwebOrigin(evidence.origin);
  const observedAt = canonicalTimestamp(evidence.observed_at, "evidence observed_at");
  if (observedAt.getTime() > nowMs + 120_000) {
    fail("readiness evidence timestamp is in the future");
  }
  if (nowMs - observedAt.getTime() > 15 * 60 * 1000) {
    fail("readiness evidence is older than fifteen minutes");
  }
  if (
    source.repository !== REPOSITORY
    || !SHA40.test(source.canonical_head)
    || source.repo_clean !== true
    || source.origin_main_exact !== true
  ) {
    fail("canonical source provenance is not exact current main");
  }
  exactKeys(evidence.physical_presence, [
    "required", "expected_host", "observed_host", "exact",
  ], "physical presence");
  if (
    evidence.physical_presence.required !== true
    || evidence.physical_presence.expected_host !== REQUIRED_PHYSICAL_HOST
    || evidence.physical_presence.observed_host !== REQUIRED_PHYSICAL_HOST
    || evidence.physical_presence.exact !== true
  ) {
    fail("physical host assertion mismatch");
  }
  validateTls(evidence.tls, origin, nowMs);
  exactKeys(evidence.routes, Object.keys(ROUTES), "route evidence");

  const routeOutput = {};
  const documents = {};
  const fileHashes = {};
  for (const [name, descriptor] of Object.entries(ROUTES)) {
    const sourceBody = source.files[descriptor.source];
    if (!Buffer.isBuffer(sourceBody)) fail(`missing canonical source bytes: ${descriptor.source}`);
    const checked = routeReceipt(name, evidence.routes[name], origin, sourceBody);
    routeOutput[name] = checked.receipt;
    documents[name] = checked.document;
    fileHashes[descriptor.source] = sha256(sourceBody);
  }
  const wellKnown = validateWellKnownDiscovery(documents.well_known);
  const canonical = validateCanonicalDiscovery(documents.canonical);
  if (
    wellKnown.canonical_discovery !== ROUTES.canonical.path
    || canonical.capability_negotiation !== ROUTES.capabilities.path
  ) {
    fail("discovery chain paths do not match the surveyed same-origin routes");
  }
  const negotiated = intersectReadOnlyCapabilities(documents.capabilities);
  for (const required of ["public_discovery", "capability_negotiation"]) {
    if (!negotiated.granted.includes(required)) {
      fail(`required read-only capability is not granted: ${required}`);
    }
  }

  const trustBody = source.files[TRUST_PINS_PATH];
  if (!Buffer.isBuffer(trustBody)) fail("missing canonical trust-pin bytes");
  let trustPins;
  try {
    trustPins = JSON.parse(trustBody.toString("utf8"));
  } catch {
    fail("canonical trust pins are not valid JSON");
  }
  const trust = validateTrustPins(trustPins, nowMs);
  fileHashes[TRUST_PINS_PATH] = sha256(trustBody);
  const bindingPath = bindingPathReceipt(evidence.binding_path, origin);

  for (const relative of [
    "integrations/browser/void-browser-agent-access-kit-v1/clearweb-origin-binding-v1.mjs",
    "ops/mainnet0/survey_void_browser_clearweb_origin_readiness_v1.mjs",
    "schemas/void-browser-clearweb-origin-readiness-v1.schema.json",
    "scripts/prove_void_browser_clearweb_origin_readiness_v1.mjs",
  ]) {
    const body = source.files[relative];
    if (!Buffer.isBuffer(body)) fail(`missing readiness source bytes: ${relative}`);
    fileHashes[relative] = sha256(body);
  }

  return Object.freeze({
    $schema: SCHEMA_ID,
    marker: MARKER,
    version: 1,
    decision: "READY",
    readiness_scope: READINESS_SCOPE,
    origin,
    observed_at: evidence.observed_at,
    blockers: Object.freeze([]),
    source: Object.freeze({
      repository: REPOSITORY,
      canonical_head: source.canonical_head,
      repo_clean: true,
      origin_main_exact: true,
      files_sha256: Object.freeze(fileHashes),
    }),
    physical_presence: Object.freeze({ ...evidence.physical_presence }),
    tls: Object.freeze({ ...evidence.tls }),
    routes: Object.freeze(routeOutput),
    trust: Object.freeze({
      trust_pins_sha256: sha256(trustBody),
      node_id: trust.node_id,
      public_key_fingerprint_sha256: trust.public_key_fingerprint_sha256,
      onion_hostname: trust.onion_hostname,
      onion_binding_sha256: trust.binding_sha256,
      onion_binding_expires_at: trust.binding_expires_at,
    }),
    binding_path: bindingPath,
    authority: AUTHORITY,
  });
}

export function holdReceipt(originInput, message, observedAt = new Date().toISOString()) {
  let origin = null;
  try {
    origin = canonicalClearwebOrigin(originInput);
  } catch {
    // A malformed candidate origin remains null in the fail-closed receipt.
  }
  return Object.freeze({
    $schema: SCHEMA_ID,
    marker: MARKER,
    version: 1,
    decision: "HOLD",
    readiness_scope: READINESS_SCOPE,
    origin,
    observed_at: observedAt,
    blockers: Object.freeze([String(message || "unspecified readiness failure")]),
    source: null,
    physical_presence: null,
    tls: null,
    routes: null,
    trust: null,
    binding_path: null,
    authority: AUTHORITY,
  });
}

function sourceContext(repository) {
  return Object.freeze({
    repository: REPOSITORY,
    canonical_head: repository.head,
    repo_clean: true,
    origin_main_exact: true,
    files: repository.files,
  });
}

function sourceProof(repoRoot, expectedHead) {
  const repository = verifyRepository(repoRoot, expectedHead, false);
  const hashes = Object.fromEntries(
    REQUIRED_SOURCE_PATHS.map((relative) => [relative, sha256(repository.files[relative])]),
  );
  return Object.freeze({
    marker: `${MARKER}_SOURCE_PROOF`,
    version: 1,
    canonical_head: repository.head,
    physical_host_assertion: "not_run_in_ci_source_mode",
    network_survey: false,
    required_source_sha256: Object.freeze(hashes),
    authority: AUTHORITY,
  });
}

async function survey(values) {
  const observedAt = new Date().toISOString();
  try {
    const origin = canonicalClearwebOrigin(values.origin);
    const physicalPresence = assertPhysicalHost(os.hostname());
    const repository = verifyRepository(values.repoRoot, values.expectedHead, true);
    const tlsEvidence = await probeTlsOrigin(origin);
    const routeEvidence = await collectRouteEvidence(origin);
    const receipt = evaluateClearwebOriginReadiness(
      {
        origin,
        observed_at: observedAt,
        physical_presence: physicalPresence,
        tls: tlsEvidence,
        routes: routeEvidence.routes,
        binding_path: routeEvidence.bindingPath,
      },
      sourceContext(repository),
    );
    console.log(JSON.stringify(receipt, null, 2));
    console.log(`${MARKER}=READY`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify(holdReceipt(values.origin, message, observedAt), null, 2));
    console.error(`HOLD: ${message}`);
    return 1;
  }
}

async function main() {
  const parsed = parseArgs({
    allowPositionals: true,
    options: {
      "repo-root": { type: "string" },
      "expected-head": { type: "string" },
      origin: { type: "string" },
    },
  });
  const [mode] = parsed.positionals;
  const repoRoot = path.resolve(parsed.values["repo-root"] || process.cwd());
  const expectedHead = parsed.values["expected-head"];
  if (!expectedHead) fail("--expected-head is required");
  if (mode === "source") {
    console.log(JSON.stringify(sourceProof(repoRoot, expectedHead), null, 2));
    console.log(`${MARKER}_SOURCE_PROOF=PASS`);
    return 0;
  }
  if (mode === "survey") {
    if (!parsed.values.origin) fail("--origin is required for survey mode");
    return survey({
      repoRoot,
      expectedHead,
      origin: parsed.values.origin,
    });
  }
  fail("mode must be source or survey");
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().then(
    (code) => { process.exitCode = code; },
    (error) => {
      console.error(`HOLD: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    },
  );
}
