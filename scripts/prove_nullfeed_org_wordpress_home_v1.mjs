#!/usr/bin/env node
// NULLFEED_ORG_WORDPRESS_HOME_PROOF_V1

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  MAX_RESPONSE_BYTES,
  PAGE_ID,
  PAGE_LINK,
  PAGE_SLUG,
  PAGE_TEMPLATE,
  PAGE_TITLE,
  readBoundedResponseBytes,
  validateCanonical,
  validatePage,
  validateRenderedIntegrity,
} from "../ops/public/sync-nullfeed-org-wordpress-home-v1.mjs";

const MARKER = "NULLFEED_ORG_WORDPRESS_HOME_PROOF_V1";
const repo = process.cwd();
const pagePath = path.join(repo, "ops/public/nullfeed-org-wordpress-home-v1.html");
const syncPath = path.join(repo, "ops/public/sync-nullfeed-org-wordpress-home-v1.mjs");
const workflowPath = path.join(repo, ".github/workflows/nullfeed-org-wordpress-home-v1.yml");
const [page, sync, workflow] = await Promise.all([
  readFile(pagePath, "utf8"),
  readFile(syncPath, "utf8"),
  readFile(workflowPath, "utf8"),
]);
const WORDPRESS_HTML_BLOCK_OPEN = "<!-- wp:html -->";
const WORDPRESS_HTML_BLOCK_CLOSE = "<!-- /wp:html -->";

const one = (source, token, label = token) => {
  assert.equal(source.split(token).length - 1, 1, `${label} must occur exactly once`);
};

one(page, "<!-- NULLFEED_ORG_WORDPRESS_HOME_V1 -->", "page marker");
one(page, WORDPRESS_HTML_BLOCK_OPEN, "WordPress Custom HTML block open");
one(page, WORDPRESS_HTML_BLOCK_CLOSE, "WordPress Custom HTML block close");
one(page, 'id="nullfeed-org-home-v1"', "page root id");
one(page, 'id="nullfeed-org-home-v1-css"', "page style id");
one(page, 'id="nullfeed-title"', "page title id");

const prefix = `${WORDPRESS_HTML_BLOCK_OPEN}\n`;
const suffix = `\n${WORDPRESS_HTML_BLOCK_CLOSE}\n`;
assert.ok(page.startsWith(prefix) && page.endsWith(suffix), "page must be one Custom HTML block");
const rendered = page.slice(prefix.length, -suffix.length);
assert.doesNotThrow(() => validateCanonical(page));
assert.doesNotThrow(() => validateRenderedIntegrity(rendered));

const contaminated = rendered.replace(
  "#nullfeed-org-home-v1 * { box-sizing:border-box; }",
  "#nullfeed-org-home-v1 * { box-sizing:border-box; }<p>",
);
assert.throws(
  () => validateRenderedIntegrity(contaminated),
  /WordPress paragraph formatting contaminated/,
  "render validator must reject WordPress paragraph injection",
);
assert.throws(
  () => validateRenderedIntegrity(rendered.replace("max-width:none !important; min-height", "min-height")),
  /lost the full-width root rule/,
  "render validator must reject a lost full-width rule",
);
assert.throws(
  () => validateCanonical(page.replace("</main>", '<script>fetch("/write")</script></main>')),
  /interactive or executable element/,
  "canonical validator must reject executable content",
);
assert.throws(
  () => validateCanonical(page.replace("https://voidchain.org/", "https://example.com/")),
  /unexpected link/,
  "canonical validator must reject an unreviewed link host",
);

const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, "all HTML ids must be unique");
assert.match(page, /@media\(max-width:820px\)/, "tablet/mobile layout contract");
assert.match(page, /@media\(max-width:520px\)/, "small-screen layout contract");
assert.doesNotMatch(page, /<script\b|<iframe\b|<form\b|<input\b/i, "page must remain static");
assert.match(page, /does not provide accounts, registration, wallets, transactions, paid work, Work Credit awards, or settlement/);

