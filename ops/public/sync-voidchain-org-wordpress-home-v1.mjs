#!/usr/bin/env node
// VOIDCHAIN_ORG_WORDPRESS_HOME_SYNC_V1

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MARKER = "VOIDCHAIN_ORG_WORDPRESS_HOME_SYNC_V1";
const PAGE_ID = 243945;
const PAGE_ENDPOINT = `https://voidchain.org/wp-json/wp/v2/pages/${PAGE_ID}`;
const ENTER_VOID_URL =
  "https://zoso-alienware-aurora-r7.taila47fd.ts.net/app/";
const PUBLIC_APP_REQUIRED_TOKENS = [
  "<title>VOID App — Read-only Home, Wallet & Earn</title>",
  "window.__VOID_PUBLIC_APP_MODE__=true",
  'id="app-shell"',
];
const WORDPRESS_HTML_BLOCK_OPEN = "<!-- wp:html -->";
const WORDPRESS_HTML_BLOCK_CLOSE = "<!-- /wp:html -->";
const CONTENT_PATH = path.resolve(
  process.cwd(),
  "ops/public/voidchain-org-wordpress-home-v1.html",
);
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;
const RESPONSE_TEARDOWN_TIMEOUT_MS = 250;

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
  const username = String(process.env.VOIDCHAIN_WORDPRESS_USERNAME || "");
  const applicationPassword = String(
    process.env.VOIDCHAIN_WORDPRESS_APPLICATION_PASSWORD || "",
  );
  if (Boolean(username) !== Boolean(applicationPassword)) {
    throw new Error("WordPress credentials are only partially configured");
  }
  if (!username || !applicationPassword) {
    return null;
  }
  return Buffer.from(`${username}:${applicationPassword}`).toString("base64");
};

