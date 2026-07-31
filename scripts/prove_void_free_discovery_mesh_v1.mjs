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
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log("VOID_FREE_DISCOVERY_MESH_V1_PROOF_GREEN");
console.log("provider_neutral=true");
console.log("google_search_console_registration_only=true");
console.log("bing_indexnow_payload_only=true");
console.log("cloudflare_crawler_hints_dashboard_only=true");
console.log("indexnow_key_outside_repository=true");
console.log("network_calls=false");
console.log("live_submission=false");
console.log("deployment=false");
console.log("payment_method_collection=false");
console.log("automatic_paid_upgrade=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
