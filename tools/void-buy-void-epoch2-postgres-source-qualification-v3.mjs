#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_CLAIMED_PG_SOURCE_QUALIFICATION_V3";
export const STATUS =
  "EPOCH2_CURRENT_ACTIVATION_REBIND_SOURCE_QUALIFIED_SIGNER_CONTROL_PRESERVED_CREDENTIAL_AND_ACTIVATION_HOLD";
export const HISTORICAL_V2_CARRIER =
  "6905658c3e7312771c3c7d0b77c5d609e7d08080";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";

export const HISTORICAL_V2_BLOBS = Object.freeze({
  "tools/void-buy-void-epoch2-postgres-source-qualification-v1.mjs":
    "834f17d99c0351c0f2b10fb024f3ee43afae8a42",
  "tools/void-buy-void-epoch2-postgres-source-qualification-v2.mjs":
    "50e6a453fcf295a641169f9052af5c85526f02d7",
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json":
    "2c861c021192c034c98404989cd25b26788cd0f0",
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json":
    "6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1",
  "ops/mainnet0/evidence/buy-void-epoch2-signer-control-public-evidence-v1.json":
    "361aea8767f8b049fafd28663b71b177f38f180d",
  "tools/void-buy-void-epoch2-signer-control-public-evidence-v1.mjs":
    "d0f3c575903a44b9a538f0201257584545077be9",
});

export const CURRENT_SOURCE_BLOBS = Object.freeze({
  "src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts":
    "158cbf14fa2b566632c096a22e484b651cd44f6d",
  "src/economic/buy_void_epoch2_credential_source_binding_v1.ts":
    "4de9832a0f8e384e477177b55975e8557ec9147c",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts":
    "af2179651a88a74b158e7f3602fc5b3c30701f87",
  "src/economic/buy_void_payment_keyed_runtime_dependency_bootstrap_v1.ts":
    "1c72f07509521a4bc2a57a2865851f623a3955ad",
  "src/economic/buy_void_payment_keyed_dispatcher_guarded_broadcast_apply_v1.ts":
    "a0c64bee56d38af5e879524ea2ca75f5d2d707a6",
  "scripts/prove_buy_void_payment_keyed_full_runtime_v1.ts":
    "4159894a4188f02d8c40e80e515840e6cc11225d",
  "scripts/prove_buy_void_epoch2_runtime_credential_source_binding_v1.ts":
    "f0c7baeb7057a74f150c2e9e50634ca7948f92ae",
  "scripts/prove_buy_void_payment_keyed_epoch2_dormant_candidate_v1.ts":
    "0d9eb90c27031b9820a139be2af63c4c07433e20",
  "src/economic/buy_void_payment_keyed_transaction_preparation_v1.ts":
    "aa2f60c57c4cb8fed280d67397636ddd08a415cc",
  "src/economic/buy_void_payment_keyed_unsigned_transaction_v1.ts":
    "1e774ba0a26eecc1fb633faea8e8c27b4ebf806d",
  "src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.ts":
    "b20e6574abb56be8ae11d73974edda45e54a0b9a",
  "src/economic/buy_void_payment_keyed_custodian_signer_v1.ts":
    "2ff9274880db4c5e29dbc73acf363f75c6a2b33f",
  "src/economic/buy_void_payment_keyed_custodian_broadcast_v1.ts":
    "9e753c04f1127b440c28675199ae2c1f97a0f077",
  "src/economic/buy_void_payment_keyed_chain2050_broadcaster_v1.ts":
    "d184aef61760e4f0109b016d6f5331e93136048d",
  "src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts":
    "2deaee8ae4e0fbd909b417eef96a76012174c668",
  "src/economic/buy_void_payment_keyed_chain2050_inspection_v1.ts":
    "b68a9e39cf5548f065042f590c58b341020cce7e",
  "src/economic/buy_void_payment_keyed_plan_reservation_v1.ts":
    "85ab70a1cee8c236dcab7bbb87cbf324bad49a40",
  "src/economic/buy_void_payment_keyed_preparation_custody_v1.ts":
    "3b06f5d87f1647003348c7459cb3797a3394d343",
  "src/economic/buy_void_epoch2_signer_control_v1.ts":
    "785fe80d74ae5f6840da22a19a337cd2bcee9944",
  "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts":
    "5fd9296d10d810b1976c159578f13cca5d1594fe",
  "scripts/prove_buy_void_epoch2_credential_signer_v1.ts":
    "19c991849243f3d751e3b924d551a9ece0ec0486",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts":
    "4e5d9a633b05d9254424c2132fc6620b94ff3692",
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json":
    "2c861c021192c034c98404989cd25b26788cd0f0",
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json":
    "1b605ebf698b69ef3a27eb2546df700878b53cf9",
  "tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs":
    "f8281ffc9cfbfd2b810a11a10f8cb3ff8473fa95",
  "ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json":
    "a03f6fd4d0f86024aa276aa3be9c1eb00fb4cef2",
  "ops/mainnet0/production-epoch2-rpc-target-v1.json":
    "5bc18bfdf27d982a6ded3b1e1ae2f26353a84189",
  "scripts/prove_buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts":
    "674de094c6750a1f7498fa06efa6f7571edb3151",
});

