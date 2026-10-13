#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
} from "../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1,
} from "../src/economic/buy_void_epoch2_credential_source_binding_v1.js";
import {
  createBuyVoidEpoch2FulfillerCredentialSignerV1,
} from "../src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1,
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CONFIRMATION_V1,
  buildBuyVoidEpoch2CredentialCapabilityProbeV1,
  buildBuyVoidEpoch2CredentialAttestationEvidenceV1,
  observeBuyVoidEpoch2SystemdCredentialBindingV1,
} from "../src/economic/buy_void_epoch2_credential_attestation_v1.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_QUALIFIER =
  "tools/void-buy-void-epoch2-postgres-source-qualification-v1.mjs";
const EXPECTED_BLOBS = Object.freeze({
  [SOURCE_QUALIFIER]: "834f17d99c0351c0f2b10fb024f3ee43afae8a42",
  "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts":
    "5fd9296d10d810b1976c159578f13cca5d1594fe",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts":
    "af2179651a88a74b158e7f3602fc5b3c30701f87",
  "src/economic/buy_void_epoch2_credential_attestation_v1.ts":
    "a0fe1fd5beda8ce288b2628a9c92f7bb74f82420",
});
const SERVICE = "void-node-live.service";

function help(): string {
  return [
    "Usage:",
    "  node --import tsx scripts/void_buy_void_epoch2_credential_attestation_v1.ts",
    "  node --import tsx scripts/void_buy_void_epoch2_credential_attestation_v1.ts --probe --confirm " +
      VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CONFIRMATION_V1,
    "",
    "Default mode is disabled and performs no systemd, /proc, credential, or signing access.",
    "The explicit probe observes the live user service, reads only its systemd-managed",
    "buy-void-epoch2-fulfiller-v1 credential, signs one non-broadcast capability",
    "probe, verifies it locally, discards the raw transaction, and emits public evidence.",
  ].join("\n");
}

function git(args: string[]): string {
  return execFileSync("git", ["-C", ROOT, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
    maxBuffer: 256 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  }).trim();
}

function safeReason(error: unknown): string {
  const raw = String((error as any)?.message || "").trim();
  return /^[a-z0-9_:-]{1,160}$/u.test(raw)
    ? raw
    : "epoch2_credential_attestation_failed";
}

