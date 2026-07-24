#!/usr/bin/env node
// SPDX-License-Identifier: VCL-1.0
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const paths = [
  ".github/workflows/official-network-authenticity-root-v2.yml",
  "config/official-network-authenticity-root-v2-policy.json",
  "docs/legal/OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2.md",
  "scripts/offline_sign_official_network_authenticity_root_v2.mjs",
  "scripts/prepare_official_network_authenticity_root_v2.mjs",
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
const docs = content["docs/legal/OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2.md"];
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
  [Object.values(policy.authority).every((v) => v === "none"), "no control authority"],
  [docs.includes("Only the public directory may return to an online host."), "offline separation documented"],
  [docs.includes("does not create authority over third-party machines"), "third-party control excluded"],
  [prepare.includes("output directory must be outside the repository"), "prepare output outside repo"],
  [signer.includes("ceremony directory already exists; use a new path"), "fresh ceremony directory"],
  [signer.includes("TRANSFER_ONLY=public/"), "public-only transfer marker"],
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
  console.error(`HOLD: ${failed} V2 check(s) failed`);
  process.exit(1);
}
console.log(`GREEN: VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2 (${checks.length} checks)`);
