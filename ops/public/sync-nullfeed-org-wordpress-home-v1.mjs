#!/usr/bin/env node
// NULLFEED_ORG_WORDPRESS_HOME_SYNC_V1

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MARKER = "NULLFEED_ORG_WORDPRESS_HOME_SYNC_V1";
const PAGE_ID = 350041;
const PAGE_ENDPOINT = `https://nullfeed.org/wp-json/wp/v2/pages/${PAGE_ID}`;
const PAGE_TITLE = "NullFeed";
const PAGE_SLUG = "coming-soon";
const PAGE_TEMPLATE = "blank";
const PAGE_LINK = "https://nullfeed.org/";
const WORDPRESS_HTML_BLOCK_OPEN = "<!-- wp:html -->";
const WORDPRESS_HTML_BLOCK_CLOSE = "<!-- /wp:html -->";
const CONTENT_PATH = path.resolve(
  process.cwd(),
  "ops/public/nullfeed-org-wordpress-home-v1.html",
);
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;

const fail = (reason, details = {}) => {
  process.stdout.write(`${JSON.stringify({
    marker: MARKER,
    outcome: "HOLD",
    reason,
    ...details,
  })}\n`);
  process.exitCode = 1;
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const parseArgs = (argv) => {
  const result = {
    mode: "inspect",
    expectedModifiedGmt: "",
    expectedContentSha256: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--inspect") {
      result.mode = "inspect";
      continue;
    }
    if (arg === "--apply") {
      result.mode = "apply";
      continue;
    }
    if (arg === "--expected-modified-gmt") {
      result.expectedModifiedGmt = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--expected-content-sha256") {
      result.expectedContentSha256 = argv[index + 1] || "";
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return result;
};

const credentials = () => {
  const username = String(process.env.NULLFEED_WORDPRESS_USERNAME || "");
  const applicationPassword = String(
    process.env.NULLFEED_WORDPRESS_APPLICATION_PASSWORD || "",
  );
  if (Boolean(username) !== Boolean(applicationPassword)) {
    throw new Error("WordPress credentials are only partially configured");
  }
  if (!username || !applicationPassword) {
    return null;
  }
  return Buffer.from(`${username}:${applicationPassword}`).toString("base64");
};

const readBoundedResponseBytes = async (response) => {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      throw new Error("invalid response content-length");
    }
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new Error("response exceeds size limit");
    }
  }

  if (!response.body) {
    return new Uint8Array();
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!(value instanceof Uint8Array)) {
        throw new Error("response body yielded a non-byte chunk");
      }
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {});
        throw new Error("response exceeds size limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    throw new Error(`unexpected content type on HTTP ${response.status}`);
  }
  const bytes = await readBoundedResponseBytes(response);
  let value;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(`invalid JSON on HTTP ${response.status}`);
  }
  if (!response.ok) {
    const code = value && typeof value === "object" ? value.code : "unknown";
    throw new Error(`WordPress HTTP ${response.status} (${String(code)})`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("WordPress returned an invalid object");
  }
  return value;
};

const titleText = (page, context) => {
  const value = page.title?.[context];
  if (typeof value !== "string") {
    throw new Error(`page title ${context} is unavailable`);
  }
  return value;
};

const validatePage = (page) => {
  if (page.id !== PAGE_ID) {
    throw new Error("page id mismatch");
  }
  if (page.status !== "publish") {
    throw new Error("page is not published");
  }
  if (page.slug !== PAGE_SLUG) {
    throw new Error("page slug mismatch");
  }
  if (page.template !== PAGE_TEMPLATE) {
    throw new Error("page template mismatch");
  }
  if (page.link !== PAGE_LINK) {
    throw new Error("page link mismatch");
  }
};

const elementPayload = (content, tag, id) => {
  const pattern = new RegExp(
    `<${tag}\\b[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i",
  );
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`rendered page is missing ${tag}#${id}`);
  }
  return match[1];
};

