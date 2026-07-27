#!/usr/bin/env node
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

export const BINDING_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_V1";
export const PLAN_MARKER =
  "VOID_AGENT_PAID_WORK_LIFECYCLE_DRY_RUN_PLAN_V1";
export const RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_LIFECYCLE_DRY_RUN_RECEIPT_V1";
export const CONFIRMATION = "dryRunAgentPaidWorkLifecycleV1";

export const PHASES = Object.freeze([
  "work_order",
  "quote",
  "acceptance",
  "payment_intent",
  "payment_execution_authorization",
  "payment_receipt",
  "independent_payment_confirmation",
  "work_execution_authorization",
  "work_completion_receipt",
  "independent_completion_verification",
  "wc_award_authorization",
  "wc_ledger_write",
  "wc_to_void_settlement",
]);

const ID_RE = /^void[a-z0-9_]{2,160}$/;
const SHA_RE = /^[0-9a-f]{64}$/;
const ACCOUNT_RE = /^[A-Za-z0-9._:-]{3,160}$/;

function hold(message) {
  throw new Error(`HOLD: ${message}`);
}

function object(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    hold(`${label} must be an object`);
  }
  return value;
}

function text(value, label, pattern = null) {
  if (typeof value !== "string" || value.length === 0) {
    hold(`${label} must be a non-empty string`);
  }
  if (pattern && !pattern.test(value)) {
    hold(`${label} has an invalid format`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    hold(
      `${label} keys differ expected=${JSON.stringify(wanted)} ` +
      `actual=${JSON.stringify(actual)}`,
    );
  }
}

function canonicalValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function readJson(path, label = "JSON input") {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  return object(parsed, label);
}

export function validateBinding(input) {
  const binding = object(input, "credential WC-account binding");
  exactKeys(
    binding,
    [
      "marker",
      "version",
      "binding_id",
      "credential_id",
      "agent_id",
      "destination_wc_account",
      "scope",
      "status",
      "effective_at",
      "expires_at",
      "uniqueness_key",
      "policy",
    ],
    "credential WC-account binding",
  );

  if (binding.marker !== BINDING_MARKER || binding.version !== 1) {
    hold("credential WC-account binding marker/version differs");
  }

  text(binding.binding_id, "binding_id", ID_RE);
  text(binding.credential_id, "credential_id", ID_RE);
  text(binding.agent_id, "agent_id", ACCOUNT_RE);
  text(
    binding.destination_wc_account,
    "destination_wc_account",
    ACCOUNT_RE,
  );

  if (binding.scope !== "agent_paid_work_submit") {
    hold("binding scope must be agent_paid_work_submit");
  }
  if (binding.status !== "active") {
    hold("binding status must be active");
  }
  text(binding.effective_at, "effective_at");
  if (binding.expires_at !== null && typeof binding.expires_at !== "string") {
    hold("expires_at must be null or a string");
  }

  const expectedUniqueness =
    `credential-wc-account:${binding.credential_id}`;
  if (binding.uniqueness_key !== expectedUniqueness) {
    hold("binding uniqueness_key differs");
  }

  const policy = object(binding.policy, "binding policy");
  exactKeys(
    policy,
    [
      "one_active_binding_per_credential",
      "account_change_requires_new_binding",
      "live_settlement_authorized",
    ],
    "binding policy",
  );

  if (
    policy.one_active_binding_per_credential !== true ||
    policy.account_change_requires_new_binding !== true ||
    policy.live_settlement_authorized !== false
  ) {
    hold("binding policy does not preserve the dry-run boundary");
  }

  return binding;
}

function decimalString(value, label, { integer = false } = {}) {
  text(value, label);
  const pattern = integer ? /^(0|[1-9][0-9]*)$/ : /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;
  if (!pattern.test(value)) {
    hold(`${label} must be a canonical non-negative decimal string`);
  }
  return BigInt(value.replace(".", ""));
}

export function validatePlan(input, bindingInput) {
  const binding = validateBinding(bindingInput);
  const plan = object(input, "lifecycle dry-run plan");

  exactKeys(
    plan,
    [
      "marker",
      "version",
      "canary_id",
      "uniqueness_key",
      "credential_id",
      "agent_id",
      "destination_wc_account",
      "created_at",
      "lifecycle",
      "requested",
      "prestate",
      "expected_poststate",
      "authority",
      "modes",
    ],
    "lifecycle dry-run plan",
  );

  if (plan.marker !== PLAN_MARKER || plan.version !== 1) {
    hold("lifecycle dry-run plan marker/version differs");
  }

  text(plan.canary_id, "canary_id", ID_RE);
  const expectedUniqueness =
    `paid-work-economic-canary:${plan.canary_id}`;
  if (plan.uniqueness_key !== expectedUniqueness) {
    hold("plan uniqueness_key differs");
  }

  if (plan.credential_id !== binding.credential_id) {
    hold("plan credential_id is not bound");
  }
  if (plan.agent_id !== binding.agent_id) {
    hold("plan agent_id is not bound");
  }
  if (plan.destination_wc_account !== binding.destination_wc_account) {
    hold("plan destination_wc_account is not bound");
  }

  text(plan.created_at, "created_at");

  if (!Array.isArray(plan.lifecycle) || plan.lifecycle.length !== PHASES.length) {
    hold(`lifecycle must contain exactly ${PHASES.length} phases`);
  }

  const artifactIds = new Set();
  const artifactHashes = new Set();

  plan.lifecycle.forEach((entryInput, index) => {
    const entry = object(entryInput, `lifecycle[${index}]`);
    exactKeys(
      entry,
      ["phase", "artifact_id", "artifact_sha256"],
      `lifecycle[${index}]`,
    );

    if (entry.phase !== PHASES[index]) {
      hold(
        `lifecycle phase order differs at index=${index} ` +
        `expected=${PHASES[index]} actual=${entry.phase}`,
      );
    }
    text(entry.artifact_id, `lifecycle[${index}].artifact_id`, ID_RE);
    text(
      entry.artifact_sha256,
      `lifecycle[${index}].artifact_sha256`,
      SHA_RE,
    );

    if (artifactIds.has(entry.artifact_id)) {
      hold("lifecycle artifact_id values must be unique");
    }
    if (artifactHashes.has(entry.artifact_sha256)) {
      hold("lifecycle artifact_sha256 values must be unique");
    }
    artifactIds.add(entry.artifact_id);
    artifactHashes.add(entry.artifact_sha256);
  });

  const requested = object(plan.requested, "requested");
  exactKeys(
    requested,
    ["payment_amount_usdc", "wc_award", "settlement_wc"],
    "requested",
  );
  decimalString(requested.payment_amount_usdc, "payment_amount_usdc");
  const award = decimalString(requested.wc_award, "wc_award", {
    integer: true,
  });
  const settlement = decimalString(
    requested.settlement_wc,
    "settlement_wc",
    { integer: true },
  );
  if (award <= 0n || settlement <= 0n || settlement > award) {
    hold("requested WC values are outside the bounded dry-run policy");
  }

  const prestate = object(plan.prestate, "prestate");
  const expectedPoststate = object(
    plan.expected_poststate,
    "expected_poststate",
  );
  exactKeys(prestate, ["wc_redeemable", "void_balance"], "prestate");
  exactKeys(
    expectedPoststate,
    ["wc_redeemable", "void_balance"],
    "expected_poststate",
  );
  decimalString(prestate.wc_redeemable, "prestate.wc_redeemable", {
    integer: true,
  });
  decimalString(prestate.void_balance, "prestate.void_balance");
  decimalString(
    expectedPoststate.wc_redeemable,
    "expected_poststate.wc_redeemable",
    { integer: true },
  );
  decimalString(
    expectedPoststate.void_balance,
    "expected_poststate.void_balance",
  );
  if (canonicalJson(prestate) !== canonicalJson(expectedPoststate)) {
    hold("dry-run expected_poststate must equal prestate");
  }

  const authority = object(plan.authority, "authority");
  exactKeys(
    authority,
    [
      "payment_execute",
      "wc_ledger_write",
      "wc_to_void_execute",
      "wallet_access",
      "signer_access",
    ],
    "authority",
  );
  for (const [key, value] of Object.entries(authority)) {
    if (value !== false) {
      hold(`live authority is forbidden in dry-run: ${key}`);
    }
  }

  const modes = object(plan.modes, "modes");
  exactKeys(
    modes,
    ["payment", "wc_ledger", "wc_to_void"],
    "modes",
  );
  if (
    modes.payment !== "dry_run_no_transfer" ||
    modes.wc_ledger !== "dry_run_no_write" ||
    modes.wc_to_void !== "dry_run_no_wallet"
  ) {
    hold("dry-run modes differ");
  }

  return plan;
}

function assertSafeStateDirectory(stateDirectory) {
  const value = resolve(stateDirectory);
  if (!isAbsolute(value)) {
    hold("state directory must resolve to an absolute path");
  }

  const forbiddenRoots = [
    resolve(homedir(), ".config/void"),
    resolve(
      homedir(),
      ".local/state/void-agent-paid-work-submission-receiver-v1",
    ),
    resolve(homedir(), ".local/state/void-node"),
  ];

  for (const forbidden of forbiddenRoots) {
    if (value === forbidden || value.startsWith(`${forbidden}/`)) {
      hold(`dry-run state directory overlaps protected state: ${forbidden}`);
    }
  }

  const lower = value.toLowerCase();
  if (
    !lower.includes("dry-run") &&
    !lower.includes("/tmp/") &&
    !lower.startsWith(resolve(tmpdir()).toLowerCase())
  ) {
    hold("dry-run state directory must be explicitly isolated");
  }

  return value;
}

function atomicCreateJson(finalPath, value) {
  mkdirSync(dirname(finalPath), { recursive: true, mode: 0o700 });
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  const temporary =
    `${finalPath}.tmp-${process.pid}-${sha256(payload).slice(0, 12)}`;
  let descriptor = null;

  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeSync(descriptor, payload, null, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;

    try {
      linkSync(temporary, finalPath);
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
      return false;
    }
    return true;
  } finally {
    if (descriptor !== null) {
      closeSync(descriptor);
    }
    if (existsSync(temporary)) {
      unlinkSync(temporary);
    }
  }
}

function loadExisting(path, label) {
  if (!existsSync(path)) {
    return null;
  }
  return readJson(path, label);
}

function buildReceipt(binding, plan, inputDigest, executionId) {
  return {
    marker: RECEIPT_MARKER,
    version: 1,
    execution_id: executionId,
    canary_id: plan.canary_id,
    uniqueness_key: plan.uniqueness_key,
    input_digest: inputDigest,
    binding_id: binding.binding_id,
    credential_id: binding.credential_id,
    agent_id: binding.agent_id,
    destination_wc_account: binding.destination_wc_account,
    lifecycle_phase_count: PHASES.length,
    lifecycle_phases: [...PHASES],
    requested: plan.requested,
    prestate: plan.prestate,
    poststate: plan.expected_poststate,
    decision: "DRY_RUN_EXACT_GREEN",
    authority_consumed: {
      payment_execute: false,
      wc_ledger_write: false,
      wc_to_void_execute: false,
      wallet_access: false,
      signer_access: false,
    },
    mutations: {
      payment_transfer: false,
      wc_ledger_write: false,
      wc_to_void_settlement: false,
      wallet_access: false,
      signer_access: false,
      network_request: false,
      service_restart: false,
      deployment: false,
    },
    next: "operator_review_before_any_live_authority_lane",
  };
}

export function inspectDryRun({ binding: bindingInput, plan: planInput }) {
  const binding = validateBinding(bindingInput);
  const plan = validatePlan(planInput, binding);
  const inputDigest = sha256(
    canonicalJson({
      binding,
      plan,
    }),
  );
  const executionId =
    `voidapwexecdry1_${sha256(
      canonicalJson({
        uniqueness_key: plan.uniqueness_key,
        input_digest: inputDigest,
      }),
    )}`;

  return {
    marker: "VOID_AGENT_PAID_WORK_LIFECYCLE_DRY_RUN_INSPECTION_V1",
    valid: true,
    execution_id: executionId,
    input_digest: inputDigest,
    phase_count: PHASES.length,
    destination_wc_account: binding.destination_wc_account,
    live_authority: false,
    writes_state: false,
  };
}

export function executeDryRun({
  binding: bindingInput,
  plan: planInput,
  stateDirectory,
}) {
  const binding = validateBinding(bindingInput);
  const plan = validatePlan(planInput, binding);
  const stateDir = assertSafeStateDirectory(stateDirectory);
  const inspection = inspectDryRun({ binding, plan });
  const inputDigest = inspection.input_digest;
  const executionId = inspection.execution_id;
  const keyHash = sha256(plan.uniqueness_key);
  const keyPath = join(stateDir, "keys", `${keyHash}.json`);
  const receiptPath = join(
    stateDir,
    "receipts",
    `${executionId}.json`,
  );

  const expectedKeyRecord = {
    marker: "VOID_AGENT_PAID_WORK_LIFECYCLE_DRY_RUN_KEY_V1",
    version: 1,
    uniqueness_key: plan.uniqueness_key,
    input_digest: inputDigest,
    execution_id: executionId,
  };

  const existingKey = loadExisting(keyPath, "dry-run uniqueness key");
  if (existingKey) {
    if (canonicalJson(existingKey) !== canonicalJson(expectedKeyRecord)) {
      hold("conflicting duplicate dry-run uniqueness key");
    }

    const existingReceipt = loadExisting(
      receiptPath,
      "dry-run receipt",
    );
    if (existingReceipt) {
      if (existingReceipt.input_digest !== inputDigest) {
        hold("existing dry-run receipt digest differs");
      }
      return {
        ...existingReceipt,
        duplicate: true,
        receipt_path: receiptPath,
        key_path: keyPath,
      };
    }
  } else {
    const keyCreated = atomicCreateJson(keyPath, expectedKeyRecord);
    if (!keyCreated) {
      return executeDryRun({
        binding,
        plan,
        stateDirectory: stateDir,
      });
    }
  }

  const receipt = buildReceipt(
    binding,
    plan,
    inputDigest,
    executionId,
  );
  const receiptCreated = atomicCreateJson(receiptPath, receipt);

  if (!receiptCreated) {
    const existingReceipt = loadExisting(
      receiptPath,
      "dry-run receipt",
    );
    if (
      !existingReceipt ||
      existingReceipt.input_digest !== inputDigest
    ) {
      hold("conflicting duplicate dry-run receipt");
    }
    return {
      ...existingReceipt,
      duplicate: true,
      receipt_path: receiptPath,
      key_path: keyPath,
    };
  }

  return {
    ...receipt,
    duplicate: false,
    receipt_path: receiptPath,
    key_path: keyPath,
  };
}

function parseArgs(argv) {
  const command = argv[2];
  const flags = new Map();

  for (let index = 3; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      hold("CLI flags must use --name value pairs");
    }
    if (flags.has(key)) {
      hold(`duplicate CLI flag: ${key}`);
    }
    flags.set(key, value);
  }

  return { command, flags };
}