const settleWithin = async (promise, timeoutMs) => {
  let timeout;
  try {
    return await Promise.race([
      Promise.resolve(promise).then(
        () => "settled",
        () => "settled",
      ),
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve("timeout"), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const abortOwnedRequest = (controller) => {
  if (!controller.signal.aborted) {
    controller.abort();
  }
};

const cancelResponseBodyBounded = async (response, controller) => {
  abortOwnedRequest(controller);
  const body = response?.body;
  if (!body || typeof body.cancel !== "function") {
    return;
  }
  let cancellation;
  try {
    cancellation = body.cancel();
  } catch (error) {
    return;
  }
  await settleWithin(cancellation, RESPONSE_TEARDOWN_TIMEOUT_MS);
};

const cancelReaderBounded = async (reader, controller) => {
  abortOwnedRequest(controller);
  let cancellation;
  try {
    cancellation = reader.cancel();
  } catch (error) {
    return;
  }
  await settleWithin(cancellation, RESPONSE_TEARDOWN_TIMEOUT_MS);
};

const canonicalContentLength = (response) => {
  const header = response.headers.get("content-length");
  if (header === null) {
    return null;
  }
  if (!/^(?:0|[1-9]\d*)$/.test(header)) {
    throw new Error("invalid response content-length");
  }
  const value = Number(header);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("invalid response content-length");
  }
  return value;
};

const readBoundedResponseBytes = async (
  response,
  controller,
  { oversizeMessage = "response exceeds size limit" } = {},
) => {
  let contentLength;
  try {
    contentLength = canonicalContentLength(response);
  } catch (error) {
    await cancelResponseBodyBounded(response, controller);
    throw error;
  }
  if (contentLength !== null && contentLength > MAX_RESPONSE_BYTES) {
    await cancelResponseBodyBounded(response, controller);
    throw new Error(oversizeMessage);
  }

  if (!response.body) {
    return new Uint8Array();
  }

  let reader;
  try {
    reader = response.body.getReader();
  } catch (error) {
    await cancelResponseBodyBounded(response, controller);
    throw error;
  }

  const chunks = [];
  let totalBytes = 0;
  try {
    for (;;) {
      let part;
      try {
        part = await reader.read();
      } catch (error) {
        await cancelReaderBounded(reader, controller);
        throw error;
      }
      if (part.done) {
        break;
      }
      if (!(part.value instanceof Uint8Array)) {
        await cancelReaderBounded(reader, controller);
        throw new Error("response body yielded a non-byte chunk");
      }
      totalBytes += part.value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await cancelReaderBounded(reader, controller);
        throw new Error(oversizeMessage);
      }
      chunks.push(part.value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (error) {
      void error;
    }
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const withResponseDeadline = async (url, options, consume) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  timeout.unref?.();
  try {
    const response = await fetch(url, {
      ...options,
      redirect: "error",
      signal: controller.signal,
    });
    return await consume(response, controller);
  } finally {
    clearTimeout(timeout);
  }
};

const requestJson = async (url, options = {}) =>
  withResponseDeadline(url, options, async (response, controller) => {
    const bytes = await readBoundedResponseBytes(response, controller);
    const contentType = String(response.headers.get("content-type") || "")
      .toLowerCase();
    if (!contentType.includes("application/json")) {
      throw new Error(`unexpected content type on HTTP ${response.status}`);
    }

    let value;
    try {
      value = JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
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
  });

const validatePublicAppDocument = ({ status, contentType, content }) => {
  if (status !== 200) {
    throw new Error(`primary CTA returned HTTP ${String(status)}`);
  }
  if (!String(contentType || "").toLowerCase().includes("text/html")) {
    throw new Error("primary CTA returned non-HTML content");
  }
  if (typeof content !== "string") {
    throw new Error("primary CTA returned invalid content");
  }
  for (const token of PUBLIC_APP_REQUIRED_TOKENS) {
    if (!content.includes(token)) {
      throw new Error(`primary CTA response is missing ${token}`);
    }
  }
};

const requestPublicAppEntrypoint = async () =>
  withResponseDeadline(
    ENTER_VOID_URL,
    {
      method: "GET",
      headers: { accept: "text/html" },
    },
    async (response, controller) => {
      const bytes = await readBoundedResponseBytes(response, controller, {
        oversizeMessage: "primary CTA response exceeds size limit",
      });
      validatePublicAppDocument({
        status: response.status,
        contentType: response.headers.get("content-type"),
        content: new TextDecoder().decode(bytes),
      });
      return response.status;
    },
  );

const validatePage = (page) => {
  if (page.id !== PAGE_ID) {
    throw new Error("page id mismatch");
  }
  if (page.status !== "publish") {
    throw new Error("page is not published");
  }
  if (page.slug !== "coming-soon") {
    throw new Error("page slug mismatch");
  }
  if (page.template !== "blank") {
    throw new Error("page template mismatch");
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

  const required = [
    "VOIDCHAIN_ORG_WORDPRESS_HOME_V1",
    "VOIDCHAIN_ORG_NODE_LIVE_V2",
    "VOIDCHAIN_ORG_NODE_LIVE_CLIENT_V1",
    "body.page-id-243945",
    "max-width:none !important",
    "width:100vw",
    "background:#050506 !important",
    `href="${ENTER_VOID_URL}"`,
    'method: "GET"',
    'credentials: "omit"',
    'fetchJson("/__void/ready.json")',
    'fetchJson("/blocks/latest/number2.json")',
  ];
  for (const token of required) {
    if (!content.includes(token)) {
      throw new Error(`canonical content is missing ${token}`);
    }
  }
  if (content.includes("https://voidchain.io")) {
    throw new Error("canonical content contains the retired public-domain link");
  }
  if (/href=["']https:\/\/voidchain\.org\/app\/?["']/i.test(content)) {
    throw new Error("canonical content contains the dead primary CTA");
  }

  const script = elementPayload(
    content,
    "script",
    "voidchain-org-node-live-client-v1",
  );
  if (script.includes("&")) {
    throw new Error("canonical live client must be ampersand-free");
  }
  new Function(script);
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

const validateRenderedIntegrity = (content) => {
  const required = [
    "VOIDCHAIN_ORG_WORDPRESS_HOME_V1",
    "VOIDCHAIN_ORG_NODE_LIVE_V2",
    "VOIDCHAIN_ORG_NODE_LIVE_CLIENT_V1",
    `href="${ENTER_VOID_URL}"`,
  ];
  for (const token of required) {
    if (!content.includes(token)) {
      throw new Error(`rendered page is missing ${token}`);
    }
  }

  const style = elementPayload(
    content,
    "style",
    "voidchain-org-node-mirror-v1-css",
  );
  const script = elementPayload(
    content,
    "script",
    "voidchain-org-node-live-client-v1",
  );
  for (const [label, payload] of [["style", style], ["script", script]]) {
    if (/<\/?p(?:\s|>)/i.test(payload) || /<br\s*\/?>/i.test(payload)) {
      throw new Error(`WordPress paragraph formatting contaminated the ${label}`);
    }
  }
  if (/&(?:#(?:x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos);/i.test(script)) {
    throw new Error("WordPress entity encoding contaminated the script");
  }
  if (
    !/#voidchain-org-node-mirror-v1\s*\{[^}]*width:100vw;[^}]*max-width:none !important;/s.test(
      style,
    )
  ) {
    throw new Error("rendered page lost the full-width root rule");
  }
  new Function(script);
};

const hasLayoutV1 = (content) => {
  try {
    validateRenderedIntegrity(content);
    return true;
  } catch (error) {
    return false;
  }
};

const publicRenderedContent = async () => {
  const page = await requestJson(`${PAGE_ENDPOINT}?context=view`);
  validatePage(page);
  const rendered = page.content?.rendered;
  if (typeof rendered !== "string") {
    throw new Error("public page content is unavailable");
  }
  return { page, content: rendered };
};

const editableRawContent = async (authorization) => {
  const page = await requestJson(`${PAGE_ENDPOINT}?context=edit`, {
    headers: { authorization: `Basic ${authorization}` },
  });
  validatePage(page);
  const raw = page.content?.raw;
  if (typeof raw !== "string") {
    throw new Error("editable raw page content is unavailable");
  }
  return { page, content: raw };
};

export {
  ENTER_VOID_URL,
  MAX_RESPONSE_BYTES,
  readBoundedResponseBytes,
  validateCanonical,
  validatePublicAppDocument,
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
    const primaryCtaHttpStatus = await requestPublicAppEntrypoint();

    if (args.mode === "inspect") {
      const rendered = await publicRenderedContent();
      const current = authorization
        ? await editableRawContent(authorization)
        : rendered;
      const contentSha256 = sha256(current.content);
      process.stdout.write(`${JSON.stringify({
        marker: MARKER,
        outcome: "READY",
        mode: "inspect",
        authenticated: Boolean(authorization),
        page_id: PAGE_ID,
        modified_gmt: current.page.modified_gmt,
        current_content_sha256: contentSha256,
        canonical_content_sha256: canonicalSha256,
        primary_cta_url: ENTER_VOID_URL,
        primary_cta_http_status: primaryCtaHttpStatus,
        primary_cta_live_verified: true,
        layout_v1_deployed: hasLayoutV1(rendered.content),
        rendered_integrity_verified: hasLayoutV1(rendered.content),
        raw_content_equivalent: authorization
          ? contentSha256 === canonicalSha256
          : null,
      })}\n`);
    } else {
      if (!authorization) {
        throw new Error("apply requires WordPress application credentials");
      }
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(
        args.expectedModifiedGmt,
      )) {
        throw new Error("apply requires exact --expected-modified-gmt");
      }
      if (!/^[0-9a-f]{64}$/.test(args.expectedContentSha256)) {
        throw new Error("apply requires exact --expected-content-sha256");
      }

      const current = await editableRawContent(authorization);
      const currentSha256 = sha256(current.content);
      if (current.page.modified_gmt !== args.expectedModifiedGmt) {
        throw new Error("page modified_gmt changed before apply");
      }
      if (currentSha256 !== args.expectedContentSha256) {
        throw new Error("page content changed before apply");
      }

      const updated = await requestJson(PAGE_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Basic ${authorization}`,
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ content: canonical }),
      });
      validatePage(updated);

      const confirmed = await editableRawContent(authorization);
      if (sha256(confirmed.content) !== canonicalSha256) {
        throw new Error("WordPress raw content does not match canonical after apply");
      }
      const live = await publicRenderedContent();
      validateRenderedIntegrity(live.content);
      process.stdout.write(`${JSON.stringify({
        marker: MARKER,
        outcome: "APPLIED",
        mode: "apply",
        page_id: PAGE_ID,
        previous_modified_gmt: args.expectedModifiedGmt,
        modified_gmt: updated.modified_gmt,
        previous_content_sha256: currentSha256,
        canonical_content_sha256: canonicalSha256,
        primary_cta_url: ENTER_VOID_URL,
        primary_cta_http_status: primaryCtaHttpStatus,
        primary_cta_live_verified: true,
        raw_content_equivalent: true,
        live_layout_verified: true,
      })}\n`);
    }
  } catch (error) {
    fail("sync_failed", { detail: String(error?.message || error) });
  }
}
