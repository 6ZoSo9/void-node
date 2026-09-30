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
  buildVoidPublicOriginBindingActivationPacketV1,
} from "../tools/void-public-origin-binding-activation-packet-v1.mjs";
import {
  signVoidNodePublicOriginBindingV1,
  verifyVoidNodePublicOriginBindingV1,
} from "../tools/lib/void-node-public-origin-binding-v1.mjs";
import {
  VOID_PUBLIC_ORIGIN_BINDING_SEED_CLEAN_ENVIRONMENT_DROPIN_V1,
  VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1,
  buildVoidPublicOriginBindingSeedServicePlanV1,
  writeVoidPublicOriginBindingSeedServicePlanV1,
} from "../tools/void-public-origin-binding-seed-service-plan-v1.mjs";

const ROOT = process.cwd();
const TOOL = path.join(
  ROOT,
  "tools/void-public-origin-binding-seed-service-plan-v1.mjs",
);
const SEED_GATEWAY = path.join(
  ROOT,
  "tools/void-public-seed-gateway-v1.mjs",
);
const seedGatewaySource = fs.readFileSync(
  SEED_GATEWAY,
  "utf8",
);
const work = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-public-origin-binding-seed-service-plan-v1-",
  ),
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

try {
  for (const marker of [
    'from "../ops/public/void-public-origin-binding-serving-v1.mjs"',
    "configureVoidPublicOriginBindingServingFromEnvV1(process.env)",
    "serveVoidPublicOriginBindingV1(",
  ]) {
    assert.equal(
      seedGatewaySource.includes(marker),
      true,
      `4111 plan target does not consume public-origin binding config: ${marker}`,
    );
  }
  assert.ok(
    seedGatewaySource.indexOf(
      "serveVoidPublicOriginBindingV1(",
    ) < seedGatewaySource.indexOf(
      "requestUrl.pathname === CHECKPOINT_DISCOVERY_ROUTE_V1",
    ),
    "4111 plan target must serve reviewed binding before checkpoint/generic routing",
  );

  const { privateKey, publicKey } =
    generateKeyPairSync("ed25519");
  const fingerprint = sha256(
    publicKey.export({
      type: "spki",
      format: "der",
    }),
  );
  const nowMs =
    Date.parse("2026-09-30T12:00:00.000Z");

  const binding = signVoidNodePublicOriginBindingV1({
    privateKey,
    publicKey,
    nodeId:
      "9d89483769e469e0473b489dc50dba96",
    origin: "https://seed.nullfeed.org",
    issuedAt: "2026-09-30T11:59:00.000Z",
    expiresAt: "2026-10-30T12:00:00.000Z",
  });
  const bindingFile = path.join(
    work,
    "signed-binding.json",
  );
  fs.writeFileSync(
    bindingFile,
    JSON.stringify(binding, null, 2) + "\n",
    { mode: 0o600 },
  );

  const verifyEphemeral = (value, options) =>
    verifyVoidNodePublicOriginBindingV1(value, {
      ...options,
      expectedPublicKeyFingerprintSha256:
        fingerprint,
      nowMs,
    });

  const activationPacket =
    buildVoidPublicOriginBindingActivationPacketV1({
      bindingFile,
      nowMs,
      verifyBinding: verifyEphemeral,
    });

  const activationPacketFile = path.join(
    work,
    "activation-packet.json",
  );
  fs.writeFileSync(
    activationPacketFile,
    JSON.stringify(activationPacket, null, 2) + "\n",
    { mode: 0o600 },
  );

  const cleanDropin = path.join(
    work,
    "90-void-nullfeed-clean-environment.conf",
  );
  fs.writeFileSync(
    cleanDropin,
    [
      "[Service]",
      "UnsetEnvironment=VOID_PUBLIC_SEED_CHECKPOINT_ROOT VOID_PUBLIC_SEED_CHECKPOINT_ID VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256 LEGACY_UNUSED_NAME",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  const rebuildEphemeral = ({
    bindingFile: file,
  }) =>
    buildVoidPublicOriginBindingActivationPacketV1({
      bindingFile: file,
      nowMs,
      verifyBinding: verifyEphemeral,
    });

  const plan =
    buildVoidPublicOriginBindingSeedServicePlanV1({
      activationPacketFile,
      cleanEnvironmentDropin: cleanDropin,
      nowMs,
      rebuildActivationPacket: rebuildEphemeral,
    });

  assert.equal(
    plan.marker,
    "VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_PLAN_V1",
  );
  assert.equal(
    plan.target.unit,
    VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1,
  );
  assert.equal(
    plan.target.unit,
    "void-public-seed-gateway-v1.service",
  );
  assert.equal(
    VOID_PUBLIC_ORIGIN_BINDING_SEED_CLEAN_ENVIRONMENT_DROPIN_V1,
    path.join(
      os.homedir(),
      ".config/systemd/user",
      "void-public-seed-gateway-v1.service.d",
      "90-void-nullfeed-clean-environment.conf",
    ),
  );
  assert.equal(plan.target.bind, "127.0.0.1");
  assert.equal(plan.target.port, 4111);
  assert.equal(
    plan.target.dropin_name,
    "95-void-public-origin-binding-v1.conf",
  );
  assert.equal(
    plan.target.named_tunnel_restart_required,
    false,
  );
  assert.equal(
    plan.clean_environment.binding_variables_unset,
    false,
  );
  assert.equal(
    plan.environment
      .VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_ORIGIN,
    "https://seed.nullfeed.org",
  );
  assert.equal(
    plan.environment
      .VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID,
    "9d89483769e469e0473b489dc50dba96",
  );

  const envLines = plan.dropin.text
    .split("\n")
    .filter((line) => line.startsWith("Environment="));
  assert.equal(envLines.length, 3);
  assert.equal(
    plan.dropin.text.includes("UnsetEnvironment="),
    false,
  );
  assert.match(
    plan.dropin.text,
    /VOID_PUBLIC_ORIGIN_BINDING_FILE=/u,
  );
  assert.match(
    plan.dropin.text,
    /VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_ORIGIN=https:\/\/seed\.nullfeed\.org/u,
  );
  assert.match(
    plan.dropin.text,
    /VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID=9d89483769e469e0473b489dc50dba96/u,
  );

  for (const key of [
    "dropin_write",
    "daemon_reload",
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
    assert.equal(plan.authority[key], false);
  }

  const outputOne = path.join(work, "plan-one.json");
  const outputTwo = path.join(work, "plan-two.json");
  for (const outputFile of [outputOne, outputTwo]) {
    const written =
      writeVoidPublicOriginBindingSeedServicePlanV1({
        activationPacketFile,
        cleanEnvironmentDropin: cleanDropin,
        outputFile,
        nowMs,
        rebuildActivationPacket: rebuildEphemeral,
      });
    assert.equal(
      written.plan.plan_id,
      plan.plan_id,
    );
    assert.equal(
      fs.statSync(outputFile).mode & 0o777,
      0o600,
    );
  }
  assert.equal(
    fs.readFileSync(outputOne, "utf8"),
    fs.readFileSync(outputTwo, "utf8"),
  );

  assert.throws(
    () =>
      writeVoidPublicOriginBindingSeedServicePlanV1({
        activationPacketFile,
        cleanEnvironmentDropin: cleanDropin,
        outputFile: outputOne,
        nowMs,
        rebuildActivationPacket: rebuildEphemeral,
      }),
    /refusing to overwrite existing output/u,
  );

  const conflictingDropin = path.join(
    work,
    "conflicting-clean-environment.conf",
  );
  fs.writeFileSync(
    conflictingDropin,
    [
      "[Service]",
      "UnsetEnvironment=VOID_PUBLIC_ORIGIN_BINDING_FILE OTHER_NAME",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  assert.throws(
    () =>
      buildVoidPublicOriginBindingSeedServicePlanV1({
        activationPacketFile,
        cleanEnvironmentDropin:
          conflictingDropin,
        nowMs,
        rebuildActivationPacket:
          rebuildEphemeral,
      }),
    /unsets required binding variable/u,
  );

  const tampered = structuredClone(activationPacket);
  tampered.environment
    .VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID =
      "a".repeat(32);
  const tamperedPacket = path.join(
    work,
    "tampered-activation-packet.json",
  );
  fs.writeFileSync(
    tamperedPacket,
    JSON.stringify(tampered, null, 2) + "\n",
    { mode: 0o600 },
  );
  assert.throws(
    () =>
      buildVoidPublicOriginBindingSeedServicePlanV1({
        activationPacketFile: tamperedPacket,
        cleanEnvironmentDropin: cleanDropin,
        nowMs,
        rebuildActivationPacket:
          rebuildEphemeral,
      }),
    /differs from fresh signed-binding verification/u,
  );

  const cliHome = path.join(work, "cli-home");
  const cliCleanDropin = path.join(
    cliHome,
    ".config",
    "systemd",
    "user",
    "void-public-seed-gateway-v1.service.d",
    "90-void-nullfeed-clean-environment.conf",
  );
  fs.mkdirSync(path.dirname(cliCleanDropin), {
    recursive: true,
    mode: 0o700,
  });
  fs.writeFileSync(
    cliCleanDropin,
    [
      "[Service]",
      "UnsetEnvironment=VOID_PUBLIC_SEED_CHECKPOINT_ROOT VOID_PUBLIC_SEED_CHECKPOINT_ID VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256 LEGACY_UNUSED_NAME",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  const cliOutput = path.join(
    work,
    "cli-plan.json",
  );
  const cli = spawnSync(
    process.execPath,
    [
      TOOL,
      "build",
      "--activation-packet",
      activationPacketFile,
      "--output",
      cliOutput,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: cliHome,
      },
    },
  );
  assert.notEqual(
    cli.status,
    0,
    "CLI must reject the unreviewed ephemeral signing key",
  );
  assert.match(
    cli.stderr,
    /binding public key does not match independent trust pin/u,
    "CLI failure must come from the reviewed production trust pin",
  );
  assert.doesNotMatch(
    cli.stderr,
    /could not be canonicalized|unknown argument/u,
    "CLI rejection must not be caused by path or argument setup",
  );
  assert.equal(fs.existsSync(cliOutput), false);

  const decoyOverride = spawnSync(
    process.execPath,
    [
      TOOL,
      "build",
      "--activation-packet",
      activationPacketFile,
      "--clean-environment-dropin",
      cleanDropin,
      "--output",
      path.join(work, "decoy-plan.json"),
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.notEqual(decoyOverride.status, 0);
  assert.match(
    decoyOverride.stderr,
    /unknown argument: --clean-environment-dropin/u,
  );
  assert.equal(
    fs.existsSync(path.join(work, "decoy-plan.json")),
    false,
  );

  const source = fs.readFileSync(TOOL, "utf8");
  assert.equal(
    source.includes('"--clean-environment-dropin"'),
    false,
    "production CLI must not accept a clean-environment path override",
  );
  assert.ok(
    source.includes(
      "VOID_PUBLIC_ORIGIN_BINDING_SEED_CLEAN_ENVIRONMENT_DROPIN_V1",
    ),
    "production CLI must use the fixed seed clean-environment path",
  );
  for (const forbidden of [
    "systemctl",
    "daemon-reload",
    "child_process",
    "spawnSync",
    "execSync",
    "process.env",
    "--service",
    "--unit",
    "--port",
    "--origin",
    "--node-id",
    "--key-file",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      `service-plan tool contains forbidden token: ${forbidden}`,
    );
  }

  console.log(
    "VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_PLAN_V1_PROOF_GREEN",
  );
  console.log("activation_packet_freshly_reverified=true");
  console.log("canonical_seed_service_fixed=true");
  console.log("canonical_seed_port=4111");
  console.log("target_seed_gateway_consumes_binding_environment=true");
  console.log("clean_environment_conflict_checked=true");
  console.log("production_clean_environment_path_fixed=true");
  console.log("clean_environment_path_override=false");
  console.log("cli_rejects_unreviewed_key_for_trust_pin=true");
  console.log("binding_unset_conflict_rejected=true");
  console.log("exact_three_environment_lines=true");
  console.log("create_only_plan=true");
  console.log("plan_mode=0600");
  console.log("unreviewed_key_cli_rejected=true");
  console.log("dropin_write=false");
  console.log("daemon_reload=false");
  console.log("service_restart=false");
  console.log("tunnel_mutation=false");
  console.log("dns_or_tls_mutation=false");
  console.log("private_key_access=false");
  console.log("signature_creation=false");
  console.log("runtime_mutation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(work, {
    recursive: true,
    force: true,
  });
}
