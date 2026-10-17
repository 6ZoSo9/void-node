#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(
  resolve(ROOT, "public/public-node/connect/index.html"),
  "utf8",
);
const compact = html.replace(/\s+/gu, " ");

assert.match(html, /<html lang="en">/u);
assert.match(html, /<main>/u);
assert.match(
  compact,
  /a:focus-visible \{ outline:3px solid #f8fafc; outline-offset:4px; \}/u,
);
assert.doesNotMatch(html, /outline\s*:\s*(?:0|none)\b/iu);

const publicLinks = [
  "/public-node/connect/public-node-connect-pack-v1.json",
  "/public-node/connect/public-node-connect-pack-v1.html",
];
assert.equal((html.match(/<a\b/gu) || []).length, publicLinks.length);
for (const href of publicLinks) {
  assert.ok(html.includes(`href="${href}"`), `missing public link: ${href}`);
}

assert.doesNotMatch(html, /<script\b|<form\b|<input\b/iu);
assert.match(html, /This is not validator admission/);
assert.match(html, /Public-safe node connection guidance only/);

console.log("VOID_PUBLIC_NODE_CONNECT_FOCUS_V1_PROOF_GREEN");
console.log("explicit_keyboard_focus_indicator=true");
console.log("focus_not_removed=true");
console.log("public_resource_links=2");
console.log("runtime_or_network_mutation=false");
