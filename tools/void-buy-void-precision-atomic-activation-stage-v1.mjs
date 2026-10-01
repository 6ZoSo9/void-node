#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1,
  renderVoidBuyVoidPrecisionAtomicActivationDropinV1,
} from "./void-buy-void-precision-atomic-activation-preflight-v1.mjs";

export const VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1 =
  "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1";

export const VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_AUTHORITY_V1 =
  Object.freeze({
    fresh_green_preflight_receipt_required: true,
    exact_live_and_rollback_hash_binding_required: true,
    active_dropin_tree_overlap_forbidden: true,
    inactive_private_staging_write: true,
    idempotent_exact_stage_reuse: true,
    active_dropin_write: false,
    daemon_reload: false,
    service_stop: false,
    service_start: false,
    service_restart: false,
    runtime_gate_mutation: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    public_activation: false,
    funds_movement: false,
  });

function fail(reason) {
  throw new Error(reason);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseReceipt(text) {
  if (
    !text.includes(
      "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_WRAPPER_V1_DONE",
    ) ||
    !text.includes(
      "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1_DONE",
    )
  ) {
    fail("preflight_completion_marker_missing");
  }
  const values = new Map();
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.trim();
    const match = /^([a-z0-9_]+)=(.*)$/u.exec(line);
    if (match) values.set(match[1], match[2]);
  }
  const required = [
    "status",
    "activation_ready",
    "activation_authorized",
    "unreviewed_gate_source_count",
    "canonical_remote_url",
    "repository_head_sha",
    "repository_tree_sha",
    "remote_main_sha",
    "source_slice_manifest_sha256",
    "source_slice_count",
    "preflight_wrapper_git_blob_sha1",
    "preflight_tool_git_blob_sha1",
    "live_configuration_generation_id",
    "live_configuration_sha256",
    "live_dropin_sha256",
    "dormant_configuration_generation_id",
    "dormant_configuration_sha256",
    "dormant_dropin_sha256",
    "runtime_gate_mutation_performed",
    "service_mutation_performed",
    "transaction_broadcast_performed",
    "funds_movement_performed",
  ];
  for (const key of required) {
    if (!values.has(key)) fail("preflight_receipt_field_missing:" + key);
  }
  const get = (key) => values.get(key);
  if (
    get("status") !== "ATOMIC_ACTIVATION_PREFLIGHT_GREEN_NOT_AUTHORIZED" ||
    get("activation_ready") !== "true" ||
    get("activation_authorized") !== "false" ||
    get("unreviewed_gate_source_count") !== "0" ||
    get("canonical_remote_url") !==
      "https://github.com/6ZoSo9/void-node.git" ||
    get("source_slice_count") !== "22" ||
    get("runtime_gate_mutation_performed") !== "false" ||
    get("service_mutation_performed") !== "false" ||
    get("transaction_broadcast_performed") !== "false" ||
    get("funds_movement_performed") !== "false"
  ) {
    fail("preflight_receipt_not_green_nonmutating");
  }

  const hex40 = /^[0-9a-f]{40}$/u;
  const hex64 = /^[0-9a-f]{64}$/u;
  for (const key of [
    "repository_head_sha",
    "repository_tree_sha",
    "remote_main_sha",
    "preflight_wrapper_git_blob_sha1",
    "preflight_tool_git_blob_sha1",
  ]) {
    if (!hex40.test(get(key))) fail("preflight_receipt_sha1_invalid:" + key);
  }
  for (const key of [
    "source_slice_manifest_sha256",
    "live_configuration_sha256",
    "live_dropin_sha256",
    "dormant_configuration_sha256",
    "dormant_dropin_sha256",
  ]) {
    if (!hex64.test(get(key))) fail("preflight_receipt_sha256_invalid:" + key);
  }
  if (get("repository_head_sha") !== get("remote_main_sha")) {
    fail("preflight_receipt_source_not_remote_main");
  }
  for (const prefix of ["live", "dormant"]) {
    const generation = get(prefix + "_configuration_generation_id");
    const configuration = get(prefix + "_configuration_sha256");
    if (generation !== "voidbvpcg1_" + configuration) {
      fail(prefix + "_generation_configuration_mismatch");
    }
  }
  if (
    get("live_configuration_sha256") ===
    get("dormant_configuration_sha256")
  ) {
    fail("live_and_dormant_configuration_must_differ");
  }

  return Object.freeze(Object.fromEntries(values.entries()));
}

function isWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (
      relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative)
    )
  );
}

function exactDirectory(input, label) {
  if (!path.isAbsolute(input) || path.resolve(input) !== input) {
    fail(label + "_not_absolute_normalized");
  }
  const stat = fs.lstatSync(input);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(label + "_not_direct_directory");
  }
  const real = fs.realpathSync(input);
  if (real !== input) fail(label + "_symlink_component_forbidden");
  return real;
}

function fileState(filePath) {
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("staged_file_not_direct_regular:" + filePath);
  }
  return {
    bytes: fs.readFileSync(filePath),
    mode: stat.mode & 0o777,
  };
}

export function deriveVoidBuyVoidPrecisionAtomicActivationStageV1(
  preflightText,
) {
  const receipt = parseReceipt(preflightText);
  const live = renderVoidBuyVoidPrecisionAtomicActivationDropinV1({
    generation_id: receipt.live_configuration_generation_id,
    configuration_sha256: receipt.live_configuration_sha256,
    mode: "live_apply",
  });
  const rollback = renderVoidBuyVoidPrecisionAtomicActivationDropinV1({
    generation_id: receipt.dormant_configuration_generation_id,
    configuration_sha256: receipt.dormant_configuration_sha256,
    mode: "dormant_rollback",
  });
  if (live.sha256 !== receipt.live_dropin_sha256) {
    fail("live_dropin_hash_mismatch");
  }
  if (rollback.sha256 !== receipt.dormant_dropin_sha256) {
    fail("dormant_dropin_hash_mismatch");
  }
  return Object.freeze({ receipt, live, rollback });
}

