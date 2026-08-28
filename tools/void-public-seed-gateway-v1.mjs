#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import {
  VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1,
} from "../scripts/lib/void_public_checkpoint_contract_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_GATEWAY_V1";
const BIND_HOST = process.env.VOID_PUBLIC_SEED_BIND || "127.0.0.1";
const PORT = Number(process.env.VOID_PUBLIC_SEED_PORT || 4111);
const UPSTREAM = new URL(process.env.VOID_PUBLIC_SEED_UPSTREAM || "http://127.0.0.1:4100");
const CHECKPOINT_DISCOVERY_ROUTE_V1 = "/__void/checkpoint/v1.json";
const CHECKPOINT_ID_RE_V1 = /^voidpbc1_[0-9a-f]{64}$/;
const CHECKPOINT_MANIFEST_PATH_RE_V1 =
  /^\/checkpoints\/v1\/(voidpbc1_[0-9a-f]{64})\/checkpoint\.json$/;
const CHECKPOINT_SEGMENT_PATH_RE_V1 =
  /^\/checkpoints\/v1\/(voidpbc1_[0-9a-f]{64})\/segments\/([0-9]{8})\/blocks\.bin$/;
const CHECKPOINT_ROOT_RAW_V1 = String(
  process.env.VOID_PUBLIC_SEED_CHECKPOINT_ROOT || "",
).trim();
const CHECKPOINT_EXPECTED_ID_V1 = String(
  process.env.VOID_PUBLIC_SEED_CHECKPOINT_ID || "",
).trim();
const CHECKPOINT_EXPECTED_MANIFEST_SHA256_V1 = String(
  process.env.VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256 || "",
).trim();
const MAX_RANGE = Math.max(
  1,
  Math.min(999, Number(process.env.VOID_PUBLIC_SEED_MAX_RANGE || 999) || 999),
);
const MAX_RESPONSE_BYTES = Math.max(
  1024 * 1024,
  Math.min(
    128 * 1024 * 1024,
    Number(
      process.env.VOID_PUBLIC_SEED_MAX_RESPONSE_BYTES ||
        VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1,
    ) || VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1,
  ),
);
const UPSTREAM_TIMEOUT_MS = Math.max(
  1000,
  Math.min(120_000, Number(process.env.VOID_PUBLIC_SEED_UPSTREAM_TIMEOUT_MS || 60_000) || 60_000),
);

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function isLoopbackLiteral(hostname) {
  return ["127.0.0.1", "::1", "[::1]"].includes(String(hostname).toLowerCase());
}

if (
  UPSTREAM.protocol !== "http:" ||
  !isLoopbackLiteral(UPSTREAM.hostname) ||
  UPSTREAM.username ||
  UPSTREAM.password ||
  UPSTREAM.search ||
  UPSTREAM.hash ||
  (UPSTREAM.pathname !== "/" && UPSTREAM.pathname !== "")
) {
  fail("upstream must be one credential-free loopback HTTP origin");
}
if (!isLoopbackLiteral(BIND_HOST)) {
  fail("gateway must bind to a numeric loopback literal; publish it through a separate HTTPS proxy");
}
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) fail("invalid gateway port");


const CHECKPOINT_MANIFEST_KEYS_V1 = [
  "schema",
  "network",
  "chain_id",
  "format",
  "source_sha",
  "captured_at",
  "head",
  "head_era",
  "head_header_hash",
  "head_body_sha256",
  "block_count",
  "segment_span",
  "segment_count",
  "payload_bytes",
  "segments",
  "rebuild",
  "authority",
  "checkpoint_id",
];

const CHECKPOINT_SEGMENT_KEYS_V1 = [
  "name",
  "path",
  "first",
  "last",
  "blocks",
  "bytes",
  "sha256",
];

const CHECKPOINT_REBUILD_KEYS_V1 = [
  "auto_repair_required",
  "sparse_every",
  "sparse_index_reconstructed",
  "segment_meta_reconstructed",
  "head_markers_reconstructed",
  "wal_included",
  "derived_indexes_included",
  "other_data_dir_content_included",
];

const CHECKPOINT_AUTHORITY_KEYS_V1 = [
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
];

function exactObjectKeysV1(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function stableJsonV1(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonV1(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJsonV1(value[key])}`)
    .join(",")}}`;
}

function sha256BytesV1(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function noSymlinkComponentsV1(target) {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  const parts = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const part of parts) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    const st = fs.lstatSync(current);
    if (st.isSymbolicLink()) {
      throw new Error("checkpoint path contains a symlink component");
    }
  }
}

