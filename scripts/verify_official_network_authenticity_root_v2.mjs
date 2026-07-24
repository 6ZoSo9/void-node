#!/usr/bin/env node
// SPDX-License-Identifier: VCL-1.0
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
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
const rootArg = arg("--root");
if (!payloadArg || !rootArg) {
  console.error("HOLD: required: --payload <payload.json> --root <root.json>");
  process.exit(1);
}

const payload = JSON.parse(await readFile(resolve(payloadArg), "utf8"));
const rootRecord = JSON.parse(await readFile(resolve(rootArg), "utf8"));
const payloadBytes = canonicalBytes(payload);
const publicKey = createPublicKey(rootRecord.public_key_pem);
const publicDer = publicKey.export({ format: "der", type: "spki" });
const expectedKeyId = `ed25519:${sha256(publicDer)}`;

const failures = [];
if (
  payload.schema !==
    "void.official-network-authenticity-root-signing-payload.v2.1"
) failures.push("payload schema");
if (
  payload.marker !==
    "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_SIGNING_PAYLOAD_V2_1"
) failures.push("payload marker");
if (
  payload.supersedes_payload_sha256 !==
    "b624f7bb029e5b3eca8b2e14050711d4f764d2d39bba56455f1f94697de2708e"
) failures.push("payload supersession");
if (rootRecord.schema !== "void.official-network-authenticity-root.v2") failures.push("schema");
if (rootRecord.marker !== "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2") failures.push("marker");
if (rootRecord.signature_domain !== "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2") failures.push("domain");
if (rootRecord.algorithm !== "ed25519") failures.push("algorithm");
if (rootRecord.key_id !== expectedKeyId) failures.push("key ID");
if (rootRecord.payload_sha256 !== sha256(payloadBytes)) failures.push("payload SHA-256");
if (
  !verify(
    null,
    payloadBytes,
    publicKey,
    Buffer.from(rootRecord.signature_base64, "base64"),
  )
) failures.push("signature");
if (rootRecord.status !== "ceremony_complete_unpublished") failures.push("status");

if (failures.length) {
  failures.forEach((failure) => console.error(`HOLD: ${failure} verification failed`));
  process.exit(1);
}

console.log("GREEN: V2 authenticity root verifies");
console.log(`key_id=${rootRecord.key_id}`);
console.log(`payload_sha256=${rootRecord.payload_sha256}`);
console.log("publication=none");