export function stageVoidBuyVoidPrecisionAtomicActivationV1({
  preflightText,
  outDir,
  activeDropinDir,
}) {
  const derived =
    deriveVoidBuyVoidPrecisionAtomicActivationStageV1(preflightText);

  if (!path.isAbsolute(outDir) || path.resolve(outDir) !== outDir) {
    fail("staging_output_not_absolute_normalized");
  }
  const parent = exactDirectory(path.dirname(outDir), "staging_parent");
  const active = exactDirectory(activeDropinDir, "active_dropin_dir");
  const candidate = path.join(parent, path.basename(outDir));
  if (isWithin(candidate, active) || isWithin(active, candidate)) {
    fail("staging_path_overlaps_active_dropin_tree");
  }

  const liveRel =
    "live/" + VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1;
  const rollbackRel =
    "rollback/" + VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1;

  const manifest = {
    marker: VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1,
    version: 1,
    status: "STAGED_NOT_ACTIVATED",
    preflight: {
      status: derived.receipt.status,
      repository_head_sha: derived.receipt.repository_head_sha,
      repository_tree_sha: derived.receipt.repository_tree_sha,
      remote_main_sha: derived.receipt.remote_main_sha,
      source_slice_manifest_sha256:
        derived.receipt.source_slice_manifest_sha256,
      source_slice_count: Number(derived.receipt.source_slice_count),
      preflight_wrapper_git_blob_sha1:
        derived.receipt.preflight_wrapper_git_blob_sha1,
      preflight_tool_git_blob_sha1:
        derived.receipt.preflight_tool_git_blob_sha1,
      live_configuration_generation_id:
        derived.receipt.live_configuration_generation_id,
      live_configuration_sha256:
        derived.receipt.live_configuration_sha256,
      live_dropin_sha256: derived.receipt.live_dropin_sha256,
      dormant_configuration_generation_id:
        derived.receipt.dormant_configuration_generation_id,
      dormant_configuration_sha256:
        derived.receipt.dormant_configuration_sha256,
      dormant_dropin_sha256: derived.receipt.dormant_dropin_sha256,
    },
    files: {
      live: {
        relative_path: liveRel,
        sha256: derived.live.sha256,
      },
      rollback: {
        relative_path: rollbackRel,
        sha256: derived.rollback.sha256,
      },
    },
    authority:
      VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_AUTHORITY_V1,
  };
  const manifestBytes =
    Buffer.from(JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const verifyExisting = () => {
    const dir = exactDirectory(outDir, "existing_staging_output");
    const liveState = fileState(path.join(dir, liveRel));
    const rollbackState = fileState(path.join(dir, rollbackRel));
    const manifestState = fileState(path.join(dir, "manifest.json"));
    if (
      liveState.mode !== 0o600 ||
      rollbackState.mode !== 0o600 ||
      manifestState.mode !== 0o600 ||
      !liveState.bytes.equals(Buffer.from(derived.live.bytes, "utf8")) ||
      !rollbackState.bytes.equals(Buffer.from(derived.rollback.bytes, "utf8")) ||
      !manifestState.bytes.equals(manifestBytes)
    ) {
      fail("existing_stage_identity_mismatch");
    }
    return {
      out_dir: dir,
      stage_reused: true,
      manifest_sha256: sha256(manifestBytes),
      live_path: path.join(dir, liveRel),
      rollback_path: path.join(dir, rollbackRel),
    };
  };

  if (fs.existsSync(outDir)) return Object.freeze(verifyExisting());

  const temp = fs.mkdtempSync(
    path.join(parent, "." + path.basename(outDir) + ".tmp-"),
  );
  try {
    fs.chmodSync(temp, 0o700);
    for (const name of ["live", "rollback"]) {
      fs.mkdirSync(path.join(temp, name), { mode: 0o700 });
      fs.chmodSync(path.join(temp, name), 0o700);
    }
    fs.writeFileSync(
      path.join(temp, liveRel),
      derived.live.bytes,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(temp, rollbackRel),
      derived.rollback.bytes,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(temp, "manifest.json"),
      manifestBytes,
      { flag: "wx", mode: 0o600 },
    );
    fs.renameSync(temp, outDir);
  } catch (error) {
    fs.rmSync(temp, { recursive: true, force: true });
    throw error;
  }

  const verified = verifyExisting();
  return Object.freeze({
    ...verified,
    stage_reused: false,
  });
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (direct) {
  try {
    const args = process.argv.slice(2);
    if (
      args.length !== 6 ||
      args[0] !== "--preflight-log" ||
      args[2] !== "--out-dir" ||
      args[4] !== "--active-dropin-dir"
    ) {
      fail(
        "usage: --preflight-log /absolute/preflight.log " +
        "--out-dir /absolute/stage-dir " +
        "--active-dropin-dir /absolute/systemd-dropin-dir",
      );
    }
    const [logPath, outDir, activeDropinDir] = [args[1], args[3], args[5]];
    for (const [value, label] of [
      [logPath, "preflight_log"],
      [outDir, "out_dir"],
      [activeDropinDir, "active_dropin_dir"],
    ]) {
      if (!path.isAbsolute(value) || path.resolve(value) !== value) {
        fail(label + "_path_invalid");
      }
    }
    const logStat = fs.lstatSync(logPath);
    if (!logStat.isFile() || logStat.isSymbolicLink()) {
      fail("preflight_log_not_direct_regular");
    }
    const result = stageVoidBuyVoidPrecisionAtomicActivationV1({
      preflightText: fs.readFileSync(logPath, "utf8"),
      outDir,
      activeDropinDir,
    });
    console.log(VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1);
    console.log("status=STAGED_NOT_ACTIVATED");
    console.log("out_dir=" + result.out_dir);
    console.log("stage_reused=" + String(result.stage_reused));
    console.log("live_path=" + result.live_path);
    console.log("rollback_path=" + result.rollback_path);
    console.log("manifest_sha256=" + result.manifest_sha256);
    console.log("active_dropin_write=false");
    console.log("daemon_reload=false");
    console.log("service_mutation=false");
    console.log("runtime_gate_mutation=false");
    console.log("transaction_broadcast=false");
    console.log("funds_movement=false");
    console.log(
      "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1_DONE",
    );
  } catch (error) {
    console.error(
      "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1_HOLD",
    );
    console.error(
      "reason=" +
        (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 2;
  }
}
