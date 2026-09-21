#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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
  testOnly,
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

function fakeHeaders(values = {}) {
  const headers = new Map(
    Object.entries(values).map(([key, value]) => [
      key.toLowerCase(),
      String(value),
    ]),
  );
  return {
    get(name) {
      return headers.has(String(name).toLowerCase())
        ? headers.get(String(name).toLowerCase())
        : null;
    },
    has(name) {
      return headers.has(String(name).toLowerCase());
    },
  };
}

function lazyBody(chunks = []) {
  let index = 0;
  let readCount = 0;
  let cancelCount = 0;
  return {
    get readCount() {
      return readCount;
    },
    get cancelCount() {
      return cancelCount;
    },
    async cancel() {
      cancelCount += 1;
    },
    getReader() {
      return {
        async read() {
          readCount += 1;
          if (index >= chunks.length) return { done: true, value: undefined };
          const value = chunks[index];
          index += 1;
          return { done: false, value };
        },
        async cancel() {
          cancelCount += 1;
        },
        releaseLock() {},
      };
    },
  };
}

function fakeFetchResponse(url, {
  status = 200,
  redirected = false,
  headers = {},
  body = null,
} = {}) {
  return {
    status,
    redirected,
    url,
    headers: fakeHeaders(headers),
    body,
  };
}

function gitFixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-clearweb-git-object-proof-"),
  );
  const env = {
    LC_ALL: "C",
    LANG: "C",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
  };
  const run = (...args) =>
    execFileSync("/usr/bin/git", args, {
      cwd: root,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  run("init", "-q");
  fs.writeFileSync(path.join(root, "sample.txt"), "committed\n");
  run("add", "--", "sample.txt");
  run(
    "-c", "user.name=void-proof",
    "-c", "user.email=void-proof@example.invalid",
    "commit", "-qm", "fixture",
  );
  return { root, head: run("rev-parse", "HEAD") };
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

const transportUrl = "https://node.example/proof.json";

{
  const body = lazyBody([Buffer.from("{}")]);
  await rejects(
    async () => testOnly.boundedRequest(
      transportUrl,
      "GET",
      async () => fakeFetchResponse(transportUrl, {
        headers: { "content-length": String(1024 * 1024 + 1) },
        body,
      }),
      1024 * 1024,
      1000,
    ),
    /exceeds maximum response size/,
  );
  assert.equal(body.readCount, 0);
  assert.equal(body.cancelCount, 1);
}

{
  const body = lazyBody([
    Buffer.alloc(4, 0x61),
    Buffer.alloc(4, 0x62),
  ]);
  await rejects(
    async () => testOnly.boundedRequest(
      transportUrl,
      "GET",
      async () => fakeFetchResponse(transportUrl, { body }),
      6,
      1000,
    ),
    /exceeds maximum response size/,
  );
  assert.equal(body.readCount, 2);
  assert.equal(body.cancelCount, 1);
}

{
  const body = lazyBody([Buffer.from("{}")]);
  await rejects(
    async () => testOnly.boundedRequest(
      transportUrl,
      "GET",
      async () => fakeFetchResponse(transportUrl, {
        headers: { "content-length": "01" },
        body,
      }),
      1024,
      1000,
    ),
    /content-length is not one canonical decimal integer/,
  );
  assert.equal(body.readCount, 0);
}

{
  const body = lazyBody([Buffer.from("{}")]);
  await rejects(
    async () => testOnly.boundedRequest(
      transportUrl,
      "GET",
      async () => fakeFetchResponse("https://other.example/proof.json", {
        body,
      }),
      1024,
      1000,
    ),
    /response provenance mismatch/,
  );
  assert.equal(body.readCount, 0);
  assert.equal(body.cancelCount, 1);
}

{
  const body = lazyBody([]);
  await rejects(
    async () => testOnly.boundedRequest(
      transportUrl,
      "HEAD",
      async () => fakeFetchResponse(transportUrl, { body }),
      1024,
      1000,
    ),
    /unexpectedly exposed a response body/,
  );
  assert.equal(body.readCount, 0);
  assert.equal(body.cancelCount, 1);
}

{
  const body = lazyBody([Buffer.from('{"ok":true}')]);
  const admitted = await testOnly.boundedRequest(
    transportUrl,
    "GET",
    async () => fakeFetchResponse(transportUrl, {
      headers: {
        "content-length": String(Buffer.byteLength('{"ok":true}')),
        "content-type": "application/json",
      },
      body,
    }),
    1024,
    1000,
  );
  assert.equal(admitted.status, 200);
  assert.equal(admitted.observed_url, transportUrl);
  assert.equal(admitted.body.toString("utf8"), '{"ok":true}');
}

{
  const fixtureRepo = gitFixture();
  const priorGitDir = process.env.GIT_DIR;
  const priorPath = process.env.PATH;
  try {
    const committed = testOnly.readGitBlobAtHead(
      fixtureRepo.root,
      fixtureRepo.head,
      "sample.txt",
    );
    assert.equal(committed.mode, "100644");
    assert.equal(committed.bytes.toString("utf8"), "committed\n");

    fs.writeFileSync(
      path.join(fixtureRepo.root, "sample.txt"),
      "working-tree-substitution\n",
    );
    process.env.GIT_DIR = path.join(fixtureRepo.root, "hostile-git-dir");
    process.env.PATH = path.join(fixtureRepo.root, "hostile-path");

    const recaptured = testOnly.readGitBlobAtHead(
      fixtureRepo.root,
      fixtureRepo.head,
      "sample.txt",
    );
    assert.equal(recaptured.blob, committed.blob);
    assert.equal(recaptured.bytes.toString("utf8"), "committed\n");
    assert.notEqual(
      fs.readFileSync(path.join(fixtureRepo.root, "sample.txt"), "utf8"),
      recaptured.bytes.toString("utf8"),
    );
  } finally {
    if (priorGitDir === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = priorGitDir;
    if (priorPath === undefined) delete process.env.PATH;
    else process.env.PATH = priorPath;
    fs.rmSync(fixtureRepo.root, { recursive: true, force: true });
  }
}

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
assert.match(surveySource, /const GIT_BIN = "\/usr\/bin\/git"/);
assert.match(surveySource, /GIT_CONFIG_NOSYSTEM: "1"/);
assert.match(surveySource, /const treeLine = git\(repoRoot, "ls-tree", expectedHead, "--", relative\);/);
assert.match(surveySource, /gitBuffer\(repoRoot, "cat-file", "blob"/);
assert.match(surveySource, /assertStableRepositoryGeneration\(\);/);
assert.doesNotMatch(surveySource, /execFileSync\("git"/);
assert.doesNotMatch(surveySource, /env: \{ \.\.\.process\.env/);
assert.doesNotMatch(surveySource, /response\.arrayBuffer\(\)/);
assert.doesNotMatch(surveySource, /Number\(response\.headers\.get\("content-length"\)\)/);

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
console.log("response_body_stream_bounded=true");
console.log("head_body_forbidden=true");
console.log("selected_commit_git_blob_authority=true");
console.log("ambient_git_environment_ignored=true");
console.log("discovery_bytes_exact=true");
console.log("unsafe_authority_rejected=true");
console.log("unsigned_binding_absence_required=true");
console.log("browser_activation=false");
console.log("live_binding_created=false");
console.log("private_key_access=false");
console.log("deployment=false");
console.log("payment_authority=false");
console.log("fund_movement=false");
