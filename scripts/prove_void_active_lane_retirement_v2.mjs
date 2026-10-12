#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  RETIREMENT_MARKER,
  applyRetirement,
  confirmationToken,
  parseArgs,
  parseWorktreePorcelain,
  planRetirement,
  resolveRetirementLineage,
  validateCandidate,
} from "../tools/void-active-lane-retirement-v2.mjs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (options.check !== false && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${
        (result.stderr || result.stdout || "").trim()
      }`,
    );
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function git(repo, args, options = {}) {
  return run("git", ["-C", repo, ...args], options);
}

function head(repo) {
  return git(repo, ["rev-parse", "HEAD"]).stdout.trim();
}

function createCandidate({ repo, root, name, merge = true, push = true }) {
  const worktree = join(root, `${name.replaceAll("/", "-")}-worktree`);
  git(repo, ["worktree", "add", "-b", name, worktree, "main"]);
  writeFileSync(join(worktree, "candidate.txt"), `${name}\n`);
  git(worktree, ["add", "candidate.txt"]);
  git(worktree, ["commit", "-m", `candidate ${name}`]);
  const candidateHead = head(worktree);
  if (merge) {
    git(repo, ["merge", "--ff-only", name]);
    git(repo, ["push", "origin", "main"]);
  }
  if (push) {
    git(repo, ["push", "origin", `${name}:${name}`]);
  }
  return { worktree, candidateHead };
}

function createSquashCandidate({ repo, root, name }) {
  const candidate = createCandidate({
    repo,
    root,
    name,
    merge: false,
    push: true,
  });
  git(repo, ["merge", "--squash", name]);
  git(repo, ["commit", "-m", `squash ${name}`]);
  const mergeCommit = head(repo);
  git(repo, ["push", "origin", "main"]);
  return { ...candidate, mergeCommit };
}

function mergedPr({ number, branch, headOid, mergeOid }) {
  return {
    number,
    state: "MERGED",
    baseRefName: "main",
    headRefName: branch,
    headRefOid: headOid,
    mergeCommit: { oid: mergeOid },
    title: `merged ${branch}`,
    url: `https://example.invalid/pull/${number}`,
    mergedAt: "2026-07-31T00:00:00Z",
  };
}

const noOpenPrs = () => [];

assert.equal(RETIREMENT_MARKER, "VOID_ACTIVE_LANE_RETIREMENT_V2");
assert.equal(
  confirmationToken(
    "feat/example-v2",
    "0123456789012345678901234567890123456789",
  ),
  "RETIRE_VOID_LANE:feat/example-v2:0123456789012345678901234567890123456789",
);
assert.deepEqual(
  parseArgs([
    "plan",
    "--repo-root",
    "/tmp/repo",
    "--branch",
    "feat/example-v2",
    "--worktree",
    "/tmp/worktree",
    "--archive-dir",
    "/tmp/archive",
    "--output",
    "/tmp/output.json",
    "--require-github",
  ]),
  {
    command: "plan",
    repo_root: "/tmp/repo",
    branch: "feat/example-v2",
    worktree: "/tmp/worktree",
    archive_dir: "/tmp/archive",
    output: "/tmp/output.json",
    require_github: true,
  },
);

const root = mkdtempSync(join(tmpdir(), "void-lane-retirement-v2-proof-"));
const repo = join(root, "repo");
const origin = join(root, "origin.git");

