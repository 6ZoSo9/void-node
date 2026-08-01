#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  MARKER,
  READINESS_SCOPE,
  REQUIRED_PHYSICAL_HOST,
  SCHEMA_ID,
  assertPhysicalHost,
  canonicalClearwebOrigin,
  evaluateClearwebOriginReadiness,
  holdReceipt,
} from "../ops/mainnet0/survey_void_browser_clearweb_origin_readiness_v1.mjs";

const ROOT = process.cwd();
const SURVEY = path.join(
  ROOT,
  "ops/mainnet0/survey_void_browser_clearweb_origin_readiness_v1.mjs",
);
const SCHEMA = path.join(
  ROOT,
  "schemas/void-browser-clearweb-origin-readiness-v1.schema.json",
);
const WORKFLOW = path.join(
  ROOT,
  ".github/workflows/void-browser-clearweb-origin-readiness-v1.yml",
);
const DOC = path.join(
  ROOT,
  "docs/operations/void-browser-clearweb-origin-readiness-v1.md",
);
const MANIFEST = path.join(
  ROOT,
  "integrations/browser/void-browser-agent-access-kit-v1/manifest.json",
);
const BINDING_PUBLIC_PATH = path.join(
  ROOT,
  "public/.well-known/void-browser-clearweb-origin-binding-v1.json",
);

const ROUTES = {
  well_known: {
    path: "/.well-known/void-agent-discovery.json",
    source: "public/.well-known/void-agent-discovery.json",
  },
  canonical: {
    path: "/public-node/agents/discovery-v1.json",
    source: "public/public-node/agents/discovery-v1.json",
  },
  capabilities: {
    path: "/public-node/agents/capabilities-v1.json",
    source: "public/public-node/agents/capabilities-v1.json",
  },
};
const TRUST_PINS =
  "integrations/browser/void-browser-agent-access-kit-v1/trust-pins.json";
const REQUIRED_CONTEXT = [
  ...Object.values(ROUTES).map((value) => value.source),
  TRUST_PINS,
  "integrations/browser/void-browser-agent-access-kit-v1/clearweb-origin-binding-v1.mjs",
  "ops/mainnet0/survey_void_browser_clearweb_origin_readiness_v1.mjs",
  "schemas/void-browser-clearweb-origin-readiness-v1.schema.json",
  "scripts/prove_void_browser_clearweb_origin_readiness_v1.mjs",
];
const NOW = Date.parse("2026-08-01T17:45:00.000Z");
const OBSERVED_AT = new Date(NOW).toISOString();
const ORIGIN = "https://node.example";

function clone(value) {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    );
  }
  return value;
}

async function rejects(action, pattern) {
  await assert.rejects(action, pattern);
}

function response(url, method, status, body, contentType = "application/json") {
  return {
    status,
    observed_url: url,
    content_type: contentType,
    location: null,
    set_cookie: false,
    www_authenticate: false,
    body: method === "GET" ? Buffer.from(body) : Buffer.alloc(0),
  };
}

function fixture() {
  const files = Object.fromEntries(
    REQUIRED_CONTEXT.map((relative) => [relative, fs.readFileSync(path.join(ROOT, relative))]),
  );
  const routes = {};
  for (const [name, descriptor] of Object.entries(ROUTES)) {
    const body = files[descriptor.source];
    const url = `${ORIGIN}${descriptor.path}`;
    routes[name] = {
      path: descriptor.path,
      get: response(url, "GET", 200, body),
      head: response(url, "HEAD", 200, body),
    };
  }
  const bindingUrl =
    `${ORIGIN}/.well-known/void-browser-clearweb-origin-binding-v1.json`;
  return {
    evidence: {
      origin: ORIGIN,
      observed_at: OBSERVED_AT,
      physical_presence: assertPhysicalHost(REQUIRED_PHYSICAL_HOST),
      tls: {
        servername: "node.example",
        authorized: true,
        protocol: "TLSv1.3",
        peer_fingerprint_sha256: "a".repeat(64),
        valid_from: new Date(NOW - 24 * 60 * 60 * 1000).toISOString(),
        valid_to: new Date(NOW + 30 * 24 * 60 * 60 * 1000).toISOString(),
        alpn_protocol: "h2",
      },
      routes,
      binding_path: {
        path: "/.well-known/void-browser-clearweb-origin-binding-v1.json",
        get: response(bindingUrl, "GET", 404, "not found", "text/plain"),
        head: response(bindingUrl, "HEAD", 404, "", "text/plain"),
      },
    },
    source: {
      repository: "6ZoSo9/void-node",
      canonical_head: "1".repeat(40),
      repo_clean: true,
      origin_main_exact: true,
      files,
    },
  };
}