function git(args) {
  return execFileSync(GIT, ["--no-replace-objects", "-C", ROOT, ...args], {
    encoding: "utf8",
    timeout: 7000,
    maxBuffer: 1_000_000,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
    },
  }).trim();
}

function blobSha(bytes) {
  return crypto.createHash("sha1")
    .update("blob " + String(bytes.length) + "\0")
    .update(bytes)
    .digest("hex");
}

function readCurrentExact(relative, expected) {
  const absolute = path.join(ROOT, relative);
  const before = fs.lstatSync(absolute);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.size < 1 ||
    before.size > 2_000_000
  ) {
    throw new Error("current_source_shape_invalid:" + relative);
  }
  const fd = fs.openSync(
    absolute,
    fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
  );
  let bytes;
  try {
    const opened = fs.fstatSync(fd);
    if (
      !opened.isFile() ||
      opened.dev !== before.dev ||
      opened.ino !== before.ino ||
      opened.size !== before.size
    ) {
      throw new Error("current_source_replaced:" + relative);
    }
    bytes = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) {
        throw new Error("current_source_short_read:" + relative);
      }
      offset += count;
    }
    const after = fs.fstatSync(fd);
    if (
      after.dev !== opened.dev ||
      after.ino !== opened.ino ||
      after.size !== opened.size
    ) {
      throw new Error("current_source_changed_during_read:" + relative);
    }
  } finally {
    fs.closeSync(fd);
  }
  if (blobSha(bytes) !== expected) {
    throw new Error("current_source_blob_mismatch:" + relative);
  }
  if (git(["rev-parse", "--verify", "HEAD:" + relative]) !== expected) {
    throw new Error("current_head_blob_mismatch:" + relative);
  }
  return bytes;
}

function exactHistoricalCarrier(relative, expected) {
  if (
    git([
      "rev-parse",
      "--verify",
      HISTORICAL_V2_CARRIER + ":" + relative,
    ]) !== expected
  ) {
    throw new Error("historical_v2_carrier_blob_mismatch:" + relative);
  }
}

function exactPlainObject(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...keys].sort())
  );
}

export function classifyCurrentActivationCandidateV3(candidate) {
  const bad = (reason) => Object.freeze({
    ok: false,
    status: "HOLD",
    reason,
    activation_authorized: false,
    runtime_gate_mutation: false,
    service_mutation: false,
    transaction_broadcast: false,
    funds_movement: false,
  });
  if (
    !exactPlainObject(candidate, [
      "marker",
      "version",
      "status",
      "reviewed_inherited_source_main_commit",
      "reviewed_inherited_source_blobs",
      "candidate_source_review_base_commit",
      "candidate_source_review_base_tree",
      "reviewed_candidate_head_source_blobs",
      "observed_gate_state",
      "observed_readiness",
      "activation_phase_order",
      "transition_policy",
      "authority",
    ])
  ) {
    return bad("activation_candidate_schema_changed");
  }
  if (
    candidate.marker !==
      "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1" ||
    candidate.version !== 1 ||
    candidate.status !==
      "source_candidate_activation_contract_only_no_gate_change_authorized"
  ) {
    return bad("activation_candidate_identity_changed");
  }
  const gates = candidate.observed_gate_state;
  if (
    !gates ||
    gates.parent_runtime !== "1" ||
    gates.claimed_runtime !== "0" ||
    gates.full_runtime !== "0" ||
    gates.admitted_guarded_runtime !== "0" ||
    gates.full_runtime_apply !== "0"
  ) {
    return bad("activation_candidate_not_dormant");
  }
  const authority = candidate.authority;
  const authorityKeys = [
    "source_candidate_only",
    "activation_authorized",
    "host_mutation",
    "service_mutation",
    "runtime_gate_mutation",
    "credential_read",
    "database_mutation",
    "wallet_or_signer_access",
    "transaction_construction",
    "transaction_signing",
    "transaction_broadcast",
    "market_activation",
    "public_presale_activation",
    "funds_movement",
  ];
  if (
    !exactPlainObject(authority, authorityKeys) ||
    authority.source_candidate_only !== true ||
    Object.entries(authority).some(
      ([key, value]) => key !== "source_candidate_only" && value !== false,
    )
  ) {
    return bad("activation_candidate_authority_expanded");
  }
  return Object.freeze({
    ok: true,
    status: STATUS,
    reason: null,
    activation_authorized: false,
    runtime_gate_mutation: false,
    service_mutation: false,
    transaction_broadcast: false,
    funds_movement: false,
  });
}

