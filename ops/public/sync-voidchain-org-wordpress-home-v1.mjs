#!/usr/bin/env node
// VOIDCHAIN_ORG_WORDPRESS_HOME_SYNC_V1

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MARKER = "VOIDCHAIN_ORG_WORDPRESS_HOME_SYNC_V1";
const PAGE_ID = 243945;
const PAGE_ENDPOINT = `https://voidchain.org/wp-json/wp/v2/pages/${PAGE_ID}`;
const CONTENT_PATH = path.resolve(
  process.cwd(),
  "ops/public/voidchain-org-wordpress-home-v1.html",
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

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("response exceeds size limit");
  }

  const contentType = String(response.headers.get("content-type") || "")
    .toLowerCase();
  if (!contentType.includes("application/json")) {
    throw new Error(`unexpected content type on HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("response exceeds size limit");
  }

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
  const required = [
    "VOIDCHAIN_ORG_WORDPRESS_HOME_V1",
    "VOIDCHAIN_ORG_NODE_LIVE_V2",
    "VOIDCHAIN_ORG_NODE_LIVE_CLIENT_V1",
    "body.page-id-243945",
    "max-width:none !important",
    "width:100vw",
    "background:#050506 !important",
    'href="https://voidchain.org/app"',
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
};

const hasLayoutV1 = (content) => [
  "VOIDCHAIN_ORG_WORDPRESS_HOME_V1",
  "body.page-id-243945",
  "max-width:none !important",
  'href="https://voidchain.org/app"',
].every((token) => content.includes(token));

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

const args = (() => {
  try {
    return parseArgs(process.argv.slice(2));
  } catch (error) {
    fail("invalid_arguments", { detail: String(error?.message || error) });
    return null;
  }
})();

if (args) {
  try {
    const canonical = await readFile(CONTENT_PATH, "utf8");
    validateCanonical(canonical);
    const canonicalSha256 = sha256(canonical);
    const authorization = credentials();

    if (args.mode === "inspect") {
      const current = authorization
        ? await editableRawContent(authorization)
        : await publicRenderedContent();
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
        layout_v1_deployed: hasLayoutV1(current.content),
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

      const live = await publicRenderedContent();
      validateCanonical(live.content);
      process.stdout.write(`${JSON.stringify({
        marker: MARKER,
        outcome: "APPLIED",
        mode: "apply",
        page_id: PAGE_ID,
        previous_modified_gmt: args.expectedModifiedGmt,
        modified_gmt: updated.modified_gmt,
        previous_content_sha256: currentSha256,
        canonical_content_sha256: canonicalSha256,
        live_layout_verified: true,
      })}\n`);
    }
  } catch (error) {
    fail("sync_failed", { detail: String(error?.message || error) });
  }
}