const rejectInteractiveAuthority = (content, label) => {
  if (/<(?:script|iframe|form|input|textarea|select)\b/i.test(content)) {
    throw new Error(`${label} contains an interactive or executable element`);
  }
  if (/\son[a-z]+\s*=/i.test(content)) {
    throw new Error(`${label} contains an inline event handler`);
  }
  if (/\b(?:POST|PUT|PATCH|DELETE)\b/.test(content)) {
    throw new Error(`${label} contains a mutation method`);
  }
};

const validateLinks = (content, label) => {
  const expected = new Set([
    "https://voidchain.org/",
    "https://github.com/6ZoSo9/void-node",
  ]);
  const links = [...content.matchAll(/href=["']([^"']+)["']/gi)].map(
    (match) => match[1],
  );
  if (links.length !== 3) {
    throw new Error(`${label} must contain exactly three links`);
  }
  for (const link of links) {
    if (!expected.has(link)) {
      throw new Error(`${label} contains an unexpected link: ${link}`);
    }
  }
};

const validateCanonical = (content) => {
  if (
    !content.startsWith(`${WORDPRESS_HTML_BLOCK_OPEN}\n`) ||
    !content.endsWith(`${WORDPRESS_HTML_BLOCK_CLOSE}\n`)
  ) {
    throw new Error("canonical content must be one WordPress Custom HTML block");
  }
  if (
    content.split(WORDPRESS_HTML_BLOCK_OPEN).length - 1 !== 1 ||
    content.split(WORDPRESS_HTML_BLOCK_CLOSE).length - 1 !== 1
  ) {
    throw new Error("canonical content must contain one Custom HTML block");
  }
  for (const token of [
    "NULLFEED_ORG_WORDPRESS_HOME_V1",
    'id="nullfeed-org-home-v1"',
    'id="nullfeed-org-home-v1-css"',
    "body.page-id-350041",
    "width:100vw",
    "max-width:none !important",
    "Open signal for humans and autonomous agents",
    "Current status",
    "Read only",
    "does not provide accounts, registration, wallets, transactions, paid work, Work Credit awards, or settlement",
  ]) {
    if (!content.includes(token)) {
      throw new Error(`canonical content is missing ${token}`);
    }
  }
  rejectInteractiveAuthority(content, "canonical content");
  validateLinks(content, "canonical content");
};

const validateRenderedIntegrity = (content) => {
  for (const token of [
    "NULLFEED_ORG_WORDPRESS_HOME_V1",
    'id="nullfeed-org-home-v1"',
    "Open signal for humans and autonomous agents",
    "Read only",
  ]) {
    if (!content.includes(token)) {
      throw new Error(`rendered page is missing ${token}`);
    }
  }
  const style = elementPayload(content, "style", "nullfeed-org-home-v1-css");
  if (/<\/?p(?:\s|>)|<br\s*\/?>/i.test(style)) {
    throw new Error("WordPress paragraph formatting contaminated the style");
  }
  if (
    !/#nullfeed-org-home-v1\s*\{[^}]*width:100vw;[^}]*max-width:none !important;[^}]*left:50%;[^}]*margin:0 0 0 -50vw !important;/s.test(
      style,
    )
  ) {
    throw new Error("rendered page lost the full-width root rule");
  }
  if (
    !/body\.page-id-350041\s+\.wp-block-post-content[^}]*max-width:none !important;/s.test(
      style,
    )
  ) {
    throw new Error("rendered page lost the WordPress wrapper override");
  }
  rejectInteractiveAuthority(content, "rendered page");
  validateLinks(content, "rendered page");
};

const hasHomeV1 = (content) => {
  try {
    validateRenderedIntegrity(content);
    return true;
  } catch {
    return false;
  }
};

const publicRenderedPage = async () => {
  const page = await requestJson(`${PAGE_ENDPOINT}?context=view`);
  validatePage(page);
  const rendered = page.content?.rendered;
  if (typeof rendered !== "string") {
    throw new Error("public page content is unavailable");
  }
  return { page, content: rendered, title: titleText(page, "rendered") };
};