function safeCheckpointFileV1(root, relativePath) {
  const file = path.resolve(root, relativePath);
  const rootPrefix = `${path.resolve(root)}${path.sep}`;
  if (!file.startsWith(rootPrefix)) {
    throw new Error("checkpoint path escapes root");
  }
  noSymlinkComponentsV1(path.dirname(file));
  const st = fs.lstatSync(file);
  if (!st.isFile() || st.isSymbolicLink()) {
    throw new Error("checkpoint entry is not a regular file");
  }
  if ((st.mode & 0o002) !== 0) {
    throw new Error("checkpoint entry is world-writable");
  }
  return { file, st };
}

function checkpointBodyIdV1(manifest) {
  const body = {};
  for (const key of CHECKPOINT_MANIFEST_KEYS_V1) {
    if (key !== "checkpoint_id") body[key] = manifest[key];
  }
  return `voidpbc1_${sha256BytesV1(Buffer.from(stableJsonV1(body)))}`;
}

function loadCheckpointPublicationV1() {
  const configured = [
    CHECKPOINT_ROOT_RAW_V1,
    CHECKPOINT_EXPECTED_ID_V1,
    CHECKPOINT_EXPECTED_MANIFEST_SHA256_V1,
  ].filter(Boolean).length;

  if (configured === 0) return null;
  if (configured !== 3) {
    throw new Error(
      "checkpoint publication requires root, checkpoint id, and manifest sha256 together",
    );
  }
  if (!CHECKPOINT_ID_RE_V1.test(CHECKPOINT_EXPECTED_ID_V1)) {
    throw new Error("checkpoint id is malformed");
  }
  if (!/^[0-9a-f]{64}$/.test(CHECKPOINT_EXPECTED_MANIFEST_SHA256_V1)) {
    throw new Error("checkpoint manifest sha256 is malformed");
  }
  if (!path.isAbsolute(CHECKPOINT_ROOT_RAW_V1)) {
    throw new Error("checkpoint root must be absolute");
  }

  const root = path.resolve(CHECKPOINT_ROOT_RAW_V1);
  if (root !== CHECKPOINT_ROOT_RAW_V1) {
    throw new Error("checkpoint root must be canonical");
  }
  noSymlinkComponentsV1(root);
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("checkpoint root must be a real directory");
  }
  if ((rootStat.mode & 0o002) !== 0) {
    throw new Error("checkpoint root must not be world-writable");
  }

  const manifestEntry = safeCheckpointFileV1(root, "checkpoint.json");
  const manifestBytes = fs.readFileSync(manifestEntry.file);
  const manifestSha256 = sha256BytesV1(manifestBytes);
  if (manifestSha256 !== CHECKPOINT_EXPECTED_MANIFEST_SHA256_V1) {
    throw new Error("checkpoint manifest sha256 mismatch");
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error("checkpoint manifest is malformed JSON");
  }

  if (!exactObjectKeysV1(manifest, CHECKPOINT_MANIFEST_KEYS_V1)) {
    throw new Error("checkpoint manifest key set mismatch");
  }
  if (
    manifest.schema !== "void_public_canonical_checkpoint_v1" ||
    manifest.network !== "VOID Network" ||
    manifest.chain_id !== 2050 ||
    manifest.format !== "blocks-bin-only-v1" ||
    manifest.checkpoint_id !== CHECKPOINT_EXPECTED_ID_V1 ||
    checkpointBodyIdV1(manifest) !== CHECKPOINT_EXPECTED_ID_V1 ||
    typeof manifest.source_sha !== "string" ||
    !/^[0-9a-f]{40}$/.test(manifest.source_sha) ||
    typeof manifest.head !== "number" ||
    !Number.isSafeInteger(manifest.head) ||
    manifest.head < 0 ||
    typeof manifest.block_count !== "number" ||
    !Number.isSafeInteger(manifest.block_count) ||
    manifest.block_count !== manifest.head + 1 ||
    manifest.segment_span !== 10_000 ||
    typeof manifest.segment_count !== "number" ||
    !Number.isSafeInteger(manifest.segment_count) ||
    manifest.segment_count <= 0 ||
    typeof manifest.payload_bytes !== "number" ||
    !Number.isSafeInteger(manifest.payload_bytes) ||
    manifest.payload_bytes <= 0 ||
    !/^[0-9a-f]{64}$/.test(String(manifest.head_body_sha256 || "")) ||
    !Array.isArray(manifest.segments) ||
    manifest.segments.length !== manifest.segment_count
  ) {
    throw new Error("checkpoint manifest contract mismatch");
  }

  if (
    !exactObjectKeysV1(manifest.rebuild, CHECKPOINT_REBUILD_KEYS_V1) ||
    manifest.rebuild.auto_repair_required !== true ||
    manifest.rebuild.sparse_every !== 16 ||
    manifest.rebuild.sparse_index_reconstructed !== true ||
    manifest.rebuild.segment_meta_reconstructed !== true ||
    manifest.rebuild.head_markers_reconstructed !== true ||
    manifest.rebuild.wal_included !== false ||
    manifest.rebuild.derived_indexes_included !== false ||
    manifest.rebuild.other_data_dir_content_included !== false
  ) {
    throw new Error("checkpoint rebuild contract mismatch");
  }

  if (!exactObjectKeysV1(manifest.authority, CHECKPOINT_AUTHORITY_KEYS_V1)) {
    throw new Error("checkpoint authority key set mismatch");
  }
  for (const key of CHECKPOINT_AUTHORITY_KEYS_V1) {
    if (manifest.authority[key] !== false) {
      throw new Error("checkpoint authority must remain all-false");
    }
  }

  const segmentFiles = new Map();
  let payloadBytes = 0;
  let blockCount = 0;

  for (let index = 0; index < manifest.segments.length; index += 1) {
    const entry = manifest.segments[index];
    if (!exactObjectKeysV1(entry, CHECKPOINT_SEGMENT_KEYS_V1)) {
      throw new Error("checkpoint segment key set mismatch");
    }
    const expectedName = String(index * 10_000).padStart(8, "0");
    const expectedFirst = index * 10_000;
    const expectedLast =
      index === manifest.segments.length - 1
        ? manifest.head
        : expectedFirst + 9_999;
    const expectedPath = `segments/${expectedName}/blocks.bin`;

    if (
      entry.name !== expectedName ||
      entry.path !== expectedPath ||
      entry.first !== expectedFirst ||
      entry.last !== expectedLast ||
      entry.blocks !== expectedLast - expectedFirst + 1 ||
      typeof entry.bytes !== "number" ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes <= 0 ||
      entry.bytes > VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1 ||
      typeof entry.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(entry.sha256)
    ) {
      throw new Error("checkpoint segment contract mismatch");
    }

    const fileEntry = safeCheckpointFileV1(root, expectedPath);
    if (
      fileEntry.st.size !== entry.bytes ||
      fileEntry.st.size > VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1
    ) {
      throw new Error("checkpoint segment size mismatch");
    }
    const bytes = fs.readFileSync(fileEntry.file);
    if (sha256BytesV1(bytes) !== entry.sha256) {
      throw new Error("checkpoint segment sha256 mismatch");
    }

    payloadBytes += entry.bytes;
    blockCount += entry.blocks;
    segmentFiles.set(expectedName, Object.freeze({
      file: fileEntry.file,
      bytes: entry.bytes,
      sha256: entry.sha256,
    }));
  }

  if (
    payloadBytes !== manifest.payload_bytes ||
    blockCount !== manifest.block_count
  ) {
    throw new Error("checkpoint aggregate totals mismatch");
  }

  const packetBasePath = `/checkpoints/v1/${manifest.checkpoint_id}`;
  const discovery = Object.freeze({
    schema: "void_public_checkpoint_discovery_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "available",
    checkpoint: Object.freeze({
      checkpoint_id: manifest.checkpoint_id,
      manifest_sha256: manifestSha256,
      source_sha: manifest.source_sha,
      head: manifest.head,
      block_count: manifest.block_count,
      segment_count: manifest.segment_count,
      payload_bytes: manifest.payload_bytes,
      packet_base_path: packetBasePath,
    }),
  });

  return Object.freeze({
    root,
    manifest,
    manifestBytes,
    manifestSha256,
    segmentFiles,
    discovery,
    packetBasePath,
  });
}

