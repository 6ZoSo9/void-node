#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const [raw, expectedRaw] = process.argv.slice(2);

if (!raw || !expectedRaw) {
  console.error("Usage: npm run datanet:field-object:pull -- <url-or-file-path> <expected-sha256>");
  process.exit(2);
}

const expected = expectedRaw.replace(/^sha256:/, "").toLowerCase();

if (!/^[a-f0-9]{64}$/.test(expected)) {
  console.error(`Invalid expected SHA-256: ${expectedRaw}`);
  process.exit(2);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = join(".void-field-trial", "datanet-field-object-pull", stamp);
mkdirSync(dir, { recursive: true });

async function pull(input) {
  if (input.startsWith("file://")) {
    const path = fileURLToPath(input);
    const body = readFileSync(path);
    return { ok: true, status: null, code: null, error: null, body, source_type: "file" };
  }

  if (existsSync(input)) {
    const body = readFileSync(input);
    return { ok: true, status: null, code: null, error: null, body, source_type: "file_path" };
  }

  let url;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, status: null, code: "INVALID_URL", error: `Invalid URL or file path: ${input}`, body: Buffer.alloc(0), source_type: "invalid" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, status: null, code: "UNSUPPORTED_PROTOCOL", error: `Unsupported protocol: ${url.protocol}`, body: Buffer.alloc(0), source_type: "unsupported" };
  }

  const client = url.protocol === "https:" ? https : http;
  const timeoutMs = Number(process.env.VOID_PULL_TIMEOUT_MS || "10000");

  return await new Promise((resolve) => {
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
          source_type: "http",
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
        source_type: "http",
      });
    });
  });
}

const result = await pull(raw);
const bodyPath = join(dir, "object.txt");
writeFileSync(bodyPath, result.body || Buffer.alloc(0));

const actual = createHash("sha256").update(result.body || Buffer.alloc(0)).digest("hex");
const match = result.ok && actual === expected;

const receipt = {
  marker: match ? "VOID_DATANET_FIELD_OBJECT_PULL_V1_GREEN" : "VOID_DATANET_FIELD_OBJECT_PULL_V1_FAIL",
  created_at: new Date().toISOString(),
  host: hostname(),
  network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
  source: raw,
  source_type: result.source_type,
  ok: result.ok,
  status: result.status,
  code: result.code,
  error: result.error,
  expected_sha256: expected,
  actual_sha256: actual,
  match,
  bytes: result.body?.length || 0,
  object_path: bodyPath,
  dangerous_paths_touched: false
};

const receiptPath = join(dir, "receipt.json");
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

console.log(receipt.marker);
console.log(`source=${raw}`);
console.log(`ok=${receipt.ok}`);
console.log(`status=${receipt.status}`);
console.log(`code=${receipt.code}`);
console.log(`bytes=${receipt.bytes}`);
console.log(`expected_sha256=${expected}`);
console.log(`actual_sha256=${actual}`);
console.log(`match=${match}`);
console.log(`receipt=${receiptPath}`);

process.exit(match ? 0 : 1);
