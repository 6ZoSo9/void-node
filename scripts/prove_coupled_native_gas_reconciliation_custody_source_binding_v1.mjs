#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1,
  inspectCoupledNativeGasReconciliationCustodySourceBindingV1,
  testOnlyPinnedObservationPlanV1,
  testOnlyRepositoryCleanStateV1,
  testOnlyRequireObservationHeadUnchangedV1,
  testOnlyWorktreeGitBlobSha1V1,
} from "../tools/void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs";

const observed = () => ({
  repository_head_sha: "a".repeat(40),
  repository_tree_sha: "b".repeat(40),
  repository_origin: "https://github.com/6ZoSo9/void-node.git",
  worktree_clean: true,
  reviewed_base_is_ancestor: true,
  source_blobs:
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1
      .map((row) => ({
        ...row,
        worktree_git_blob_sha1: row.git_blob_sha1,
      })),
});

const baseline =
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1(observed());
assert.equal(baseline.ok, true);
if (!baseline.ok) throw new Error(baseline.reason);
assert.equal(
  baseline.marker,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
);
assert.equal(baseline.status, "SOURCE_GENERATION_BOUND_NOT_TRUSTED");
assert.equal(baseline.reviewed_source_count, 21);
assert.match(
  baseline.reviewed_source_manifest_sha256,
  /^[0-9a-f]{64}$/u,
);
assert.equal(
  baseline.reviewed_source_manifest_sha256,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
);
assert.equal(baseline.writer_generation_binding_proven, true);
assert.equal(baseline.qualification_generation_binding_proven, true);
assert.equal(baseline.collector_generation_binding_proven, true);
assert.equal(baseline.deployed_artifact_generation_verified, false);
assert.equal(baseline.trusted_collector_proven, false);
assert.equal(baseline.bootstrap_receipt_external_trust_proven, false);
assert.equal(baseline.evidence_generation_monotonicity_proven, false);
assert.equal(baseline.verification_clock_authority_proven, false);
assert.equal(baseline.live_host_qualification_performed, false);
assert.equal(baseline.storage_bootstrap, false);
assert.equal(baseline.runtime_integration, false);
assert.equal(baseline.production_gate_ready, false);
assert.equal(baseline.funds_movement, false);
assert.match(baseline.source_binding_id, /^voidngrcsb1_[0-9a-f]{64}$/u);
assert.equal(
  baseline.source_generation_id,
  "voidngrcsg1_" +
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
);
assert.equal(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1
    .index_manifest_rebound_after_worktree_census,
  true,
);
assert.equal(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1
    .reviewed_worktree_revalidated_after_clean_census,
  true,
);

const alternativeHead =
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1({
    ...observed(),
    repository_head_sha: "c".repeat(40),
  });
assert.equal(alternativeHead.ok, true);
if (!alternativeHead.ok) throw new Error(alternativeHead.reason);
assert.notEqual(alternativeHead.source_binding_id, baseline.source_binding_id);
assert.equal(alternativeHead.source_generation_id, baseline.source_generation_id);

for (let index = 0; index <
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1.length;
  index += 1
) {
  const candidate = observed();
  candidate.source_blobs[index].git_blob_sha1 = "0".repeat(40);
  const held =
    testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1(candidate);
  assert.equal(held.ok, false, candidate.source_blobs[index].path);
  if (held.ok) throw new Error("expected source drift HOLD");
  assert.equal(
    held.reason,
    "source_binding_reviewed_source_drift:" +
      candidate.source_blobs[index].path,
  );
}

for (let index = 0; index <
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1.length;
  index += 1
) {
  const candidate = observed();
  candidate.source_blobs[index].worktree_git_blob_sha1 =
    "0".repeat(40);
  const held =
    testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1(candidate);
  assert.equal(held.ok, false, candidate.source_blobs[index].path);
  if (held.ok) throw new Error("expected worktree source drift HOLD");
  assert.equal(
    held.reason,
    "source_binding_reviewed_source_worktree_drift:" +
      candidate.source_blobs[index].path,
  );
}

