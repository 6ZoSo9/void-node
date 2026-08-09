#!/usr/bin/env node
// VOIDCHAIN_ORG_WORDPRESS_HOME_PROOF_V1

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MARKER = "VOIDCHAIN_ORG_WORDPRESS_HOME_PROOF_V1";
const repo = process.cwd();
const pagePath = path.join(
  repo,
  "ops/public/voidchain-org-wordpress-home-v1.html",
);
const syncPath = path.join(
  repo,
  "ops/public/sync-voidchain-org-wordpress-home-v1.mjs",
);

const [page, sync] = await Promise.all([
  readFile(pagePath, "utf8"),
  readFile(syncPath, "utf8"),
]);

const one = (source, token, label = token) => {
  assert.equal(
    source.split(token).length - 1,
    1,
    `${label} must occur exactly once`,
  );
};

one(page, "<!-- VOIDCHAIN_ORG_WORDPRESS_HOME_V1 -->", "page marker");
one(page, 'id="voidchain-org-node-mirror-v1"', "page root id");
one(page, 'id="voidchain-org-node-mirror-v1-css"', "page style id");
one(page, 'id="voidchain-org-node-live-client-v1"', "live client id");

const styleMatch = page.match(
  /<style id="voidchain-org-node-mirror-v1-css">([\s\S]*?)<\/style>/,
);
assert.ok(styleMatch, "page must contain its scoped style");
const style = styleMatch[1];

assert.match(
  style,
  /body\.page-id-243945\s*\{[^}]*background:#050506 !important;[^}]*overflow-x:hidden;/s,
  "WordPress canvas must be dark and prevent horizontal overflow",
);
assert.match(
  style,
  /body\.page-id-243945 \.entry-content\.wp-block-post-content\s*\{[^}]*max-width:none !important;[^}]*padding:0 !important;/s,
  "WordPress content wrapper must not retain the theme width or padding",
);
assert.match(
  style,
  /#voidchain-org-node-mirror-v1\s*\{[^}]*width:100vw; max-width:none !important;[^}]*margin:0 0 0 -50vw !important;/s,
  "page root must clear the inherited 800px max-width and span the viewport",
);

const viewportWidth = 1920;
const wordpressInheritedMaxWidth = 800;
const brokenRenderedWidth = Math.min(
  viewportWidth,
  wordpressInheritedMaxWidth,
);
const repairedRenderedWidth = viewportWidth;
assert.equal(brokenRenderedWidth, 800, "fixture must reproduce the live defect");
assert.equal(
  repairedRenderedWidth,
  viewportWidth,
  "max-width:none must restore the full viewport width",
);

assert.match(style, /@media\(max-width:900px\)/, "tablet metric layout");
assert.match(style, /@media\(max-width:820px\)/, "single-column card layout");
assert.match(style, /@media\(max-width:520px\)/, "mobile header layout");

const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, "all HTML ids must be unique");

const scriptMatch = page.match(
  /<script id="voidchain-org-node-live-client-v1">([\s\S]*?)<\/script>/,
);
assert.ok(scriptMatch, "page must contain its live read-only client");
const liveClient = scriptMatch[1];
new Function(liveClient);

for (const token of [
  'method: "GET"',
  'credentials: "omit"',
  'referrerPolicy: "no-referrer"',
  'fetchJson("/__void/ready.json")',
  'fetchJson("/blocks/latest/number2.json")',
  'root.dataset.liveState = "fallback"',
  'window.setInterval(refresh, REFRESH_MS)',
]) {
  assert.ok(liveClient.includes(token), `live client must contain ${token}`);
}
assert.doesNotMatch(
  liveClient,
  /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i,
  "browser client must remain read-only",
);

assert.ok(
  page.includes('href="https://voidchain.org/app"'),
  "primary CTA must stay on the canonical public domain",
);
assert.ok(
  page.includes('href="https://voidchain.org/"'),
  "footer network link must stay on the canonical public domain",
);
assert.ok(!page.includes("https://voidchain.io"), "page must not link to .io");

for (const href of [...page.matchAll(/href="([^"]+)"/g)].map(
  (match) => match[1],
)) {
  const url = new URL(href);
  assert.ok(
    [
      "voidchain.org",
      "github.com",
      "zoso-alienware-aurora-r7.taila47fd.ts.net",
    ].includes(url.hostname),
    `unexpected page link host: ${url.hostname}`,
  );
}

for (const token of [
  "VOIDCHAIN_ORG_WORDPRESS_HOME_SYNC_V1",
  "https://voidchain.org/wp-json/wp/v2/pages/${PAGE_ID}",
  'redirect: "error"',
  "MAX_RESPONSE_BYTES",
  "REQUEST_TIMEOUT_MS",
  "VOIDCHAIN_WORDPRESS_USERNAME",
  "VOIDCHAIN_WORDPRESS_APPLICATION_PASSWORD",
  "WordPress credentials are only partially configured",
  "--expected-modified-gmt",
  "--expected-content-sha256",
  'method: "POST"',
  "page modified_gmt changed before apply",
  "page content changed before apply",
]) {
  assert.ok(sync.includes(token), `sync tool must contain ${token}`);
}
assert.ok(
  !sync.includes("console.log(process.env"),
  "sync tool must not print its environment",
);

process.stdout.write(`${JSON.stringify({
  marker: MARKER,
  outcome: "PASS",
  viewport_fixture_px: viewportWidth,
  reproduced_broken_width_px: brokenRenderedWidth,
  repaired_width_px: repairedRenderedWidth,
  canonical_domain: "https://voidchain.org",
  page_path: path.relative(repo, pagePath),
  sync_path: path.relative(repo, syncPath),
})}\n`);
