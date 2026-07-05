#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const input = process.argv[2];
const expectedArg = process.argv[3] || "";

if (!input) {
  console.error("Usage: npm run datanet:field-object:roundtrip -- <mirror-base-url-or-latest-json-path> [expected-sha256]");
  console.error("Example: npm run datanet:field-object:roundtrip -- http://100.111.171.116:8089");
  process.exit(2);
}

function isHttp(raw) {
  return raw.startsWith("http://") || raw.startsWith("https://");
}

function normalizeBase(raw) {
  return raw.replace(/\/+$/, "");
}

function normalizeSha(raw) {
  return String(raw || "").replace(/^sha256:/, "").toLowerCase();
}

function fetchUrl(raw, timeoutMs = Number(process.env.VOID_PULL_TIMEOUT_MS || "10000")) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(raw);
    } catch {
      resolve({ ok: false, status: null, code: "INVALID_URL", error: `Invalid URL: ${raw}`, body: Buffer.alloc(0) });
      return;
    }

    const client = url.protocol === "https:" ? https : http;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          code: null,
          error: null,
          body,
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(Object.assign(new Error(`timeout after ${timeoutMs}ms`), { code: "ETIMEDOUT" }));
    });

    req.on("error", (err) => {
      resolve({
        ok: false,
        status: null,
        code: err.code || null,
        error: err.message,
        body: Buffer.alloc(0),
      });
    });
  });
}

function readLocal(raw) {
  const p = raw.startsWith("file://") ? fileURLToPath(raw) : raw;
  return readFileSync(p);
}

async function loadLatest(raw) {
  if (isHttp(raw)) {
    const base = normalizeBase(raw);
    const latestUrl = `${base}/public-node/datanet/field-object-mirrors/latest.json`;
    const res = await fetchUrl(latestUrl);
    if (!res.ok) {
      return { ok: false, base, latest_url: latestUrl, status: res.status, code: res.code, error: res.error };
    }
    try {
      return { ok: true, base, latest_url: latestUrl, latest: JSON.parse(res.body.toString("utf8")) };
    } catch (err) {
      return { ok: false, base, latest_url: latestUrl, status: res.status, code: "JSON_PARSE_FAIL", error: err.message };
    }
  }

  const localPath = raw.startsWith("file://") ? fileURLToPath(raw) : raw;
  if (!existsSync(localPath)) {
    return { ok: false, latest_url: localPath, status: null, code: "LOCAL_LATEST_NOT_FOUND", error: `not found: ${localPath}` };
  }

  try {
    return { ok: true, latest_url: localPath, local_latest_dir: dirname(localPath), latest: JSON.parse(readFileSync(localPath, "utf8")) };
  } catch (err) {
    return { ok: false, latest_url: localPath, status: null, code: "JSON_PARSE_FAIL", error: err.message };
  }
}

async function loadObject(source) {
  if (isHttp(source)) return await fetchUrl(source);
  if (source.startsWith("file://") || existsSync(source)) {
    return { ok: true, status: null, code: null, error: null, body: readLocal(source) };
  }
  return { ok: false, status: null, code: "OBJECT_SOURCE_NOT_FOUND", error: `object source not found: ${source}`, body: Buffer.alloc(0) };
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(".void-field-trial", "datanet-field-object-roundtrip", stamp);
mkdirSync(outDir, { recursive: true });

function finish(receipt) {
  const receiptPath = join(outDir, "receipt.json");
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

  console.log(receipt.marker);
  console.log(`phase=${receipt.phase || "roundtrip_verify"}`);
  console.log(`mirror_latest=${receipt.latest_url || ""}`);
  console.log(`mirror_object_source=${receipt.mirror_object_source || ""}`);
  console.log(`ok=${receipt.ok}`);
  console.log(`status=${receipt.status}`);
  console.log(`code=${receipt.code}`);
  console.log(`bytes=${receipt.bytes || 0}`);
  console.log(`expected_sha256=${receipt.expected_sha256 || ""}`);
  console.log(`mirror_sha256=${receipt.mirror_sha256 || ""}`);
  console.log(`actual_sha256=${receipt.actual_sha256 || ""}`);
  console.log(`match=${receipt.match}`);
  console.log(`receipt=${receiptPath}`);
  process.exit(receipt.marker.endsWith("_GREEN") ? 0 : 1);
}

const latestResult = await loadLatest(input);

if (!latestResult.ok) {
  finish({
    marker: "VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_FAIL",
    created_at: new Date().toISOString(),
    host: hostname(),
    network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
    input,
    phase: "load_mirror_latest",
    ok: false,
    latest_url: latestResult.latest_url,
    status: latestResult.status,
    code: latestResult.code,
    error: latestResult.error,
    match: false,
    dangerous_paths_touched: false,
  });
}

const latest = latestResult.latest;
const mirrorSha = normalizeSha(latest.sha256 || latest.object_id);
const expected = expectedArg ? normalizeSha(expectedArg) : mirrorSha;

if (!/^[a-f0-9]{64}$/.test(mirrorSha) || !/^[a-f0-9]{64}$/.test(expected)) {
  finish({
    marker: "VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_FAIL",
    created_at: new Date().toISOString(),
    host: hostname(),
    network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
    input,
    phase: "validate_mirror_latest",
    ok: false,
    latest_url: latestResult.latest_url,
    status: null,
    code: "BAD_SHA",
    error: "mirror latest missing valid sha256/object_id or expected SHA is invalid",
    expected_sha256: expected,
    mirror_sha256: mirrorSha,
    match: false,
    latest,
    dangerous_paths_touched: false,
  });
}

let objectSource = "";
if (latestResult.base && latest.public_path) {
  objectSource = `${latestResult.base}${latest.public_path}`;
} else if (latest.mirror_url) {
  objectSource = latest.mirror_url;
} else if (latest.mirror_object_path) {
  objectSource = latest.mirror_object_path;
} else if (latest.public_path && latestResult.local_latest_dir) {
  objectSource = latest.mirror_object_path || latest.public_path;
}

const objectResult = await loadObject(objectSource);
const objectPath = join(outDir, "mirror-object.txt");
writeFileSync(objectPath, objectResult.body || Buffer.alloc(0));

const actual = createHash("sha256").update(objectResult.body || Buffer.alloc(0)).digest("hex");
const match = objectResult.ok && actual === mirrorSha && actual === expected;

writeFileSync(join(outDir, "mirror-latest.json"), JSON.stringify(latest, null, 2) + "\n");

finish({
  marker: match ? "VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN" : "VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_FAIL",
  created_at: new Date().toISOString(),
  host: hostname(),
  network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
  input,
  phase: "roundtrip_verify",
  ok: objectResult.ok,
  latest_url: latestResult.latest_url,
  mirror_object_source: objectSource,
  status: objectResult.status,
  code: objectResult.code,
  error: objectResult.error,
  bytes: objectResult.body?.length || 0,
  expected_sha256: expected,
  mirror_sha256: mirrorSha,
  actual_sha256: actual,
  match,
  downloaded_object_path: objectPath,
  source_object_url: latest.source_object_url || null,
  source_receipt: latest.source_receipt || null,
  mirror_latest: latest,
  dangerous_paths_touched: false,
});