export function verifyCurrentEpoch2ClaimSourceV3() {
  const remote = git(["config", "--local", "--no-includes", "--get", "remote.origin.url"]);
  if (
    ![
      "https://github.com/6ZoSo9/void-node.git",
      "https://github.com/6ZoSo9/void-node",
      "git@github.com:6ZoSo9/void-node.git",
    ].includes(remote)
  ) {
    throw new Error("noncanonical_repo_origin");
  }
  const head = git(["rev-parse", "--verify", "HEAD"]);
  if (!/^[0-9a-f]{40}$/u.test(head)) {
    throw new Error("head_invalid");
  }
  if (git(["status", "--porcelain=v1", "--untracked-files=no"]) !== "") {
    throw new Error("repository_tracked_worktree_dirty");
  }
  try {
    git(["merge-base", "--is-ancestor", HISTORICAL_V2_CARRIER, "HEAD"]);
  } catch {
    throw new Error("historical_v2_carrier_not_ancestor");
  }

  for (const [relative, expected] of Object.entries(HISTORICAL_V2_BLOBS)) {
    exactHistoricalCarrier(relative, expected);
    readCurrentExact(relative, expected);
  }
  const currentBytes = new Map();
  for (const [relative, expected] of Object.entries(CURRENT_SOURCE_BLOBS)) {
    currentBytes.set(relative, readCurrentExact(relative, expected));
  }

  const activationPath =
    "ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json";
  const activation = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(currentBytes.get(activationPath)),
  );
  const classified = classifyCurrentActivationCandidateV3(activation);
  if (!classified.ok) {
    throw new Error(classified.reason);
  }

  const v2 = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(
      readCurrentExact(
        "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json",
        HISTORICAL_V2_BLOBS[
          "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json"
        ],
      ),
    ),
  );
  if (
    v2?.marker !== "VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V2" ||
    v2?.version !== 2 ||
    v2?.signer_credential_state?.signer_offchain_control_proven !== true ||
    v2?.signer_credential_state?.systemd_credential_identity_proven !== false ||
    v2?.authority?.candidate_only !== true ||
    Object.entries(v2?.authority || {}).some(
      ([key, value]) => key !== "candidate_only" && value !== false,
    )
  ) {
    throw new Error("historical_v2_signer_control_state_changed");
  }

  return Object.freeze({
    ok: true,
    status: STATUS,
    head,
    historical_v2_carrier: HISTORICAL_V2_CARRIER,
    historical_v1_source_qualification_preserved: true,
    historical_v2_signer_control_evidence_preserved: true,
    current_activation_candidate_source_requalified: true,
    current_source_blob_count: Object.keys(CURRENT_SOURCE_BLOBS).length,
    signer_offchain_control_proven: true,
    systemd_credential_identity_proven: false,
    credential_binding_established: false,
    runtime_or_payment_activation_authorized: false,
    activation_authorized: false,
    runtime_gate_mutation: false,
    service_mutation: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    funds_movement: false,
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const out = verifyCurrentEpoch2ClaimSourceV3();
    console.log("marker=" + MARKER);
    console.log("status=" + out.status);
    console.log("historical_v2_carrier=" + out.historical_v2_carrier);
    console.log("historical_v1_source_qualification_preserved=true");
    console.log("historical_v2_signer_control_evidence_preserved=true");
    console.log("current_activation_candidate_source_requalified=true");
    console.log("current_source_blob_count=" + String(out.current_source_blob_count));
    console.log("signer_offchain_control_proven=true");
    console.log("systemd_credential_identity_proven=false");
    console.log("credential_binding_established=false");
    console.log("runtime_or_payment_activation_authorized=false");
    console.log("activation_authorized=false");
    console.log("runtime_gate_mutation=false");
    console.log("service_mutation=false");
    console.log("transaction_broadcast=false");
    console.log("public_presale_activation=false");
    console.log("funds_movement=false");
  } catch (error) {
    console.error("marker=" + MARKER + "_HOLD");
    console.error("reason=" + String(error?.message || "source_qualification_error"));
    process.exitCode = 2;
  }
}
