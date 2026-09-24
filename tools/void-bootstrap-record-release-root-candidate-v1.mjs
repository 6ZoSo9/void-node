#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
  VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
  validateVoidBootstrapRecordReleaseRootV1,
  voidBootstrapRecordReleaseKeyIdV1,
  voidBootstrapRecordReleaseRootIdV1,
} from "../scripts/lib/void_bootstrap_record_release_root_v1.mjs";
import {
  VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1,
} from "../scripts/lib/void_p2p_udp_swarm_verified_discovery_composition_v1.mjs";

export const MARKER = "VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_CANDIDATE_V1";

function usage(message = null) {
  if (message) process.stderr.write(`${message}\n`);
  process.stderr.write(
    "usage: node tools/void-bootstrap-record-release-root-candidate-v1.mjs " +
      "--threshold <n> --spki-base64 <ed25519-spki> [--spki-base64 <...>] --output <path>\n",
  );
  process.exit(message ? 2 : 0);
}

function canonicalSpkiBase64(raw, label) {
  const value = String(raw || "");
  if (!value || value.length > 4096 || /\s/.test(value)) {
    throw new Error(`${label} must be canonical base64`);
  }
  const der = Buffer.from(value, "base64");
  if (der.length === 0 || der.toString("base64") !== value) {
    throw new Error(`${label} must be canonical base64`);
  }
  let publicKey;
  try {
    publicKey = crypto.createPublicKey({ key: der, format: "der", type: "spki" });
  } catch (error) {
    throw new Error(`${label} is not a valid SPKI public key: ${error.message}`);
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error(`${label} must be Ed25519`);
  }
  const canonicalDer = publicKey.export({ type: "spki", format: "der" });
  if (!Buffer.from(canonicalDer).equals(der)) {
    throw new Error(`${label} is not canonical DER`);
  }
  return Buffer.from(der);
}

export function buildVoidBootstrapRecordReleaseRootCandidateV1({
  threshold,
  publicKeySpkiBase64,
}) {
  if (!Number.isSafeInteger(threshold) || threshold < 1) {
    throw new Error("threshold must be a positive integer");
  }
  if (
    !Array.isArray(publicKeySpkiBase64) ||
    publicKeySpkiBase64.length < 1 ||
    publicKeySpkiBase64.length > 8
  ) {
    throw new Error("between 1 and 8 public keys are required");
  }

  const entries = publicKeySpkiBase64.map((raw, index) => {
    const der = canonicalSpkiBase64(raw, `public key ${index + 1}`);
    return Object.freeze({
      key_id: voidBootstrapRecordReleaseKeyIdV1(der),
      algorithm: "ed25519",
      public_key_spki_base64: der.toString("base64"),
    });
  });
  entries.sort((a, b) => a.key_id.localeCompare(b.key_id));

  const keyIds = entries.map((entry) => entry.key_id);
  if (new Set(keyIds).size !== keyIds.length) {
    throw new Error("duplicate public keys are not allowed");
  }
  if (threshold > entries.length) {
    throw new Error("threshold cannot exceed public-key count");
  }

  const root = {
    schema: VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
    network: "VOID Network",
    chain_id: 2050,
    status: "active",
    signature_domain: VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
    threshold,
    keys: entries,
    authority: VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1,
    root_id: "",
  };
  root.root_id = voidBootstrapRecordReleaseRootIdV1(root);
  validateVoidBootstrapRecordReleaseRootV1(root, { allowHold: false });
  return Object.freeze(structuredClone(root));
}

function parseArgs(argv) {
  let threshold = null;
  let output = null;
  const publicKeySpkiBase64 = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage();
    if (arg === "--threshold") {
      if (i + 1 >= argv.length) usage("missing --threshold value");
      threshold = Number(argv[++i]);
      continue;
    }
    if (arg === "--spki-base64") {
      if (i + 1 >= argv.length) usage("missing --spki-base64 value");
      publicKeySpkiBase64.push(argv[++i]);
      continue;
    }
    if (arg === "--output") {
      if (i + 1 >= argv.length) usage("missing --output value");
      output = argv[++i];
      continue;
    }
    usage(`unknown argument: ${arg}`);
  }
  if (!Number.isSafeInteger(threshold)) usage("--threshold is required");
  if (publicKeySpkiBase64.length === 0) usage("at least one --spki-base64 is required");
  if (!output) usage("--output is required");
  return { threshold, publicKeySpkiBase64, output };
}

function writeExclusiveJson(rawPath, value) {
  const target = path.resolve(String(rawPath || ""));
  const parent = path.dirname(target);
  const parentStatus = fs.lstatSync(parent);
  if (parentStatus.isSymbolicLink() || !parentStatus.isDirectory()) {
    throw new Error("output parent must be a regular directory");
  }
  if (fs.realpathSync(parent) !== parent) {
    throw new Error("output parent path must already be canonical");
  }
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o644,
  });
  return target;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const root = buildVoidBootstrapRecordReleaseRootCandidateV1(args);
    const output = writeExclusiveJson(args.output, root);
    console.log(MARKER);
    console.log(`root_id=${root.root_id}`);
    console.log(`threshold=${root.threshold}`);
    console.log(`key_count=${root.keys.length}`);
    console.log(`output=${output}`);
    console.log("private_key_argument_supported=false");
    console.log("private_key_file_read=false");
    console.log("signature_generated=false");
    console.log("publication_performed=false");
    console.log("runtime_activation_performed=false");
    console.log("network_calls_performed=false");
  } catch (error) {
    console.error(`REFUSE: ${error.message}`);
    process.exit(1);
  }
}
