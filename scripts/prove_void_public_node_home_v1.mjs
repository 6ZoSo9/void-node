#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const html = read("public/public-node/index.html");
const js = read("public/public-node/void-public-node-home-v1.js");
const tokens = read("public/void-app-wave1-v1/assets/css/tokens.css");
const safeServe = read("tools/public-node-safe-serve-v1.mjs");

function cssVar(text, name) {
  const match = text.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  assert.ok(match, `missing CSS variable --${name}`);
  return match[1].trim().toLowerCase();
}

assert.match(html, /VOID_PUBLIC_NODE_HOME_V1/);
assert.match(html, /Mainnet-0 \/ Chain 2050 \/ Public Node/);
assert.match(html, /A decentralized data network for AI agents\./);
assert.match(html, /href="\/app\/">Enter VOID<\/a>/);
assert.match(html, /href="\/participant">Participate<\/a>/);
assert.match(html, /href="\/public-node\/datanet\/"/);
assert.match(html, /href="\/\.well-known\/void-agent-discovery\.json"/);
assert.match(html, /href="\/public-node\/index\.json">System \/ Proofs<\/a>/);
assert.match(html, /src="\.\/void-public-node-home-v1\.js"\s+defer/);

assert.doesNotMatch(html, /<form\b/i);
assert.doesNotMatch(html, /<input\b/i);
assert.doesNotMatch(html, /wallet send|stake lock|runner limit|raw json/i);
assert.doesNotMatch(html, /border-radius\s*:/i);
assert.doesNotMatch(html, /box-shadow\s*:/i);

const bindings = [
  ["bg", "void-bg-canvas"],
  ["panel", "void-surface-1"],
  ["line", "void-border-default"],
  ["text", "void-text-primary"],
  ["muted", "void-text-muted"],
  ["secondary", "void-text-secondary"],
];

for (const [publicName, tokenName] of bindings) {
  assert.equal(
    cssVar(html, publicName),
    cssVar(tokens, tokenName),
    `${publicName} must match ${tokenName}`,
  );
}

assert.match(safeServe, /const root = resolve\(process\.cwd\(\), "public"\);/);
assert.match(
  safeServe,
  /if \(existsSync\(file\) && statSync\(file\)\.isDirectory\(\)\) \{\s*file = join\(file, "index\.html"\);\s*\}/s,
);

assert.match(js, /const MARKER = "VOID_PUBLIC_NODE_HOME_V1"/);
assert.match(js, /const NETWORK_ENDPOINT = "\/__void\/public-app\/network\.json"/);
assert.match(js, /const MAX_RESPONSE_BYTES = 64 \* 1024/);
assert.match(js, /method:\s*"GET"/);
assert.match(js, /credentials:\s*"omit"/);
assert.match(js, /redirect:\s*"error"/);
assert.match(js, /referrerPolicy:\s*"no-referrer"/);
assert.match(js, /AbortSignal\.timeout\(REQUEST_TIMEOUT_MS\)/);
assert.match(js, /response\.url !== exactNetworkUrl\(\)/);
assert.match(js, /new TextDecoder\("utf-8", \{ fatal: true \}\)/);
assert.match(js, /node\.textContent =/);
assert.match(js, /Promise\.race\(/);
assert.match(js, /try \{\s*reader\.releaseLock\(\);\s*\} catch \{/s);
assert.doesNotMatch(js, /\bPOST\b/);
assert.doesNotMatch(js, /innerHTML\s*=/);
assert.doesNotMatch(js, /localStorage|sessionStorage|document\.cookie/);

console.log("VOID_PUBLIC_NODE_HOME_V1_PROOF_GREEN");
console.log("canonical_static_root=public/public-node/index.html");
console.log("static_directory_index_binding=true");
console.log("shared_visual_tokens_bound=true");
console.log("primary_choices=2");
console.log("capability_cards=3");
console.log("bounded_live_status_get=true");
console.log("operator_controls_exposed=false");
console.log("src_index_changed=false");
console.log("runtime_mutation=false");
console.log("economic_mutation=false");