for (const [label, mutate, reason] of [
  [
    "dirty worktree",
    (input) => { input.worktree_clean = false; },
    "source_binding_worktree_not_clean",
  ],
  [
    "missing reviewed ancestry",
    (input) => { input.reviewed_base_is_ancestor = false; },
    "source_binding_reviewed_base_not_ancestor",
  ],
  [
    "wrong repository origin",
    (input) => { input.repository_origin = "https://example.com/void-node.git"; },
    "source_binding_repository_origin_invalid",
  ],
  [
    "bad head",
    (input) => { input.repository_head_sha = "nope"; },
    "source_binding_repository_identity_invalid",
  ],
  [
    "missing source record",
    (input) => { input.source_blobs.pop(); },
    "source_binding_source_blob_count_mismatch",
  ],
  [
    "duplicate source record",
    (input) => {
      input.source_blobs[1] = { ...input.source_blobs[0] };
    },
    "source_binding_source_blob_record_invalid",
  ],
]) {
  const candidate = observed();
  mutate(candidate);
  const held =
    testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1(candidate);
  assert.equal(held.ok, false, label);
  if (held.ok) throw new Error("expected " + label + " HOLD");
  assert.equal(held.reason, reason, label);
  assert.equal(held.writer_generation_binding_proven, false, label);
  assert.equal(held.production_gate_ready, false, label);
}

for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_only_contract",
    "git_repository_identity_read",
    "subprocess_git_read",
    "filesystem_read",
    "clean_worktree_required",
    "reviewed_base_ancestry_required",
    "exact_reviewed_git_blobs_required",
    "exact_reviewed_worktree_bytes_required",
    "reviewed_package_tsconfig_context_bound",
    "writer_generation_binding_proven_on_success",
    "qualification_generation_binding_proven_on_success",
    "collector_generation_binding_proven_on_success",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

const poison = {
  GIT_DIR: process.env.GIT_DIR,
  GIT_WORK_TREE: process.env.GIT_WORK_TREE,
  GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
  GIT_CONFIG_SYSTEM: process.env.GIT_CONFIG_SYSTEM,
  GIT_REPLACE_REF_BASE: process.env.GIT_REPLACE_REF_BASE,
};
try {
  process.env.GIT_DIR = "/tmp/void-fake-git-dir";
  process.env.GIT_WORK_TREE = "/tmp/void-fake-worktree";
  process.env.GIT_CONFIG_GLOBAL = "/tmp/void-fake-global";
  process.env.GIT_CONFIG_SYSTEM = "/tmp/void-fake-system";
  process.env.GIT_REPLACE_REF_BASE = "refs/replace/fake";

  const live = inspectCoupledNativeGasReconciliationCustodySourceBindingV1();
  assert.equal(live.ok, true);
  if (!live.ok) throw new Error(live.reason);
  assert.equal(live.writer_generation_binding_proven, true);
  assert.equal(live.trusted_collector_proven, false);
  assert.equal(live.live_host_qualification_performed, false);
  assert.equal(live.production_gate_ready, false);
} finally {
  for (const [key, value] of Object.entries(poison)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

for (const [flag, clearFlag] of [
  ["--assume-unchanged", "--no-assume-unchanged"],
  ["--skip-worktree", "--no-skip-worktree"],
]) {
  const target = "package.json";
  const original = fs.readFileSync(target);
  const runGit = (args) =>
    spawnSync("/usr/bin/git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
      },
    });
  try {
    const marked = runGit(["update-index", flag, target]);
    assert.equal(marked.status, 0, String(marked.stderr || ""));

    fs.writeFileSync(
      target,
      Buffer.concat([
        original,
        Buffer.from("\n", "utf8"),
      ]),
    );

    const hiddenStatus = runGit([
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]);
    assert.equal(hiddenStatus.status, 0);
    assert.equal(
      String(hiddenStatus.stdout || "").trim(),
      "",
      flag + " must reproduce hidden worktree drift",
    );

    const headResult = runGit(["rev-parse", "HEAD"]);
    assert.equal(headResult.status, 0, String(headResult.stderr || ""));
    assert.throws(
      () =>
        testOnlyRepositoryCleanStateV1(
          String(headResult.stdout || "").trim(),
        ),
      /source_binding_repository_index_flags_forbidden/u,
      flag + " must be rejected before clean-state authority",
    );

    const held =
      inspectCoupledNativeGasReconciliationCustodySourceBindingV1();
    assert.equal(held.ok, false, flag);
    if (held.ok) throw new Error("expected hidden worktree drift HOLD");
    assert.equal(
      held.reason,
      "source_binding_repository_index_flags_forbidden",
      flag,
    );
  } finally {
    fs.writeFileSync(target, original);
    const cleared = runGit(["update-index", clearFlag, target]);
    assert.equal(cleared.status, 0, String(cleared.stderr || ""));
  }
}


