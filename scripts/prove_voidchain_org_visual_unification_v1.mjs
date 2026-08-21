#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const page = readFileSync(
  resolve(ROOT, "ops/public/voidchain-org-wordpress-home-v1.html"),
  "utf8",
);

const PUBLIC_BASE = "https://zoso-alienware-aurora-r7.taila47fd.ts.net";

assert.match(page, /VOIDCHAIN_ORG_WORDPRESS_HOME_V1/);
assert.match(page, /VOIDCHAIN_ORG_VISUAL_UNIFICATION_V1/);
assert.match(page, /VOID NETWORK \/ CHAIN ID 2050/);
assert.match(page, /<h1>VOID<br>NETWORK<\/h1>/);
assert.match(page, /A decentralized data network for AI agents\./);
assert.match(page, new RegExp(`href="${PUBLIC_BASE.replaceAll(".", "\\.")}\/app\/"`));
assert.match(page, new RegExp(`href="${PUBLIC_BASE.replaceAll(".", "\\.")}\/public-node\/"`));
assert.match(page, new RegExp(`href="${PUBLIC_BASE.replaceAll(".", "\\.")}\/participant"`));
assert.match(page, new RegExp(`href="${PUBLIC_BASE.replaceAll(".", "\\.")}\/public-node\/datanet\/"`));
assert.match(page, new RegExp(`href="${PUBLIC_BASE.replaceAll(".", "\\.")}\/\.well-known\/void-agent-discovery\.json"`));

assert.equal(
  (page.match(/class="path-card"/g) || []).length,
  3,
  "public website must present exactly three capability paths",
);
assert.equal(
  (page.match(/class="hero-button/g) || []).length,
  2,
  "hero must keep exactly two primary exits",
);

for (const clutter of [
  "NODE MIRROR / READ-ONLY SNAPSHOT",
  "EXACT-GREEN HINT",
  "TXROOT LIVE",
  "Bootstrap truth:",
  "discovery sha256",
  "route-index sha256",
  "git_commit",
  "VIEW SOURCE",
]) {
  assert.ok(!page.includes(clutter), `legacy homepage clutter must be absent: ${clutter}`);
}

assert.doesNotMatch(page, /1856587|c5596f1d7b11/);
assert.doesNotMatch(page, /border-radius\s*:/i);
assert.doesNotMatch(page, /box-shadow\s*:/i);
assert.doesNotMatch(page, /<form\b|<input\b/i);

assert.match(page, /id="voidchain-live-mode-v2"/);
assert.match(page, /id="voidchain-live-head-v2"/);
assert.match(page, /class="technical-state" hidden aria-hidden="true"/);
assert.match(page, /id="voidchain-live-gap-v2"/);
assert.match(page, /id="voidchain-live-txroot-v2"/);
assert.match(page, /id="voidchain-live-exact-v2"/);

const scriptMatch = page.match(
  /<script id="voidchain-org-node-live-client-v1">([\s\S]*?)<\/script>/,
);
assert.ok(scriptMatch, "homepage must retain the reviewed read-only live client");
const client = scriptMatch[1];
assert.match(client, /method:\s*"GET"/);
assert.match(client, /credentials:\s*"omit"/);
assert.match(client, /fetchJson\("\/__void\/ready\.json"\)/);
assert.match(client, /fetchJson\("\/blocks\/latest\/number2\.json"\)/);
assert.doesNotMatch(client, /method:\s*"(?:POST|PUT|PATCH|DELETE)"/i);

console.log("VOIDCHAIN_ORG_VISUAL_UNIFICATION_V1_PROOF_GREEN");
console.log("hero_primary_exits=2");
console.log("capability_paths=3");
console.log("legacy_mirror_clutter_visible=false");
console.log("read_only_live_client_preserved=true");
console.log("wordpress_mutation=false");
console.log("runtime_mutation=false");
console.log("economic_mutation=false");
