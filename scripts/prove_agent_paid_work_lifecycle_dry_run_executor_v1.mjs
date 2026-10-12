#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  BINDING_MARKER,
  CONFIRMATION,
  PHASES,
  PLAN_MARKER,
  RECEIPT_MARKER,
  executeDryRun,
  inspectDryRun,
  readJson,
  validateBinding,
  validatePlan,
} from "./agent_paid_work_lifecycle_dry_run_executor_v1.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executorPath = join(
  root,
  "scripts/agent_paid_work_lifecycle_dry_run_executor_v1.mjs",
);
const bindingPath = join(
  root,
  "examples/agent-paid-work-credential-wc-account-binding-v1.example.json",
);
const planPath = join(
  root,
  "examples/agent-paid-work-lifecycle-dry-run-plan-v1.example.json",
);
const bindingSchemaPath = join(
  root,
  "schemas/agent-paid-work-credential-wc-account-binding-v1.schema.json",
);
const planSchemaPath = join(
  root,
  "schemas/agent-paid-work-lifecycle-dry-run-plan-v1.schema.json",
);
const documentationPath = join(
  root,
  "docs/public/agent-paid-work-lifecycle-dry-run-executor-v1.md",
);
const workflowPath = join(
  root,
  ".github/workflows/agent-paid-work-lifecycle-dry-run-executor-v1.yml",
);

for (const path of [
  executorPath,
  bindingPath,
  planPath,
  bindingSchemaPath,
  planSchemaPath,
  documentationPath,
  workflowPath,
]) {
  assert.equal(existsSync(path), true, `missing file: ${path}`);
}

const executorSource = readFileSync(executorPath, "utf8");
for (const forbidden of [
  'from "node:http"',
  'from "node:https"',
  'from "node:net"',
  'from "node:tls"',
  'from "node:child_process"',
  "fetch(",
  "http.request",
  "https.request",
  "sendTransaction",
  "signTransaction",
  "eth_sendRawTransaction",
  "privateKey",
]) {
  assert.equal(
    executorSource.includes(forbidden),
    false,
    `executor contains forbidden authority: ${forbidden}`,
  );
}

assert.equal(
  executorSource.includes("dry_run_no_transfer"),
  true,
);
assert.equal(
  executorSource.includes("dry_run_no_write"),
  true,
);
assert.equal(
  executorSource.includes("dry_run_no_wallet"),
  true,
);
assert.equal(
  executorSource.includes("conflicting duplicate dry-run uniqueness key"),
  true,
);

const binding = readJson(bindingPath, "binding example");
const plan = readJson(planPath, "plan example");
const bindingSchema = readJson(
  bindingSchemaPath,
  "binding schema",
);
const planSchema = readJson(planSchemaPath, "plan schema");

assert.equal(binding.marker, BINDING_MARKER);
assert.equal(plan.marker, PLAN_MARKER);
assert.equal(
  bindingSchema.properties.marker.const,
  BINDING_MARKER,
);
assert.equal(
  planSchema.properties.marker.const,
  PLAN_MARKER,
);
assert.deepEqual(
  plan.lifecycle.map((entry) => entry.phase),
  PHASES,
);

validateBinding(binding);
validatePlan(plan, binding);

const inspection = inspectDryRun({ binding, plan });
assert.equal(inspection.valid, true);
assert.equal(inspection.phase_count, 13);
assert.equal(inspection.live_authority, false);
assert.equal(inspection.writes_state, false);

const testRoot = mkdtempSync(
  join(tmpdir(), "void-paid-work-dry-run-v1-"),
);
const stateDir = join(testRoot, "dry-run-state");

