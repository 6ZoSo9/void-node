#!/usr/bin/env node
// SPDX-License-Identifier: VCL-1.0
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const paths = [
  ".github/workflows/official-network-identity-mainnet0-correction-v2-1.yml",
  "config/official-network-authenticity-root-v2-policy.json",
  "config/official-network-identity-v1.json",
  "docs/legal/OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2.md",
  "docs/legal/OFFICIAL_NETWORK_IDENTITY_MAINNET0_CORRECTION_V2_1.md",
  "scripts/offline_sign_official_network_authenticity_root_v2.mjs",
  "scripts/prepare_official_network_authenticity_root_v2.mjs",
  "scripts/prove_official_network_identity_mainnet0_correction_v2_1.mjs",
  "scripts/verify_official_network_authenticity_root_v2.mjs",
  "src/security/official_network_authenticity_root_v2.ts",
];
const content = {};
for (const path of paths) {
  try {
    content[path] = await readFile(resolve(process.cwd(), path), "utf8");
  } catch {
    console.error(`HOLD: missing ${path}`);
    process.exit(1);
  }
}

const policy = JSON.parse(
  content["config/official-network-authenticity-root-v2-policy.json"],
);
const manifest = JSON.parse(
  content["config/official-network-identity-v1.json"],
);
const docs = content["docs/legal/OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2.md"];
const correctionDoc =
  content["docs/legal/OFFICIAL_NETWORK_IDENTITY_MAINNET0_CORRECTION_V2_1.md"];
const prepare =
  content["scripts/prepare_official_network_authenticity_root_v2.mjs"];
const signer =
  content["scripts/offline_sign_official_network_authenticity_root_v2.mjs"];
const verifier =
  content["scripts/verify_official_network_authenticity_root_v2.mjs"];
const ts = content["src/security/official_network_authenticity_root_v2.ts"];

const checks = [
  [policy.schema === "void.official-network-authenticity-root-policy.v2", "policy schema"],
  [policy.algorithm === "ed25519", "Ed25519 policy"],
  [policy.ceremony.offline_host_required === true, "offline host required"],
  [policy.ceremony.fresh_key_required === true, "fresh key required"],
  [policy.ceremony.public_export_only === true, "public export only"],
  [policy.private_key.repository_storage_forbidden === true, "repository key storage forbidden"],
  [policy.private_key.network_transfer_forbidden === true, "private-key transfer forbidden"],
  [Object.values(policy.authority).every((value) => value === "none"), "no control authority"],
  [manifest.identity_revision === "v2.1", "identity revision is v2.1"],
  [
    manifest.canonical.network_name === "VOID Mainnet-0",
    "official public network name is VOID Mainnet-0",
  ],
  [
    manifest.canonical.genesis_network_name === "VOID-DEV",
    "legacy genesis name remains VOID-DEV",
  ],
  [
    manifest.supersession.superseded_payload_sha256 ===
      "b624f7bb029e5b3eca8b2e14050711d4f764d2d39bba56455f1f94697de2708e",
    "incorrect payload is explicitly superseded",
  ],
  [
    manifest.supersession.disposition === "do_not_sign_or_transfer",
    "superseded payload disposition is fail-closed",
  ],
  [docs.includes("Only the public directory may return to an online host."), "offline separation documented"],
  [docs.includes("VOID Mainnet-0"), "official public identity documented"],
  [correctionDoc.includes("VOID-DEV"), "legacy genesis identifier documented"],
  [correctionDoc.includes("b624f7bb029e5b3eca8b2e14050711d4f764d2d39bba56455f1f94697de2708e"), "held payload hash documented"],
  [prepare.includes("--source-checkpoint-tag"), "preparation requires correction checkpoint tag"],
  [prepare.includes("--source-checkpoint-commit"), "preparation requires correction checkpoint commit"],
  [prepare.includes("preparationToolSha256"), "preparation self-hash is included"],
  [prepare.includes("official-network-authenticity-root-v2-preparation-receipt.json"), "preparation receipt is emitted"],
  [prepare.includes("await mkdir(dirname(output), { recursive: true })"), "missing parent directory is handled"],
  [prepare.includes("network_name: manifest.canonical.network_name"), "official network name enters signed payload"],
  [prepare.includes("genesis_network_name: manifest.canonical.genesis_network_name"), "legacy genesis name enters signed payload"],
  [prepare.includes("SEALED_HISTORY"), "V1 and V2 sealed history is included"],
  [prepare.includes("SUPERSEDED_PAYLOAD_SHA256"), "superseded payload hash is included"],
  [signer.includes("TRANSFER_ONLY=public/"), "public-only transfer marker"],
  [
    signer.includes(
      'payload.schema !== "void.official-network-authenticity-root-signing-payload.v2.1"',
    ),
    "offline signer requires corrected V2.1 payload schema",
  ],
  [
    signer.includes(
      'payload.marker !== "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_SIGNING_PAYLOAD_V2_1"',
    ),
    "offline signer requires corrected V2.1 payload marker",
  ],
  [
    verifier.includes("payload supersession"),
    "standalone verifier requires supersession binding",
  ],
  [verifier.includes("V2 authenticity root verifies"), "standalone verifier"],
  [ts.includes("verifyOfficialNetworkAuthenticityRootV2"), "TypeScript verifier"],
];

const sources = [prepare, signer, verifier, ts];
for (const token of [
  'from "node:http"',
  'from "node:https"',
  'from "node:net"',
  'from "node:dgram"',
  'from "node:tls"',
  'from "node:child_process"',
  "fetch(",
  "WebSocket",
]) {
  checks.push([
    sources.every((source) => !source.includes(token)),
    `no ${JSON.stringify(token)}`,
  ]);
}

let failed = 0;
for (const [ok, label] of checks) {
  if (ok) console.log(`PASS: ${label}`);
  else {
    failed += 1;
    console.error(`FAIL: ${label}`);
  }
}
if (failed) {
  console.error(`HOLD: ${failed} V2.1 root check(s) failed`);
  process.exit(1);
}
console.log(
  `GREEN: VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2_1 (${checks.length} checks)`,
);
