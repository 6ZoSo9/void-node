#!/usr/bin/env node
// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(process.cwd());
const required = [
  ".github/workflows/official-network-authenticity-wall-v1.yml",
  "config/official-network-identity-v1.json",
  "config/source-forensic-fingerprint-registry-v1.json",
  "docs/legal/INFRINGEMENT_EVIDENCE_V1.md",
  "docs/legal/OFFICIAL_NETWORK_AUTHENTICITY_WALL_V1.md",
  "schemas/official-network-identity-v1.schema.json",
  "src/security/official_network_identity_v1.ts",
];

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
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

const fail = (message) => {
  console.error(`HOLD: ${message}`);
  process.exitCode = 1;
};

for (const path of required) {
  try {
    await readFile(resolve(root, path));
  } catch {
    fail(`required file missing: ${path}`);
  }
}
if (process.exitCode) process.exit();

const manifest = JSON.parse(
  await readFile(resolve(root, "config/official-network-identity-v1.json"), "utf8"),
);
const registry = JSON.parse(
  await readFile(
    resolve(root, "config/source-forensic-fingerprint-registry-v1.json"),
    "utf8",
  ),
);
const genesisBytes = await readFile(resolve(root, "genesis.json"));
const genesis = JSON.parse(genesisBytes.toString("utf8"));
const license = await readFile(resolve(root, "LICENSE"), "utf8");
const trademarks = await readFile(
  resolve(root, "docs/legal/TRADEMARKS.md"),
  "utf8",
);
const verifierSource = await readFile(
  resolve(root, "src/security/official_network_identity_v1.ts"),
  "utf8",
);
const wallDoc = await readFile(
  resolve(root, "docs/legal/OFFICIAL_NETWORK_AUTHENTICITY_WALL_V1.md"),
  "utf8",
);
const evidenceDoc = await readFile(
  resolve(root, "docs/legal/INFRINGEMENT_EVIDENCE_V1.md"),
  "utf8",
);

const checks = [
  [manifest.schema === "void.official-network-identity.v1", "manifest schema is exact"],
  [
    manifest.marker === "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WALL_V1",
    "manifest marker is exact",
  ],
  [manifest.status === "draft_unsealed", "V1 remains draft_unsealed"],
  [
    manifest.canonical.chain_id === genesis.chainId,
    "manifest chain ID matches genesis",
  ],
  [
    manifest.identity_revision === "v2.1",
    "identity revision is v2.1",
  ],
  [
    manifest.canonical.network_name === "VOID Mainnet-0",
    "official public network name is VOID Mainnet-0",
  ],
  [
    manifest.canonical.genesis_network_name === genesis.networkName,
    "legacy genesis network name matches genesis",
  ],
  [
    manifest.supersession.superseded_payload_sha256 ===
      "b624f7bb029e5b3eca8b2e14050711d4f764d2d39bba56455f1f94697de2708e",
    "incorrect unsigned payload is superseded",
  ],
  [
    manifest.supersession.disposition === "do_not_sign_or_transfer",
    "superseded payload remains held",
  ],
  [
    manifest.canonical.genesis_sha256 === sha256(genesisBytes),
    "manifest genesis SHA-256 matches exact file bytes",
  ],
  [
    manifest.forensic_fingerprint_registry.canonical_sha256 ===
      sha256(canonicalBytes(registry)),
    "forensic registry canonical SHA-256 matches",
  ],
  [manifest.authority.algorithm === "ed25519", "authority algorithm is Ed25519"],
  [
    manifest.authority.key_id === null &&
      manifest.authority.public_key_pem === null &&
      manifest.authority.signature_base64 === null,
    "no signing identity is fabricated in V1",
  ],
  [
    manifest.official_service_policy.verification_required_before_enablement === true,
    "official services are fail-closed pending verification",
  ],
  [
    Object.values(manifest.safety_boundary).every((value) => value === false),
    "all prohibited control capabilities are false",
  ],
  [
    license.includes("fork the Software into a new or competing network"),
    "current VCL competing-network restriction remains present",
  ],
  [
    trademarks.includes("VOID") &&
      trademarks.includes("Obelisk Wallet") &&
      trademarks.includes("VoidStones"),
    "current trademark notice remains present",
  ],
  [
    wallDoc.includes("does not claim or create authority over computers"),
    "wall documents third-party control boundary",
  ],
  [
    evidenceDoc.includes("must never exploit, disrupt, disable"),
    "evidence workflow is read-only and non-disruptive",
  ],
];

const prohibitedVerifierTokens = [
  'from "node:child_process"',
  'from "node:http"',
  'from "node:https"',
  'from "node:net"',
  'from "node:dgram"',
  "exec(",
  "spawn(",
  "kill(",
  "rmSync(",
  "unlinkSync(",
];
for (const token of prohibitedVerifierTokens) {
  checks.push([
    !verifierSource.includes(token),
    `pure verifier excludes prohibited token ${JSON.stringify(token)}`,
  ]);
}

let failed = 0;
for (const [ok, label] of checks) {
  if (ok) {
    console.log(`PASS: ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${label}`);
  }
}
if (failed > 0) {
  console.error(`HOLD: ${failed} authenticity-wall check(s) failed`);
  process.exit(1);
}
console.log(
  `GREEN: VOID_OFFICIAL_NETWORK_AUTHENTICITY_WALL_V1 (${checks.length} checks)`,
);