{
  const target = "package.json";
  const original = fs.readFileSync(target);
  const runGit = (args) =>
    spawnSync("/usr/bin/git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
      },
    });
  const headResult = runGit(["rev-parse", "HEAD"]);
  assert.equal(headResult.status, 0, String(headResult.stderr || ""));
  const head = String(headResult.stdout || "").trim();

  try {
    assert.throws(
      () =>
        testOnlyRepositoryCleanStateV1(head, {
          testOnlyAfterInitialIndexCheckBeforeManifest() {
            fs.writeFileSync(
              target,
              Buffer.concat([
                original,
                Buffer.from("\n", "utf8"),
              ]),
            );
            const staged = runGit(["add", "--", target]);
            assert.equal(
              staged.status,
              0,
              String(staged.stderr || ""),
            );
          },
        }),
      /source_binding_repository_index_changed_during_observation/u,
      "index/worktree mutation after the initial clean check must HOLD",
    );
  } finally {
    const reset = runGit(["reset", "--", target]);
    assert.equal(reset.status, 0, String(reset.stderr || ""));
    fs.writeFileSync(target, original);
  }
}

const pinnedHead = "1".repeat(40);
const pinnedPlan = testOnlyPinnedObservationPlanV1(pinnedHead);
assert.equal(pinnedPlan.head, pinnedHead);
assert.equal(pinnedPlan.tree_spec, pinnedHead + "^{tree}");
assert.equal(
  pinnedPlan.blob_spec("src/example.ts"),
  pinnedHead + ":src/example.ts",
);
assert.equal(pinnedPlan.ancestry_head, pinnedHead);
assert.equal(
  testOnlyRequireObservationHeadUnchangedV1(
    pinnedHead,
    pinnedHead,
  ),
  pinnedHead,
);
assert.throws(
  () =>
    testOnlyRequireObservationHeadUnchangedV1(
      pinnedHead,
      "2".repeat(40),
    ),
  /source_binding_repository_head_changed_during_observation/u,
);

{
  const filterKey = "filter.voidsourcebindingproof.clean";
  const runGit = (args) =>
    spawnSync("/usr/bin/git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
      },
    });

  try {
    const set = runGit([
      "config",
      "--local",
      filterKey,
      "/bin/false",
    ]);
    assert.equal(set.status, 0, String(set.stderr || ""));

    const held =
      inspectCoupledNativeGasReconciliationCustodySourceBindingV1();
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected filter config HOLD");
    assert.equal(
      held.reason,
      "source_binding_repository_filter_config_forbidden",
    );
  } finally {
    const unset = runGit([
      "config",
      "--local",
      "--unset-all",
      filterKey,
    ]);
    assert.ok(
      unset.status === 0 || unset.status === 5,
      String(unset.stderr || ""),
    );
  }
}

