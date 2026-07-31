#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SURVEY_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DISABLED_PRODUCTION_DEPLOYMENT_MECHANISM_SURVEY_V1";
export const PACKET_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DISABLED_PRODUCTION_DEPLOYMENT_PACKET_V1";
export const VERSION = 1;
export const SOURCE_COMMIT = "3b298bc1e31365aec7a20d03c3f425e22fd2f949";
export const PR889_HEAD = "555745a19625e4772e1b847dc60215ad0618fb32";
export const CHECKPOINT_TAG = "ckpt-authenticated-paid-work-activation-persistence-runtime-binding-v1-cli-no-read-postmerge-exact-green-20260731T154115Z";
export const INPUT_SURVEY_RECEIPT_SHA256 =
  "7abcbe1e5e20041646411ba9bf3f98bdde5a7099417527ad4d851b80f033a0f7";
export const PACKET_ID_PREFIX = "voidapwrdp1_";

const SOURCE_FILES = Object.freeze({
  "docs": {
    "path": "docs/operations/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.md",
    "sha256": "6478d3d43896eff5eb7f096abb4afe6722ac93929a1a8d02d1427e3956dd42a3"
  },
  "example": {
    "path": "examples/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.example.json",
    "sha256": "f4e017c32a49e8681ea174481e01f26284eb266ebbcf266cdbd114aac9688928"
  },
  "proof": {
    "path": "scripts/prove_authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts",
    "sha256": "54d8d6d18abdd60c9864d70dcb9ef4e2ad16059b8606cda18a1d64fc6ad329c6"
  },
  "runtime": {
    "path": "scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts",
    "sha256": "3248f5720121d699e5ea4fe34554f7c0ee75ae1f751a8ade7f0a93e3ce72f1b7"
  },
  "schema": {
    "path": "schemas/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.schema.json",
    "sha256": "23e6a070b201f26a1f856e5fc11942d60617ef77782a6d6a832d65701cc79de5"
  },
  "workflow": {
    "path": ".github/workflows/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.yml",
    "sha256": "7ea8a710cbfd87734adb20843fb221783884fbcdd20ad94756779953227a173d"
  }
});
const UNIT_NAMES = Object.freeze([
  "void-node-live.service",
  "void-public-node-tor-backend-v1.service",
  "void-tor-onion-transport-v1.service"
]);
const ACTIVATION_BLOCKERS = Object.freeze([
  "explicit_enable_configuration_not_authorized",
  "production_private_root_not_created",
  "trusted_live_context_provider_not_bound",
  "production_command_source_not_authorized",
  "confirmed_apply_not_authorized",
  "separate_payment_execution_gate_absent",
  "separate_work_execution_gate_absent"
]);
const SURVEY_AUTHORITY_FALSE = Object.freeze([
  "activation",
  "configuration_write",
  "deployment",
  "fund_movement",
  "http_route_registration",
  "network_listener_create",
  "payment_authority",
  "payment_destination_resolution",
  "payment_execution",
  "production_root_create",
  "production_signing",
  "quote_acceptance",
  "service_restart",
  "service_unit_create",
  "transaction_broadcast",
  "transaction_construction",
  "void_settlement",
  "wallet_access",
  "work_credit_write",
  "work_dispatch",
  "work_execution_authorization"
]);

function fail(code) {
  throw new Error(code);
}

function requireCondition(condition, code) {
  if (!condition) fail(code);
}

function isObject(value) {
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value),
  );
}

function get(root, dotted) {
  let value = root;

  for (const key of dotted.split(".")) {
    requireCondition(
      isObject(value) && Object.hasOwn(value, key),
      `missing_${dotted}`,
    );
    value = value[key];
  }

  return value;
}

function expect(root, dotted, expected) {
  const actual = get(root, dotted);

  requireCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `unexpected_${dotted}`,
  );
}

