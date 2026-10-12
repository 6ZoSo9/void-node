#!/usr/bin/env node
// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import process from "node:process";

const DOMAIN = "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2";
const OFFICIAL_NETWORK_NAME = "VOID Mainnet-0";
const LEGACY_GENESIS_NETWORK_NAME = "VOID-DEV";
const SUPERSEDED_PAYLOAD_SHA256 =
  "b624f7bb029e5b3eca8b2e14050711d4f764d2d39bba56455f1f94697de2708e";

const SEALED_HISTORY = {
  v1: {
    merge_commit: "48c8413d6dc6f737532e71dc86d80dca91d1eec7",
    checkpoint_tag:
      "ckpt-official-network-authenticity-wall-v1-post-merge-exact-green-20260724T211149Z",
    checkpoint_commit: "48c8413d6dc6f737532e71dc86d80dca91d1eec7",
  },
  v2: {
    merge_commit: "628772440e5ea8ab2a504909e40e445a1432c17c",
    checkpoint_tag:
      "ckpt-official-network-authenticity-root-v2-post-merge-exact-green-20260724T212919Z",
    checkpoint_commit: "628772440e5ea8ab2a504909e40e445a1432c17c",
  },
};

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};
const canonicalBytes = (value) =>
  Buffer.from(`${JSON.stringify(canonicalize(value))}\n`, "utf8");
const prettyBytes = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const outputArg = getArg("--output");
const sourceCheckpointTag = getArg("--source-checkpoint-tag");
const sourceCheckpointCommit = getArg("--source-checkpoint-commit");

if (!outputArg || !sourceCheckpointTag || !sourceCheckpointCommit) {
  console.error(
    "HOLD: required: --output <new-directory-outside-repository> " +
      "--source-checkpoint-tag <tag> --source-checkpoint-commit <40-hex-commit>",
  );
  process.exit(1);
}
if (!/^[0-9a-f]{40}$/.test(sourceCheckpointCommit)) {
  console.error("HOLD: source checkpoint commit must be exactly 40 lowercase hex characters");
  process.exit(1);
}
if (
  !sourceCheckpointTag.startsWith(
    "ckpt-official-network-identity-mainnet0-correction-v2-1-post-merge-exact-green-",
  )
) {
  console.error("HOLD: source checkpoint tag is not a V2.1 correction checkpoint");
  process.exit(1);
}