function requireFlag(flags, name) {
  if (!flags.has(name)) {
    hold(`missing CLI flag: ${name}`);
  }
  return flags.get(name);
}

export function main(argv = process.argv) {
  const { command, flags } = parseArgs(argv);
  const bindingPath = requireFlag(flags, "--binding");
  const planPath = requireFlag(flags, "--plan");
  const binding = readJson(bindingPath, "binding file");
  const plan = readJson(planPath, "plan file");

  if (command === "inspect") {
    if (flags.size !== 2) {
      hold("inspect accepts only --binding and --plan");
    }
    console.log(JSON.stringify(inspectDryRun({ binding, plan })));
    return;
  }

  if (command === "dry-run") {
    const stateDirectory = requireFlag(flags, "--state-dir");
    const confirmation = requireFlag(flags, "--confirm");
    if (flags.size !== 4) {
      hold(
        "dry-run accepts only --binding, --plan, --state-dir, and --confirm",
      );
    }
    if (confirmation !== CONFIRMATION) {
      hold("dry-run confirmation token mismatch");
    }
    console.log(
      JSON.stringify(
        executeDryRun({
          binding,
          plan,
          stateDirectory,
        }),
      ),
    );
    return;
  }

  hold("only inspect and dry-run commands are supported");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";

if (import.meta.url === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(error?.message || String(error));
    process.exitCode = 2;
  }
}
