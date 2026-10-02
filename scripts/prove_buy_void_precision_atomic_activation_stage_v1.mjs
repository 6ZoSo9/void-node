#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1,
  renderVoidBuyVoidPrecisionAtomicActivationDropinV1,
} from "../tools/void-buy-void-precision-atomic-activation-preflight-v1.mjs";

const ROOT = process.cwd();
const TOOL = path.join(
  ROOT,
  "tools/void-buy-void-precision-atomic-activation-stage-v1.mjs",
);
const WRAPPER = path.join(
  ROOT,
  "ops/precision/void_precision_buy_void_atomic_activation_stage_v1.sh",
);

const LIVE_CONFIGURATION_SHA256 =
  "88513c7982057b95380b9029157df9414203033d463aba9534d96bfc2854c14f";
const LIVE_DROPIN_SHA256 =
  "2772e133833575e1ed9042ff3a4f114eccfb378c6a5655dcfaeb16823c068bb9";
const DORMANT_CONFIGURATION_SHA256 =
  "f5366e8f24d664b7dbfebba5d39b04d2ee7ac9e1a98064190a1e133b6c2a5e87";
const DORMANT_DROPIN_SHA256 =
  "13e1571f1278809527a629812631e4c0413a1066ff000dc4befa341c7b17ebf7";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const live = renderVoidBuyVoidPrecisionAtomicActivationDropinV1({
  generation_id: "voidbvpcg1_" + LIVE_CONFIGURATION_SHA256,
  configuration_sha256: LIVE_CONFIGURATION_SHA256,
  mode: "live_apply",
});
const rollback = renderVoidBuyVoidPrecisionAtomicActivationDropinV1({
  generation_id: "voidbvpcg1_" + DORMANT_CONFIGURATION_SHA256,
  configuration_sha256: DORMANT_CONFIGURATION_SHA256,
  mode: "dormant_rollback",
});
assert.equal(live.basename, VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1);
assert.equal(rollback.basename, VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1);
assert.equal(live.sha256, LIVE_DROPIN_SHA256);
assert.equal(rollback.sha256, DORMANT_DROPIN_SHA256);
assert(live.bytes.includes(
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=1",
));
assert(live.bytes.includes(
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=1",
));
assert(rollback.bytes.includes(
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0",
));
assert(rollback.bytes.includes(
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0",
));

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-void-atomic-stage-proof-"),
);
try {
  const active = path.join(tmp, "active-dropins");
  const stageRoot = path.join(tmp, "stage-root");
  fs.mkdirSync(active, { mode: 0o700 });
  fs.mkdirSync(stageRoot, { mode: 0o700 });

  const logPath = path.join(tmp, "preflight.log");
  const receipt = [
    "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_WRAPPER_V1",
    "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1",
    "phase=full_preflight",
    "status=ATOMIC_ACTIVATION_PREFLIGHT_GREEN_NOT_AUTHORIZED",
    "activation_ready=true",
    "activation_authorized=false",
    "unreviewed_gate_source_count=0",
    "canonical_remote_url=https://github.com/6ZoSo9/void-node.git",
    "repository_head_sha=" + "7".repeat(40),
    "repository_tree_sha=" + "8".repeat(40),
    "remote_main_sha=" + "7".repeat(40),
    "source_slice_manifest_sha256=" + "9".repeat(64),
    "source_slice_count=22",
    "preflight_wrapper_git_blob_sha1=" + "a".repeat(40),
    "preflight_tool_git_blob_sha1=" + "b".repeat(40),
    "reviewed_source_slice_green=true",
    "live_configuration_generation_id=voidbvpcg1_" +
      LIVE_CONFIGURATION_SHA256,
    "live_configuration_sha256=" + LIVE_CONFIGURATION_SHA256,
    "live_dropin_sha256=" + LIVE_DROPIN_SHA256,
    "dormant_configuration_generation_id=voidbvpcg1_" +
      DORMANT_CONFIGURATION_SHA256,
    "dormant_configuration_sha256=" + DORMANT_CONFIGURATION_SHA256,
    "dormant_dropin_sha256=" + DORMANT_DROPIN_SHA256,
    "runtime_gate_mutation_performed=false",
    "service_mutation_performed=false",
    "transaction_broadcast_performed=false",
    "funds_movement_performed=false",
    "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1_DONE",
    "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_WRAPPER_V1_DONE",
    "",
  ].join("\n");
  fs.writeFileSync(logPath, receipt, { mode: 0o600 });

  function run(log, out, extraEnv = {}) {
    return spawnSync(
      process.execPath,
      [
        TOOL,
        "--preflight-log",
        log,
        "--out-dir",
        out,
        "--active-dropin-dir",
        active,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, ...extraEnv },
      },
    );
  }

  {
    const looseLog = path.join(tmp, "preflight-loose-mode.log");
    fs.writeFileSync(looseLog, receipt, { mode: 0o600 });
    fs.chmodSync(looseLog, 0o644);
    const loose = run(
      looseLog,
      path.join(stageRoot, "preflight-loose-mode"),
    );
    assert.equal(loose.status, 2);
    assert.match(loose.stderr, /preflight_log_mode_mismatch/u);
  }

  {
    const hardlinkLog = path.join(tmp, "preflight-hardlink.log");
    fs.linkSync(logPath, hardlinkLog);
    const linked = run(
      hardlinkLog,
      path.join(stageRoot, "preflight-hardlink"),
    );
    assert.equal(linked.status, 2);
    assert.match(linked.stderr, /preflight_log_hardlink_forbidden/u);
    fs.unlinkSync(hardlinkLog);
  }

  {
    const looseParent = path.join(tmp, "loose-preflight-parent");
    fs.mkdirSync(looseParent, { mode: 0o700 });
    fs.chmodSync(looseParent, 0o755);
    const looseParentLog = path.join(looseParent, "preflight.log");
    fs.writeFileSync(looseParentLog, receipt, { mode: 0o600 });
    const held = run(
      looseParentLog,
      path.join(stageRoot, "preflight-loose-parent"),
    );
    assert.equal(held.status, 2);
    assert.match(held.stderr, /preflight_log_parent_mode_mismatch/u);
  }

  const out = path.join(stageRoot, LIVE_CONFIGURATION_SHA256);
  const first = run(logPath, out);
  assert.equal(first.status, 0, first.stderr);
  assert.match(
    first.stdout,
    /status=STAGED_BYTES_ONLY_NOT_PREFLIGHT_AUTHORITY/u,
  );
  assert.match(first.stdout, /stage_reused=false/u);
  assert.match(first.stdout, /fresh_preflight_execution_proven=false/u);
  assert.match(first.stdout, /manifest_is_preflight_authority=false/u);
  assert.match(first.stdout, /active_dropin_write=false/u);
  assert.match(first.stdout, /runtime_gate_mutation=false/u);

  const livePath = path.join(
    out,
    "live",
    VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1,
  );
  const rollbackPath = path.join(
    out,
    "rollback",
    VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1,
  );
  const manifestPath = path.join(out, "manifest.json");
  assert.equal(sha256(fs.readFileSync(livePath)), LIVE_DROPIN_SHA256);
  assert.equal(sha256(fs.readFileSync(rollbackPath)), DORMANT_DROPIN_SHA256);
  assert.equal(fs.statSync(out).mode & 0o777, 0o700);
  assert.equal(fs.statSync(path.join(out, "live")).mode & 0o777, 0o700);
  assert.equal(
    fs.statSync(path.join(out, "rollback")).mode & 0o777,
    0o700,
  );
  assert.equal(fs.statSync(livePath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(rollbackPath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(manifestPath).mode & 0o777, 0o600);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(
    manifest.marker,
    "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1",
  );
  assert.equal(
    manifest.status,
    "STAGED_BYTES_ONLY_NOT_PREFLIGHT_AUTHORITY",
  );
  assert.equal(
    manifest.preflight.supplied_log_sha256,
    sha256(Buffer.from(receipt, "utf8")),
  );
  assert.equal(manifest.preflight.structural_validation_only, true);
  assert.equal(manifest.preflight.fresh_execution_proven, false);
  assert.equal(manifest.preflight.manifest_is_preflight_authority, false);
  assert.equal(manifest.preflight.live_dropin_sha256, LIVE_DROPIN_SHA256);
  assert.equal(
    manifest.preflight.dormant_dropin_sha256,
    DORMANT_DROPIN_SHA256,
  );
  assert.equal(
    manifest.authority.preflight_text_structural_validation_only,
    true,
  );
  assert.equal(manifest.authority.fresh_preflight_execution_proven, false);
  assert.equal(manifest.authority.manifest_is_preflight_authority, false);
  assert.equal(manifest.authority.durable_fsync_publication_required, true);
  assert.equal(manifest.authority.private_stage_custody_required, true);
  assert.equal(manifest.authority.active_dropin_write, false);
  assert.equal(manifest.authority.daemon_reload, false);
  assert.equal(manifest.authority.service_restart, false);
  assert.equal(manifest.authority.runtime_gate_mutation, false);
  assert.equal(manifest.authority.transaction_broadcast, false);
  assert.equal(manifest.authority.funds_movement, false);

  const second = run(logPath, out);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /stage_reused=true/u);

  {
    const liveDir = path.join(out, "live");
    const moved = path.join(out, "live.direct");
    fs.renameSync(liveDir, moved);
    fs.symlinkSync(moved, liveDir);
    const symlinked = run(logPath, out);
    assert.equal(symlinked.status, 2);
    assert.match(
      symlinked.stderr,
      /existing_live_directory_not_direct_directory/u,
    );
    fs.unlinkSync(liveDir);
    fs.renameSync(moved, liveDir);
  }

  {
    const rollbackDir = path.join(out, "rollback");
    fs.chmodSync(rollbackDir, 0o755);
    const looseMode = run(logPath, out);
    assert.equal(looseMode.status, 2);
    assert.match(
      looseMode.stderr,
      /existing_rollback_directory_mode_mismatch/u,
    );
    fs.chmodSync(rollbackDir, 0o700);
  }

  {
    const hardlink = path.join(tmp, "live-hardlink.conf");
    fs.linkSync(livePath, hardlink);
    const linked = run(logPath, out);
    assert.equal(linked.status, 2);
    assert.match(
      linked.stderr,
      /existing_live_file_hardlink_forbidden/u,
    );
    fs.unlinkSync(hardlink);
  }

  {
    const interruptedBefore =
      path.join(stageRoot, "interrupted-before-rename");
    const interrupted = run(logPath, interruptedBefore, {
      VOID_BUY_VOID_STAGE_TEST_INTERRUPT_AFTER_DURABLE_TEMP: "1",
    });
    assert.equal(interrupted.status, 2);
    assert.match(
      interrupted.stderr,
      /test_interruption_after_durable_temp_before_rename/u,
    );
    assert.equal(fs.existsSync(interruptedBefore), false);
    assert.equal(
      fs.readdirSync(stageRoot).some(
        (name) => name.startsWith(".interrupted-before-rename.tmp-"),
      ),
      false,
    );
  }

  {
    const interruptedAfter =
      path.join(stageRoot, "interrupted-after-rename");
    const interrupted = run(logPath, interruptedAfter, {
      VOID_BUY_VOID_STAGE_TEST_INTERRUPT_AFTER_RENAME_BEFORE_PARENT_FSYNC:
        "1",
    });
    assert.equal(interrupted.status, 2);
    assert.match(
      interrupted.stderr,
      /test_interruption_after_rename_before_parent_fsync/u,
    );
    assert.equal(fs.existsSync(interruptedAfter), true);
    const recovered = run(logPath, interruptedAfter);
    assert.equal(recovered.status, 0, recovered.stderr);
    assert.match(recovered.stdout, /stage_reused=true/u);
  }

  const badReceiptPath = path.join(tmp, "bad-preflight.log");
  fs.writeFileSync(
    badReceiptPath,
    receipt.replace(
      "live_dropin_sha256=" + LIVE_DROPIN_SHA256,
      "live_dropin_sha256=" + "0".repeat(64),
    ),
    { mode: 0o600 },
  );
  const badReceipt = run(
    badReceiptPath,
    path.join(stageRoot, "bad-receipt"),
  );
  assert.equal(badReceipt.status, 2);
  assert.match(badReceipt.stderr, /live_dropin_hash_mismatch/u);

  const overlap = run(logPath, path.join(active, "forbidden-stage"));
  assert.equal(overlap.status, 2);
  assert.match(
    overlap.stderr,
    /staging_path_overlaps_active_dropin_tree/u,
  );

  fs.writeFileSync(livePath, live.bytes + "# tampered\n", "utf8");
  const tampered = run(logPath, out);
  assert.equal(tampered.status, 2);
  assert.match(tampered.stderr, /existing_stage_identity_mismatch/u);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

const toolSource = fs.readFileSync(TOOL, "utf8");
for (const forbidden of [
  "systemctl",
  "daemon-reload",
  "eth_sendRawTransaction",
  "sign_transaction",
  "new Wallet(",
]) {
  assert.equal(toolSource.includes(forbidden), false, forbidden);
}
for (const required of [
  "fs.fsyncSync",
  "fsyncDirectory(parent)",
  "writeDurablePrivateFile",
  "readPrivatePreflightLogV1",
  "fs.constants.O_NOFOLLOW",
  "fs.fstatSync(fd, { bigint: true })",
  "preflight_log_hardlink_forbidden",
  "preflight_log_changed_during_read",
  "preflight_log_path_changed_during_read",
  "MAX_PREFLIGHT_LOG_BYTES_V1",
  "const liveBytesSha256 = sha256(liveBytes)",
  "const rollbackBytesSha256 = sha256(rollbackBytes)",
  "private_stage_custody_required",
  "manifest_is_preflight_authority: false",
  "VOID_BUY_VOID_STAGE_TEST_INTERRUPT_AFTER_DURABLE_TEMP",
  "VOID_BUY_VOID_STAGE_TEST_INTERRUPT_AFTER_RENAME_BEFORE_PARENT_FSYNC",
]) {
  assert(toolSource.includes(required), required);
}
const durableTempFsyncAt = toolSource.indexOf("fsyncDirectory(temp)");
const publishRenameAt = toolSource.indexOf("fs.renameSync(temp, outDir)");
const parentFsyncAfterRenameAt =
  toolSource.indexOf("fsyncDirectory(parent)", publishRenameAt);
assert(durableTempFsyncAt >= 0);
assert(publishRenameAt > durableTempFsyncAt);
assert(parentFsyncAfterRenameAt > publishRenameAt);

assert.equal(
  toolSource.includes('fs.readFileSync(logPath, "utf8")'),
  false,
  "preflight log must not be validate-then-reopened by pathname",
);

const wrapperSource = fs.readFileSync(WRAPPER, "utf8");
for (const forbidden of [
  "systemctl --user daemon-reload",
  "systemctl --user restart",
  "systemctl --user stop",
  "systemctl --user start",
]) {
  assert.equal(wrapperSource.includes(forbidden), false, forbidden);
}
assert.equal(
  wrapperSource.includes('mkdir -p "$HOME/.config/void" "$stage_root"'),
  false,
);
assert(
  wrapperSource.indexOf('test -d "$dir" && test ! -L "$dir"') >= 0,
);
assert(
  wrapperSource.indexOf('test -d "$dir" && test ! -L "$dir"') <
    wrapperSource.indexOf('chmod 700 "$dir"'),
);
for (const required of [
  'git_bin="/usr/bin/git"',
  'bash_bin="/usr/bin/bash"',
  'node_bin="/usr/bin/node"',
  '"$git_bin" --no-replace-objects -C "$repo"',
  'GIT_CONFIG_GLOBAL=/dev/null',
  'GIT_CONFIG_NOSYSTEM=1',
  'config --local --no-includes --get remote.origin.url',
  'mkdir -m 700 -- "$dir"',
  'ensure_private_direct_dir "$HOME/.config/void" "void_config_dir"',
  'ensure_private_direct_dir "$stage_root" "stage_root"',
  'exec "$bash_bin" --noprofile --norc',
  'unset BASH_ENV ENV NODE_OPTIONS NODE_PATH NPM_CONFIG_PREFIX npm_config_prefix',
  'chmod 600 "$preflight_log"',
  'captured_preflight_log_sha256="$(',
  'preflight_log_digest_captured_before_staging=true',
  'preflight_log_private_custody=true',
  'test "$preflight_repository_head_sha" = "$head"',
  'test "$preflight_wrapper_git_blob_sha1" = "${source_blob[$preflight_wrapper_rel]}"',
  'test "$preflight_repository_tree_sha" = "$tree"',
  'repository_head_changed_after_preflight',
  'reviewed_runtime="$tmp/reviewed-stage-runtime"',
  'safe_git cat-file blob "$head:$rel"',
  'reviewed_stage_tool="$reviewed_runtime/$(basename "$stage_tool_rel")"',
  'immutable_stage_source_materialized=true',
  'unset NODE_OPTIONS NODE_PATH NPM_CONFIG_PREFIX npm_config_prefix',
  'unset LD_PRELOAD LD_LIBRARY_PATH',
  'exec "$node_bin" "$reviewed_stage_tool"',
  '--active-dropin-dir "$active_dropin_dir"',
  'sha256sum "$preflight_log"',
  'test "$observed_preflight_log_sha256" = "$captured_preflight_log_sha256"',
  'test "$staged_preflight_log_sha256" = "$captured_preflight_log_sha256"',
  'actual_live_dropin_sha256="$(sha256sum "$live_path" | awk',
  'actual_dormant_dropin_sha256="$(sha256sum "$rollback_path" | awk',
  'test "$actual_live_dropin_sha256" = "$live_dropin_sha256"',
  'test "$actual_dormant_dropin_sha256" = "$dormant_dropin_sha256"',
  'wrapper_fresh_preflight_execution_proven=true',
  'stage_manifest_preflight_authority=false',
  'test "$pid_after" = "$pid_before"',
  'test "$inv_after" = "$inv_before"',
]) {
  assert(wrapperSource.includes(required), required);
}
assert.equal(
  wrapperSource.includes('node "$repo/$stage_tool_rel"'),
  false,
  "worktree stage tool must not execute after preflight",
);
const preflightDigestAt = wrapperSource.indexOf(
  'captured_preflight_log_sha256="$(' ,
);
const preflightGreenAt = wrapperSource.indexOf(
  'say "fresh_atomic_preflight_green=true"',
);
const immutableMaterializeAt = wrapperSource.indexOf(
  'reviewed_runtime="$tmp/reviewed-stage-runtime"',
);
const immutableExecuteAt = wrapperSource.indexOf(
  'exec "$node_bin" "$reviewed_stage_tool"',
);
assert(preflightDigestAt >= 0);
assert(preflightGreenAt > preflightDigestAt);
assert(immutableMaterializeAt > preflightGreenAt);
assert(immutableExecuteAt > immutableMaterializeAt);

const workflowSource = fs.readFileSync(
  ".github/workflows/buy-void-precision-atomic-activation-stage-v1.yml",
  "utf8",
);
assert(
  workflowSource.includes(
    'ref: ${{ github.event.pull_request.head.sha || github.sha }}',
  ),
  "focused workflow must check out exact PR head",
);
assert.match(workflowSource, /persist-credentials:\s*false/u);
assert.equal(
  workflowSource.split(
    '- "ops/precision/void_precision_buy_void_atomic_activation_preflight_v1.sh"',
  ).length - 1,
  2,
  "preflight wrapper must trigger both PR and main focused workflows",
);

console.log("VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1_PROOF");
console.log("live_dropin_sha256=" + LIVE_DROPIN_SHA256);
console.log("dormant_dropin_sha256=" + DORMANT_DROPIN_SHA256);
console.log("inactive_staging_write_verified=true");
console.log("synthetic_receipt_preflight_authority=false");
console.log("idempotent_exact_reuse_verified=true");
console.log("private_stage_custody_verified=true");
console.log("rendered_bytes_independently_hashed=true");
console.log("wrapper_staged_bytes_rehashed=true");
console.log("immutable_stage_source_execution_bound=true");
console.log("descriptor_bound_preflight_log_read=true");
console.log("private_preflight_log_custody_bound=true");
console.log("preflight_log_loose_mode_rejected=true");
console.log("preflight_log_hardlink_rejected=true");
console.log("preflight_log_nonprivate_parent_rejected=true");
console.log("preflight_log_digest_captured_before_staging=true");
console.log("reviewed_git_boundary_bound=true");
console.log("exact_head_workflow_bound=true");
console.log("durable_fsync_publication_verified=true");
console.log("pre_rename_interruption_cleanup_verified=true");
console.log("post_rename_reuse_redurability_verified=true");
console.log("tamper_rejection_verified=true");
console.log("active_dropin_tree_rejection_verified=true");
console.log("service_mutation=false");
console.log("runtime_gate_mutation=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
console.log("VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1_GREEN");
