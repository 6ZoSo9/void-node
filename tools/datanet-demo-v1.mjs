#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = join(".void-field-trial", "datanet-demo", stamp);
mkdirSync(dir, { recursive: true });

const body = [
  "VOID DataNet field demo object",
  `created_at=${new Date().toISOString()}`,
  `host=${hostname()}`,
  "purpose=store-read-hash-verify-local-field-test",
].join("\n") + "\n";

const objectPath = join(dir, "object.txt");
writeFileSync(objectPath, body);

const bytes = readFileSync(objectPath);
const hash = createHash("sha256").update(bytes).digest("hex");
const objectId = `sha256:${hash}`;

const verifyHash = createHash("sha256").update(readFileSync(objectPath)).digest("hex");
const verified = verifyHash === hash;

const receipt = {
  marker: "VOID_DATANET_DEMO_V1_GREEN",
  created_at: new Date().toISOString(),
  host: hostname(),
  object_id: objectId,
  sha256: hash,
  bytes: bytes.length,
  object_path: objectPath,
  verified,
  dangerous_paths_touched: false,
};

const receiptPath = join(dir, "receipt.json");
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

if (!verified) {
  console.error("VOID_DATANET_DEMO_V1_FAIL");
  process.exit(1);
}

console.log("VOID_DATANET_DEMO_V1_GREEN");
console.log(`object_id=${objectId}`);
console.log(`sha256=${hash}`);
console.log(`object_path=${objectPath}`);
console.log(`receipt=${receiptPath}`);
