#!/usr/bin/env node
// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(process.cwd());
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

const manifest = JSON.parse(
  await readFile(resolve(root, "config/official-network-identity-v1.json"), "utf8"),
);
const schema = JSON.parse(
  await readFile(
    resolve(root, "schemas/official-network-identity-v1.schema.json"),
    "utf8",
  ),
);
const genesisBytes = await readFile(resolve(root, "genesis.json"));
const genesis = JSON.parse(genesisBytes.toString("utf8"));
const v1Verifier = await readFile(
  resolve(root, "src/security/official_network_identity_v1.ts"),
  "utf8",
);
const prepare = await readFile(
  resolve(root, "scripts/prepare_official_network_authenticity_root_v2.mjs"),
  "utf8",
);
const signer = await readFile(
  resolve(root, "scripts/offline_sign_official_network_authenticity_root_v2.mjs"),
  "utf8",
);
const verifier = await readFile(
  resolve(root, "scripts/verify_official_network_authenticity_root_v2.mjs"),
  "utf8",
);

const checks = [
  [manifest.identity_revision === "v2.1", "manifest revision is v2.1"],
  [manifest.status === "draft_unsealed", "manifest remains draft_unsealed"],
  [manifest.canonical.chain_id === 2050, "chain ID remains 2050"],
  [
    manifest.canonical.network_name === "VOID Mainnet-0",
    "official public network name is corrected",
  ],
  [
    manifest.canonical.genesis_network_name === genesis.networkName,
    "legacy genesis label matches exact genesis",
  ],
  [
    genesis.networkName === "VOID-DEV",
    "legacy genesis label remains immutable",
  ],
  [
    manifest.canonical.genesis_sha256 === sha256(genesisBytes),
    "genesis SHA-256 remains exact",
  ],
  [
    manifest.supersession.superseded_payload_sha256 ===
      "b624f7bb029e5b3eca8b2e14050711d4f764d2d39bba56455f1f94697de2708e",
    "incorrect payload hash is superseded",
  ],
  [
    manifest.supersession.disposition === "do_not_sign_or_transfer",
    "incorrect payload remains held",
  ],
  [
    schema.properties.identity_revision.const === "v2.1",
    "schema fixes identity revision",
  ],
  [
    schema.properties.canonical.properties.network_name.const ===
      "VOID Mainnet-0",
    "schema fixes official network name",
  ],
  [
    schema.properties.canonical.properties.genesis_network_name.const ===
      "VOID-DEV",
    "schema fixes legacy genesis label",
  ],
  [
    v1Verifier.includes("manifest.canonical.genesis_network_name"),
    "V1 verifier compares genesis against legacy genesis label",
  ],
  [
    prepare.includes("correction_checkpoint"),
    "replacement payload binds to correction checkpoint",
  ],
  [
    prepare.includes("preparation_tool"),
    "replacement payload binds to preparation tool",
  ],
  [
    signer.includes(
      'payload.schema !== "void.official-network-authenticity-root-signing-payload.v2.1"',
    ),
    "offline signer rejects the old V2 payload schema",
  ],
  [
    verifier.includes("payload supersession"),
    "verifier checks the superseded payload binding",
  ],
  [
    manifest.authority.key_id === null &&
      manifest.authority.public_key_pem === null &&
      manifest.authority.signature_base64 === null,
    "no signing identity is fabricated",
  ],
];

let failed = 0;
for (const [ok, label] of checks) {
  if (ok) console.log(`PASS: ${label}`);
  else {
    failed += 1;
    console.error(`FAIL: ${label}`);
  }
}
if (failed) {
  console.error(`HOLD: ${failed} identity-correction check(s) failed`);
  process.exit(1);
}
console.log(
  `GREEN: VOID_OFFICIAL_NETWORK_IDENTITY_MAINNET0_CORRECTION_V2_1 (${checks.length} checks)`,
);
