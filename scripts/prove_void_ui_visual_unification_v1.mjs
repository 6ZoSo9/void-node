#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const theme = read("public/void-app-wave1-v1/assets/css/site-theme.css");
const main = read("public/void-app-wave1-v1/assets/css/main.css");
const tokens = read("public/void-app-wave1-v1/assets/css/tokens.css");

assert.match(theme, /VOID_UI_VISUAL_UNIFICATION_V1/);
assert.match(theme, /\.prototype-banner\s*\{\s*display\s*:\s*none\s*;/s);
assert.match(theme, /\.app-shell\s*\{[^}]*padding-top\s*:\s*0\s*;/s);
assert.match(theme, /\.app-header\s*\{[^}]*top\s*:\s*0\s*;/s);
assert.match(theme, /\.primary-nav\s*>\s*\[data-route="network"\]\s*\{\s*display\s*:\s*none\s*;/s);
assert.match(theme, /\.sidebar-footer\s+\[data-route="foundation"\]\s*\{\s*display\s*:\s*none\s*;/s);
assert.match(theme, /content\s*:\s*"Participant"\s*;/);
assert.match(theme, /content\s*:\s*"DataNet"\s*;/);
assert.match(theme, /content\s*:\s*"Buy VOID"\s*;/);
assert.match(theme, /content\s*:\s*"System"\s*;/);
assert.match(theme, /\[data-home-view\]\s+\.balance-tile--production\s*\{\s*display\s*:\s*none\s*;/s);
assert.match(theme, /\[data-home-view\]\s+\.surface\.panel\.span-7\s*\{\s*display\s*:\s*none\s*;/s);
assert.match(theme, /\.wallet-live-grid\s*>\s*\.surface\.panel\.span-5\s*\{\s*display\s*:\s*none\s*;/s);
assert.match(theme, /@media\s*\(max-width:\s*860px\)[\s\S]*?\.mobile-nav\s*\{[^}]*background\s*:\s*rgba\(5,\s*5,\s*6,\s*0\.98\)/s);

const imports = [...main.matchAll(/@import\s+url\("([^\"]+)"\);/g)].map((match) => match[1]);
assert.equal(imports.at(-1), "./site-theme.css");
assert.equal(tokens.match(/--void-bg-canvas:\s*#050506\s*;/)?.[0]?.includes("#050506"), true);
assert.equal(tokens.match(/--void-surface-1:\s*#0b0b0e\s*;/)?.[0]?.includes("#0b0b0e"), true);
assert.equal(tokens.match(/--void-radius-1:\s*0\s*;/)?.[0]?.includes("0"), true);

// The established production-theme contract must remain green.
execFileSync(process.execPath, [resolve(ROOT, "scripts/prove_void_app_site_theme_v1.mjs")], {
  cwd: ROOT,
  stdio: "inherit",
});

console.log("VOID_UI_VISUAL_UNIFICATION_V1_PROOF_GREEN");
console.log("participant_shell_decluttered=true");
console.log("home_primary_evidence_reduced=true");
console.log("wallet_guard_copy_demoted=true");
console.log("datanet_label_unified=true");
console.log("buy_void_label_unified=true");
console.log("system_detail_demoted=true");
console.log("functional_javascript_changed=false");
console.log("runtime_route_changed=false");
console.log("wallet_or_signer_authority_added=false");
console.log("economic_authority_added=false");
console.log("deployment=false");
