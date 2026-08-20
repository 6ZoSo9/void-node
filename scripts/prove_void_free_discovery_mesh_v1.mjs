#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CRAWLER_EXCLUSIONS,
  MARKER,
  PUBLIC_PATHS,
  buildDiscoveryPack,
  canonicalUrls,
  datasetJsonLd,
  indexNowRequest,
  readDiscoveryConfigFile,
  readPinnedUtf8RegularFile,
  renderLanding,
  renderRobots,
  renderSitemap,
  validateIndexNowKey,
  validateLastmod,
  validateOrigin,
} from "../tools/void-free-discovery-mesh-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const TOOL = path.join(REPO_ROOT, "tools/void-free-discovery-mesh-v1.mjs");
const CONFIG = path.join(REPO_ROOT, "config/void-free-discovery-mesh-v1.json");
const WORKFLOW_PATH =
  ".github/workflows/void-free-discovery-mesh-v1.yml";
const CI_COST_CHECKER_PATH = "scripts/check_void_ci_cost_boundary_v1.py";
const EXPECTED_TRIGGER_PATHS = Object.freeze([
  WORKFLOW_PATH,
  "config/void-free-discovery-mesh-v1.json",
  "docs/public-node/void-free-discovery-mesh-v1.md",
  "scripts/prove_void_free_discovery_mesh_v1.mjs",
  CI_COST_CHECKER_PATH,
  "tools/void-free-discovery-mesh-v1.mjs",
].sort());
const ORIGIN = "https://void.example";
const LASTMOD = "2026-07-31";
const INDEXNOW_KEY = "VOID-Free-Discovery-Test-Key-0001";

assert.equal(MARKER, "VOID_FREE_DISCOVERY_MESH_V1");
assert.deepEqual(PUBLIC_PATHS, [
  "/",
  "/discovery/",
  "/public-node",
  "/.well-known/void-public-node.json",
  "/.well-known/void-agent-discovery.json",
]);
assert.deepEqual(CRAWLER_EXCLUSIONS, [
  "/admin/",
  "/internal/",
  "/operator/",
  "/private/",
  "/debug/",
  "/metrics",
]);

assert.equal(validateOrigin(ORIGIN), ORIGIN);
assert.equal(validateOrigin("https://VOID.EXAMPLE:443"), ORIGIN);
for (const invalid of [
  "http://void.example",
  "https://void.example/path",
  "https://void.example/?query=yes",
  "https://void.example/#fragment",
  "https://user:void@void.example",
  "https://localhost",
  "https://127.0.0.1",
  "https://void.local",
  "https://voidexample.onion",
  "https://void.example:8443",
]) {
  assert.throws(() => validateOrigin(invalid));
}

assert.equal(validateLastmod(LASTMOD), LASTMOD);
for (const invalid of ["2026-7-31", "2026-02-30", "2026-07-31T00:00:00Z", "today"]) {
  assert.throws(() => validateLastmod(invalid));
}

assert.equal(validateIndexNowKey(`${INDEXNOW_KEY}\n`), INDEXNOW_KEY);
for (const invalid of ["short", "contains_underscore", "two\nlines", "x".repeat(129)]) {
  assert.throws(() => validateIndexNowKey(invalid));
}

const urls = canonicalUrls(ORIGIN);
assert.deepEqual(urls, [
  "https://void.example/",
  "https://void.example/discovery/",
  "https://void.example/public-node",
  "https://void.example/.well-known/void-public-node.json",
  "https://void.example/.well-known/void-agent-discovery.json",
]);
assert.equal(urls.every((value) => new URL(value).host === "void.example"), true);

