#!/usr/bin/env node
// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

const outputArg = arg("--output");
if (!outputArg) {
  console.error("HOLD: required: --output <new-directory-outside-repository>");
  process.exit(1);
}

const root = resolve(process.cwd());
const output = resolve(outputArg);
const rel = relative(root, output);
if (rel === "" || (!rel.startsWith("..") && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`))) {
  console.error("HOLD: output directory must be outside the repository");
  process.exit(1);
}

const manifest = JSON.parse(
  await readFile(resolve(root, "config/official-network-identity-v1.json"), "utf8"),
);
const registry = JSON.parse(
  await readFile(
    resolve(root, "config/source-forensic-fingerprint-registry-v1.json"),
    "utf8",
  ),
);
const policy = JSON.parse(
  await readFile(
    resolve(root, "config/official-network-authenticity-root-v2-policy.json"),
    "utf8",
  ),
);
const genesisBytes = await readFile(resolve(root, "genesis.json"));
const genesis = JSON.parse(genesisBytes.toString("utf8"));

const holds = [];
if (manifest.status !== "draft_unsealed") holds.push("V1 identity is not draft_unsealed");
if (manifest.authority?.key_id !== null) holds.push("V1 key_id is already populated");
if (manifest.authority?.public_key_pem !== null) holds.push("V1 public key is already populated");
if (manifest.authority?.signature_base64 !== null) holds.push("V1 signature is already populated");
if (manifest.canonical?.chain_id !== genesis.chainId) holds.push("chain ID mismatch");
if (manifest.canonical?.network_name !== genesis.networkName) holds.push("network name mismatch");
if (manifest.canonical?.genesis_sha256 !== sha256(genesisBytes)) holds.push("genesis hash mismatch");
if (
  manifest.forensic_fingerprint_registry?.canonical_sha256 !==
  sha256(canonicalBytes(registry))
) holds.push("fingerprint registry mismatch");
if (
  policy.algorithm !== "ed25519" ||
  policy.signature_domain !== "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2"
) holds.push("V2 policy mismatch");

if (holds.length) {
  holds.forEach((hold) => console.error(`HOLD: ${hold}`));
  process.exit(1);
}

const payload = {
  schema: "void.official-network-authenticity-root-signing-payload.v2",
  marker: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_SIGNING_PAYLOAD_V2",
  signature_domain: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2",
  algorithm: "ed25519",
  project: manifest.project,
  repository: manifest.repository,
  identity_manifest_canonical_sha256: sha256(canonicalBytes(manifest)),
  identity_source_base_commit: manifest.source_base_commit,
  canonical: manifest.canonical,
  forensic_fingerprint_registry: manifest.forensic_fingerprint_registry,
  policy_canonical_sha256: sha256(canonicalBytes(policy)),
};
const payloadBytes = canonicalBytes(payload);
const payloadSha256 = sha256(payloadBytes);

await mkdir(output, { recursive: false });
await writeFile(
  resolve(output, "official-network-authenticity-root-v2-payload.json"),
  payloadBytes,
  { mode: 0o644 },
);
await writeFile(
  resolve(output, "SHA256SUMS.txt"),
  `${payloadSha256}  official-network-authenticity-root-v2-payload.json\n`,
  { mode: 0o644 },
);

console.log("GREEN: public V2 signing payload prepared");
console.log(`output=${output}`);
console.log(`payload_sha256=${payloadSha256}`);
console.log("key_generation=none");
console.log("signing=none");
console.log("publication=none");
