#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_OUTSIDE_MACHINE_TARGET_V1_PROOF";
const root = process.cwd();
const helper = path.join(root, "scripts/void_public_bootstrap_outside_machine_target_v1.mjs");
const workflow = path.join(root, ".github/workflows/void-public-bootstrap-outside-machine-acceptance-v1.yml");

function run(args) {
  return spawnSync(process.execPath, [helper, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function manifest({ id, heads = [1951058], authorityFalse = true } = {}) {
  const authority = {
    private_routes_exposed: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    treasury_authority: false,
    work_credit_authority: false,
    money_movement_authority: false,
  };
  if (!authorityFalse) authority.wallet_authority = true;
  return {
    schema: "void_public_bootstrap_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "stable_https_seed",
    generated_at: "2026-08-28T06:50:06.655Z",
    expires_at: "2026-08-31T06:50:06.655Z",
    sync_endpoints: heads.map((qualified_head, index) => ({
      transport: "https",
      base: `https://seed${index || ""}.example.org`,
      priority: index,
      enabled: true,
      temporary: false,
      qualification_id: "voidpsq1_" + String(index + 1).padStart(64, "0"),
      qualified_at: "2026-08-28T06:50:06.595Z",
      qualified_head,
    })),
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
    authority,
    notes: "fixture",
    manifest_id: id,
  };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-bootstrap-target-proof-"));
try {
  const manifestId = "voidpbm1_" + "a".repeat(64);
  const manifestFile = path.join(tmp, "manifest.json");
  const resolverLog = path.join(tmp, "resolver.log");
  const ready = path.join(tmp, "ready.json");

  fs.writeFileSync(manifestFile, JSON.stringify(manifest({ id: manifestId, heads: [100, 250] })));
  fs.writeFileSync(resolverLog, `manifest_id=${manifestId}\n`);
  const bound = run(["bind", "--manifest", manifestFile, "--resolver-log", resolverLog]);
  assert.equal(bound.status, 0, bound.stderr);
  assert.match(bound.stdout, /^target_head=250$/m);
  assert.match(bound.stdout, /^remote_manifest_identity_bound=true$/m);

  fs.writeFileSync(resolverLog, `manifest_id=${"voidpbm1_" + "b".repeat(64)}\n`);
  const mismatch = run(["bind", "--manifest", manifestFile, "--resolver-log", resolverLog]);
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /verified remote manifest identity differs/);

  fs.writeFileSync(resolverLog, `manifest_id=${manifestId}\n`);
  fs.writeFileSync(manifestFile, JSON.stringify(manifest({ id: manifestId, heads: ["250"] })));
  const stringHead = run(["bind", "--manifest", manifestFile, "--resolver-log", resolverLog]);
  assert.notEqual(stringHead.status, 0);
  assert.match(stringHead.stderr, /qualified_head must be a positive safe integer JSON number/);

  fs.writeFileSync(manifestFile, JSON.stringify(manifest({ id: manifestId, heads: [250], authorityFalse: false })));
  const badAuthority = run(["bind", "--manifest", manifestFile, "--resolver-log", resolverLog]);
  assert.notEqual(badAuthority.status, 0);
  assert.match(badAuthority.stderr, /wallet_authority must be false/);

  const check = (body, target = 250) => {
    fs.writeFileSync(ready, JSON.stringify(body));
    return run(["check-ready", "--ready", ready, "--target-head", String(target)]);
  };

  const partial = check({ ready: true, head: 196, gap: 0, txroot_live: 1 });
  assert.notEqual(partial.status, 0);
  assert.match(partial.stderr, /below verified target/);

  const exact = check({ ready: true, head: 250, gap: 0, txroot_live: 1 });
  assert.equal(exact.status, 0, exact.stderr);
  assert.match(exact.stdout, /target_head_reached=true/);

  const ahead = check({ ready: true, head: 251, gap: 0, txroot_live: 1 });
  assert.equal(ahead.status, 0, ahead.stderr);

  const wrongType = check({ ready: true, head: "250", gap: 0, txroot_live: 1 });
  assert.notEqual(wrongType.status, 0);

  const workflowSource = fs.readFileSync(workflow, "utf8");
  assert.match(workflowSource, /Bind acceptance target to exact verified manifest/);
  assert.match(workflowSource, /resolve_void_public_bootstrap_v1\.mjs --verify-only/);
  assert.equal(
    (workflowSource.match(/void_public_bootstrap_outside_machine_target_v1\.mjs check-ready/g) || []).length,
    2,
  );
  assert.match(workflowSource, /VOID_PUBLIC_BOOTSTRAP_ACCEPTANCE_TARGET_HEAD/);
  assert.match(workflowSource, /target\.txt/);
  assert.match(workflowSource, /target_head_reached=true/);
  assert.match(workflowSource, /VOID_PUBLIC_CHECKPOINT_RESTORE:\s*'1'/);
  assert.match(workflowSource, /test ! -e "\$DATA_DIR"/);
  assert.match(workflowSource, /timeout-minutes:\s*55/);
  assert.match(
    workflowSource,
    /VOID_PUBLIC_CHECKPOINT_RESTORE_TOTAL_TIMEOUT_MS:\s*'1800000'/,
  );
  assert.match(
    workflowSource,
    /VOID_PUBLIC_BOOTSTRAP_ACCEPTANCE_WAIT_SECONDS:\s*'2400'/,
  );
  assert.match(
    workflowSource,
    /VOID_PUBLIC_BOOTSTRAP_ACCEPTANCE_GRACE_SECONDS:\s*'30'/,
  );
  assert.match(workflowSource, /monotonic_seconds\(\)/);
  assert.match(workflowSource, /read -r uptime idle < \/proc\/uptime/);
  assert.match(workflowSource, /deadline_s=/);
  assert.match(workflowSource, /--max-time "\$curl_max_s"/);
  assert.match(workflowSource, /timeout -k 1s "\$remaining_s" node/);
  assert.match(workflowSource, /VOID_PUBLIC_BOOTSTRAP_ACCEPTANCE_READY_DEADLINE_EXCEEDED_V1/);
  assert.match(
    workflowSource,
    /sleep "\$VOID_PUBLIC_BOOTSTRAP_ACCEPTANCE_GRACE_SECONDS"/,
  );
  const jobBudgetSeconds = 55 * 60;
  const restoreBudgetSeconds = 1800000 / 1000;
  const restoreToNodeReadyMarginSeconds = 5 * 60;
  const readinessWaitSeconds = 2400;
  const postReadyGraceSeconds = 30;
  const preStartBudgetSeconds = 10 * 60;
  assert.ok(
    restoreBudgetSeconds + restoreToNodeReadyMarginSeconds <
      readinessWaitSeconds,
    "restore budget must finish before acceptance readiness budget",
  );
  assert.ok(
    readinessWaitSeconds + postReadyGraceSeconds + preStartBudgetSeconds <
      jobBudgetSeconds,
    "job budget must exceed pre-start + readiness + post-ready grace",
  );
  assert.doesNotMatch(
    workflowSource,
    /mkdir -p outside-machine-evidence "\$DATA_DIR"/,
  );
  // Execute the actual workflow polling body under inert local command stubs.
  // Slow curl and late-success cases must be bounded by elapsed monotonic time.
  assert.equal(process.platform, "linux", "monotonic acceptance uses procfs");
  const waitBegin = workflowSource.indexOf("          monotonic_seconds() {");
  const waitEnd = workflowSource.indexOf(
    '\n          if test "$GREEN" != 1; then', waitBegin,
  );
  assert.ok(waitBegin >= 0 && waitEnd > waitBegin, "timed readiness loop missing");
  const waitBody = workflowSource.slice(waitBegin, waitEnd);
  const fakeBin = path.join(tmp, "clock-probe-bin");
  fs.mkdirSync(fakeBin);
  const fakeCurl = path.join(fakeBin, "curl");
  const fakeNode = path.join(fakeBin, "node");
  fs.writeFileSync(fakeNode, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  for (const [scenario, curlSource, waitSeconds, expectedExit] of [
    ["slow_failure", "#!/bin/sh\nsleep 1\nexit 28\n", 2, 2],
    ["late_success", "#!/bin/sh\nsleep 2\nprintf '{}\\n'\n", 1, 2],
    ["on_time_success", "#!/bin/sh\nprintf '{}\\n'\n", 2, 0],
  ]) {
    fs.writeFileSync(fakeCurl, curlSource, { mode: 0o700 });
    const started = Date.now();
    const observed = spawnSync("bash", [
      "-c", "set -Eeuo pipefail\n" + waitBody +
        '\nprintf "accepted=%s\\n" "$GREEN"\n',
    ], {
      cwd: tmp,
      encoding: "utf8",
      timeout: 9_000,
      env: {
        PATH: fakeBin + ":" + process.env.PATH,
        PID: String(process.pid),
        READY: path.join(tmp, "ready.json"),
        LOG: path.join(tmp, "node.log"),
        VOID_PUBLIC_BOOTSTRAP_ACCEPTANCE_WAIT_SECONDS: String(waitSeconds),
        VOID_PUBLIC_BOOTSTRAP_ACCEPTANCE_TARGET_HEAD: "1951058",
      },
    });
    assert.equal(observed.error, undefined, scenario);
    assert.equal(observed.status, expectedExit, scenario + ": " + observed.stderr);
    if (expectedExit === 2) {
      assert.match(observed.stderr, /VOID_PUBLIC_BOOTSTRAP_ACCEPTANCE_READY_DEADLINE_EXCEEDED_V1/, scenario);
    } else {
      assert.match(observed.stdout, /accepted=1/, scenario);
      assert.doesNotMatch(observed.stderr, /VOID_PUBLIC_BOOTSTRAP_ACCEPTANCE_READY_DEADLINE_EXCEEDED_V1/, scenario);
    }
    assert.ok(Date.now() - started < 7_500, scenario + " overshot bounded fixture");
  }

  assert.doesNotMatch(workflowSource, /Number\(body\.head\) <= 0\) process\.exit\(1\)/);

  console.log("verified_remote_manifest_identity_bound=true");
  console.log("target_head_is_max_enabled_qualified_head=true");
  console.log("partial_local_head_rejected=true");
  console.log("exact_or_later_target_head_accepted=true");
  console.log("wrong_typed_ready_head_rejected=true");
  console.log("authority_boundary_preserved=true");
  console.log("workflow_checks_target_before_initial_and_grace_acceptance=true");
  console.log("fresh_acceptance_requests_checkpoint_restore=true");
  console.log("checkpoint_restore_data_dir_precreated=false");
  console.log("checkpoint_restore_timeout_ms=1800000");
  console.log("acceptance_readiness_wait_seconds=2400");
  console.log("acceptance_wait_real_elapsed_monotonic_bound=true");
  console.log("slow_ready_and_late_success_deadline_adversaries_hold=true");
  console.log("post_ready_grace_seconds=30");
  console.log("restore_timeout_plus_start_margin_lt_readiness_wait=true");
  console.log("prestart_plus_readiness_plus_grace_lt_job_timeout=true");
  console.log(`${MARKER}_GREEN`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