const robots = renderRobots(ORIGIN);
assert.match(robots, /^# VOID_FREE_DISCOVERY_MESH_V1/m);
assert.match(robots, /Sitemap: https:\/\/void\.example\/sitemap\.xml/);
for (const exclusion of CRAWLER_EXCLUSIONS) {
  assert.match(robots, new RegExp(`Disallow: ${exclusion.replaceAll("/", "\\/")}`));
}

const sitemap = renderSitemap(ORIGIN, LASTMOD);
assert.equal((sitemap.match(/<url>/g) ?? []).length, PUBLIC_PATHS.length);
assert.equal((sitemap.match(/<lastmod>2026-07-31<\/lastmod>/g) ?? []).length, PUBLIC_PATHS.length);
for (const url of urls) assert.match(sitemap, new RegExp(`<loc>${url.replaceAll("/", "\\/")}</loc>`));

const dataset = datasetJsonLd(ORIGIN);
assert.equal(dataset["@context"], "https://schema.org");
assert.equal(dataset["@type"], "Dataset");
assert.equal(dataset.isAccessibleForFree, true);
assert.equal(dataset.distribution.length, 2);
assert.equal(dataset.distribution.every((entry) => entry["@type"] === "DataDownload"), true);

const landing = renderLanding(ORIGIN);
assert.match(landing, /<script type="application\/ld\+json">/);
assert.match(landing, /<link rel="canonical" href="https:\/\/void\.example\/discovery\/">/);
assert.match(landing, /grants no wallet, signer, payment, Work Credit, validator, operator, or mutation authority/);

const request = indexNowRequest(ORIGIN, INDEXNOW_KEY);
assert.deepEqual(request, {
  host: "void.example",
  key: INDEXNOW_KEY,
  keyLocation: `https://void.example/${INDEXNOW_KEY}.txt`,
  urlList: urls,
});

const config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
assert.equal(config.marker, MARKER);
assert.equal(config.source.base_commit, "118ccd098d99053d921c53c4036eb8008bb2c705");
assert.equal(config.activation.state, "source_only_not_activated");
assert.equal(config.cost_boundary.payment_method_collection, false);
assert.equal(config.cost_boundary.automatic_paid_upgrade, false);
assert.equal(config.authority.network_calls, false);
assert.equal(config.authority.deployment, false);
assert.equal(config.authority.wallet_or_signer_access, false);
assert.equal(readDiscoveryConfigFile(CONFIG).config.marker, MARKER);

function workflowEventPaths(source, eventName, endMarker) {
  const startMarker = `  ${eventName}:\n`;
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${eventName}: trigger missing`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `${eventName}: trigger boundary missing`);
  return [...source.slice(start, end).matchAll(/^\s{6}- "([^"]+)"$/gm)]
    .map((match) => match[1])
    .sort();
}

const workflowSource = fs.readFileSync(
  path.join(REPO_ROOT, WORKFLOW_PATH),
  "utf8",
);
const pullRequestPaths = workflowEventPaths(
  workflowSource,
  "pull_request",
  "  push:\n",
);
const pushPaths = workflowEventPaths(
  workflowSource,
  "push",
  "\npermissions:\n",
);
assert.deepEqual(
  pullRequestPaths,
  EXPECTED_TRIGGER_PATHS,
  "pull_request trigger must bind the exact Free Discovery Mesh dependency set",
);
assert.deepEqual(
  pushPaths,
  EXPECTED_TRIGGER_PATHS,
  "push trigger must bind the exact Free Discovery Mesh dependency set",
);
assert.ok(
  pullRequestPaths.includes(CI_COST_CHECKER_PATH)
    && pushPaths.includes(CI_COST_CHECKER_PATH),
  "CI cost checker-only changes must schedule the Free Discovery Mesh workflow",
);
assert.ok(
  !pullRequestPaths.includes("src/node_core.ts")
    && !pushPaths.includes("src/node_core.ts"),
  "unrelated source changes must not schedule the Free Discovery Mesh workflow",
);

const toolSource = fs.readFileSync(TOOL, "utf8");
for (const forbidden of [
  /\bfetch\s*\(/,
  /node:https/,
  /node:http/,
  /child_process/,
  /\bcurl\b/,
  /\bwget\b/,
]) {
  assert.doesNotMatch(toolSource, forbidden);
}
assert.match(toolSource, /\/proc\/self\/fd/);
assert.match(toolSource, /O_NOFOLLOW/);
assert.doesNotMatch(toolSource, /fs\.readFileSync\(CONFIG_PATH/);
assert.doesNotMatch(toolSource, /requireRegularFile\(args\.indexNowKeyFile/);

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-free-discovery-mesh-proof-"));
try {
  const output = path.join(temporaryRoot, "pack");
  const built = buildDiscoveryPack({
    origin: ORIGIN,
    output,
    indexNowKey: INDEXNOW_KEY,
    lastmod: LASTMOD,
  });
  assert.equal(built.destination, output);
  assert.equal(built.receipt.claims.source_only, true);
  assert.equal(built.receipt.claims.network_calls, false);
  assert.equal(built.receipt.claims.live_submission, false);
  assert.equal(built.receipt.claims.public_deployment, false);
  assert.equal(built.receipt.claims.provider_account_mutation, false);
  assert.equal(built.receipt.claims.payment_method_collection, false);
  assert.equal(built.receipt.claims.automatic_paid_upgrade, false);
  assert.equal(
    built.receipt.config_sha256,
    readDiscoveryConfigFile(CONFIG).sha256,
    "receipt must hash the descriptor-bound config bytes actually validated",
  );

  const inventory = [];
  function collect(directory, prefix = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) collect(path.join(directory, entry.name), relative);
      else inventory.push(relative);
    }
  }
  collect(output);
  inventory.sort();
  assert.deepEqual(inventory, [
    "build-receipt-v1.json",
    "operator/indexnow-request-v1.json",
    "operator/provider-registration-checklist-v1.json",
    `public/${INDEXNOW_KEY}.txt`,
    "public/discovery/index.html",
    "public/discovery/void-datanet-dataset-v1.jsonld",
    "public/robots.txt",
    "public/sitemap.xml",
  ]);
  assert.equal(fs.readFileSync(path.join(output, `public/${INDEXNOW_KEY}.txt`), "utf8"), `${INDEXNOW_KEY}\n`);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(output, "operator/indexnow-request-v1.json"), "utf8")),
    request,
  );
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(output, "public/discovery/void-datanet-dataset-v1.jsonld"), "utf8")),
    dataset,
  );

  assert.throws(
    () => buildDiscoveryPack({
      origin: ORIGIN,
      output: path.join(REPO_ROOT, "must-not-write-here"),
      indexNowKey: INDEXNOW_KEY,
      lastmod: LASTMOD,
    }),
    /outside the repository/,
  );

  const keyPath = path.join(temporaryRoot, "indexnow-key.txt");
  const keyOpenedGeneration = path.join(temporaryRoot, "indexnow-key.opened.txt");
  fs.writeFileSync(keyPath, `${INDEXNOW_KEY}\n`, { mode: 0o600 });
  assert.throws(
    () => readPinnedUtf8RegularFile(keyPath, "IndexNow key file", {
      afterOpen() {
        fs.renameSync(keyPath, keyOpenedGeneration);
        fs.writeFileSync(keyPath, "Attacker-Replacement-Key-0001\n", { mode: 0o600 });
      },
    }),
    /changed while being read|path changed generation/,
    "key pathname replacement after open must HOLD",
  );
  assert.equal(
    fs.readFileSync(keyPath, "utf8"),
    "Attacker-Replacement-Key-0001\n",
    "replacement key generation must not be mistaken for the opened generation",
  );

  const configPath = path.join(temporaryRoot, "config.json");
  const configOpenedGeneration = path.join(temporaryRoot, "config.opened.json");
  fs.writeFileSync(configPath, fs.readFileSync(CONFIG));
  assert.throws(
    () => readDiscoveryConfigFile(configPath, {
      afterOpen() {
        fs.renameSync(configPath, configOpenedGeneration);
        const replacement = structuredClone(config);
        replacement.authority.network_calls = true;
        fs.writeFileSync(configPath, `${JSON.stringify(replacement, null, 2)}\n`);
      },
    }),
    /changed while being read|path changed generation/,
    "config pathname replacement after open must HOLD before replacement authority can be consumed",
  );

  const symlinkTarget = path.join(temporaryRoot, "symlink-target");
  const symlinkParent = path.join(temporaryRoot, "symlink-parent");
  fs.mkdirSync(symlinkTarget);
  fs.symlinkSync(symlinkTarget, symlinkParent, "dir");
  assert.throws(
    () => buildDiscoveryPack({
      origin: ORIGIN,
      output: path.join(symlinkParent, "pack"),
      indexNowKey: INDEXNOW_KEY,
      lastmod: LASTMOD,
    }),
    /only existing real directories/,
    "output parent traversal must reject symlink components",
  );
  assert.deepEqual(fs.readdirSync(symlinkTarget), [], "symlink target must receive zero writes");

  const authorityRoot = path.join(temporaryRoot, "authority-swap");
  const anchor = path.join(authorityRoot, "anchor");
  const originalAnchor = path.join(authorityRoot, "anchor-original");
  const parent = path.join(anchor, "parent");
  const redirectedOutput = path.join(parent, "pack");
  fs.mkdirSync(parent, { recursive: true });
  assert.throws(
    () => buildDiscoveryPack({
      origin: ORIGIN,
      output: redirectedOutput,
      indexNowKey: INDEXNOW_KEY,
      lastmod: LASTMOD,
      testHooks: {
        beforePublish() {
          fs.renameSync(anchor, originalAnchor);
          fs.mkdirSync(parent, { recursive: true });
        },
      },
    }),
    /output parent path changed generation|must contain only existing real directories/,
    "ancestor replacement before publication must HOLD",
  );
  assert.equal(fs.existsSync(redirectedOutput), false, "replacement namespace must receive no published pack");
  assert.deepEqual(fs.readdirSync(parent), [], "replacement namespace must receive zero writes");
  assert.deepEqual(
    fs.readdirSync(path.join(originalAnchor, "parent")),
    [],
    "the pinned original parent must clean its private temporary generation on HOLD",
  );

  const noReplaceParent = path.join(temporaryRoot, "no-replace-parent");
  const foreignDestination = path.join(noReplaceParent, "pack");
  fs.mkdirSync(noReplaceParent);
  let foreignDestinationIdentity;
  assert.throws(
    () => buildDiscoveryPack({
      origin: ORIGIN,
      output: foreignDestination,
      indexNowKey: INDEXNOW_KEY,
      lastmod: LASTMOD,
      testHooks: {
        beforePublish() {
          fs.mkdirSync(foreignDestination, { mode: 0o700 });
          const metadata = fs.statSync(foreignDestination, { bigint: true });
          foreignDestinationIdentity = { dev: metadata.dev, ino: metadata.ino };
        },
      },
    }),
    /output became occupied before publication/,
    "a concurrent foreign destination must win without being replaced",
  );
  const preservedForeignDestination = fs.statSync(
    foreignDestination,
    { bigint: true },
  );
  assert.deepEqual(
    {
      dev: preservedForeignDestination.dev,
      ino: preservedForeignDestination.ino,
    },
    foreignDestinationIdentity,
    "the exact concurrently-created foreign destination generation must remain",
  );
  assert.deepEqual(
    fs.readdirSync(foreignDestination),
    [],
    "the foreign destination must remain untouched",
  );
  assert.deepEqual(
    fs.readdirSync(noReplaceParent),
    ["pack"],
    "private temporary output must be cleaned after no-replace HOLD",
  );

  const stagedMutationParent = path.join(temporaryRoot, "staged-mutation-parent");
  const stagedMutationOutput = path.join(stagedMutationParent, "pack");
  fs.mkdirSync(stagedMutationParent);
  assert.throws(
    () => buildDiscoveryPack({
      origin: ORIGIN,
      output: stagedMutationOutput,
      indexNowKey: INDEXNOW_KEY,
      lastmod: LASTMOD,
      testHooks: {
        beforePublish({ temporary }) {
          const target = path.join(temporary, "public/robots.txt");
          const original = fs.readFileSync(target);
          const replacement = Buffer.from(original);
          replacement[0] ^= 0x01;
          fs.writeFileSync(target, replacement);
        },
      },
    }),
    /staged output bytes changed: public\/robots\.txt/,
    "staged content mutation after receipt construction must HOLD",
  );
  assert.equal(
    fs.existsSync(stagedMutationOutput),
    false,
    "compromised staged content must never become a successful published pack",
  );
  assert.deepEqual(
    fs.readdirSync(stagedMutationParent),
    [],
    "compromised private staging must be removed by exact owned generation",
  );

  const receiptMutationParent = path.join(temporaryRoot, "receipt-mutation-parent");
  const receiptMutationOutput = path.join(receiptMutationParent, "pack");
  fs.mkdirSync(receiptMutationParent);
  assert.throws(
    () => buildDiscoveryPack({
      origin: ORIGIN,
      output: receiptMutationOutput,
      indexNowKey: INDEXNOW_KEY,
      lastmod: LASTMOD,
      testHooks: {
        beforePublish({ temporary }) {
          fs.writeFileSync(
            path.join(temporary, "build-receipt-v1.json"),
            '{"marker":"ATTACKER_REPLACEMENT"}\n',
          );
        },
      },
    }),
    /staged output byte length changed: build-receipt-v1\.json/,
    "the receipt generation itself must remain bound through publication",
  );
  assert.equal(fs.existsSync(receiptMutationOutput), false);
  assert.deepEqual(fs.readdirSync(receiptMutationParent), []);

  const publishedMutationParent = path.join(temporaryRoot, "published-mutation-parent");
  const publishedMutationOutput = path.join(publishedMutationParent, "pack");
  fs.mkdirSync(publishedMutationParent);
  assert.throws(
    () => buildDiscoveryPack({
      origin: ORIGIN,
      output: publishedMutationOutput,
      indexNowKey: INDEXNOW_KEY,
      lastmod: LASTMOD,
      testHooks: {
        afterReservedPublication({ destination }) {
          fs.writeFileSync(
            path.join(destination, "operator/indexnow-request-v1.json"),
            '{"host":"attacker.example"}\n',
          );
        },
      },
    }),
    /published output byte length changed: operator\/indexnow-request-v1\.json/,
    "final descriptor-bound inventory must be reverified after publication",
  );
  assert.equal(
    fs.existsSync(publishedMutationOutput),
    false,
    "a compromised reserved publication must not survive a HOLD",
  );
  assert.deepEqual(fs.readdirSync(publishedMutationParent), []);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log("VOID_FREE_DISCOVERY_MESH_V1_PROOF_GREEN");
console.log("provider_neutral=true");
console.log("google_search_console_registration_only=true");
console.log("bing_indexnow_payload_only=true");
console.log("cloudflare_crawler_hints_dashboard_only=true");
console.log("indexnow_key_outside_repository=true");
console.log("input_generation_replacements_held=true");
console.log("output_symlink_components_held=true");
console.log("output_ancestor_swap_held=true");
console.log("descriptor_relative_output_authority=true");
console.log("destination_no_replace_publication=true");
console.log("staged_content_generation_bound=true");
console.log("published_inventory_reverified=true");
console.log("ci_cost_checker_change_schedules=true");
console.log("unrelated_path_does_not_schedule=true");
console.log("network_calls=false");
console.log("live_submission=false");
console.log("deployment=false");
console.log("payment_method_collection=false");
console.log("automatic_paid_upgrade=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
