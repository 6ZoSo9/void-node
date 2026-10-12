#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

const createdAt = new Date().toISOString();
const stamp = createdAt.replace(/[:.]/g, "-");

const body = [
  "VOID DataNet field object v1",
  `created_at=${createdAt}`,
  `host=${hostname()}`,
  "purpose=precision-to-field-node-object-exchange",
  "dangerous_paths_touched=false",
].join("\n") + "\n";

const bytes = Buffer.from(body);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const objectId = `sha256:${sha256}`;
const dirId = `sha256-${sha256}`;
const root = join("public", "public-node", "datanet", "field-objects");
const dir = join(root, dirId);

mkdirSync(dir, { recursive: true });

const objectPath = join(dir, "object.txt");
const receiptPath = join(dir, "receipt.json");
const latestPath = join(root, "latest.json");

writeFileSync(objectPath, body);

const verifyHash = createHash("sha256").update(readFileSync(objectPath)).digest("hex");
if (verifyHash !== sha256) {
  console.error("VOID_DATANET_FIELD_OBJECT_CREATE_V1_FAIL");
  process.exit(1);
}

const publicPath = `/public-node/datanet/field-objects/${dirId}/object.txt`;
const receiptPublicPath = `/public-node/datanet/field-objects/${dirId}/receipt.json`;

const base = (process.env.VOID_FIELD_BASE_URL || "").replace(/\/+$/, "");
const url = base ? `${base}${publicPath}` : "";

const receipt = {
  marker: "VOID_DATANET_FIELD_OBJECT_CREATE_V1_GREEN",
  created_at: createdAt,
  host: hostname(),
  object_id: objectId,
  dir_id: dirId,
  sha256,
  bytes: bytes.length,
  object_path: objectPath,
  receipt_path: receiptPath,
  public_path: publicPath,
  receipt_public_path: receiptPublicPath,
  url,
  verified_locally: true,
  dangerous_paths_touched: false
};

writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
writeFileSync(latestPath, JSON.stringify(receipt, null, 2) + "\n");

console.log("VOID_DATANET_FIELD_OBJECT_CREATE_V1_GREEN");
console.log(`object_id=${objectId}`);
console.log(`sha256=${sha256}`);
console.log(`object_path=${objectPath}`);
console.log(`receipt=${receiptPath}`);
console.log(`public_path=${publicPath}`);
console.log(`url=${url || "(set VOID_FIELD_BASE_URL to print full URL)"}`);
