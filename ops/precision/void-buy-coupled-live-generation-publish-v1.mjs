#!/usr/bin/env node
import process from "node:process";

import {
  publishBuyLaunchGenerationTransitionV1,
} from "../../src/economic/buy_void_coupled_launch_gate_v1.mjs";

const MARKER =
  "VOID_BUY_COUPLED_LIVE_GENERATION_PUBLISHER_V1";
const REQUIRED_CONFIRMATION =
  "publishBuyLaunchGenerationTransitionV1";

function fail(message) {
  process.stderr.write(`[fail] ${message}\n`);
  process.exitCode = 2;
}

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return "";
  return String(process.argv[index + 1] || "").trim();
}

if (process.argv.includes("--help")) {
  process.stdout.write(
    [
      MARKER,
      "source_and_local_state_only=true",
      "wallet_access=false",
      "private_key_access=false",
      "transaction_construction=false",
      "transaction_signing=false",
      "transaction_broadcast=false",
      "funds_movement=false",
      "",
      "Usage:",
      "  node ops/precision/void-buy-coupled-live-generation-publish-v1.mjs \\",
      "    --state active|revoked \\",
      "    --generation 0x<64hex> \\",
      "    --occurred-at-ms <positive-safe-integer> \\",
      `    --confirm ${REQUIRED_CONFIRMATION}`,
      "",
      "DATA_DIR or VOID_DATA_DIR must identify the live node data directory.",
      "Run only after the reviewed launch/revocation ceremony authorizes the transition.",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

const state = arg("--state");
const generation = arg("--generation");
const occurredRaw = arg("--occurred-at-ms");
const confirmation = arg("--confirm");
const occurredAtMs = Number(occurredRaw);

if (
  !["active", "revoked"].includes(state) ||
  !/^0x[0-9a-fA-F]{64}$/u.test(generation) ||
  !Number.isSafeInteger(occurredAtMs) ||
  occurredAtMs <= 0 ||
  confirmation !== REQUIRED_CONFIRMATION
) {
  fail("invalid_arguments");
} else {
  try {
    const result = await publishBuyLaunchGenerationTransitionV1(
      {
        state,
        generation,
        occurred_at_ms: occurredAtMs,
        confirmation,
      },
      process.env,
    );
    process.stdout.write(
      [
        MARKER,
        "ok=true",
        `state=${result.state}`,
        `generation=${result.generation}`,
        `sequence=${result.sequence}`,
        `tip_sha256=${result.tip_sha256}`,
        `external_anchor_sha256=${result.external_anchor_sha256}`,
        "shared_generation_authority_lock=true",
        "asynchronous_callback_allowed=false",
        "wallet_access=false",
        "private_key_access=false",
        "transaction_construction=false",
        "transaction_signing=false",
        "transaction_broadcast=false",
        "funds_movement=false",
        "",
      ].join("\n"),
    );
  } catch (error) {
    fail(String(error?.message || error));
  }
}