const CHECKPOINT_PUBLICATION_V1 = (() => {
  try {
    return loadCheckpointPublicationV1();
  } catch (error) {
    fail(`checkpoint publication configuration invalid: ${error?.message || String(error)}`);
  }
})();

function checkpointDiscoveryBodyV1() {
  if (CHECKPOINT_PUBLICATION_V1) return CHECKPOINT_PUBLICATION_V1.discovery;
  return {
    schema: "void_public_checkpoint_discovery_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "unavailable",
    checkpoint: null,
  };
}

function classifyCheckpointRouteV1(url) {
  if (url.search !== "") return null;
  if (!CHECKPOINT_PUBLICATION_V1) return null;

  const manifestMatch = CHECKPOINT_MANIFEST_PATH_RE_V1.exec(url.pathname);
  if (manifestMatch) {
    if (manifestMatch[1] !== CHECKPOINT_PUBLICATION_V1.manifest.checkpoint_id) {
      return null;
    }
    return Object.freeze({ kind: "manifest" });
  }

  const segmentMatch = CHECKPOINT_SEGMENT_PATH_RE_V1.exec(url.pathname);
  if (segmentMatch) {
    if (segmentMatch[1] !== CHECKPOINT_PUBLICATION_V1.manifest.checkpoint_id) {
      return null;
    }
    if (!CHECKPOINT_PUBLICATION_V1.segmentFiles.has(segmentMatch[2])) {
      return null;
    }
    return Object.freeze({ kind: "segment", name: segmentMatch[2] });
  }

  return null;
}