try {
  run("git", ["init", "--bare", origin]);
  run("git", ["init", repo]);
  git(repo, ["config", "user.name", "VOID Proof"]);
  git(repo, ["config", "user.email", "proof@example.invalid"]);
  writeFileSync(join(repo, "README.md"), "proof\n");
  git(repo, ["add", "README.md"]);
  git(repo, ["commit", "-m", "proof base"]);
  git(repo, ["branch", "-M", "main"]);
  git(repo, ["remote", "add", "origin", origin]);
  git(repo, ["push", "-u", "origin", "main"]);

  assert.throws(
    () => validateCandidate({
      repoRoot: repo,
      branch: "main",
      worktreePath: join(root, "main-worktree"),
      archiveDir: join(root, "main-archive"),
      outputPath: join(root, "main-output.json"),
    }),
    /main is forbidden/,
  );

  const direct = createCandidate({
    repo,
    root,
    name: "feat/direct-retire-proof-v2",
  });
  writeFileSync(join(repo, "main-after.txt"), "main advanced\n");
  git(repo, ["add", "main-after.txt"]);
  git(repo, ["commit", "-m", "advance main after direct candidate"]);
  git(repo, ["push", "origin", "main"]);

  const directPlanPath = join(root, "direct-plan.json");
  const directArchive = join(root, "direct-archive");
  const directPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/direct-retire-proof-v2",
    worktreePath: direct.worktree,
    archiveDir: directArchive,
    outputPath: directPlanPath,
    requireGithub: false,
  });
  assert.equal(directPlan.ready, true);
  assert.deepEqual(directPlan.reasons, []);
  assert.equal(
    directPlan.inspection.candidate.retirement_lineage.kind,
    "direct_commit_ancestry",
  );
  assert.equal(
    directPlan.inspection.candidate.retirement_lineage.verified,
    true,
  );
  assert.equal(existsSync(directArchive), false);

  writeFileSync(join(direct.worktree, "dirty.txt"), "dirty\n");
  const dirtyPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/direct-retire-proof-v2",
    worktreePath: direct.worktree,
    archiveDir: join(root, "dirty-archive"),
    outputPath: join(root, "dirty-plan.json"),
    requireGithub: false,
  });
  assert.equal(dirtyPlan.ready, false);
  assert.ok(dirtyPlan.reasons.includes("worktree_dirty"));
  rmSync(join(direct.worktree, "dirty.txt"));

  git(repo, [
    "push",
    "--force",
    "origin",
    "main:refs/heads/feat/direct-retire-proof-v2",
  ]);
  const mismatchPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/direct-retire-proof-v2",
    worktreePath: direct.worktree,
    archiveDir: join(root, "mismatch-archive"),
    outputPath: join(root, "mismatch-plan.json"),
    requireGithub: false,
  });
  assert.equal(mismatchPlan.ready, false);
  assert.ok(mismatchPlan.reasons.includes("remote_branch_head_mismatch"));
  git(repo, [
    "push",
    "--force",
    "origin",
    "feat/direct-retire-proof-v2:refs/heads/feat/direct-retire-proof-v2",
  ]);

  const unmerged = createCandidate({
    repo,
    root,
    name: "feat/unmerged-proof-v2",
    merge: false,
    push: false,
  });
  const unmergedPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/unmerged-proof-v2",
    worktreePath: unmerged.worktree,
    archiveDir: join(root, "unmerged-archive"),
    outputPath: join(root, "unmerged-plan.json"),
    requireGithub: false,
  });
  assert.equal(unmergedPlan.ready, false);
  assert.ok(
    unmergedPlan.reasons.includes("squash_lineage_requires_github_metadata"),
  );
  git(repo, ["worktree", "remove", unmerged.worktree]);
  git(repo, ["branch", "-D", "feat/unmerged-proof-v2"]);

  const directReceipt = applyRetirement({
    repoRoot: repo,
    branch: "feat/direct-retire-proof-v2",
    worktreePath: direct.worktree,
    archiveDir: directArchive,
    outputPath: join(root, "direct-receipt.json"),
    confirmation: confirmationToken(
      "feat/direct-retire-proof-v2",
      direct.candidateHead,
    ),
    requireGithub: false,
  });
  assert.equal(directReceipt.retired, true);
  assert.equal(directReceipt.lineage_kind, "direct_commit_ancestry");
  assert.equal(directReceipt.completed.archive_created, true);
  assert.equal(
    git(
      repo,
      ["bundle", "verify", join(directArchive, "active-lane-source-v2.bundle")],
      { check: false },
    ).status,
    0,
  );

  const squash = createSquashCandidate({
    repo,
    root,
    name: "feat/squash-retire-proof-v2",
  });
  const squashMetadata = [mergedPr({
    number: 42,
    branch: "feat/squash-retire-proof-v2",
    headOid: squash.candidateHead,
    mergeOid: squash.mergeCommit,
  })];
  const squashMergedPrCheck = () => squashMetadata;
  const squashPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/squash-retire-proof-v2",
    worktreePath: squash.worktree,
    archiveDir: join(root, "squash-archive"),
    outputPath: join(root, "squash-plan.json"),
    requireGithub: true,
    openPrCheck: noOpenPrs,
    mergedPrCheck: squashMergedPrCheck,
  });
  assert.equal(squashPlan.ready, true);
  assert.deepEqual(squashPlan.reasons, []);
  assert.equal(
    squashPlan.inspection.candidate.head_ancestor_of_live_origin_main,
    false,
  );
  assert.equal(
    squashPlan.inspection.candidate.retirement_lineage.kind,
    "verified_squash_merged_pull_request",
  );
  assert.equal(
    squashPlan.inspection.candidate.retirement_lineage.pull_request.number,
    42,
  );
  assert.equal(
    squashPlan.inspection.candidate.retirement_lineage.merge_commit_oid,
    squash.mergeCommit,
  );

  const wrongHeadPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/squash-retire-proof-v2",
    worktreePath: squash.worktree,
    archiveDir: join(root, "wrong-head-archive"),
    outputPath: join(root, "wrong-head-plan.json"),
    requireGithub: true,
    openPrCheck: noOpenPrs,
    mergedPrCheck: () => [mergedPr({
      number: 43,
      branch: "feat/squash-retire-proof-v2",
      headOid: squash.mergeCommit,
      mergeOid: squash.mergeCommit,
    })],
  });
  assert.equal(wrongHeadPlan.ready, false);
  assert.ok(wrongHeadPlan.reasons.includes("verified_squash_lineage_not_found"));

  const ambiguousPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/squash-retire-proof-v2",
    worktreePath: squash.worktree,
    archiveDir: join(root, "ambiguous-archive"),
    outputPath: join(root, "ambiguous-plan.json"),
    requireGithub: true,
    openPrCheck: noOpenPrs,
    mergedPrCheck: () => [
      mergedPr({
        number: 44,
        branch: "feat/squash-retire-proof-v2",
        headOid: squash.candidateHead,
        mergeOid: squash.mergeCommit,
      }),
      mergedPr({
        number: 45,
        branch: "feat/squash-retire-proof-v2",
        headOid: squash.candidateHead,
        mergeOid: squash.mergeCommit,
      }),
    ],
  });
  assert.equal(ambiguousPlan.ready, false);
  assert.ok(
    ambiguousPlan.reasons.includes("verified_squash_lineage_ambiguous"),
  );

  const nonAncestorPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/squash-retire-proof-v2",
    worktreePath: squash.worktree,
    archiveDir: join(root, "nonancestor-archive"),
    outputPath: join(root, "nonancestor-plan.json"),
    requireGithub: true,
    openPrCheck: noOpenPrs,
    mergedPrCheck: () => [mergedPr({
      number: 46,
      branch: "feat/squash-retire-proof-v2",
      headOid: squash.candidateHead,
      mergeOid: squash.candidateHead,
    })],
  });
  assert.equal(nonAncestorPlan.ready, false);
  assert.ok(
    nonAncestorPlan.reasons.includes(
      "verified_squash_merge_commit_not_ancestor_of_live_origin_main",
    ),
  );

  const squashArchive = join(root, "squash-archive");
  const squashReceipt = applyRetirement({
    repoRoot: repo,
    branch: "feat/squash-retire-proof-v2",
    worktreePath: squash.worktree,
    archiveDir: squashArchive,
    outputPath: join(root, "squash-receipt.json"),
    confirmation: confirmationToken(
      "feat/squash-retire-proof-v2",
      squash.candidateHead,
    ),
    requireGithub: true,
    openPrCheck: noOpenPrs,
    mergedPrCheck: squashMergedPrCheck,
  });
  assert.equal(squashReceipt.retired, true);
  assert.equal(
    squashReceipt.lineage_kind,
    "verified_squash_merged_pull_request",
  );
  assert.equal(squashReceipt.lineage_pull_request_number, 42);
  assert.equal(squashReceipt.lineage_merge_commit_oid, squash.mergeCommit);
  assert.equal(squashReceipt.completed.remote_branch_deleted, true);
  assert.equal(squashReceipt.completed.worktree_removed, true);
  assert.equal(squashReceipt.completed.local_branch_deleted, true);
  assert.equal(existsSync(squash.worktree), false);
  assert.equal(
    git(
      repo,
      ["bundle", "verify", join(squashArchive, "active-lane-source-v2.bundle")],
      { check: false },
    ).status,
    0,
  );

  const directLineage = resolveRetirementLineage({
    repoRoot: repo,
    branch: "feat/pure-direct-v2",
    branchHead: head(repo),
    liveMain: head(repo),
    liveMainObjectPresent: true,
    headAncestorOfLiveMain: true,
    requireGithub: false,
    allowObjectFetch: false,
  });
  assert.equal(directLineage.kind, "direct_commit_ancestry");
  assert.equal(directLineage.verified, true);

  mkdirSync(join(repo, "ops", "coordination"), { recursive: true });
  writeFileSync(
    join(repo, "ops", "coordination", "active-lane-reservations-v1.json"),
    `${JSON.stringify({
      github_repository: "6ZoSo9/void-node",
      marker: "VOID_ACTIVE_LANE_RESERVATION_POLICY_V1",
      reserved_exact_branches: [],
      reserved_families: [],
      runtime_evidence_pattern: "never-match",
      version: 1,
    }, null, 2)}\n`,
  );
  git(repo, ["add", "ops/coordination/active-lane-reservations-v1.json"]);
  git(repo, ["commit", "-m", "add proof reservation policy"]);
  git(repo, ["push", "origin", "main"]);

  const cliSquash = createSquashCandidate({
    repo,
    root,
    name: "feat/squash-cli-proof-v2",
  });
  const fakeBin = join(root, "fake-bin");
  mkdirSync(fakeBin);
  const fakeGh = join(fakeBin, "gh");
  writeFileSync(
    fakeGh,
    `#!/usr/bin/env bash
set -Eeuo pipefail
STATE=""
HEAD=""
ARGS=("$@")
for ((i=0;i<\${#ARGS[@]};i++)); do
  case "\${ARGS[$i]}" in
    --state) STATE="\${ARGS[$((i+1))]}" ;;
    --head) HEAD="\${ARGS[$((i+1))]}" ;;
  esac
done
if [[ "$STATE" == "open" ]]; then
  printf '[]\\n'
elif [[ "$STATE" == "merged" && "$HEAD" == "feat/squash-cli-proof-v2" ]]; then
  printf '[{"number":77,"state":"MERGED","baseRefName":"main","headRefName":"feat/squash-cli-proof-v2","headRefOid":"%s","mergeCommit":{"oid":"%s"},"title":"squash","url":"https://example.invalid/77","mergedAt":"2026-07-31T00:00:00Z"}]\\n' "$VOID_TEST_HEAD" "$VOID_TEST_MERGE"
else
  printf 'unexpected gh args: %q\\n' "$*" >&2
  exit 9
fi
`,
  );
  chmodSync(fakeGh, 0o755);

  const cliEnv = {
    ...process.env,
    PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
    VOID_TEST_HEAD: cliSquash.candidateHead,
    VOID_TEST_MERGE: cliSquash.mergeCommit,
  };
  const cliPlanPath = join(root, "cli-plan.json");
  const cliArchive = join(root, "cli-archive");
  const toolPath = fileURLToPath(
    new URL("../tools/void-active-lane-retirement-v2.mjs", import.meta.url),
  );
  const cliPlanRun = run(
    process.execPath,
    [
      toolPath,
      "plan",
      "--repo-root",
      repo,
      "--branch",
      "feat/squash-cli-proof-v2",
      "--worktree",
      cliSquash.worktree,
      "--archive-dir",
      cliArchive,
      "--output",
      cliPlanPath,
      "--require-github",
    ],
    { env: cliEnv },
  );
  assert.match(cliPlanRun.stdout, /VOID_ACTIVE_LANE_RETIREMENT_V2_COMPLETE=true/);
  const cliPlan = JSON.parse(readFileSync(cliPlanPath, "utf8"));
  assert.equal(cliPlan.ready, true);
  assert.equal(
    cliPlan.inspection.candidate.retirement_lineage.kind,
    "verified_squash_merged_pull_request",
  );
  assert.equal(
    cliPlan.inspection.candidate.retirement_lineage.pull_request.number,
    77,
  );

  const cliApplyPath = join(root, "cli-apply.json");
  const cliApplyRun = run(
    process.execPath,
    [
      toolPath,
      "apply",
      "--repo-root",
      repo,
      "--branch",
      "feat/squash-cli-proof-v2",
      "--worktree",
      cliSquash.worktree,
      "--archive-dir",
      cliArchive,
      "--output",
      cliApplyPath,
      "--confirm",
      confirmationToken("feat/squash-cli-proof-v2", cliSquash.candidateHead),
      "--require-github",
    ],
    { env: cliEnv },
  );
  assert.match(cliApplyRun.stdout, /VOID_ACTIVE_LANE_RETIREMENT_V2_COMPLETE=true/);
  const cliApply = JSON.parse(readFileSync(cliApplyPath, "utf8"));
  assert.equal(cliApply.retired, true);
  assert.equal(cliApply.lineage_kind, "verified_squash_merged_pull_request");
  assert.equal(cliApply.lineage_pull_request_number, 77);

  const partial = createCandidate({
    repo,
    root,
    name: "feat/partial-proof-v2",
  });
  const partialArchive = join(root, "partial-archive");
  const partialOutput = join(root, "partial-output.json");
  assert.throws(
    () => applyRetirement({
      repoRoot: repo,
      branch: "feat/partial-proof-v2",
      worktreePath: partial.worktree,
      archiveDir: partialArchive,
      outputPath: partialOutput,
      confirmation: confirmationToken(
        "feat/partial-proof-v2",
        partial.candidateHead,
      ),
      requireGithub: false,
      openPrCheck: noOpenPrs,
      hooks: {
        afterRemoteDelete() {
          throw new Error("forced partial retirement proof failure");
        },
      },
    }),
    /forced partial retirement proof failure/,
  );
  const failure = JSON.parse(readFileSync(partialOutput, "utf8"));
  assert.equal(failure.retired, false);
  assert.equal(failure.mutation_performed, true);
  assert.equal(failure.completed.archive_created, true);
  assert.equal(failure.completed.remote_branch_deleted, true);
  assert.equal(failure.completed.worktree_removed, false);
  assert.equal(failure.retirement_lineage.kind, "direct_commit_ancestry");
  assert.equal(
    existsSync(join(partialArchive, "retirement-failure-receipt-v2.json")),
    true,
  );
  git(repo, ["worktree", "remove", partial.worktree]);
  git(repo, ["branch", "-D", "feat/partial-proof-v2"]);

  const parsed = parseWorktreePorcelain(
    git(repo, ["worktree", "list", "--porcelain", "-z"]).stdout,
  );
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].branch, "main");

  console.log("argument_parser_green=true");
  console.log("candidate_validation_green=true");
  console.log("direct_ancestry_plan_and_apply_green=true");
  console.log("read_only_plan_green=true");
  console.log("exact_head_confirmation_green=true");
  console.log("dirty_worktree_refusal_green=true");
  console.log("unmerged_without_github_refusal_green=true");
  console.log("remote_branch_mismatch_refusal_green=true");
  console.log("verified_squash_lineage_plan_green=true");
  console.log("verified_squash_lineage_apply_green=true");
  console.log("production_gh_cli_plan_and_apply_green=true");
  console.log("squash_wrong_head_refusal_green=true");
  console.log("squash_ambiguity_refusal_green=true");
  console.log("squash_merge_ancestry_refusal_green=true");
  console.log("archive_before_retirement_green=true");
  console.log("remote_worktree_local_cleanup_green=true");
  console.log("post_retirement_verification_green=true");
  console.log("partial_failure_receipt_green=true");
  console.log("canonical_main_unchanged_green=true");
  console.log("VOID_ACTIVE_LANE_RETIREMENT_V2_PROOF_GREEN=true");
} finally {
  rmSync(root, { recursive: true, force: true });
}
