#!/usr/bin/env node
// Review-only successor for the Epoch-1 PostgreSQL activation source tuple.
// Historical V1 admission and its exact inherited blobs remain immutable.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_CLAIMED_PG_SOURCE_QUALIFICATION_V1";
export const STATUS =
  "EPOCH2_SOURCE_TUPLE_REVIEWABLE_CREDENTIAL_AND_ACTIVATION_HOLD";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANDIDATE =
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json";
const LEGACY =
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json";
const TARGET = "ops/mainnet0/production-epoch2-rpc-target-v1.json";
const PRESALE = "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const FULFILLER = "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const RPC = "http://127.0.0.1:18553/";

// Exact executable-source tuple from Draft #2821, reviewed relative to the
// historical #1523/claimed-PostgreSQL V1 generation. This binds source bytes
// for current review; it does NOT accept the prior credentials or grant apply.
export const SOURCE_BLOBS = Object.freeze({
  "src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts":
    "158cbf14fa2b566632c096a22e484b651cd44f6d",
  "src/economic/buy_void_epoch2_credential_source_binding_v1.ts":
    "4de9832a0f8e384e477177b55975e8557ec9147c",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts":
    "9f6e6068e575659dfdab8d956a2ec4b21dc510c8",
  "src/economic/buy_void_payment_keyed_runtime_dependency_bootstrap_v1.ts":
    "1c72f07509521a4bc2a57a2865851f623a3955ad",
  "src/economic/buy_void_payment_keyed_dispatcher_guarded_broadcast_apply_v1.ts":
    "a0c64bee56d38af5e879524ea2ca75f5d2d707a6",
  "scripts/prove_buy_void_payment_keyed_full_runtime_v1.ts":
    "b2b72528b5f52fa62e45df343cba45e6b3fd3f83",
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
  "src/economic/buy_void_epoch2_signer_control_v1.ts":
    "0ce33a35da61199b597bad80fa019dca26ffade1",
  // The successor's separate systemd credential and its inert adversarial
  // proof are independent of the frozen E1 signer evidence.
  "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts":
    "5fd9296d10d810b1976c159578f13cca5d1594fe",
  "scripts/prove_buy_void_epoch2_credential_signer_v1.ts":
    "19c991849243f3d751e3b924d551a9ece0ec0486",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts":
    "4e5d9a633b05d9254424c2132fc6620b94ff3692",
  [CANDIDATE]: "2c861c021192c034c98404989cd25b26788cd0f0",
  [LEGACY]: "1b605ebf698b69ef3a27eb2546df700878b53cf9",
  "tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs":
    "db6a56b56eea4fe150ad1ebc98519bc263b70ee2",
  "ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json":
    "ed853b88329cd3a708b22a025cec0fe48540168a",
  [TARGET]: "5bc18bfdf27d982a6ded3b1e1ae2f26353a84189",
});

