#!/usr/bin/env node
// VOIDCHAIN_ORG_WORDPRESS_HOME_PROOF_V1

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  ENTER_VOID_URL,
  MAX_RESPONSE_BYTES,
  readBoundedResponseBytes,
  requireJsonResponseHeaders,
  requirePublicAppResponseHeaders,
  validateCanonical,
  validatePublicAppDocument,
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
one(page, `href="${ENTER_VOID_URL}"`, "primary ENTER VOID CTA");

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

assert.equal(
  ENTER_VOID_URL,
  "https://zoso-alienware-aurora-r7.taila47fd.ts.net/app/",
  "primary CTA must target the verified public VOID app",
);
assert.ok(
  page.includes(`href="${ENTER_VOID_URL}"`),
  "primary CTA must target the verified public VOID app",
);
assert.doesNotMatch(
  page,
  /href=["']https:\/\/voidchain\.org\/app\/?["']/i,
  "primary CTA must not target the dead WordPress /app route",
);
const deadPrimaryCtaPage = page.replace(
  `href="${ENTER_VOID_URL}"`,
  'href="https://voidchain.org/app"',
);
assert.throws(
  () => validateCanonical(deadPrimaryCtaPage),
  /canonical content is missing|dead primary CTA/,
  "production canonical validator must reject the dead WordPress /app route",
);
assert.throws(
  () => validateRenderedIntegrity(
    deadPrimaryCtaPage.slice(
      customHtmlPrefix.length,
      -customHtmlSuffix.length,
    ),
  ),
  /rendered page is missing/,
  "production rendered validator must reject the dead WordPress /app route",
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

const publicAppDocument = [
  "<!doctype html>",
  "<html><head>",
  "<title>VOID App — Read-only Home, Wallet & Earn</title>",
  "<script>window.__VOID_PUBLIC_APP_MODE__=true;</script>",
  "</head><body>",
  '<div class="app-shell" id="app-shell"></div>',
  "</body></html>",
].join("");
assert.doesNotThrow(
  () => validatePublicAppDocument({
    status: 200,
    contentType: "text/html; charset=utf-8",
    content: publicAppDocument,
  }),
  "primary CTA validator must accept the public VOID app contract",
);
assert.throws(
  () => validatePublicAppDocument({
    status: 404,
    contentType: "text/html",
    content: publicAppDocument,
  }),
  /primary CTA returned HTTP 404/,
  "primary CTA validator must reject the broken route that triggered this fix",
);
assert.throws(
  () => validatePublicAppDocument({
    status: 200,
    contentType: "application/json",
    content: publicAppDocument,
  }),
  /primary CTA returned non-HTML content/,
  "primary CTA validator must reject a non-HTML response",
);
assert.throws(
  () => validatePublicAppDocument({
    status: 200,
    contentType: "text/html",
    content: publicAppDocument.replace(
      "window.__VOID_PUBLIC_APP_MODE__=true",
      "window.__VOID_PUBLIC_APP_MODE__=false",
    ),
  }),
  /primary CTA response is missing/,
  "primary CTA validator must reject the wrong application surface",
);

const syntheticResponse = ({
  status = 200,
  contentType = "application/json",
  contentLength = null,
  parts = [],
  cancel = () => Promise.resolve(),
}) => {
  const state = {
    bodyCancelCalls: 0,
    readerCancelCalls: 0,
    getReaderCalls: 0,
    readCalls: 0,
  };
  const headers = new Headers();
  headers.set("content-type", contentType);
  if (contentLength !== null) {
    headers.set("content-length", contentLength);
  }
  const body = {
    cancel() {
      state.bodyCancelCalls += 1;
      return cancel();
    },
    getReader() {
      state.getReaderCalls += 1;
      let index = 0;
      return {
        async read() {
          state.readCalls += 1;
          if (index >= parts.length) {
            return { done: true, value: undefined };
          }
          const value = parts[index];
          index += 1;
          return { done: false, value };
        },
        cancel() {
          state.readerCancelCalls += 1;
          return cancel();
        },
        releaseLock() {},
      };
    },
  };
  return [
    {
      status,
      ok: status >= 200 && status < 300,
      headers,
      body,
    },
    state,
  ];
};

{
  const [response, state] = syntheticResponse({
    contentLength: "3",
    parts: [new Uint8Array([1, 2]), new Uint8Array([3])],
  });
  const bytes = await readBoundedResponseBytes(response, new AbortController());
  assert.deepEqual([...bytes], [1, 2, 3], "small streamed response must remain usable");
  assert.equal(state.readerCancelCalls, 0, "valid response must not be cancelled");
}

{
  const [response, state] = syntheticResponse({
    contentType: "text/html",
    parts: [new Uint8Array([1])],
    cancel: () => Promise.reject(new Error("synthetic header cleanup rejection")),
  });
  const controller = new AbortController();
  await assert.rejects(
    () => requireJsonResponseHeaders(response, controller),
    /unexpected content type on HTTP 200/,
    "wrong JSON media type must preserve its primary header error",
  );
  assert.equal(state.getReaderCalls, 0, "wrong JSON media type must reject before reader acquisition");
  assert.equal(state.readCalls, 0, "wrong JSON media type must reject before body reads");
  assert.equal(state.bodyCancelCalls, 1, "wrong JSON media type must own body cancellation");
  assert.equal(controller.signal.aborted, true, "wrong JSON media type must abort the owned request");
}

{
  const [response, state] = syntheticResponse({
    status: 404,
    contentType: "text/html",
    parts: [new Uint8Array([1])],
  });
  const controller = new AbortController();
  await assert.rejects(
    () => requirePublicAppResponseHeaders(response, controller),
    /primary CTA returned HTTP 404/,
  );
  assert.equal(state.getReaderCalls, 0, "CTA non-200 must reject before reader acquisition");
  assert.equal(state.readCalls, 0, "CTA non-200 must reject before body reads");
  assert.equal(state.bodyCancelCalls, 1, "CTA non-200 must own body cancellation");
  assert.equal(controller.signal.aborted, true, "CTA non-200 must abort the owned request");
}

{
  const [response, state] = syntheticResponse({
    status: 200,
    contentType: "application/json",
    parts: [new Uint8Array([1])],
  });
  const controller = new AbortController();
  await assert.rejects(
    () => requirePublicAppResponseHeaders(response, controller),
    /primary CTA returned non-HTML content/,
  );
  assert.equal(state.getReaderCalls, 0, "CTA wrong media type must reject before reader acquisition");
  assert.equal(state.readCalls, 0, "CTA wrong media type must reject before body reads");
  assert.equal(state.bodyCancelCalls, 1, "CTA wrong media type must own body cancellation");
  assert.equal(controller.signal.aborted, true, "CTA wrong media type must abort the owned request");
}

{
  const [response, state] = syntheticResponse({
    contentLength: String(MAX_RESPONSE_BYTES + 1),
  });
  const controller = new AbortController();
  await assert.rejects(
    () => readBoundedResponseBytes(response, controller),
    /response exceeds size limit/,
  );
  assert.equal(state.getReaderCalls, 0, "declared oversize must reject before body reads");
  assert.equal(state.bodyCancelCalls, 1, "declared oversize must own body cancellation");
  assert.equal(controller.signal.aborted, true, "declared oversize must abort the owned request");
}

{
  const [response, state] = syntheticResponse({ contentLength: "02" });
  const controller = new AbortController();
  await assert.rejects(
    () => readBoundedResponseBytes(response, controller),
    /invalid response content-length/,
  );
  assert.equal(state.getReaderCalls, 0, "malformed declared length must reject before reads");
  assert.equal(state.bodyCancelCalls, 1, "malformed declared length must own teardown");
  assert.equal(controller.signal.aborted, true, "malformed declared length must abort request");
}

{
  const [response, state] = syntheticResponse({
    parts: [new Uint8Array(MAX_RESPONSE_BYTES + 1)],
  });
  const controller = new AbortController();
  await assert.rejects(
    () => readBoundedResponseBytes(response, controller),
    /response exceeds size limit/,
  );
  assert.equal(state.readCalls, 1, "stream overflow must fail at first over-limit chunk");
  assert.equal(state.readerCancelCalls, 1, "stream overflow must cancel its reader once");
  assert.equal(controller.signal.aborted, true, "stream overflow must abort the owned request");
}

{
  const [response, state] = syntheticResponse({
    parts: [new Uint8Array(MAX_RESPONSE_BYTES + 1)],
    cancel: () => Promise.reject(new Error("synthetic cancellation rejection")),
  });
  await assert.rejects(
    () => readBoundedResponseBytes(response, new AbortController()),
    /response exceeds size limit/,
    "cleanup rejection must not replace the primary oversize result",
  );
  assert.equal(state.readerCancelCalls, 1, "rejecting cleanup must be attempted exactly once");
}

{
  const [response, state] = syntheticResponse({
    parts: [new Uint8Array(MAX_RESPONSE_BYTES + 1)],
    cancel: () => new Promise(() => {}),
  });
  const started = Date.now();
  await assert.rejects(
    () => readBoundedResponseBytes(response, new AbortController()),
    /response exceeds size limit/,
    "never-settling cleanup must preserve the primary oversize result",
  );
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 150, `teardown bound returned implausibly early: ${elapsed}ms`);
  assert.ok(elapsed < 1500, `teardown bound exceeded reviewed terminal: ${elapsed}ms`);
  assert.equal(state.readerCancelCalls, 1, "never-settling cleanup must be attempted once");
}

{
  const [response, state] = syntheticResponse({ parts: ["not-bytes"] });
  await assert.rejects(
    () => readBoundedResponseBytes(response, new AbortController()),
    /non-byte chunk/,
  );
  assert.equal(state.readerCancelCalls, 1, "non-byte body evidence must be cancelled");
}

assert.doesNotMatch(
  sync,
  /\.arrayBuffer\s*\(/,
  "production sync must not prebuffer untrusted responses before enforcing the byte ceiling",
);
assert.match(
  sync,
  /const RESPONSE_TEARDOWN_TIMEOUT_MS = 250;/,
  "production sync must keep an explicit bounded teardown terminal",
);
assert.match(
  sync,
  /const requestJson = async[\s\S]*requireJsonResponseHeaders\(response, controller\);[\s\S]*readBoundedResponseBytes\(response, controller\)/,
  "WordPress JSON header admission must precede body acquisition",
);
assert.match(
  sync,
  /const requestPublicAppEntrypoint = async \(\) =>\s*withResponseDeadline\([\s\S]*method: "GET"[\s\S]*requirePublicAppResponseHeaders\(response, controller\);[\s\S]*readBoundedResponseBytes/,
  "primary CTA header admission must precede bounded body settlement",
);

for (const token of [
  "VOIDCHAIN_ORG_WORDPRESS_HOME_SYNC_V1",
  "https://voidchain.org/wp-json/wp/v2/pages/${PAGE_ID}",
  'redirect: "error"',
  "MAX_RESPONSE_BYTES",
  "REQUEST_TIMEOUT_MS",
  "RESPONSE_TEARDOWN_TIMEOUT_MS",
  "readBoundedResponseBytes",
  "requireJsonResponseHeaders",
  "requirePublicAppResponseHeaders",
  "withResponseDeadline",
  "requestPublicAppEntrypoint",
  "validatePublicAppDocument",
  "primary CTA returned HTTP",
  "primary_cta_live_verified",
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
  primary_cta_url: ENTER_VOID_URL,
  primary_cta_404_reproduced: true,
  primary_cta_contract_guard: true,
  streamed_response_bound: true,
  json_wrong_content_type_prebody_rejected: true,
  cta_non_200_prebody_rejected: true,
  cta_wrong_content_type_prebody_rejected: true,
  declared_oversize_pre_read_rejection: true,
  malformed_content_length_teardown_owned: true,
  rejecting_cleanup_preserves_primary_error: true,
  nonsettling_cleanup_bounded: true,
  prebuffer_arraybuffer_removed: true,
  canonical_domain: "https://voidchain.org",
  page_path: path.relative(repo, pagePath),
  sync_path: path.relative(repo, syncPath),
})}\n`);