for (const required of [SURVEY, SCHEMA, WORKFLOW, DOC, MANIFEST]) {
  assert.ok(fs.statSync(required).isFile(), `missing required source: ${required}`);
}

const schema = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));
assert.equal(schema.$id, SCHEMA_ID);
assert.equal(schema.properties?.marker?.const, MARKER);
assert.deepEqual(schema.properties?.decision?.enum, ["READY", "HOLD"]);
assert.equal(schema.properties?.readiness_scope?.const, READINESS_SCOPE);
assert.equal(
  schema.$defs?.physical_presence?.properties?.expected_host?.const,
  REQUIRED_PHYSICAL_HOST,
);
for (const key of [
  "browser_activation",
  "clearweb_binding_creation",
  "private_key_access",
  "deployment",
  "service_restart",
  "dns_or_tls_mutation",
  "node_runtime_mutation",
  "transaction_submission",
  "payment_authority",
  "wallet_or_signer_access",
  "work_credit_write",
  "fund_movement",
]) {
  assert.equal(schema.$defs?.authority?.properties?.[key]?.const, false);
}

assert.equal(canonicalClearwebOrigin(ORIGIN), ORIGIN);
assert.throws(() => canonicalClearwebOrigin("http://node.example"), /HTTPS origin/);
assert.throws(() => canonicalClearwebOrigin("https://node.example/path"), /HTTPS origin/);
assert.throws(() => canonicalClearwebOrigin("https://user@node.example"), /HTTPS origin/);
assert.throws(
  () => assertPhysicalHost("github-actions-runner"),
  /must run on zoso-Precision-Tower-7810/,
);

const good = fixture();
const ready = evaluateClearwebOriginReadiness(good.evidence, good.source, { nowMs: NOW });
assert.equal(ready.decision, "READY");
assert.equal(ready.readiness_scope, READINESS_SCOPE);
assert.equal(ready.origin, ORIGIN);
assert.equal(ready.blockers.length, 0);
assert.equal(ready.physical_presence.exact, true);
assert.equal(ready.tls.authorized, true);
assert.equal(ready.routes.well_known.exact_source_bytes, true);
assert.equal(ready.routes.canonical.exact_source_bytes, true);
assert.equal(ready.routes.capabilities.exact_source_bytes, true);
assert.equal(ready.binding_path.published, false);
assert.equal(ready.authority.browser_activation, false);
assert.equal(ready.authority.private_key_access, false);
assert.equal(ready.authority.payment_authority, false);

const wrongHost = clone(good.evidence);
wrongHost.physical_presence.observed_host = "github-actions-runner";
wrongHost.physical_presence.exact = false;
await rejects(
  async () => evaluateClearwebOriginReadiness(wrongHost, good.source, { nowMs: NOW }),
  /physical host assertion mismatch/,
);

const staleMain = clone(good.source);
staleMain.origin_main_exact = false;
await rejects(
  async () => evaluateClearwebOriginReadiness(good.evidence, staleMain, { nowMs: NOW }),
  /not exact current main/,
);

const redirect = clone(good.evidence);
redirect.routes.well_known.get.status = 302;
redirect.routes.well_known.get.location = "https://other.example/discovery.json";
await rejects(
  async () => evaluateClearwebOriginReadiness(redirect, good.source, { nowMs: NOW }),
  /response boundary mismatch/,
);

