#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const input = process.argv[2];

if (!input) {
  console.error("Usage: npm run datanet:field-object:trial -- <base-url-or-latest-json-path>");
  console.error("Example: npm run datanet:field-object:trial -- http://100.122.245.125:8088");
  process.exit(2);
}

function fetchUrl(raw, timeoutMs = Number(process.env.VOID_PULL_TIMEOUT_MS || "10000")) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(raw);
    } catch {
      resolve({ ok: false, code: "INVALID_URL", error: `Invalid URL: ${raw}`, status: null, body: Buffer.alloc(0) });
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

function normalizeBase(raw) {
  return raw.replace(/\/+$/, "");
}

function isHttp(raw) {
  return raw.startsWith("http://") || raw.startsWith("https://");
}

function readLocal(pathLike) {
  const path = pathLike.startsWith("file://") ? fileURLToPath(pathLike) : pathLike;
  return readFileSync(path);
}

async function loadLatest(raw) {
  if (isHttp(raw)) {
    const base = normalizeBase(raw);
    const latestUrl = `${base}/public-node/datanet/field-objects/latest.json`;
    const res = await fetchUrl(latestUrl);
    if (!res.ok) {
      return { ok: false, latest_url: latestUrl, error: res.error, code: res.code, status: res.status };
    }

    try {
      const latest = JSON.parse(res.body.toString("utf8"));
      return { ok: true, latest, latest_url: latestUrl, base };
    } catch (err) {
      return { ok: false, latest_url: latestUrl, error: `latest.json parse failed: ${err.message}`, code: "JSON_PARSE_FAIL", status: res.status };
    }
  }

  const localPath = raw.startsWith("file://") ? fileURLToPath(raw) : raw;
  if (!existsSync(localPath)) {
    return { ok: false, latest_url: localPath, error: `latest.json path not found: ${localPath}`, code: "LOCAL_LATEST_NOT_FOUND", status: null };
  }

  try {
    const latest = JSON.parse(readFileSync(localPath, "utf8"));
    return { ok: true, latest, latest_url: localPath, local_latest_dir: dirname(localPath) };
  } catch (err) {
    return { ok: false, latest_url: localPath, error: `latest.json parse failed: ${err.message}`, code: "JSON_PARSE_FAIL", status: null };
  }
}

async function loadObject(source, context) {
  if (isHttp(source)) {
    return await fetchUrl(source);
  }

  if (source.startsWith("file://") || existsSync(source)) {
    return { ok: true, status: null, code: null, error: null, body: readLocal(source) };
  }

  if (context.local_latest_dir && context.latest?.object_path && existsSync(context.latest.object_path)) {
    return { ok: true, status: null, code: null, error: null, body: readFileSync(context.latest.object_path) };
  }

  return { ok: false, status: null, code: "OBJECT_SOURCE_NOT_FOUND", error: `object source not found: ${source}`, body: Buffer.alloc(0) };
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(".void-field-trial", "datanet-field-object-trial", stamp);
mkdirSync(outDir, { recursive: true });

const latestResult = await loadLatest(input);

if (!latestResult.ok) {
  const receipt = {
    marker: "VOID_DATANET_FIELD_OBJECT_TRIAL_V1_FAIL",
    created_at: new Date().toISOString(),
    host: hostname(),
    network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
    input,
    phase: "load_latest",
    ok: false,
    code: latestResult.code,
    status: latestResult.status,
    error: latestResult.error,
    latest_url: latestResult.latest_url,
    dangerous_paths_touched: false,
  };
  const receiptPath = join(outDir, "receipt.json");
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  console.log(receipt.marker);
  console.log(`phase=${receipt.phase}`);
  console.log(`ok=false`);
  console.log(`code=${receipt.code}`);
  console.log(`error=${receipt.error}`);
  console.log(`receipt=${receiptPath}`);
  process.exit(1);
}

const latest = latestResult.latest;
const expected = String(latest.sha256 || latest.object_id || "").replace(/^sha256:/, "").toLowerCase();

if (!/^[a-f0-9]{64}$/.test(expected)) {
  const receipt = {
    marker: "VOID_DATANET_FIELD_OBJECT_TRIAL_V1_FAIL",
    created_at: new Date().toISOString(),
    host: hostname(),
    input,
    phase: "validate_latest",
    ok: false,
    error: "latest.json missing valid sha256/object_id",
    latest,
    dangerous_paths_touched: false,
  };
  const receiptPath = join(outDir, "receipt.json");
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  console.log(receipt.marker);
  console.log(`phase=${receipt.phase}`);
  console.log(`error=${receipt.error}`);
  console.log(`receipt=${receiptPath}`);
  process.exit(1);
}

let objectSource = latest.url || "";
if (!objectSource && latestResult.base && latest.public_path) {
  objectSource = `${latestResult.base}${latest.public_path}`;
}
if (!objectSource && latest.object_path) {
  objectSource = latest.object_path;
}

const objectResult = await loadObject(objectSource, latestResult);
const objectPath = join(outDir, "object.txt");
writeFileSync(objectPath, objectResult.body || Buffer.alloc(0));

const actual = createHash("sha256").update(objectResult.body || Buffer.alloc(0)).digest("hex");
const match = objectResult.ok && actual === expected;

const receipt = {
  marker: match ? "VOID_DATANET_FIELD_OBJECT_TRIAL_V1_GREEN" : "VOID_DATANET_FIELD_OBJECT_TRIAL_V1_FAIL",
  created_at: new Date().toISOString(),
  host: hostname(),
  network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
  input,
  latest_url: latestResult.latest_url,
  object_source: objectSource,
  ok: objectResult.ok,
  status: objectResult.status,
  code: objectResult.code,
  error: objectResult.error,
  expected_sha256: expected,
  actual_sha256: actual,
  match,
  bytes: objectResult.body?.length || 0,
  object_path: objectPath,
  latest,
  dangerous_paths_touched: false,
};

const receiptPath = join(outDir, "receipt.json");
writeFileSync(join(outDir, "latest.json"), JSON.stringify(latest, null, 2) + "\n");
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

console.log(receipt.marker);
console.log(`latest_url=${receipt.latest_url}`);
console.log(`object_source=${receipt.object_source}`);
console.log(`ok=${receipt.ok}`);
console.log(`status=${receipt.status}`);
console.log(`code=${receipt.code}`);
console.log(`bytes=${receipt.bytes}`);
console.log(`expected_sha256=${expected}`);
console.log(`actual_sha256=${actual}`);
console.log(`match=${match}`);
console.log(`receipt=${receiptPath}`);

process.exit(match ? 0 : 1);