function expectSha256(value, label) {
  requireCondition(
    typeof value === "string" && /^[0-9a-f]{64}$/.test(value),
    `invalid_sha256_${label}`,
  );
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
    ).join(",")}}`;
  }

  return JSON.stringify(value);
}

export function sha256Canonical(value) {
  return crypto
    .createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex");
}

function validateFalseTree(value, label) {
  requireCondition(isObject(value), `invalid_${label}`);

  for (const [key, present] of Object.entries(value)) {
    requireCondition(
      present === false,
      `unexpected_${label}_${key}`,
    );
  }
}

function validateSurvey(receipt) {
  requireCondition(isObject(receipt), "invalid_survey_receipt");
  expect(receipt, "marker", SURVEY_MARKER);
  expect(receipt, "version", VERSION);
  expect(receipt, "status", "green");

  expect(receipt, "source.commit", SOURCE_COMMIT);
  expect(receipt, "source.pr889_head", PR889_HEAD);
  expect(receipt, "source.pr889_merge", SOURCE_COMMIT);
  expect(receipt, "source.checkpoint_tag", CHECKPOINT_TAG);
  expect(receipt, "source.critical_post_pr889_drift", false);

  for (const [key, expected] of Object.entries(SOURCE_FILES)) {
    expect(receipt, `source.files.${key}.path`, expected.path);
    const actualSha = get(receipt, `source.files.${key}.sha256`);
    expectSha256(actualSha, `source_file_${key}`);
    requireCondition(
      actualSha === expected.sha256,
      `unexpected_source_file_sha_${key}`,
    );
  }

  expect(receipt, "runtime_surface.kind", "standalone_operator_cli");

  for (const key of [
    "imported_by_src",
    "referenced_by_public_server_tool",
    "live_process_reference",
    "http_route_registered",
    "network_listener_created",
    "service_unit_created",
  ]) {
    expect(receipt, `runtime_surface.${key}`, false);
  }

  validateFalseTree(
    get(receipt, "configuration.manager_environment_key_presence"),
    "manager_environment",
  );

  const unitEnvironment = get(
    receipt,
    "configuration.unit_environment_key_presence",
  );

  requireCondition(
    isObject(unitEnvironment),
    "invalid_unit_environment",
  );

  requireCondition(
    JSON.stringify(Object.keys(unitEnvironment).sort())
      === JSON.stringify([...UNIT_NAMES].sort()),
    "unexpected_unit_environment_key_set",
  );

  for (const unit of UNIT_NAMES) {
    validateFalseTree(
      unitEnvironment[unit],
      `unit_environment_${unit}`,
    );
  }

  for (const key of [
    "enable_configuration_present",
    "production_root_configuration_present",
    "optional_configuration_present",
    "configuration_written",
    "production_root_created",
  ]) {
    expect(receipt, `configuration.${key}`, false);
  }

  expect(receipt, "proof.focused_runtime_binding", "exact_green");
  expect(receipt, "proof.disabled_cli_status", "disabled");
  expect(receipt, "proof.disabled_cli_command_file_not_read", true);
  expect(receipt, "proof.disabled_cli_trusted_context_file_not_read", true);
  expect(receipt, "proof.disabled_cli_store_inspected", false);
  expect(receipt, "proof.disabled_cli_persistence_attempted", false);

  expect(
    receipt,
    "decision.ready_to_build_disabled_production_deployment_packet",
    true,
  );
  expect(
    receipt,
    "decision.ready_for_disabled_production_deployment",
    true,
  );
  expect(receipt, "decision.ready_for_activation", false);
  expect(
    receipt,
    "decision.activation_blockers",
    ACTIVATION_BLOCKERS,
  );

  expect(receipt, "authority.receipt_write", true);
  expect(receipt, "authority.source_read", true);

  for (const key of SURVEY_AUTHORITY_FALSE) {
    expect(receipt, `authority.${key}`, false);
  }

  return receipt;
}

function packetBasis() {
  return {
    marker: PACKET_MARKER,
    version: VERSION,
    input_survey_receipt_sha256: INPUT_SURVEY_RECEIPT_SHA256,
    source: {
      commit: SOURCE_COMMIT,
      checkpoint_tag: CHECKPOINT_TAG,
      files: SOURCE_FILES,
    },
    deployment_target: {
      surface: "standalone_operator_cli",
      host_scope: "operator_selected_single_host",
      install_mode: "source_bound_disabled_only",
      enable_configuration_required: false,
      production_private_root_required: false,
      http_route_required: false,
      network_listener_required: false,
      service_unit_required: false,
      service_restart_required: false,
    },
    preconditions: {
      exact_source_and_checkpoint: true,
      runtime_source_bound: true,
      runtime_imported_by_src: false,
      runtime_referenced_by_public_server_tool: false,
      runtime_live_process_reference: false,
      enable_configuration_present: false,
      production_root_configuration_present: false,
      optional_configuration_present: false,
      focused_runtime_binding_proof_green: true,
      disabled_cli_no_read_green: true,
    },
    ready_for_disabled_production_deployment: true,
    ready_for_activation: false,
    activation_blockers: ACTIVATION_BLOCKERS,
    authority: {
      receipt_read: true,
      packet_evaluation: true,
      configuration_write: false,
      production_root_create: false,
      http_route_registration: false,
      network_listener_create: false,
      service_unit_create: false,
      service_restart: false,
      deployment: false,
      activation: false,
      quote_acceptance: false,
      payment_authority: false,
      payment_execution: false,
      payment_destination_resolution: false,
      transaction_construction: false,
      transaction_broadcast: false,
      wallet_access: false,
      production_signing: false,
      work_execution_authorization: false,
      work_dispatch: false,
      work_credit_write: false,
      void_settlement: false,
      fund_movement: false,
    },
  };
}

export function evaluateDisabledProductionDeploymentPacketV1(receipt) {
  validateSurvey(receipt);
  const basis = packetBasis();

  return {
    ...basis,
    packet_id: `${PACKET_ID_PREFIX}${sha256Canonical(basis)}`,
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (
    args.length !== 3
      || args[0] !== "evaluate"
      || args[1] !== "--input"
  ) {
    fail("usage_evaluate_--input");
  }

  const inputPath = path.resolve(args[2]);
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  process.stdout.write(
    `${JSON.stringify(
      evaluateDisabledProductionDeploymentPacketV1(input),
      null,
      2,
    )}\n`,
  );
}

const invoked = process.argv[1]
  ? path.resolve(process.argv[1])
  : "";

if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error.message}\n`);
    process.exitCode = 1;
  });
}
