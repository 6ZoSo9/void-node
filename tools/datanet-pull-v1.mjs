#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

const raw = process.argv[2];

if (!raw || raw.includes("<") || raw.includes(">")) {
  console.error("Usage: npm run datanet:pull -- http://HOST:PORT/path");
  console.error("Do not paste the placeholder. Replace it with a real Precision/public-node URL.");
  process.exit(2);
}

let url;
try {
  url = new URL(raw);
} catch {
  console.error(`Invalid URL: ${raw}`);
  process.exit(2);
}

if (!["http:", "https:"].includes(url.protocol)) {
  console.error(`Unsupported protocol: ${url.protocol}`);
  process.exit(2);
}

const client = url.protocol === "https:" ? https : http;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = join(".void-field-trial", "datanet-pull", stamp);
mkdirSync(dir, { recursive: true });

const timeoutMs = Number(process.env.VOID_PULL_TIMEOUT_MS || "10000");

const result = await new Promise((resolve) => {
  const req = client.get(url, { timeout: timeoutMs }, (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
      const body = Buffer.concat(chunks);
      resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        headers: res.headers,
        body,
      });
    });
  });

  req.on("timeout", () => {
    req.destroy(new Error(`timeout after ${timeoutMs}ms`));
  });

  req.on("error", (err) => {
    resolve({ ok: false, error: err.message, body: Buffer.alloc(0) });
  });
});

const bodyPath = join(dir, "pulled.bin");
writeFileSync(bodyPath, result.body || Buffer.alloc(0));

const sha256 = createHash("sha256").update(result.body || Buffer.alloc(0)).digest("hex");

const receipt = {
  marker: result.ok ? "VOID_DATANET_PULL_V1_GREEN" : "VOID_DATANET_PULL_V1_FAIL",
  created_at: new Date().toISOString(),
  host: hostname(),
  url: raw,
  ok: result.ok,
  status: result.status || null,
  error: result.error || null,
  bytes: result.body?.length || 0,
  sha256,
  body_path: bodyPath,
  dangerous_paths_touched: false,
};

const receiptPath = join(dir, "receipt.json");
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

console.log(receipt.marker);
console.log(`url=${raw}`);
console.log(`ok=${receipt.ok}`);
console.log(`status=${receipt.status}`);
console.log(`bytes=${receipt.bytes}`);
console.log(`sha256=${sha256}`);
console.log(`receipt=${receiptPath}`);

process.exit(result.ok ? 0 : 1);