const changedDocument = clone(good.evidence);
changedDocument.routes.canonical.get.body = Buffer.from("{}\n");
await rejects(
  async () => evaluateClearwebOriginReadiness(changedDocument, good.source, { nowMs: NOW }),
  /differs from canonical source bytes/,
);

const elevatedSource = clone(good.source);
const elevatedEvidence = clone(good.evidence);
const catalog = JSON.parse(elevatedSource.files[ROUTES.capabilities.source].toString("utf8"));
catalog.authority.payment_submission_active = true;
const elevatedBytes = Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`);
elevatedSource.files[ROUTES.capabilities.source] = elevatedBytes;
elevatedEvidence.routes.capabilities.get.body = Buffer.from(elevatedBytes);
await rejects(
  async () => evaluateClearwebOriginReadiness(
    elevatedEvidence,
    elevatedSource,
    { nowMs: NOW },
  ),
  /capability authority boundary is not read-only/,
);

const liveUnsignedBinding = clone(good.evidence);
liveUnsignedBinding.binding_path.get.status = 200;
liveUnsignedBinding.binding_path.head.status = 200;
await rejects(
  async () => evaluateClearwebOriginReadiness(
    liveUnsignedBinding,
    good.source,
    { nowMs: NOW },
  ),
  /not safely absent/,
);

const expiringCertificate = clone(good.evidence);
expiringCertificate.tls.valid_to =
  new Date(NOW + 24 * 60 * 60 * 1000).toISOString();
await rejects(
  async () => evaluateClearwebOriginReadiness(
    expiringCertificate,
    good.source,
    { nowMs: NOW },
  ),
  /less than seven days/,
);

const unknownField = clone(good.evidence);
unknownField.activate = true;
await rejects(
  async () => evaluateClearwebOriginReadiness(unknownField, good.source, { nowMs: NOW }),
  /readiness evidence keys mismatch/,
);

const hold = holdReceipt("http://unsafe.example", "unsafe origin", OBSERVED_AT);
assert.equal(hold.decision, "HOLD");
assert.equal(hold.origin, null);
assert.deepEqual(hold.blockers, ["unsafe origin"]);
assert.equal(hold.authority.browser_activation, false);

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
assert.deepEqual(manifest.optional_host_permissions, ["http://*.onion/*"]);
assert.equal(fs.existsSync(BINDING_PUBLIC_PATH), false);

const surveySource = fs.readFileSync(SURVEY, "utf8");
for (const forbidden of [
  /writeFile(?:Sync)?\s*\(/,
  /appendFile(?:Sync)?\s*\(/,
  /createWriteStream\s*\(/,
  /\bPOST\b/,
  /\bPUT\b/,
  /\bPATCH\b/,
  /\bDELETE\b/,
  /BEGIN PRIVATE KEY/,
  /mnemonic/i,
  /seed[_ -]?phrase/i,
]) {
  assert.equal(forbidden.test(surveySource), false, `forbidden source pattern: ${forbidden}`);
}
assert.match(surveySource, /physical_host_assertion: "not_run_in_ci_source_mode"/);
assert.match(surveySource, /assertPhysicalHost\(os\.hostname\(\)\)/);
assert.match(surveySource, /redirect: "manual"/);
assert.match(surveySource, /credentials: "omit"/);

const documentation = fs.readFileSync(DOC, "utf8");
for (const required of [
  "READY for offline signing only",
  REQUIRED_PHYSICAL_HOST,
  "GitHub Actions",
  "does not select an origin",
  "No private key",
  "does not deploy",
]) {
  assert.ok(documentation.includes(required), `documentation missing: ${required}`);
}

console.log(`${MARKER}_PROOF_GREEN`);
console.log("ready_scope_offline_signing_only=true");
console.log("precision_physical_host_required=true");
console.log("ci_physical_presence_skipped=true");
console.log("tls_and_no_redirect_required=true");
console.log("discovery_bytes_exact=true");
console.log("unsafe_authority_rejected=true");
console.log("unsigned_binding_absence_required=true");
console.log("browser_activation=false");
console.log("live_binding_created=false");
console.log("private_key_access=false");
console.log("deployment=false");
console.log("payment_authority=false");
console.log("fund_movement=false");
