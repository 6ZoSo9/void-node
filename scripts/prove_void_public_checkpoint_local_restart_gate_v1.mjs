#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER =
  "VOID_PUBLIC_CHECKPOINT_LOCAL_RESTART_GATE_V1_PROOF_GREEN";
const root = process.cwd();
const launcherPath = path.join(root, "run-void-node.sh");
const workflowPath = path.join(
  root,
  ".github/workflows/void-public-checkpoint-restore-v1.yml",
);

const launcher = fs.readFileSync(launcherPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");

const start = launcher.indexOf(
  "checkpoint_local_restart_candidate() {",
);
const end = launcher.indexOf(
  "\nresolve_public_bootstrap() {",
  start,
);
assert.ok(start >= 0, "local restart candidate function missing");
assert.ok(end > start, "local restart candidate boundary missing");
const candidate = launcher.slice(start, end).trim();

assert.match(
  candidate,
  /test "\$HTTPS_BOOTSTRAP_STATE" = "transport_unavailable" \|\| return 1/,
);
assert.match(
  candidate,
  /transport_unavailable\|not_configured\) ;;/,
);

const requireGateAt = launcher.indexOf(
  'if test "${VOID_PUBLIC_BOOTSTRAP_REQUIRE:-0}" = 1 && test "$active_count" -eq 0',
);
const fallbackAt = launcher.indexOf(
  'if test "$active_count" -eq 0 && checkpoint_local_restart_candidate; then',
);
const trustHoldAt = launcher.indexOf(
  'if test "$HTTPS_BOOTSTRAP_STATE" = "hold_no_stable_seed" ||',
);
assert.ok(requireGateAt >= 0, "explicit REQUIRE gate missing");
assert.ok(fallbackAt > requireGateAt, "local fallback precedes REQUIRE gate");
assert.ok(trustHoldAt > fallbackAt, "expected trust-HOLD branch missing");

const occurrences = (source, needle) =>
  source.split(needle).length - 1;

assert.equal(
  occurrences(workflow, '- "run-void-node.sh"'),
  2,
  "workflow must watch launcher in PR and push path filters",
);
assert.equal(
  occurrences(
    workflow,
    '- "public/mainnet0-historical-cartography-acceptance-v1.json"',
  ),
  2,
  "workflow must watch merged restart authority in PR and push path filters",
);
assert.match(
  workflow,
  /node --check scripts\/prove_void_public_checkpoint_local_restart_gate_v1\.mjs/,
);
assert.match(
  workflow,
  /run: node scripts\/prove_void_public_checkpoint_local_restart_gate_v1\.mjs/,
);

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-checkpoint-local-restart-gate-v1-"),
);
try {
  const generation = path.join(tmp, "generation");
  const selector = path.join(tmp, "data");
  const ordinary = path.join(tmp, "ordinary");
  fs.mkdirSync(generation);
  fs.mkdirSync(ordinary);
  fs.symlinkSync(generation, selector, "dir");

  function evaluate({
    label,
    https,
    tor,
    restore = "1",
    dataDir = selector,
    expected,
  }) {
    const shell = `${candidate}
if checkpoint_local_restart_candidate; then
  exit 0
else
  exit 23
fi
`;
    const result = spawnSync("bash", ["-c", shell], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        VOID_PUBLIC_CHECKPOINT_RESTORE: restore,
        DATA_DIR: dataDir,
        HTTPS_BOOTSTRAP_STATE: https,
        TOR_BOOTSTRAP_STATE: tor,
      },
    });
    const wanted = expected ? 0 : 23;
    assert.equal(
      result.status,
      wanted,
      `${label}: expected status ${wanted}, got ${result.status}; ` +
        `stdout=${result.stdout} stderr=${result.stderr}`,
    );
  }

  evaluate({
    label: "https-loss-tor-not-configured",
    https: "transport_unavailable",
    tor: "not_configured",
    expected: true,
  });
  evaluate({
    label: "both-transports-unavailable",
    https: "transport_unavailable",
    tor: "transport_unavailable",
    expected: true,
  });
  evaluate({
    label: "canonical-trust-hold",
    https: "hold_no_stable_seed",
    tor: "not_configured",
    expected: false,
  });
  evaluate({
    label: "local-trust-hold",
    https: "local_hold_no_stable_seed",
    tor: "not_configured",
    expected: false,
  });
  evaluate({
    label: "https-active",
    https: "active",
    tor: "not_configured",
    expected: false,
  });
  evaluate({
    label: "tor-active",
    https: "transport_unavailable",
    tor: "active",
    expected: false,
  });
  evaluate({
    label: "bootstrap-disabled-state",
    https: "disabled_explicitly",
    tor: "disabled_explicitly",
    expected: false,
  });
  evaluate({
    label: "restore-disabled",
    https: "transport_unavailable",
    tor: "not_configured",
    restore: "0",
    expected: false,
  });
  evaluate({
    label: "ordinary-data-dir",
    https: "transport_unavailable",
    tor: "not_configured",
    dataDir: ordinary,
    expected: false,
  });
  evaluate({
    label: "missing-data-dir",
    https: "transport_unavailable",
    tor: "not_configured",
    dataDir: path.join(tmp, "missing"),
    expected: false,
  });

  console.log("local_restart_transport_loss_only=true");
  console.log("https_transport_unavailable_required=true");
  console.log("tor_transport_unavailable_or_not_configured_required=true");
  console.log("canonical_trust_hold_fallback=false");
  console.log("local_trust_hold_fallback=false");
  console.log("live_transport_candidate_fallback=false");
  console.log("explicit_public_bootstrap_require_precedes_local_fallback=true");
  console.log("selector_symlink_required=true");
  console.log("workflow_launcher_trigger_bound=true");
  console.log("workflow_restart_authority_trigger_bound=true");
  console.log(MARKER);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