function hold(reason) { throw new Error(reason); }
function own(o, key) {
  return o && typeof o === "object" && !Array.isArray(o) &&
    Object.getPrototypeOf(o) === Object.prototype &&
    Object.hasOwn(o, key);
}
function exactFields(o, expected) {
  return o && typeof o === "object" && !Array.isArray(o) &&
    Object.getPrototypeOf(o) === Object.prototype &&
    JSON.stringify(Object.keys(o).sort()) ===
      JSON.stringify([...expected].sort());
}
function git(args) {
  return execFileSync("git", ["-C", ROOT, ...args], {
    encoding: "utf8", timeout: 7000, maxBuffer: 8192,
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  }).trim();
}
function readReviewedFile(relative, expectedBlob) {
  if (!Object.hasOwn(SOURCE_BLOBS, relative)) hold("unreviewed_source_path");
  const absolute = path.join(ROOT, relative);
  const before = fs.lstatSync(absolute);
  if (!before.isFile() || before.isSymbolicLink() ||
      before.size < 1 || before.size > 100_000) {
    hold("source_file_shape_invalid:" + relative);
  }
  const fd = fs.openSync(absolute,
    fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  let bytes;
  try {
    const opened = fs.fstatSync(fd);
    if (opened.dev !== before.dev || opened.ino !== before.ino ||
        opened.size !== before.size || !opened.isFile()) {
      hold("source_file_replaced:" + relative);
    }
    bytes = Buffer.alloc(opened.size);
    if (fs.readSync(fd, bytes, 0, bytes.length, 0) !== bytes.length ||
        fs.fstatSync(fd).size !== opened.size) {
      hold("source_file_changed:" + relative);
    }
  } finally { fs.closeSync(fd); }
  const hashed = crypto.createHash("sha1")
    .update("blob " + String(bytes.length) + "\0")
    .update(bytes).digest("hex");
  if (hashed !== expectedBlob ||
      git(["rev-parse", "--verify", "HEAD:" + relative]) !== expectedBlob) {
    hold("current_source_tuple_drift:" + relative);
  }
  return bytes;
}

export function classifyEpoch2ClaimSourceV1(candidate, legacy, target) {
  const bad = (reason) => Object.freeze({
    ok: false, status: "HOLD", reason,
    credential_binding_established: false,
    runtime_or_payment_activation_authorized: false,
    historical_v1_authority_inherited: false,
  });
  if (!exactFields(candidate, [
    "marker","version","status","canonical_chain_id","execution_epoch",
    "source_prior_candidate_path","selected_production_target_path",
    "epoch2_presale_contract","epoch2_fulfiller_public_address",
    "candidate_configuration","signer_credential_state",
    "explicit_remaining_gates","authority",
  ])) return bad("candidate_schema_changed");
  if (candidate.marker !==
      "VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V1" ||
      candidate.version !== 1 || candidate.canonical_chain_id !== 2050 ||
      candidate.execution_epoch !== 2 ||
      candidate.status !==
        "EPOCH2_SOURCE_CANDIDATE_SIGNER_CREDENTIAL_AND_ACTIVATION_HOLD" ||
      candidate.epoch2_presale_contract !== PRESALE ||
      candidate.epoch2_fulfiller_public_address !== FULFILLER ||
      candidate.source_prior_candidate_path !== LEGACY ||
      candidate.selected_production_target_path !== TARGET) {
    return bad("candidate_epoch2_identity_mismatch");
  }
  const c = candidate.candidate_configuration;
  const old = legacy?.candidate_configuration;
  const selection = target?.selection;
  if (!c || !old || !selection ||
      !exactFields(c, [
        ...Object.keys(old).filter(
          k => !["CREDENTIALS_DIRECTORY",
                "VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID"].includes(k)
        ),
        "VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID",
      ])) return bad("candidate_configuration_keys_changed");
  const differences = new Set([
    "VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL",
    "VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS",
    "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
    "VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI",
    "VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID",
  ]);
  for (const [key,value] of Object.entries(c)) {
    if (typeof value !== "string" || (!differences.has(key) && value !== old[key])) {
      return bad("candidate_unreviewed_config_change:" + key);
    }
  }
  if (c.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL !== RPC ||
      c.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS !== PRESALE ||
      c.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS !== FULFILLER ||
      c.VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID !==
        "5fde8cc7fcd0493619c105ac9f367063fbdacd74e8ae50df76454c6d298206f1" ||
      c.VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI !== "0" ||
      c.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED !== "0" ||
      c.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED !== "0" ||
      selection.rpc_url !== RPC || selection.production_rpc_target_selected !== true) {
    return bad("candidate_production_target_or_enable_invalid");
  }
  const signer = candidate.signer_credential_state, a = candidate.authority;
  if (!exactFields(signer, [
    "signer_offchain_control_proven","systemd_credential_identity_proven",
    "epoch2_credential_binding_evidence_id",
    "legacy_wallet_credential_reuse_authorized",
    "credential_path_selected","private_key_material_read",
  ]) || Object.values(signer).some(v => v !== false && v !== null) ||
      signer.epoch2_credential_binding_evidence_id !== null ||
      !a || a.candidate_only !== true ||
      Object.entries(a).some(([key,val]) =>
        key !== "candidate_only" && val !== false
      )) return bad("candidate_signer_or_authority_overclaimed");
  if (!Array.isArray(candidate.explicit_remaining_gates) ||
      !candidate.explicit_remaining_gates.includes(
        "independently_attest_systemd_credential_identity_and_active_signing_capability"
      )) return bad("candidate_missing_current_signer_gate");
  return Object.freeze({
    ok: true, status: STATUS, reason: null,
    credential_binding_established: false,
    runtime_or_payment_activation_authorized: false,
    historical_v1_authority_inherited: false,
  });
}

export function verifyCurrentEpoch2ClaimSourceV1() {
  const remote = git(["remote", "get-url", "origin"]);
  if (!["https://github.com/6ZoSo9/void-node.git",
        "https://github.com/6ZoSo9/void-node",
        "git@github.com:6ZoSo9/void-node.git"].includes(remote)) {
    hold("noncanonical_repo_origin");
  }
  if (!/^[0-9a-f]{40}$/u.test(git(["rev-parse","HEAD"]))) {
    hold("head_invalid");
  }
  if (git(["status","--porcelain=v1","--untracked-files=no"]) !== "") {
    hold("repository_tracked_worktree_dirty");
  }
  const publicBytes = new Map();
  for (const [p,sha] of Object.entries(SOURCE_BLOBS)) {
    const b = readReviewedFile(p,sha);
    if ([CANDIDATE,LEGACY,TARGET].includes(p)) {
      publicBytes.set(p,b);
    }
  }
  const parse = (p) => JSON.parse(
    new TextDecoder("utf-8",{fatal:true}).decode(publicBytes.get(p))
  );
  const result = classifyEpoch2ClaimSourceV1(
    parse(CANDIDATE),parse(LEGACY),parse(TARGET)
  );
  if (!result.ok) hold(result.reason);
  return result;
}

if (process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const out = verifyCurrentEpoch2ClaimSourceV1();
    console.log("marker=" + MARKER);
    console.log("status=" + out.status);
    console.log("reviewed_source_blob_count=" + Object.keys(SOURCE_BLOBS).length);
    console.log("historical_v1_authority_inherited=false");
    console.log("signer_control_or_systemd_credential_verified=false");
    console.log("production_payment_activation=false");
    console.log("chain_rpc_or_customer_records_accessed=false");
    console.log("transaction_sign_or_broadcast=false");
    console.log("source_qualification_complete=true");
  } catch (e) {
    console.error("marker=" + MARKER + "_HOLD");
    console.error("reason=" + String(e?.message || "source_qualification_error"));
    process.exitCode = 2;
  }
}
