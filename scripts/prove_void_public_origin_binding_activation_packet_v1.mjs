#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  signVoidNodePublicOriginBindingV1,
  verifyVoidNodePublicOriginBindingV1,
} from "../tools/lib/void-node-public-origin-binding-v1.mjs";
import {
  VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_NODE_ID_V1,
  VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_ORIGIN_V1,
  buildVoidPublicOriginBindingActivationPacketV1,
  writeVoidPublicOriginBindingActivationPacketV1,
} from "../tools/void-public-origin-binding-activation-packet-v1.mjs";

const ROOT = process.cwd();
const TOOL = path.join(
  ROOT,
  "tools/void-public-origin-binding-activation-packet-v1.mjs",
);
const work = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-public-origin-binding-activation-packet-v1-",
  ),
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

try {
  const { privateKey, publicKey } =
    generateKeyPairSync("ed25519");
  const fingerprint = sha256(
    publicKey.export({ type: "spki", format: "der" }),
  );
  const nowMs = Date.parse("2026-09-30T12:00:00.000Z");
  const binding = signVoidNodePublicOriginBindingV1({
    privateKey,
    publicKey,
    nodeId:
      VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_NODE_ID_V1,
    origin:
      VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_ORIGIN_V1,
    issuedAt: "2026-09-30T11:59:00.000Z",
    expiresAt: "2026-10-30T12:00:00.000Z",
  });
  const bindingFile = path.join(work, "signed-binding.json");
  fs.writeFileSync(
    bindingFile,
    JSON.stringify(binding, null, 2) + "\n",
    { mode: 0o600 },
  );

  const verifyEphemeral = (value, options) =>
    verifyVoidNodePublicOriginBindingV1(value, {
      ...options,
      expectedPublicKeyFingerprintSha256: fingerprint,
      nowMs,
    });

  const packet =
    buildVoidPublicOriginBindingActivationPacketV1({
      bindingFile,
      nowMs,
      verifyBinding: verifyEphemeral,
    });

  assert.equal(
    packet.marker,
    "VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1",
  );
  assert.equal(
    packet.binding.origin,
    "https://seed.nullfeed.org",
  );
  assert.equal(
    packet.binding.node_id,
    "9d89483769e469e0473b489dc50dba96",
  );
  assert.equal(
    packet.environment.VOID_PUBLIC_ORIGIN_BINDING_FILE,
    bindingFile,
  );
  assert.equal(
    packet.environment
      .VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_ORIGIN,
    "https://seed.nullfeed.org",
  );
  assert.equal(
    packet.environment
      .VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID,
    "9d89483769e469e0473b489dc50dba96",
  );
  for (const key of [
    "systemd_write",
    "environment_installation",
    "service_enable",
    "service_start",
    "service_restart",
    "tunnel_mutation",
    "dns_or_tls_mutation",
    "private_key_access",
    "wallet_or_signer_access",
    "signature_creation",
    "node_runtime_mutation",
    "work_credit_mutation",
    "transaction_submission",
    "validator_mutation",
    "funds_movement",
  ]) {
    assert.equal(packet.authority[key], false);
  }

  const packetFileOne = path.join(work, "packet-one.json");
  const packetFileTwo = path.join(work, "packet-two.json");
  for (const outputFile of [packetFileOne, packetFileTwo]) {
    const written =
      writeVoidPublicOriginBindingActivationPacketV1({
        bindingFile,
        outputFile,
        nowMs,
        verifyBinding: verifyEphemeral,
      });
    assert.equal(written.packet.binding.origin,
      VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_ORIGIN_V1);
    assert.equal(
      fs.statSync(outputFile).mode & 0o777,
      0o600,
    );
  }
  assert.equal(
    fs.readFileSync(packetFileOne, "utf8"),
    fs.readFileSync(packetFileTwo, "utf8"),
  );

  assert.throws(
    () =>
      writeVoidPublicOriginBindingActivationPacketV1({
        bindingFile,
        outputFile: packetFileOne,
        nowMs,
        verifyBinding: verifyEphemeral,
      }),
    /refusing to overwrite existing output/u,
  );

  const tampered = structuredClone(binding);
  tampered.origin.value = "https://attacker.example";
  const tamperedFile = path.join(work, "tampered.json");
  fs.writeFileSync(
    tamperedFile,
    JSON.stringify(tampered, null, 2) + "\n",
    { mode: 0o600 },
  );
  assert.throws(
    () =>
      buildVoidPublicOriginBindingActivationPacketV1({
        bindingFile: tamperedFile,
        nowMs,
        verifyBinding: verifyEphemeral,
      }),
    /binding origin does not match expected origin/u,
  );

  const expired = signVoidNodePublicOriginBindingV1({
    privateKey,
    publicKey,
    nodeId:
      VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_NODE_ID_V1,
    origin:
      VOID_PUBLIC_ORIGIN_BINDING_CANONICAL_ORIGIN_V1,
    issuedAt: "2026-09-28T12:00:00.000Z",
    expiresAt: "2026-09-29T12:00:00.000Z",
  });
  const expiredFile = path.join(work, "expired.json");
  fs.writeFileSync(
    expiredFile,
    JSON.stringify(expired, null, 2) + "\n",
    { mode: 0o600 },
  );
  assert.throws(
    () =>
      buildVoidPublicOriginBindingActivationPacketV1({
        bindingFile: expiredFile,
        nowMs,
        verifyBinding: verifyEphemeral,
      }),
    /binding is expired/u,
  );

  const cliOutput = path.join(work, "cli-packet.json");
  const cli = spawnSync(
    process.execPath,
    [
      TOOL,
      "build",
      "--binding-file", bindingFile,
      "--output", cliOutput,
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.notEqual(
    cli.status,
    0,
    "CLI must not accept an unreviewed ephemeral signing key",
  );
  assert.equal(fs.existsSync(cliOutput), false);

  const arbitraryOrigin = spawnSync(
    process.execPath,
    [
      TOOL,
      "build",
      "--binding-file", bindingFile,
      "--output", path.join(work, "arbitrary.json"),
      "--origin", "https://attacker.example",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.notEqual(arbitraryOrigin.status, 0);
  assert.match(
    arbitraryOrigin.stderr,
    /unknown argument: --origin/u,
  );

  const source = fs.readFileSync(TOOL, "utf8");
  for (const forbidden of [
    "systemctl",
    "daemon-reload",
    "service restart",
    "service enable",
    "--origin",
    "--node-id",
    "--key-file",
    "cryptoSign",
    "loadExistingVoidNodeKeypairV1",
    "process.env",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      `activation packet tool contains forbidden token: ${forbidden}`,
    );
  }

  console.log(
    "VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1_PROOF_GREEN",
  );
  console.log("signed_binding_required=true");
  console.log("canonical_origin_fixed=true");
  console.log("canonical_node_id_fixed=true");
  console.log("environment_values_exact=true");
  console.log("create_only_packet=true");
  console.log("unreviewed_key_cli_rejected=true");
  console.log("expired_binding_rejected=true");
  console.log("systemd_write=false");
  console.log("environment_installation=false");
  console.log("service_restart=false");
  console.log("tunnel_mutation=false");
  console.log("dns_or_tls_mutation=false");
  console.log("private_key_access=false");
  console.log("signature_creation=false");
  console.log("runtime_mutation=false");
  console.log("work_credit_mutation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