const root = resolve(process.cwd());
const output = resolve(outputArg);
const rel = relative(root, output);
if (
  rel === "" ||
  (!rel.startsWith("..") &&
    !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`))
) {
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
const preparationToolBytes = await readFile(new URL(import.meta.url));

const holds = [];
if (manifest.schema !== "void.official-network-identity.v1") {
  holds.push("unexpected V1 identity schema");
}
if (manifest.identity_revision !== "v2.1") {
  holds.push("identity revision is not v2.1");
}
if (manifest.status !== "draft_unsealed") {
  holds.push("V1 identity must remain draft_unsealed before the ceremony");
}
if (
  manifest.authority?.key_id !== null ||
  manifest.authority?.public_key_pem !== null ||
  manifest.authority?.signature_base64 !== null
) {
  holds.push("V1 identity already contains authority material");
}
if (manifest.canonical?.chain_id !== genesis.chainId) {
  holds.push("chain ID conflicts with genesis");
}
if (manifest.canonical?.network_name !== OFFICIAL_NETWORK_NAME) {
  holds.push("official public network name is not VOID Mainnet-0");
}
if (
  manifest.canonical?.genesis_network_name !== LEGACY_GENESIS_NETWORK_NAME ||
  manifest.canonical?.genesis_network_name !== genesis.networkName
) {
  holds.push("legacy genesis network name is not preserved exactly");
}
if (manifest.canonical?.genesis_sha256 !== sha256(genesisBytes)) {
  holds.push("genesis SHA-256 conflicts with V1 identity");
}
if (
  manifest.forensic_fingerprint_registry?.canonical_sha256 !==
  sha256(canonicalBytes(registry))
) {
  holds.push("forensic fingerprint registry conflicts with V1 identity");
}
if (
  manifest.supersession?.superseded_payload_sha256 !==
    SUPERSEDED_PAYLOAD_SHA256 ||
  manifest.supersession?.disposition !== "do_not_sign_or_transfer"
) {
  holds.push("superseded payload hold is not recorded exactly");
}
if (
  policy.signature_domain !== DOMAIN ||
  policy.algorithm !== "ed25519" ||
  policy.ceremony?.offline_host_required !== true
) {
  holds.push("V2 root policy is invalid");
}
if (holds.length > 0) {
  holds.forEach((hold) => console.error(`HOLD: ${hold}`));
  process.exit(1);
}

const preparationToolSha256 = sha256(preparationToolBytes);
const payload = {
  schema: "void.official-network-authenticity-root-signing-payload.v2.1",
  marker: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_SIGNING_PAYLOAD_V2_1",
  signature_domain: DOMAIN,
  algorithm: "ed25519",
  project: manifest.project,
  repository: manifest.repository,
  official_network_identity: {
    chain_id: manifest.canonical.chain_id,
    network_name: manifest.canonical.network_name,
    genesis_network_name: manifest.canonical.genesis_network_name,
    genesis_file: manifest.canonical.genesis_file,
    genesis_sha256: manifest.canonical.genesis_sha256,
  },
  identity_manifest_canonical_sha256: sha256(canonicalBytes(manifest)),
  identity_source_base_commit: manifest.source_base_commit,
  identity_revision: manifest.identity_revision,
  forensic_fingerprint_registry: manifest.forensic_fingerprint_registry,
  policy_canonical_sha256: sha256(canonicalBytes(policy)),
  sealed_history: SEALED_HISTORY,
  correction_checkpoint: {
    tag: sourceCheckpointTag,
    commit: sourceCheckpointCommit,
  },
  preparation_tool: {
    path: "scripts/prepare_official_network_authenticity_root_v2.mjs",
    sha256: preparationToolSha256,
  },
  supersedes_payload_sha256: SUPERSEDED_PAYLOAD_SHA256,
};

const payloadBytes = canonicalBytes(payload);
const payloadSha256 = sha256(payloadBytes);
const receipt = {
  schema: "void.official-network-authenticity-root-preparation-receipt.v2.1",
  marker: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_PREPARATION_RECEIPT_V2_1",
  payload_file: "official-network-authenticity-root-v2-payload.json",
  payload_sha256: payloadSha256,
  correction_checkpoint: payload.correction_checkpoint,
  sealed_history: SEALED_HISTORY,
  preparation_tool_sha256: preparationToolSha256,
  supersedes_payload_sha256: SUPERSEDED_PAYLOAD_SHA256,
  network_access: "none",
  key_generation: "none",
  signing: "none",
  private_key_access: "none",
  publication: "none",
};
const receiptBytes = prettyBytes(receipt);

await mkdir(dirname(output), { recursive: true });
await mkdir(output, { recursive: false });
await writeFile(
  resolve(output, "official-network-authenticity-root-v2-payload.json"),
  payloadBytes,
  { mode: 0o644 },
);
await writeFile(
  resolve(
    output,
    "official-network-authenticity-root-v2-preparation-receipt.json",
  ),
  receiptBytes,
  { mode: 0o644 },
);
await writeFile(
  resolve(output, "SHA256SUMS.txt"),
  [
    `${payloadSha256}  official-network-authenticity-root-v2-payload.json`,
    `${sha256(receiptBytes)}  official-network-authenticity-root-v2-preparation-receipt.json`,
    "",
  ].join("\n"),
  { mode: 0o644 },
);

console.log("GREEN: corrected public V2.1 signing payload prepared");
console.log(`output=${output}`);
console.log(`payload_sha256=${payloadSha256}`);
console.log(`preparation_tool_sha256=${preparationToolSha256}`);
console.log(`source_checkpoint_tag=${sourceCheckpointTag}`);
console.log(`source_checkpoint_commit=${sourceCheckpointCommit}`);
console.log(`supersedes_payload_sha256=${SUPERSEDED_PAYLOAD_SHA256}`);
console.log("key_generation=none");
console.log("signing=none");
console.log("publication=none");
