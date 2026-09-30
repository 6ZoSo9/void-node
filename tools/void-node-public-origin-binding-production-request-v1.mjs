#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  verifyVoidNodeOnionBindingV1,
} from "./lib/void-node-onion-binding-v1.mjs";
import {
  buildVoidNodePublicOriginBindingSigningRequestV1,
  verifyVoidNodePublicOriginBindingSigningRequestV1,
} from "./void-node-public-origin-binding-signing-request-v1.mjs";

export const VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_REQUEST_V1 =
  "VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_REQUEST_V1";

export const VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_ORIGIN_V1 =
  "https://seed.nullfeed.org";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const NODE_IDENTITY_EVIDENCE = resolve(
  ROOT,
  "public/public-node/evidence/void-node-onion-binding-v1-nimo-verified.json",
);
const MAX_EVIDENCE_BYTES = 128 * 1024;

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalTimestamp(value, label) {
  if (typeof value !== "string") {
    fail(`${label} must be a canonical ISO-8601 timestamp`);
  }
  const parsed = new Date(value);
  if (
    !Number.isFinite(parsed.getTime())
    || parsed.toISOString() !== value
  ) {
    fail(`${label} must be a canonical ISO-8601 timestamp`);
  }
  return value;
}

function readEvidence() {
  const stat = fs.lstatSync(NODE_IDENTITY_EVIDENCE, {
    bigint: true,
  });
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("node identity evidence must be a regular non-symlink file");
  }
  if (
    stat.size < 2n
    || stat.size > BigInt(MAX_EVIDENCE_BYTES)
  ) {
    fail("node identity evidence size is invalid");
  }

  const bytes = fs.readFileSync(NODE_IDENTITY_EVIDENCE);
  const after = fs.lstatSync(NODE_IDENTITY_EVIDENCE, {
    bigint: true,
  });
  if (
    stat.dev !== after.dev
    || stat.ino !== after.ino
    || stat.size !== after.size
    || stat.mtimeNs !== after.mtimeNs
    || stat.ctimeNs !== after.ctimeNs
    || BigInt(bytes.length) !== stat.size
  ) {
    fail("node identity evidence changed during read");
  }

  let value;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    fail("node identity evidence is not valid UTF-8 JSON");
  }

  const verified = verifyVoidNodeOnionBindingV1(value, {
    expectedNodeId: value?.node?.node_id,
    expectedOnionHostname:
      value?.transport?.onion_hostname,
    expectedVirtualPort:
      value?.transport?.virtual_port,
    now: value?.issued_at,
    allowNotYetValidWithinSkew: true,
  });

  return Object.freeze({
    value,
    bytes,
    sha256: sha256(bytes),
    verified,
  });
}

function preflightOutput(file) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
    || path.resolve(file) !== file
  ) {
    fail("output path must be an absolute canonical path");
  }
  const parent = path.dirname(file);
  const realParent = fs.realpathSync.native(parent);
  if (realParent !== parent) {
    fail("output parent must not traverse symlinks or aliases");
  }
  try {
    fs.lstatSync(file);
    fail("refusing to overwrite existing output");
  } catch (error) {
    if (
      error?.message === "refusing to overwrite existing output"
    ) {
      throw error;
    }
    if (error?.code !== "ENOENT") throw error;
  }
  return file;
}

function writeCreateOnlyJson(file, value) {
  const flags =
    fs.constants.O_WRONLY
    | fs.constants.O_CREAT
    | fs.constants.O_EXCL
    | Number(fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(file, flags, 0o644);
  try {
    const bytes = Buffer.from(
      JSON.stringify(value, null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o644);
    return Object.freeze({
      bytes,
      sha256: sha256(bytes),
    });
  } finally {
    fs.closeSync(fd);
  }
}

export function buildVoidNodePublicOriginBindingProductionRequestV1({
  issuedAt,
  expiresAt,
} = {}) {
  const issued = canonicalTimestamp(
    issuedAt,
    "issued_at",
  );
  const expires = canonicalTimestamp(
    expiresAt,
    "expires_at",
  );
  const evidence = readEvidence();
  const nodeId = evidence.verified.summary.node_id;
  const publicKeyPem =
    evidence.value.node.public_key_pem;

  const request =
    buildVoidNodePublicOriginBindingSigningRequestV1({
      origin:
        VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_ORIGIN_V1,
      node_id: nodeId,
      public_key_pem: publicKeyPem,
      issued_at: issued,
      expires_at: expires,
    });
  const verified =
    verifyVoidNodePublicOriginBindingSigningRequestV1(
      request,
    );

  if (
    verified.origin
      !== VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_ORIGIN_V1
    || verified.node_id !== nodeId
    || verified.public_key_fingerprint_sha256
      !== evidence.verified.summary
        .public_key_fingerprint_sha256
  ) {
    fail(
      "production request does not match reviewed node identity evidence",
    );
  }

  return Object.freeze({
    request,
    summary: Object.freeze({
      marker:
        VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_REQUEST_V1,
      origin: verified.origin,
      node_id: verified.node_id,
      public_key_fingerprint_sha256:
        verified.public_key_fingerprint_sha256,
      trust_registry_sha256:
        verified.trust_registry_sha256,
      request_id: verified.request_id,
      payload_sha256: verified.payload_sha256,
      issued_at: issued,
      expires_at: expires,
      node_identity_evidence_sha256: evidence.sha256,
      private_key_access: false,
      wallet_or_signer_access: false,
      signature_created: false,
      publication_performed: false,
      route_activation_performed: false,
      runtime_mutation_performed: false,
      work_credit_mutation: false,
      funds_movement: false,
    }),
  });
}

export function writeVoidNodePublicOriginBindingProductionRequestV1({
  issuedAt,
  expiresAt,
  outputFile,
} = {}) {
  const output = preflightOutput(outputFile);
  const built =
    buildVoidNodePublicOriginBindingProductionRequestV1({
      issuedAt,
      expiresAt,
    });
  const written = writeCreateOnlyJson(
    output,
    built.request,
  );
  return Object.freeze({
    ...built.summary,
    artifact_sha256: written.sha256,
    output_mode: "0644",
  });
}

function parseArgs(argv) {
  const options = {
    command: argv[0] || "",
    expiresAt: "",
    outputFile: "",
  };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        fail(`missing value for ${argument}`);
      }
      return argv[index];
    };
    if (argument === "--issued-at") {
      fail("production issued_at override is forbidden");
    } else if (argument === "--expires-at") {
      options.expiresAt = next();
    } else if (argument === "--output") {
      options.outputFile = next();
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function usage() {
  console.log(
    "usage: node tools/void-node-public-origin-binding-production-request-v1.mjs build "
      + "--expires-at <canonical-iso> "
      + "--output /absolute/request.json",
  );
}

const direct = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (direct) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (
      options.command === "help"
      || options.command === "--help"
      || options.command === "-h"
    ) {
      usage();
    } else if (options.command === "build") {
      if (
        !options.expiresAt
        || !options.outputFile
      ) {
        fail(
          "build requires --expires-at and --output",
        );
      }
      const issuedAt = new Date().toISOString();
      const result =
        writeVoidNodePublicOriginBindingProductionRequestV1({
          issuedAt,
          expiresAt: options.expiresAt,
          outputFile: options.outputFile,
        });
      console.log(
        VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_REQUEST_V1,
      );
      for (const [key, value] of Object.entries(result)) {
        console.log(`${key}=${value}`);
      }
    } else {
      usage();
      fail("unknown command");
    }
  } catch (error) {
    console.error(
      "VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_REQUEST_V1_HOLD",
    );
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
}
