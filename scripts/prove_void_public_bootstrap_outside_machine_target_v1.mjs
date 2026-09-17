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
  assert.doesNotMatch(workflowSource, /Number\(body\.head\) <= 0\) process\.exit\(1\)/);

  console.log("verified_remote_manifest_identity_bound=true");
  console.log("target_head_is_max_enabled_qualified_head=true");
  console.log("partial_local_head_rejected=true");
  console.log("exact_or_later_target_head_accepted=true");
  console.log("wrong_typed_ready_head_rejected=true");
  console.log("authority_boundary_preserved=true");
  console.log("workflow_checks_target_before_initial_and_grace_acceptance=true");
  console.log(`${MARKER}_GREEN`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