function assertSourceGeneration(): {
  head: string;
  qualifier_blob: string;
  signer_blob: string;
  full_runtime_blob: string;
  attestation_blob: string;
} {
  const head = git(["rev-parse", "--verify", "HEAD"]).toLowerCase();
  if (!/^[0-9a-f]{40}$/u.test(head)) {
    throw new Error("epoch2_attestation_head_invalid");
  }
  for (const [relative, expected] of Object.entries(EXPECTED_BLOBS)) {
    const actual = git(["rev-parse", "--verify", "HEAD:" + relative]).toLowerCase();
    if (actual !== expected) {
      throw new Error("epoch2_attestation_source_blob_mismatch");
    }
  }
  const qualifier = execFileSync(process.execPath, [SOURCE_QUALIFIER], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 15_000,
    maxBuffer: 256 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
  if (!qualifier.includes(
      "status=EPOCH2_SOURCE_TUPLE_REVIEWABLE_CREDENTIAL_AND_ACTIVATION_HOLD") ||
      !qualifier.includes("source_qualification_complete=true")) {
    throw new Error("epoch2_source_qualification_not_green");
  }
  return {
    head,
    qualifier_blob: EXPECTED_BLOBS[SOURCE_QUALIFIER],
    signer_blob:
      EXPECTED_BLOBS[
        "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts"
      ],
    full_runtime_blob:
      EXPECTED_BLOBS["src/economic/buy_void_payment_keyed_full_runtime_v1.ts"],
    attestation_blob:
      EXPECTED_BLOBS["src/economic/buy_void_epoch2_credential_attestation_v1.ts"],
  };
}

function observeLiveSystemdCredential() {
  const show = execFileSync("systemctl", [
    "--user", "show", SERVICE, "--no-pager",
    "-p", "ActiveState",
    "-p", "SubState",
    "-p", "MainPID",
    "-p", "InvocationID",
    "-p", "LoadCredential",
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
    maxBuffer: 128 * 1024,
  });
  const match = show.match(/^MainPID=([0-9]+)$/mu);
  if (!match) throw new Error("epoch2_service_main_pid_missing");
  const pid = Number(match[1]);
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw new Error("epoch2_service_main_pid_invalid");
  }
  const environ = fs.readFileSync("/proc/" + pid.toString() + "/environ");
  return observeBuyVoidEpoch2SystemdCredentialBindingV1({
    systemctl_show: show,
    process_environ: environ,
  });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(help());
    return;
  }
  const probe = argv.includes("--probe");
  const confirmAt = argv.indexOf("--confirm");
  const confirmation =
    confirmAt >= 0 && confirmAt + 1 < argv.length ? argv[confirmAt + 1] : "";
  const recognized = new Set(["--probe", "--confirm"]);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--confirm") {
      i += 1;
      continue;
    }
    if (!recognized.has(argv[i])) throw new Error("unknown_argument");
  }

  if (!probe) {
    console.log(JSON.stringify({
      marker: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1,
      status: "disabled",
      reason: "epoch2_credential_attestation_probe_not_requested",
      systemd_observation_performed: false,
      credential_content_read: false,
      signing_performed: false,
      rpc_call_performed: false,
      transaction_broadcast_performed: false,
      runtime_activation_authorized: false,
      public_payment_acceptance_authorized: false,
      presale_activation_authorized: false,
      funds_movement: false,
    }, null, 2));
    return;
  }
  if (confirmation !==
      VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CONFIRMATION_V1) {
    throw new Error("epoch2_credential_attestation_confirmation_mismatch");
  }
  if (process.platform !== "linux") {
    throw new Error("epoch2_credential_attestation_linux_required");
  }

  const source = assertSourceGeneration();
  const systemd = observeLiveSystemdCredential();
  const signer = createBuyVoidEpoch2FulfillerCredentialSignerV1({
    credentials_directory: systemd.credentials_directory,
  });
  if (!signer.ok) throw new Error(signer.reason);
  const publicAddress = (await signer.signer.get_address()).toLowerCase();
  if (publicAddress !== VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1) {
    throw new Error("epoch2_attestation_immutable_fulfiller_mismatch");
  }

  const challenge = crypto.randomBytes(32).toString("hex");
  const envelope = buildBuyVoidEpoch2CredentialCapabilityProbeV1({
    source_head: source.head,
    challenge_hex: challenge,
  });
  let raw = await signer.signer.sign_transaction(envelope);
  try {
    const evidence = buildBuyVoidEpoch2CredentialAttestationEvidenceV1({
      source_head: source.head,
      source_qualifier_blob: source.qualifier_blob,
      signer_source_blob: source.signer_blob,
      full_runtime_source_blob: source.full_runtime_blob,
      attestation_source_blob: source.attestation_blob,
      expected_signer: VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
      probe: envelope,
      raw_signed_transaction: raw,
      systemd_observation: systemd,
    });
    if ((evidence as any).source_identity?.credential_source_binding_id !==
        VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1) {
      throw new Error("epoch2_attestation_source_binding_mismatch");
    }
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    raw = "";
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    marker: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1 + "_HOLD",
    status: "HOLD",
    reason: safeReason(error),
    raw_private_key_output: false,
    raw_signed_transaction_output: false,
    rpc_call_performed: false,
    transaction_broadcast_performed: false,
    transaction_submission_performed: false,
    filesystem_write_performed: false,
    runtime_activation_authorized: false,
    public_payment_acceptance_authorized: false,
    presale_activation_authorized: false,
    funds_movement: false,
  }, null, 2));
  process.exitCode = 2;
});