function checkpointResponseBytesV1(route) {
  if (!CHECKPOINT_PUBLICATION_V1) {
    throw new Error("checkpoint publication unavailable");
  }
  if (route.kind === "manifest") {
    const bytes = fs.readFileSync(
      safeCheckpointFileV1(CHECKPOINT_PUBLICATION_V1.root, "checkpoint.json").file,
    );
    if (sha256BytesV1(bytes) !== CHECKPOINT_PUBLICATION_V1.manifestSha256) {
      throw new Error("checkpoint manifest changed after publication admission");
    }
    return {
      bytes,
      contentType: "application/json; charset=utf-8",
    };
  }

  const expected = CHECKPOINT_PUBLICATION_V1.segmentFiles.get(route.name);
  if (!expected) throw new Error("checkpoint segment is not admitted");
  const relative = `segments/${route.name}/blocks.bin`;
  const fileEntry = safeCheckpointFileV1(CHECKPOINT_PUBLICATION_V1.root, relative);
  if (
    expected.bytes > VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1 ||
    fileEntry.st.size !== expected.bytes ||
    fileEntry.st.size > VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1
  ) {
    throw new Error("checkpoint segment size changed after publication admission");
  }
  const bytes = fs.readFileSync(fileEntry.file);
  if (sha256BytesV1(bytes) !== expected.sha256) {
    throw new Error("checkpoint segment hash changed after publication admission");
  }
  return {
    bytes,
    contentType: "application/octet-stream",
  };
}

function serveCheckpointRouteV1(res, route, method) {
  try {
    const response = checkpointResponseBytesV1(route);
    res.writeHead(
      200,
      responseHeaders(response.contentType, response.bytes.length),
    );
    if (method === "HEAD") res.end();
    else res.end(response.bytes);
  } catch {
    writeJson(
      res,
      503,
      { ok: false, error: "checkpoint_integrity_hold" },
      method,
    );
  }
}