const pageFixture = {
  id: PAGE_ID,
  status: "publish",
  slug: PAGE_SLUG,
  template: PAGE_TEMPLATE,
  link: PAGE_LINK,
};
assert.doesNotThrow(() => validatePage(pageFixture), "page contract must accept exact target");
for (const [key, value] of [
  ["id", 243945],
  ["status", "draft"],
  ["slug", "home"],
  ["template", "default"],
  ["link", "https://voidchain.org/"],
]) {
  assert.throws(
    () => validatePage({ ...pageFixture, [key]: value }),
    /mismatch|not published/,
    `page contract must reject wrong ${key}`,
  );
}

const boundedFixture = '{"ok":true}';
const boundedBytes = await readBoundedResponseBytes(
  new Response(boundedFixture, { headers: { "content-type": "application/json" } }),
);
assert.equal(new TextDecoder().decode(boundedBytes), boundedFixture, "bounded reader must preserve a valid body");
await assert.rejects(
  () =>
    readBoundedResponseBytes(
      new Response("", {
        headers: { "content-length": String(MAX_RESPONSE_BYTES + 1) },
      }),
    ),
  /response exceeds size limit/,
  "bounded reader must reject an oversized declared body before consumption",
);
await assert.rejects(
  () => readBoundedResponseBytes(new Response(new Uint8Array(MAX_RESPONSE_BYTES + 1))),
  /response exceeds size limit/,
  "bounded reader must reject an oversized streamed body",
);

for (const token of [
  "NULLFEED_ORG_WORDPRESS_HOME_SYNC_V1",
  "https://nullfeed.org/wp-json/wp/v2/pages/${PAGE_ID}",
  "NULLFEED_WORDPRESS_USERNAME",
  "NULLFEED_WORDPRESS_APPLICATION_PASSWORD",
  'redirect: "error"',
  "MAX_RESPONSE_BYTES",
  "REQUEST_TIMEOUT_MS",
  "response.body.getReader()",
  "reader.cancel()",
  "--expected-modified-gmt",
  "--expected-content-sha256",
  'method: "POST"',
  "page modified_gmt changed before apply",
  "page content changed before apply",
  "WordPress raw content does not match canonical after apply",
  "automatic_rollback_disabled=true",
  "manual_recovery_required",
  'recovery_policy: "manual_revision_recovery"',
]) {
  assert.ok(sync.includes(token), `sync tool must contain ${token}`);
}
assert.ok(!sync.includes("restorePreviousPage"), "sync tool must not perform an unguarded automatic rollback");
assert.ok(
  !sync.includes("updatePage(authorization, previous.title, previous.content)"),
  "failure handling must not overwrite a concurrent WordPress edit with stale content",
);
assert.ok(!sync.includes("VOIDCHAIN_WORDPRESS_APPLICATION_PASSWORD"), "NullFeed must not reuse voidchain.org credentials");
assert.ok(!sync.includes("console.log(process.env"), "sync tool must not print its environment");

for (const token of [
  "apply_ref_guard:",
  'if [ "$GITHUB_REF" != "refs/heads/main" ]; then',
  "NullFeed production apply requires refs/heads/main",
  "needs: [proof, apply_ref_guard]",
]) {
  assert.ok(workflow.includes(token), `workflow must contain ${token}`);
}
assert.equal(PAGE_TITLE, "NullFeed");

process.stdout.write(`${JSON.stringify({
  marker: MARKER,
  outcome: "PASS",
  page_id: PAGE_ID,
  page_title: PAGE_TITLE,
  canonical_domain: PAGE_LINK,
  wordpress_custom_html_block: true,
  static_read_only_surface: true,
  rendered_integrity_guard: true,
  exact_page_contract_guard: true,
  exact_main_apply_guard: true,
  stream_bounded_response_contract: true,
  concurrent_edit_safe_recovery_contract: true,
  responsive_contract: true,
  page_path: path.relative(repo, pagePath),
  sync_path: path.relative(repo, syncPath),
  workflow_path: path.relative(repo, workflowPath),
})}\n`);