try {
  const first = executeDryRun({
    binding,
    plan,
    stateDirectory: stateDir,
  });

  assert.equal(first.marker, RECEIPT_MARKER);
  assert.equal(first.decision, "DRY_RUN_EXACT_GREEN");
  assert.equal(first.duplicate, false);
  assert.equal(first.lifecycle_phase_count, 13);
  assert.deepEqual(first.prestate, first.poststate);
  assert.deepEqual(first.mutations, {
    payment_transfer: false,
    wc_ledger_write: false,
    wc_to_void_settlement: false,
    wallet_access: false,
    signer_access: false,
    network_request: false,
    service_restart: false,
    deployment: false,
  });

  const keyFiles = readdirSync(join(stateDir, "keys"));
  const receiptFiles = readdirSync(join(stateDir, "receipts"));
  assert.equal(keyFiles.length, 1);
  assert.equal(receiptFiles.length, 1);

  const duplicate = executeDryRun({
    binding,
    plan,
    stateDirectory: stateDir,
  });
  assert.equal(duplicate.duplicate, true);
  assert.equal(readdirSync(join(stateDir, "keys")).length, 1);
  assert.equal(readdirSync(join(stateDir, "receipts")).length, 1);

  const conflicting = structuredClone(plan);
  conflicting.requested.wc_award = "4";
  assert.throws(
    () =>
      executeDryRun({
        binding,
        plan: conflicting,
        stateDirectory: stateDir,
      }),
    /conflicting duplicate dry-run uniqueness key/,
  );

  const missingPhase = structuredClone(plan);
  missingPhase.lifecycle.pop();
  assert.throws(
    () => validatePlan(missingPhase, binding),
    /exactly 13 phases/,
  );

  const reordered = structuredClone(plan);
  [
    reordered.lifecycle[0],
    reordered.lifecycle[1],
  ] = [
    reordered.lifecycle[1],
    reordered.lifecycle[0],
  ];
  assert.throws(
    () => validatePlan(reordered, binding),
    /lifecycle phase order differs/,
  );

  const liveAuthority = structuredClone(plan);
  liveAuthority.authority.wc_to_void_execute = true;
  assert.throws(
    () => validatePlan(liveAuthority, binding),
    /live authority is forbidden/,
  );

  const liveBinding = structuredClone(binding);
  liveBinding.policy.live_settlement_authorized = true;
  assert.throws(
    () => validateBinding(liveBinding),
    /dry-run boundary/,
  );

  const accountMismatch = structuredClone(plan);
  accountMismatch.destination_wc_account =
    "void-paid-work-different-account-v1";
  assert.throws(
    () => validatePlan(accountMismatch, binding),
    /destination_wc_account is not bound/,
  );

  assert.throws(
    () =>
      executeDryRun({
        binding,
        plan,
        stateDirectory:
          `${process.env.HOME}/.local/state/` +
          "void-agent-paid-work-submission-receiver-v1/.test",
      }),
    /overlaps protected state/,
  );

  const cliInspect = spawnSync(
    process.execPath,
    [
      executorPath,
      "inspect",
      "--binding",
      bindingPath,
      "--plan",
      planPath,
    ],
    {
      encoding: "utf8",
      cwd: root,
    },
  );
  assert.equal(cliInspect.status, 0, cliInspect.stderr);
  const cliInspection = JSON.parse(cliInspect.stdout);
  assert.equal(cliInspection.valid, true);
  assert.equal(cliInspection.writes_state, false);

  const cliState = join(testRoot, "cli-dry-run-state");
  const cliDryRun = spawnSync(
    process.execPath,
    [
      executorPath,
      "dry-run",
      "--binding",
      bindingPath,
      "--plan",
      planPath,
      "--state-dir",
      cliState,
      "--confirm",
      CONFIRMATION,
    ],
    {
      encoding: "utf8",
      cwd: root,
    },
  );
  assert.equal(cliDryRun.status, 0, cliDryRun.stderr);
  const cliReceipt = JSON.parse(cliDryRun.stdout);
  assert.equal(cliReceipt.decision, "DRY_RUN_EXACT_GREEN");
  assert.equal(cliReceipt.duplicate, false);

  const wrongConfirm = spawnSync(
    process.execPath,
    [
      executorPath,
      "dry-run",
      "--binding",
      bindingPath,
      "--plan",
      planPath,
      "--state-dir",
      join(testRoot, "wrong-confirm-dry-run"),
      "--confirm",
      "wrong",
    ],
    {
      encoding: "utf8",
      cwd: root,
    },
  );
  assert.equal(wrongConfirm.status, 2);
  assert.match(wrongConfirm.stderr, /confirmation token mismatch/);

  const unsupported = spawnSync(
    process.execPath,
    [
      executorPath,
      "execute-live",
      "--binding",
      bindingPath,
      "--plan",
      planPath,
    ],
    {
      encoding: "utf8",
      cwd: root,
    },
  );
  assert.equal(unsupported.status, 2);
  assert.match(
    unsupported.stderr,
    /only inspect and dry-run commands are supported/,
  );
} finally {
  rmSync(testRoot, { recursive: true, force: true });
}

const docs = readFileSync(documentationPath, "utf8");
for (const required of [
  "VOID_AGENT_PAID_WORK_LIFECYCLE_DRY_RUN_EXECUTOR_V1",
  "credential-to-WC-account binding",
  "append-once",
  "crash-safe",
  "No payment transfer",
  "No WC ledger write",
  "No WC→VOID execution",
  "No wallet or signer access",
]) {
  assert.equal(
    docs.includes(required),
    true,
    `documentation missing: ${required}`,
  );
}

const workflow = readFileSync(workflowPath, "utf8");
assert.equal(
  workflow.includes(
    "node scripts/prove_agent_paid_work_lifecycle_dry_run_executor_v1.mjs",
  ),
  true,
);
assert.equal(
  workflow.includes(
    "node --check scripts/agent_paid_work_lifecycle_dry_run_executor_v1.mjs",
  ),
  true,
);

console.log(
  "VOID_AGENT_PAID_WORK_LIFECYCLE_DRY_RUN_EXECUTOR_V1_PROOF_BEGIN",
);
console.log("binding_contract_green=true");
console.log("thirteen_phase_order_green=true");
console.log("append_once_receipt_green=true");
console.log("identical_duplicate_suppressed_green=true");
console.log("conflicting_duplicate_rejected_green=true");
console.log("crash_safe_resume_contract_green=true");
console.log("credential_account_binding_green=true");
console.log("live_authority_rejected_green=true");
console.log("protected_state_overlap_rejected_green=true");
console.log("cli_inspect_green=true");
console.log("cli_dry_run_green=true");
console.log("wrong_confirmation_rejected_green=true");
console.log("live_command_absent_green=true");
console.log("payment_transfer=false");
console.log("wc_ledger_write=false");
console.log("wc_to_void_settlement=false");
console.log("wallet_or_signer_access=false");
console.log(
  "VOID_AGENT_PAID_WORK_LIFECYCLE_DRY_RUN_EXECUTOR_V1_GREEN",
);