function exactSearchKeys(url, expected) {
  const keys = [...url.searchParams.keys()];
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function allowedPath(url) {
  const pathname = url.pathname;
  if (
    pathname === "/__void/ready.json" ||
    pathname === "/blocks/latest/number2.json" ||
    pathname === "/head" ||
    pathname === "/__void/demo/summary.json" ||
    pathname === "/api/health"
  ) {
    return url.search === "";
  }
  if (pathname === "/blocks/range") {
    if (!exactSearchKeys(url, ["from", "to"])) return false;
    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");
    if (!/^\d+$/.test(fromRaw || "") || !/^\d+$/.test(toRaw || "")) return false;
    const from = Number(fromRaw);
    const to = Number(toRaw);
    return (
      Number.isSafeInteger(from) &&
      Number.isSafeInteger(to) &&
      from >= 0 &&
      to >= from &&
      to - from + 1 <= MAX_RANGE
    );
  }
  return false;
}

function responseHeaders(contentType, contentLength) {
  const headers = {
    "content-type": contentType,
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "cross-origin-resource-policy": "same-site",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-void-public-seed-gateway": "v1",
  };
  if (contentLength !== undefined) headers["content-length"] = contentLength;
  return headers;
}

function writeJson(res, status, body, method = "GET") {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.writeHead(status, responseHeaders("application/json; charset=utf-8", bytes.length));
  if (method === "HEAD") res.end();
  else res.end(bytes);
}

function upstreamContentType(headers) {
  const value = String(headers["content-type"] || "").trim();
  if (!/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(value)) {
    throw new Error("upstream_content_type_not_json");
  }
  return value;
}

const server = http.createServer((req, res) => {
  const method = String(req.method || "").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    writeJson(res, 405, { ok: false, error: "method_not_allowed" }, method);
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(req.url || "/", "http://gateway.invalid");
  } catch {
    writeJson(res, 400, { ok: false, error: "invalid_url" }, method);
    return;
  }

  if (
    requestUrl.pathname === CHECKPOINT_DISCOVERY_ROUTE_V1 &&
    requestUrl.search === ""
  ) {
    writeJson(res, 200, checkpointDiscoveryBodyV1(), method);
    return;
  }

  const checkpointRoute = classifyCheckpointRouteV1(requestUrl);
  if (checkpointRoute) {
    serveCheckpointRouteV1(res, checkpointRoute, method);
    return;
  }

  if (!allowedPath(requestUrl)) {
    writeJson(res, 404, { ok: false, error: "route_not_public" }, method);
    return;
  }

  const target = new URL(`${requestUrl.pathname}${requestUrl.search}`, UPSTREAM);
  const upstreamRequest = http.request(
    target,
    {
      method,
      headers: {
        accept: "application/json",
        connection: "close",
        "user-agent": "void-public-seed-gateway-v1",
      },
      timeout: UPSTREAM_TIMEOUT_MS,
    },
    (upstreamResponse) => {
      const status = Number(upstreamResponse.statusCode || 502);
      if (status >= 300 && status < 400) {
        upstreamResponse.destroy();
        writeJson(res, 502, { ok: false, error: "upstream_redirect_not_allowed" }, method);
        return;
      }
      let contentType;
      try {
        contentType = upstreamContentType(upstreamResponse.headers);
      } catch {
        upstreamResponse.destroy();
        writeJson(res, 502, { ok: false, error: "upstream_content_type_not_json" }, method);
        return;
      }

      if (method === "HEAD") {
        upstreamResponse.resume();
        res.writeHead(status, responseHeaders(contentType));
        res.end();
        return;
      }

      const advertisedLength = Number(upstreamResponse.headers["content-length"] || 0);
      if (Number.isFinite(advertisedLength) && advertisedLength > MAX_RESPONSE_BYTES) {
        upstreamResponse.destroy();
        writeJson(res, 502, { ok: false, error: "upstream_response_too_large" });
        return;
      }

      const chunks = [];
      let total = 0;
      let rejected = false;
      upstreamResponse.on("data", (chunk) => {
        if (rejected) return;
        total += chunk.length;
        if (total > MAX_RESPONSE_BYTES) {
          rejected = true;
          upstreamResponse.destroy();
          writeJson(res, 502, { ok: false, error: "upstream_response_too_large" });
          return;
        }
        chunks.push(chunk);
      });
      upstreamResponse.on("end", () => {
        if (rejected || res.writableEnded) return;
        const body = Buffer.concat(chunks, total);
        res.writeHead(status, responseHeaders(contentType, body.length));
        res.end(body);
      });
      upstreamResponse.on("error", (error) => {
        if (!res.headersSent) writeJson(res, 502, { ok: false, error: "upstream_unavailable" });
        else res.destroy(error);
      });
    },
  );

  upstreamRequest.on("timeout", () => upstreamRequest.destroy(new Error("upstream timeout")));
  upstreamRequest.on("error", (error) => {
    if (!res.headersSent) writeJson(res, 502, { ok: false, error: "upstream_unavailable" });
    else res.destroy(error);
  });
  upstreamRequest.end();
});

server.maxHeadersCount = 64;
server.headersTimeout = 10_000;
server.requestTimeout = 75_000;
server.keepAliveTimeout = 5_000;
server.on("clientError", (_error, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});

server.listen(PORT, BIND_HOST, () => {
  console.log(`${MARKER}_READY`);
  console.log(`bind=${BIND_HOST}`);
  console.log(`port=${PORT}`);
  console.log(`upstream=${UPSTREAM.origin}`);
  console.log(`max_range=${MAX_RANGE}`);
  console.log(`max_response_bytes=${MAX_RESPONSE_BYTES}`);
  console.log(`upstream_timeout_ms=${UPSTREAM_TIMEOUT_MS}`);
  console.log("methods=GET,HEAD");
  console.log(`checkpoint_available=${CHECKPOINT_PUBLICATION_V1 ? "true" : "false"}`);
  console.log(`checkpoint_id=${CHECKPOINT_PUBLICATION_V1?.manifest.checkpoint_id || ""}`);
  console.log(`checkpoint_max_segment_bytes=${VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1}`);
  console.log("private_mutation_routes_exposed=false");
  console.log("wallet_authority=false");
  console.log("signer_authority=false");
  console.log("validator_authority=false");
  console.log("treasury_authority=false");
  console.log("work_credit_authority=false");
  console.log("money_movement_authority=false");
});