{
  const filterKey = "filter.voidsourcebindingworktree.clean";
  const runGit = (args) =>
    spawnSync("/usr/bin/git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
      },
    });

  const extensionBefore = runGit([
    "config",
    "--local",
    "--get",
    "extensions.worktreeConfig",
  ]);
  const extensionExisted = extensionBefore.status === 0;
  const extensionValue =
    extensionExisted
      ? String(extensionBefore.stdout || "").trim()
      : null;

  const configWorktreePathResult = runGit([
    "rev-parse",
    "--git-path",
    "config.worktree",
  ]);
  assert.equal(
    configWorktreePathResult.status,
    0,
    String(configWorktreePathResult.stderr || ""),
  );
  const configWorktreePath = path.resolve(
    process.cwd(),
    String(configWorktreePathResult.stdout || "").trim(),
  );
  const configWorktreeExisted = fs.existsSync(configWorktreePath);
  const configWorktreeBefore =
    configWorktreeExisted
      ? fs.readFileSync(configWorktreePath)
      : null;

  try {
    const enabled = runGit([
      "config",
      "--local",
      "extensions.worktreeConfig",
      "true",
    ]);
    assert.equal(enabled.status, 0, String(enabled.stderr || ""));

    const set = runGit([
      "config",
      "--worktree",
      filterKey,
      "/bin/false",
    ]);
    assert.equal(set.status, 0, String(set.stderr || ""));

    const held =
      inspectCoupledNativeGasReconciliationCustodySourceBindingV1();
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected worktree filter config HOLD");
    assert.equal(
      held.reason,
      "source_binding_repository_filter_config_forbidden",
    );
  } finally {
    if (configWorktreeExisted) {
      fs.writeFileSync(configWorktreePath, configWorktreeBefore);
    } else {
      fs.rmSync(configWorktreePath, { force: true });
    }

    if (extensionExisted) {
      const restored = runGit([
        "config",
        "--local",
        "extensions.worktreeConfig",
        extensionValue,
      ]);
      assert.equal(restored.status, 0, String(restored.stderr || ""));
    } else {
      const unset = runGit([
        "config",
        "--local",
        "--unset-all",
        "extensions.worktreeConfig",
      ]);
      assert.ok(
        unset.status === 0 || unset.status === 5,
        String(unset.stderr || ""),
      );
    }
  }
}

{
  const runGit = (args) =>
    spawnSync("/usr/bin/git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
      },
    });
  const commonResult = runGit(["rev-parse", "--git-common-dir"]);
  assert.equal(
    commonResult.status,
    0,
    String(commonResult.stderr || ""),
  );
  const commonRaw = String(commonResult.stdout || "").trim();
  const commonDir = path.isAbsolute(commonRaw)
    ? path.resolve(commonRaw)
    : path.resolve(process.cwd(), commonRaw);
  const attributesPath = path.join(commonDir, "info", "attributes");
  const attributesExisted = fs.existsSync(attributesPath);
  const attributesBefore = attributesExisted
    ? fs.readFileSync(attributesPath)
    : null;
  const filterKey = "filter.voidsourcebindingrace.clean";
  const sentinel = path.join(
    process.cwd(),
    ".void-source-binding-filter-race-sentinel",
  );
  const headResult = runGit(["rev-parse", "HEAD"]);
  assert.equal(headResult.status, 0, String(headResult.stderr || ""));
  const head = String(headResult.stdout || "").trim();

  try {
    fs.mkdirSync(path.dirname(attributesPath), { recursive: true });
    fs.writeFileSync(
      attributesPath,
      "package.json filter=voidsourcebindingrace\n",
      { mode: 0o600 },
    );
    const set = runGit([
      "config",
      "--local",
      filterKey,
      "sh -c 'echo executed > " + sentinel + "; cat'",
    ]);
    assert.equal(set.status, 0, String(set.stderr || ""));
    fs.rmSync(sentinel, { force: true });

    assert.equal(
      testOnlyRepositoryCleanStateV1(head),
      true,
      "clean-state plumbing must not execute repository filters",
    );
    assert.equal(
      fs.existsSync(sentinel),
      false,
      "repository filter must not execute in clean-state proof",
    );
  } finally {
    fs.rmSync(sentinel, { force: true });
    const unset = runGit([
      "config",
      "--local",
      "--unset-all",
      filterKey,
    ]);
    assert.ok(
      unset.status === 0 || unset.status === 5,
      String(unset.stderr || ""),
    );
    if (attributesExisted) {
      fs.writeFileSync(attributesPath, attributesBefore);
    } else {
      fs.rmSync(attributesPath, { force: true });
    }
  }
}

