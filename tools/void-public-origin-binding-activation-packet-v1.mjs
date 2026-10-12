#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  verifyReviewedVoidNodePublicOriginBindingV1,
} from "./lib/void-public-node-identity-trust-v1.mjs";

export const VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1 =
  "VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1";

export const VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_ORIGIN_V1 =
  "https://seed.nullfeed.org";
export const VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_NODE_ID_V1 =
  "9d89483769e469e0473b489dc50dba96";

const MAX_BINDING_BYTES = 128 * 1024;

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalExistingRegularFile(file, label) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
  ) {
    fail(`${label} must be an absolute path`);
  }
  let canonical;
  try {
    canonical = fs.realpathSync.native(file);
  } catch (error) {
    fail(`${label} could not be canonicalized: ${error.message}`);
  }
  if (canonical !== file) {
    fail(`${label} must not traverse symlinks or path aliases`);
  }
  const stat = fs.lstatSync(canonical, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail(`${label} must be a regular non-symlink file`);
  }
  return { canonical, stat };
}

function readBindingFile(file) {
  const checked =
    canonicalExistingRegularFile(
      file,
      "signed binding file",
    );
  if (
    checked.stat.size < 2n
    || checked.stat.size > BigInt(MAX_BINDING_BYTES)
  ) {
    fail("signed binding file size is invalid");
  }
  const fd = fs.openSync(
    checked.canonical,
    fs.constants.O_RDONLY
      | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
      || before.ctimeNs !== after.ctimeNs
      || BigInt(bytes.length) !== before.size
    ) {
      fail("signed binding file changed during read");
    }
    let value;
    try {
      value = JSON.parse(
        new TextDecoder("utf-8", { fatal: true })
          .decode(bytes),
      );
    } catch {
      fail("signed binding file is not valid UTF-8 JSON");
    }
    return Object.freeze({
      file: checked.canonical,
      bytes,
      value,
      artifact_sha256: sha256(bytes),
    });
  } finally {
    fs.closeSync(fd);
  }
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
    fail("output parent must not traverse symlinks or path aliases");
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
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY
      | fs.constants.O_CREAT
      | fs.constants.O_EXCL
      | Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    const bytes = Buffer.from(
      JSON.stringify(value, null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    return Object.freeze({
      bytes,
      sha256: sha256(bytes),
    });
  } finally {
    fs.closeSync(fd);
  }
}

export function buildVoidPublicOriginBindingActivationPacketV1({
  bindingFile,
  nowMs = Date.now(),
  verifyBinding =
    verifyReviewedVoidNodePublicOriginBindingV1,
} = {}) {
  if (typeof verifyBinding !== "function") {
    fail("signed binding verifier is unavailable");
  }
  if (!Number.isFinite(nowMs)) {
    fail("verification time is invalid");
  }

  const loaded = readBindingFile(bindingFile);
  const verified = verifyBinding(loaded.value, {
    expectedOrigin:
      VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_ORIGIN_V1,
    expectedNodeId:
      VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_NODE_ID_V1,
    nowMs,
  });
  if (
    verified?.origin
      !== VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_ORIGIN_V1
    || verified?.node_id
      !== VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_NODE_ID_V1
  ) {
    fail("signed binding verifier returned mismatched production identity");
  }

  return Object.freeze({
    marker: VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1,
    version: 1,
    status: "verified_signed_binding_ready_for_operator_installation",
    binding: Object.freeze({
      file: loaded.file,
      artifact_sha256: loaded.artifact_sha256,
      binding_sha256: verified.binding_sha256,
      origin: verified.origin,
      node_id: verified.node_id,
      public_key_fingerprint_sha256:
        verified.public_key_fingerprint_sha256,
      issued_at: verified.issued_at,
      expires_at: verified.expires_at,
    }),
    environment: Object.freeze({
      VOID_PUBLIC_ORIGIN_BINDING_FILE: loaded.file,
      VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_ORIGIN:
        VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_ORIGIN_V1,
      VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID:
        VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_NODE_ID_V1,
    }),
    authority: Object.freeze({
      source_only_packet: true,
      signed_binding_verified: true,
      systemd_write: false,
      environment_installation: false,
      service_enable: false,
      service_start: false,
      service_restart: false,
      tunnel_mutation: false,
      dns_or_tls_mutation: false,
      private_key_access: false,
      wallet_or_signer_access: false,
      signature_creation: false,
      node_runtime_mutation: false,
      work_credit_mutation: false,
      transaction_submission: false,
      validator_mutation: false,
      funds_movement: false,
    }),
  });
}

export function writeVoidPublicOriginBindingActivationPacketV1({
  bindingFile,
  outputFile,
  nowMs = Date.now(),
  verifyBinding =
    verifyReviewedVoidNodePublicOriginBindingV1,
} = {}) {
  const output = preflightOutput(outputFile);
  const packet =
    buildVoidPublicOriginBindingActivationPacketV1({
      bindingFile,
      nowMs,
      verifyBinding,
    });
  const written = writeCreateOnlyJson(output, packet);
  return Object.freeze({
    packet,
    artifact_sha256: written.sha256,
    output_mode: "0600",
  });
}

function parseArgs(argv) {
  const options = {
    command: argv[0] || "",
    bindingFile: "",
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
    if (argument === "--binding-file") {
      options.bindingFile = next();
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
    "usage: node tools/void-public-origin-binding-activation-packet-v1.mjs build "
      + "--binding-file /absolute/signed-binding.json "
      + "--output /absolute/activation-packet.json",
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
      if (!options.bindingFile || !options.outputFile) {
        fail("build requires --binding-file and --output");
      }
      const result =
        writeVoidPublicOriginBindingActivationPacketV1({
          bindingFile: options.bindingFile,
          outputFile: options.outputFile,
        });
      console.log(
        VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1,
      );
      console.log(
        `origin=${result.packet.binding.origin}`,
      );
      console.log(
        `node_id=${result.packet.binding.node_id}`,
      );
      console.log(
        `binding_sha256=${result.packet.binding.binding_sha256}`,
      );
      console.log(
        `artifact_sha256=${result.artifact_sha256}`,
      );
      console.log("systemd_write=false");
      console.log("environment_installation=false");
      console.log("service_restart=false");
      console.log("private_key_access=false");
      console.log("signature_creation=false");
      console.log("runtime_mutation=false");
    } else {
      usage();
      fail("unknown command");
    }
  } catch (error) {
    console.error(
      "VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1_HOLD",
    );
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
}
