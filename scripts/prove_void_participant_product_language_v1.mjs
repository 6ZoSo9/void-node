#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const index = readFileSync(
  resolve(ROOT, "public/void-app-wave1-v1/index.html"),
  "utf8",
);
const views = readFileSync(
  resolve(ROOT, "public/void-app-wave1-v1/assets/js/views.js"),
  "utf8",
);

assert.match(index, /<title>VOID \/ Participant<\/title>/);
assert.match(index, /VOID \/ PARTICIPANT/);
assert.match(index, /NETWORK · ACCOUNT · ACTIVITY/);
assert.match(index, /<span class="brand-product">Participant<\/span>/);

assert.doesNotMatch(index, /WAVE 4 READ-ONLY EARN/);
assert.doesNotMatch(index, /VOID App — Read-only Home, Wallet & Earn/);

assert.match(views, /<h1>Home<\/h1>/);
assert.match(views, /<p>Your network, account, and activity\.<\/p>/);
assert.doesNotMatch(views, /<h1>System overview<\/h1>/);
assert.doesNotMatch(
  views,
  /Current node and network truth, without account or mutation authority\./,
);

for (const loader of [
  "./assets/js/app.js",
  "./assets/js/home-live.js",
  "./assets/js/wallet-live.js",
  "./assets/js/earn-live.js",
]) {
  assert.equal(
    (index.match(new RegExp(loader.replaceAll(".", "\\."), "g")) || []).length,
    1,
    `expected exactly one existing loader: ${loader}`,
  );
}

assert.equal(
  (index.match(/<script type="module" src=/g) || []).length,
  4,
  "participant shell loader count must remain unchanged",
);

console.log("VOID_PARTICIPANT_PRODUCT_LANGUAGE_V1_GREEN");
console.log("wave_banner_removed=true");
console.log("participant_product_label=true");
console.log("home_heading_semantic=true");
console.log("runtime_loader_count=4");
console.log("runtime_adapter_mutation=false");