{
  const common = spawnSync(
    "/usr/bin/git",
    ["rev-parse", "--git-common-dir"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
      },
    },
  );
  assert.equal(common.status, 0, String(common.stderr || ""));
  const commonDirRaw = String(common.stdout || "").trim();
  const commonDir = path.isAbsolute(commonDirRaw)
    ? path.resolve(commonDirRaw)
    : path.resolve(process.cwd(), commonDirRaw);
  const grafts = path.join(commonDir, "info", "grafts");
  const existed = fs.existsSync(grafts);
  const original = existed ? fs.readFileSync(grafts) : null;
  const currentHead = spawnSync(
    "/usr/bin/git",
    ["rev-parse", "HEAD"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
      },
    },
  );
  assert.equal(currentHead.status, 0);
  try {
    fs.mkdirSync(path.dirname(grafts), { recursive: true });
    fs.writeFileSync(
      grafts,
      String(currentHead.stdout || "").trim() +
        " " +
        "70faa71371eed9a8a0de4ffeb6c20e2c737cbc66" +
        "\n",
      { mode: 0o600 },
    );

    const held =
      inspectCoupledNativeGasReconciliationCustodySourceBindingV1();
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected graft overlay HOLD");
    assert.equal(
      held.reason,
      "source_binding_repository_grafts_forbidden",
    );
  } finally {
    if (existed) fs.writeFileSync(grafts, original);
    else fs.rmSync(grafts, { force: true });
  }
}

{
  const root = fs.mkdtempSync(
    path.join(process.cwd(), ".void-source-binding-reader-proof-"),
  );
  const regular = path.join(root, "regular.txt");
  const relative = path.relative(process.cwd(), regular);
  try {
    fs.writeFileSync(regular, Buffer.from("reviewed-bytes\n", "utf8"));

    assert.match(
      testOnlyWorktreeGitBlobSha1V1(relative),
      /^[0-9a-f]{40}$/u,
    );

    assert.throws(
      () =>
        testOnlyWorktreeGitBlobSha1V1(relative, {
          testOnlyAfterOpenBeforeRead(absolute) {
            fs.appendFileSync(
              absolute,
              Buffer.from("growth", "utf8"),
            );
          },
        }),
      /source_binding_worktree_file_growth:/u,
    );

    fs.writeFileSync(regular, Buffer.from("reviewed-bytes\n", "utf8"));
    assert.throws(
      () =>
        testOnlyWorktreeGitBlobSha1V1(relative, {
          testOnlyAfterLstatBeforeOpen(absolute) {
            fs.unlinkSync(absolute);
            const made = spawnSync(
              "/usr/bin/mkfifo",
              [absolute],
              {
                encoding: "utf8",
                env: {
                  PATH: "/usr/bin:/bin",
                  LANG: "C",
                  LC_ALL: "C",
                },
              },
            );
            assert.equal(
              made.status,
              0,
              String(made.stderr || ""),
            );
          },
        }),
      /source_binding_worktree_file_changed:/u,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log(
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1_GREEN",
);
console.log("reviewed_source_count=21");
console.log("exact_reviewed_git_blobs_required=true");
console.log("exact_reviewed_worktree_bytes_required=true");
console.log("reviewed_base_ancestry_required=true");
console.log("clean_worktree_required=true");
console.log("ambient_git_overrides_ignored=true");
console.log("immutable_commit_observation_plan=true");
console.log("final_head_drift_rejected=true");
console.log("repository_filter_config_rejected=true");
console.log("repository_filter_toctou_execution_removed=true");
console.log("repository_index_suppression_flags_rejected=true");
console.log("repository_clean_state_uses_nonconverting_plumbing=true");
console.log("repository_all_tracked_bytes_match_index_without_filters=true");
console.log("per_worktree_filter_config_rejected=true");
console.log("legacy_graft_overlay_rejected=true");
console.log("nonblocking_worktree_open=true");
console.log("bounded_worktree_read_with_growth_probe=true");
console.log("writer_generation_binding_proven=true");
console.log("qualification_generation_binding_proven=true");
console.log("collector_generation_binding_proven=true");
console.log("trusted_collector_proven=false");
console.log("bootstrap_receipt_external_trust_proven=false");
console.log("evidence_generation_monotonicity_proven=false");
console.log("verification_clock_authority_proven=false");
console.log("live_host_qualification_performed=false");
console.log("storage_bootstrap=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("index_manifest_rebound_after_worktree_census=true");
console.log("reviewed_worktree_revalidated_after_clean_census=true");
console.log("mid_observation_index_stage_race_rejected=true");
console.log("funds_movement=false");
