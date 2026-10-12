#!/usr/bin/env node
// SPDX-License-Identifier: VCL-1.0
import {
  createHash,
  generateKeyPairSync,
  sign,
  verify,
} from "node:crypto";
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import process from "node:process";

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};
const canonicalBytes = (value) =>
  Buffer.from(`${JSON.stringify(canonicalize(value))}\n`, "utf8");
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const args = process.argv.slice(2);
const arg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const payloadArg = arg("--payload");
const ceremonyArg = arg("--ceremony-dir");
if (!payloadArg || !ceremonyArg) {
  console.error("HOLD: required: --payload <payload.json> --ceremony-dir <new-directory>");
  process.exit(1);
}

const cwd = resolve(process.cwd());
const ceremonyDir = resolve(ceremonyArg);
const rel = relative(cwd, ceremonyDir);
if (rel === "" || (!rel.startsWith("..") && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`))) {
  console.error("HOLD: ceremony directory must be outside the script directory");
  process.exit(1);
}
try {
  await stat(ceremonyDir);
  console.error("HOLD: ceremony directory already exists; use a new path");
  process.exit(1);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const payload = JSON.parse(await readFile(resolve(payloadArg), "utf8"));
if (
  payload.schema !== "void.official-network-authenticity-root-signing-payload.v2.1" ||
  payload.marker !== "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_SIGNING_PAYLOAD_V2_1" ||
  payload.signature_domain !== "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2" ||
  payload.algorithm !== "ed25519"
) {
  console.error("HOLD: invalid or superseded signing payload; V2.1 is required");
  process.exit(1);
}

const payloadBytes = canonicalBytes(payload);
const payloadSha256 = sha256(payloadBytes);

await mkdir(ceremonyDir, { mode: 0o700 });
const privateDir = resolve(ceremonyDir, "private");
const publicDir = resolve(ceremonyDir, "public");
await mkdir(privateDir, { mode: 0o700 });
await mkdir(publicDir, { mode: 0o755 });

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privatePem = privateKey.export({ format: "pem", type: "pkcs8" });
const publicPem = publicKey.export({ format: "pem", type: "spki" });
const publicDer = publicKey.export({ format: "der", type: "spki" });
const keyId = `ed25519:${sha256(publicDer)}`;
const signature = sign(null, payloadBytes, privateKey);

if (!verify(null, payloadBytes, publicKey, signature)) {
  console.error("HOLD: generated signature failed self-verification");
  process.exit(1);
}

const rootRecord = {
  schema: "void.official-network-authenticity-root.v2",
  marker: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2",
  signature_domain: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2",
  algorithm: "ed25519",
  key_id: keyId,
  public_key_pem: publicPem.toString(),
  payload_sha256: payloadSha256,
  signature_base64: signature.toString("base64"),
  status: "ceremony_complete_unpublished",
};
const rootBytes = Buffer.from(`${JSON.stringify(rootRecord, null, 2)}\n`, "utf8");

const privatePath = resolve(
  privateDir,
  "official-network-authenticity-root-v2-private.pem",
);
await writeFile(privatePath, privatePem, { mode: 0o600 });
await chmod(privatePath, 0o600);
await writeFile(
  resolve(publicDir, "official-network-authenticity-root-v2-public.pem"),
  publicPem,
  { mode: 0o644 },
);
await writeFile(
  resolve(publicDir, "official-network-authenticity-root-v2.json"),
  rootBytes,
  { mode: 0o644 },
);
await writeFile(
  resolve(publicDir, "SHA256SUMS.txt"),
  [
    `${sha256(Buffer.from(publicPem))}  official-network-authenticity-root-v2-public.pem`,
    `${sha256(rootBytes)}  official-network-authenticity-root-v2.json`,
    "",
  ].join("\n"),
  { mode: 0o644 },
);

console.log("GREEN: offline V2 authenticity-root ceremony completed");
console.log(`key_id=${keyId}`);
console.log(`payload_sha256=${payloadSha256}`);
console.log(`private_key_path=${privatePath}`);
console.log(`public_export_directory=${publicDir}`);
console.log("TRANSFER_ONLY=public/");
console.log("publication=none");
