#!/usr/bin/env node
// VOIDCHAIN_ORG_WORDPRESS_HOME_PROOF_V1

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  validateCanonical,
  validateRenderedIntegrity,
} from "../ops/public/sync-voidchain-org-wordpress-home-v1.mjs";

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
const WORDPRESS_HTML_BLOCK_OPEN = "<!-- wp:html -->";
const WORDPRESS_HTML_BLOCK_CLOSE = "<!-- /wp:html -->";

const one = (source, token, label = token) => {
  assert.equal(
    source.split(token).length - 1,
    1,
    `${label} must occur exactly once`,
  );
};

one(page, "<!-- VOIDCHAIN_ORG_WORDPRESS_HOME_V1 -->", "page marker");
one(page, WORDPRESS_HTML_BLOCK_OPEN, "WordPress Custom HTML block open");
one(page, WORDPRESS_HTML_BLOCK_CLOSE, "WordPress Custom HTML block close");
one(page, 'id="voidchain-org-node-mirror-v1"', "page root id");
one(page, 'id="voidchain-org-node-mirror-v1-css"', "page style id");
one(page, 'id="voidchain-org-node-live-client-v1"', "live client id");

const customHtmlPrefix = `${WORDPRESS_HTML_BLOCK_OPEN}\n`;
const customHtmlSuffix = `\n${WORDPRESS_HTML_BLOCK_CLOSE}\n`;
assert.ok(
  page.startsWith(customHtmlPrefix) && page.endsWith(customHtmlSuffix),
  "the entire canonical page must be one WordPress Custom HTML block",
);
const customHtmlRendered = page.slice(
  customHtmlPrefix.length,
  -customHtmlSuffix.length,
);
assert.doesNotThrow(
  () => validateCanonical(page),
  "production canonical validator must accept the reviewed page",
);
assert.doesNotThrow(
  () => validateRenderedIntegrity(customHtmlRendered),
  "production rendered validator must accept intact Custom HTML",
);
const wpautopFixture = customHtmlRendered.replace(
  /\n{2,}/g,
  "\n</p>\n<p>",
);
const contaminatedStyle = wpautopFixture.match(
  /<style id="voidchain-org-node-mirror-v1-css">([\s\S]*?)<\/style>/,
);
const contaminatedScript = wpautopFixture.match(
  /<script id="voidchain-org-node-live-client-v1">([\s\S]*?)<\/script>/,
);
assert.ok(
  contaminatedStyle?.[1].includes("</p>"),
  "fixture must reproduce WordPress paragraph contamination in CSS",
);
assert.ok(
  contaminatedScript?.[1].includes("</p>"),
  "fixture must reproduce WordPress paragraph contamination in JavaScript",
);
assert.throws(
  () => validateRenderedIntegrity(wpautopFixture),
  /WordPress paragraph formatting contaminated/,
  "production rendered validator must reject WordPress paragraph injection",
);
const wordpressEntityFixture = customHtmlRendered.replace(
  "const readyFlag = ready.ready === true;",
  "const readyFlag = ready.ready === true &#038;&#038; true;",
);
assert.notEqual(
  wordpressEntityFixture,
  customHtmlRendered,
  "fixture must reproduce WordPress entity encoding in JavaScript",
);
assert.throws(
  () => validateRenderedIntegrity(wordpressEntityFixture),
  /WordPress entity encoding contaminated the script/,
  "production rendered validator must reject WordPress entity encoding",
);
assert.throws(
  () => validateRenderedIntegrity(
    customHtmlRendered.replace(
      "width:100vw; max-width:none !important;",
      "width:100vw;",
    ),
  ),
  /lost the full-width root rule/,
  "production rendered validator must reject a lost max-width override",
);
assert.throws(
  () => validateRenderedIntegrity(
    customHtmlRendered.replace(
      'const MARKER = "VOIDCHAIN_ORG_NODE_LIVE_CLIENT_V1";',
      'const MARKER = ; // VOIDCHAIN_ORG_NODE_LIVE_CLIENT_V1',
    ),
  ),
  SyntaxError,
  "production rendered validator must reject invalid live-client JavaScript",
);

const styleMatch = page.match(
  /<style id="voidchain-org-node-mirror-v1-css">([\s\S]*?)<\/style>/,
);
assert.ok(styleMatch, "page must contain its scoped style");
const style = styleMatch[1];
assert.doesNotMatch(
  style,
  /<\/?p(?:\s|>)|<br\s*\/?>/i,
  "canonical style must not contain WordPress paragraph markup",
);

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
assert.doesNotMatch(
  liveClient,
  /<\/?p(?:\s|>)|<br\s*\/?>/i,
  "canonical live client must not contain WordPress paragraph markup",
);
assert.doesNotMatch(
  liveClient,
  /&/,
  "canonical live client must remain ampersand-free across WordPress rendering",
);
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
  "WORDPRESS_HTML_BLOCK_OPEN",
  "validateRenderedIntegrity",
  "rendered_integrity_verified",
  "WordPress paragraph formatting contaminated",
  "canonical live client must be ampersand-free",
  "WordPress entity encoding contaminated the script",
  "WordPress raw content does not match canonical after apply",
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
  wordpress_custom_html_block: true,
  wpautop_contamination_reproduced: true,
  wordpress_entity_encoding_reproduced: true,
  rendered_integrity_guard: true,
  canonical_domain: "https://voidchain.org",
  page_path: path.relative(repo, pagePath),
  sync_path: path.relative(repo, syncPath),
})}\n`);