const editableRawPage = async (authorization) => {
  const page = await requestJson(`${PAGE_ENDPOINT}?context=edit`, {
    headers: { authorization: `Basic ${authorization}` },
  });
  validatePage(page);
  const raw = page.content?.raw;
  if (typeof raw !== "string") {
    throw new Error("editable raw page content is unavailable");
  }
  return { page, content: raw, title: titleText(page, "raw") };
};

const updatePage = async (authorization, title, content) => {
  const page = await requestJson(PAGE_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Basic ${authorization}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ title, content }),
  });
  validatePage(page);
  return page;
};

export {
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
};

const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const args = isDirectRun
  ? (() => {
      try {
        return parseArgs(process.argv.slice(2));
      } catch (error) {
        fail("invalid_arguments", { detail: String(error?.message || error) });
        return null;
      }
    })()
  : null;

if (args) {
  try {
    const canonical = await readFile(CONTENT_PATH, "utf8");
    validateCanonical(canonical);
    const canonicalSha256 = sha256(canonical);
    const authorization = credentials();

    if (args.mode === "inspect") {
      const rendered = await publicRenderedPage();
      const current = authorization ? await editableRawPage(authorization) : rendered;
      const contentSha256 = sha256(current.content);
      process.stdout.write(`${JSON.stringify({
        marker: MARKER,
        outcome: "READY",
        mode: "inspect",
        authenticated: Boolean(authorization),
        page_id: PAGE_ID,
        page_title: current.title,
        modified_gmt: current.page.modified_gmt,
        current_content_sha256: contentSha256,
        canonical_content_sha256: canonicalSha256,
        home_v1_deployed: hasHomeV1(rendered.content),
        rendered_integrity_verified: hasHomeV1(rendered.content),
        raw_content_equivalent: authorization ? contentSha256 === canonicalSha256 : null,
      })}\n`);
    } else {
      if (!authorization) {
        throw new Error("apply requires WordPress application credentials");
      }
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(args.expectedModifiedGmt)) {
        throw new Error("apply requires exact --expected-modified-gmt");
      }
      if (!/^[0-9a-f]{64}$/.test(args.expectedContentSha256)) {
        throw new Error("apply requires exact --expected-content-sha256");
      }

      const previous = await editableRawPage(authorization);
      const previousSha256 = sha256(previous.content);
      if (previous.page.modified_gmt !== args.expectedModifiedGmt) {
        throw new Error("page modified_gmt changed before apply");
      }
      if (previousSha256 !== args.expectedContentSha256) {
        throw new Error("page content changed before apply");
      }

      let writeAttempted = false;
      try {
        writeAttempted = true;
        const updated = await updatePage(authorization, PAGE_TITLE, canonical);
        const confirmed = await editableRawPage(authorization);
        if (sha256(confirmed.content) !== canonicalSha256) {
          throw new Error("WordPress raw content does not match canonical after apply");
        }
        if (confirmed.title !== PAGE_TITLE) {
          throw new Error("WordPress page title does not match canonical after apply");
        }
        const live = await publicRenderedPage();
        validateRenderedIntegrity(live.content);
        if (live.title !== PAGE_TITLE) {
          throw new Error("public WordPress page title does not match canonical after apply");
        }
        process.stdout.write(`${JSON.stringify({
          marker: MARKER,
          outcome: "APPLIED",
          mode: "apply",
          page_id: PAGE_ID,
          page_title: PAGE_TITLE,
          previous_modified_gmt: args.expectedModifiedGmt,
          modified_gmt: updated.modified_gmt,
          previous_content_sha256: previousSha256,
          canonical_content_sha256: canonicalSha256,
          raw_content_equivalent: true,
          live_layout_verified: true,
          rollback_performed: false,
          recovery_policy: "manual_revision_recovery",
        })}\n`);
      } catch (error) {
        throw new Error(
          `${String(error?.message || error)}; mutation_attempted=${String(writeAttempted)}; automatic_rollback_disabled=true; manual_recovery_required=${String(writeAttempted)}`,
        );
      }
    }
  } catch (error) {
    fail("sync_failed", { detail: String(error?.message || error) });
  }
}
