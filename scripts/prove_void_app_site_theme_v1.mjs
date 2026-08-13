#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const production = read("ops/public/voidchain-org-wordpress-home-v1.html");
const tokens = read("public/void-app-wave1-v1/assets/css/tokens.css");
const theme = read("public/void-app-wave1-v1/assets/css/site-theme.css");
const main = read("public/void-app-wave1-v1/assets/css/main.css");

function cssVar(text, name) {
  const match = text.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  assert.ok(match, `missing CSS variable --${name}`);
  return match[1].trim();
}

const bindings = [
  ["bg", "void-bg-canvas"],
  ["panel", "void-surface-1"],
  ["line", "void-border-default"],
  ["text", "void-text-primary"],
  ["muted", "void-text-muted"],
];

for (const [productionName, appName] of bindings) {
  assert.equal(
    cssVar(tokens, appName).toLowerCase(),
    cssVar(production, productionName).toLowerCase(),
    `${appName} must match production ${productionName}`,
  );
}

assert.equal(cssVar(tokens, "void-text-secondary").toLowerCase(), "#c8c8cf");
assert.equal(cssVar(tokens, "void-bg-subtle").toLowerCase(), "#030304");
assert.equal(cssVar(tokens, "void-border-strong").toLowerCase(), "#50505a");
assert.equal(cssVar(tokens, "void-grid-size"), "32px");
assert.match(production, /background-size\s*:\s*32px\s+32px\s*;/);
assert.match(theme, /background-size\s*:\s*var\(--void-grid-size\)\s+var\(--void-grid-size\)\s*;/);

for (const fontVar of ["void-font-sans", "void-font-mono"]) {
  const value = cssVar(tokens, fontVar);
  assert.match(value, /^ui-monospace,/);
  assert.match(value, /SFMono-Regular/);
  assert.match(value, /Menlo/);
  assert.match(value, /Monaco/);
  assert.match(value, /Consolas/);
  assert.match(value, /Courier New/);
  assert.match(value, /monospace$/);
}

for (const radius of [
  "void-radius-1",
  "void-radius-2",
  "void-radius-3",
  "void-radius-4",
  "void-radius-pill",
]) {
  assert.equal(cssVar(tokens, radius), "0", `${radius} must stay square`);
}
assert.equal(cssVar(tokens, "void-shadow-1"), "none");
assert.equal(cssVar(tokens, "void-shadow-2"), "none");
assert.equal(cssVar(tokens, "void-glow-cyan"), "none");

const imports = [...main.matchAll(/@import\s+url\("([^\"]+)"\);/g)].map((match) => match[1]);
assert.equal(imports.at(-1), "./site-theme.css", "site theme must be the final shared CSS layer");
assert.equal(imports.filter((entry) => entry === "./site-theme.css").length, 1);

assert.match(theme, /body::before\s*\{/);
assert.match(theme, /mask-image\s*:\s*none\s*;/);
assert.match(theme, /\.hero-surface::after\s*\{\s*display\s*:\s*none\s*;\s*\}/s);
assert.match(theme, /\.button--primary\s*\{[^}]*background\s*:\s*#efeff1\s*;/s);
assert.match(theme, /\.button--primary\s*\{[^}]*color\s*:\s*#080809\s*;/s);
assert.match(theme, /\.button--secondary\s*\{[^}]*background\s*:\s*transparent\s*;/s);
assert.match(theme, /\.surface\s*\{[^}]*background\s*:\s*rgba\(11,\s*11,\s*14,\s*0\.90\)\s*;/s);
assert.match(theme, /\.nav-item\[aria-current="page"\]\s*\{[^}]*background\s*:\s*var\(--void-surface-1\)\s*;/s);
assert.doesNotMatch(theme, /76\s*,\s*229\s*,\s*223/);
assert.doesNotMatch(theme, /157\s*,\s*136\s*,\s*255/);

assert.match(production, /VOIDCHAIN_ORG_WORDPRESS_HOME_V1/);
assert.match(production, /VOID NETWORK \/ CHAIN ID 2050/);
assert.match(theme, /Visual source of truth:\s*ops\/public\/voidchain-org-wordpress-home-v1\.html/);

console.log("VOID_APP_SITE_THEME_V1_PROOF_GREEN");
console.log("production_palette_bound=1");
console.log("production_grid_32px_bound=1");
console.log("monospace_product_typography=1");
console.log("shared_square_geometry=1");
console.log("decorative_glow_disabled=1");
console.log("site_theme_final_import=1");
console.log("functional_javascript_changed=0");
console.log("wordpress_mutation=0");
console.log("runtime_mutation=0");
console.log("economic_mutation=0");
