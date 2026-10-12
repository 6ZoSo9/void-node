#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PACKET_MARKER,
  evaluateDisabledProductionDeploymentPacketV1,
} from "../tools/void-authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const examplePath = path.join(repoRoot, "examples/authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.example.json");
const schemaPath = path.join(repoRoot, "schemas/authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.schema.json");
const docsPath = path.join(repoRoot, "docs/operations/authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.md");
const workflowPath = path.join(repoRoot, ".github/workflows/authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.yml");
const toolPath = path.join(repoRoot, "tools/void-authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.mjs");
const expectedUnitNames = [
  "void-node-live.service",
  "void-public-node-tor-backend-v1.service",
  "void-tor-onion-transport-v1.service"
];

function fixture() {
  return structuredClone({
  "authority": {
    "activation": false,
    "configuration_write": false,
    "deployment": false,
    "fund_movement": false,
    "http_route_registration": false,
    "network_listener_create": false,
    "payment_authority": false,
    "payment_destination_resolution": false,
    "payment_execution": false,
    "production_root_create": false,
    "production_signing": false,
    "quote_acceptance": false,
    "receipt_write": true,
    "service_restart": false,
    "service_unit_create": false,
    "source_read": true,
    "transaction_broadcast": false,
    "transaction_construction": false,
    "void_settlement": false,
    "wallet_access": false,
    "work_credit_write": false,
    "work_dispatch": false,
    "work_execution_authorization": false
  },
  "configuration": {
    "configuration_written": false,
    "enable_configuration_present": false,
    "manager_environment_key_presence": {
      "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED": false,
      "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_COUNT": false,
      "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_FILE_BYTES": false,
      "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_POINTER_BYTES": false,
      "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RECOVER_EXACT_ORPHANED_GENERATION": false,
      "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT": false
    },
    "optional_configuration_present": false,
    "production_root_configuration_present": false,
    "production_root_created": false,
    "unit_environment_key_presence": {
      "void-node-live.service": {
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_COUNT": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_FILE_BYTES": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_POINTER_BYTES": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RECOVER_EXACT_ORPHANED_GENERATION": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT": false
      },
      "void-public-node-tor-backend-v1.service": {
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_COUNT": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_FILE_BYTES": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_POINTER_BYTES": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RECOVER_EXACT_ORPHANED_GENERATION": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT": false
      },
      "void-tor-onion-transport-v1.service": {
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_COUNT": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_FILE_BYTES": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_POINTER_BYTES": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RECOVER_EXACT_ORPHANED_GENERATION": false,
        "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT": false
      }
    }
  },
  "decision": {
    "activation_blockers": [
      "explicit_enable_configuration_not_authorized",
      "production_private_root_not_created",
      "trusted_live_context_provider_not_bound",
      "production_command_source_not_authorized",
      "confirmed_apply_not_authorized",
      "separate_payment_execution_gate_absent",
      "separate_work_execution_gate_absent"
    ],
    "ready_for_activation": false,
    "ready_for_disabled_production_deployment": true,
    "ready_to_build_disabled_production_deployment_packet": true
  },
  "marker": "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DISABLED_PRODUCTION_DEPLOYMENT_MECHANISM_SURVEY_V1",
  "proof": {
    "disabled_cli_command_file_not_read": true,
    "disabled_cli_persistence_attempted": false,
    "disabled_cli_status": "disabled",
    "disabled_cli_store_inspected": false,
    "disabled_cli_trusted_context_file_not_read": true,
    "focused_runtime_binding": "exact_green"
  },
  "runtime_surface": {
    "http_route_registered": false,
    "imported_by_src": false,
    "kind": "standalone_operator_cli",
    "live_process_reference": false,
    "network_listener_created": false,
    "reference_scan": {
      "needle": "authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1",
      "public_server_tool_reference_count": 0,
      "public_server_tool_references": [],
      "src_reference_count": 0,
      "src_references": [],
      "total_tracked_references_outside_runtime": 11
    },
    "referenced_by_public_server_tool": false,
    "service_unit_created": false
  },
  "source": {
    "checkpoint_tag": "ckpt-authenticated-paid-work-activation-persistence-runtime-binding-v1-cli-no-read-postmerge-exact-green-20260731T154115Z",
    "commit": "3b298bc1e31365aec7a20d03c3f425e22fd2f949",
    "critical_post_pr889_drift": false,
    "files": {
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
    },
    "pr889_head": "555745a19625e4772e1b847dc60215ad0618fb32",
    "pr889_merge": "3b298bc1e31365aec7a20d03c3f425e22fd2f949"
  },
  "status": "green",
  "version": 1
});
}

function expectReject(label, mutate) {
  const value = fixture();
  mutate(value);
  assert.throws(
    () => evaluateDisabledProductionDeploymentPacketV1(value),
    /unexpected_|invalid_|missing_/,
    label,
  );
}

const packet = evaluateDisabledProductionDeploymentPacketV1(fixture());
const example = JSON.parse(await readFile(examplePath, "utf8"));

assert.deepEqual(packet, example);
assert.equal(packet.marker, PACKET_MARKER);
assert.equal(packet.ready_for_disabled_production_deployment, true);
assert.equal(packet.ready_for_activation, false);
assert.equal(packet.deployment_target.surface, "standalone_operator_cli");
assert.equal(
  packet.deployment_target.install_mode,
  "source_bound_disabled_only",
);
assert.equal(packet.deployment_target.enable_configuration_required, false);
assert.equal(packet.deployment_target.production_private_root_required, false);
assert.equal(packet.deployment_target.http_route_required, false);
assert.equal(packet.deployment_target.network_listener_required, false);
assert.equal(packet.deployment_target.service_unit_required, false);
assert.equal(packet.deployment_target.service_restart_required, false);
console.log("example_and_packet_scope_exact_green=true");

assert.equal(packet.preconditions.exact_source_and_checkpoint, true);
assert.equal(packet.preconditions.runtime_source_bound, true);
assert.equal(packet.preconditions.runtime_imported_by_src, false);
assert.equal(
  packet.preconditions.runtime_referenced_by_public_server_tool,
  false,
);
assert.equal(packet.preconditions.runtime_live_process_reference, false);
assert.equal(packet.preconditions.enable_configuration_present, false);
assert.equal(
  packet.preconditions.production_root_configuration_present,
  false,
);
assert.equal(packet.preconditions.optional_configuration_present, false);
assert.equal(
  packet.preconditions.focused_runtime_binding_proof_green,
  true,
);
assert.equal(packet.preconditions.disabled_cli_no_read_green, true);
console.log("packet_preconditions_exact_green=true");

assert.equal(packet.authority.receipt_read, true);
assert.equal(packet.authority.packet_evaluation, true);

for (const [key, value] of Object.entries(packet.authority)) {
  if (!["receipt_read", "packet_evaluation"].includes(key)) {
    assert.equal(value, false, key);
  }
}

console.log("packet_authority_boundary_exact_green=true");

expectReject("activation", (value) => {
  value.decision.ready_for_activation = true;
});

expectReject("enable configuration", (value) => {
  value.configuration.enable_configuration_present = true;
});

expectReject("production root", (value) => {
  value.configuration.production_root_created = true;
});

expectReject("src import", (value) => {
  value.runtime_surface.imported_by_src = true;
});

expectReject("public server reference", (value) => {
  value.runtime_surface.referenced_by_public_server_tool = true;
});

expectReject("live process reference", (value) => {
  value.runtime_surface.live_process_reference = true;
});

expectReject("runtime source SHA", (value) => {
  value.source.files.runtime.sha256 = "0".repeat(64);
});

expectReject("proof status", (value) => {
  value.proof.focused_runtime_binding = "hold";
});

expectReject("payment authority escalation", (value) => {
  value.authority.payment_authority = true;
});

for (const unit of expectedUnitNames) {
  expectReject(`unit environment ${unit}`, (value) => {
    const keys = Object.keys(
      value.configuration.unit_environment_key_presence[unit],
    );
    value.configuration.unit_environment_key_presence[unit][keys[0]] = true;
  });
}

console.log("unsafe_survey_refusal_exact_green=true");

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
assert.equal(schema.x_void_marker, "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DISABLED_PRODUCTION_DEPLOYMENT_PACKET_SCHEMA_V1");
assert.equal(schema.properties.marker.const, PACKET_MARKER);
assert.equal(
  schema.properties.ready_for_disabled_production_deployment.const,
  true,
);
assert.equal(schema.properties.ready_for_activation.const, false);
assert.equal(
  schema.properties.deployment_target.properties.service_restart_required.const,
  false,
);
assert.equal(
  schema.properties.authority.properties.activation.const,
  false,
);
assert.equal(
  schema.properties.authority.properties.payment_execution.const,
  false,
);
console.log("schema_contract_exact_green=true");

const docs = await readFile(docsPath, "utf8");
for (const fragment of [
  "non-executable deployment decision artifact",
  "ready_for_activation=false",
  "Payment execution and work execution remain separate future authority gates",
  "cannot write configuration",
]) {
  assert.equal(docs.includes(fragment), true, fragment);
}

const workflow = await readFile(workflowPath, "utf8");
assert.equal(workflow.includes("node scripts/prove_authenticated_paid_work_runtime_disabled_production_deployment_packet_v1.mjs"), true);
assert.equal(workflow.includes("node --check tools/void-authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.mjs"), true);
console.log("docs_and_workflow_exact_green=true");

const temporary = await mkdtemp(
  path.join(os.tmpdir(), "void-paid-work-disabled-packet-proof-"),
);

try {
  const inputPath = path.join(temporary, "survey.json");
  const bytes = Buffer.from(`${JSON.stringify(fixture(), null, 2)}\n`);
  await writeFile(inputPath, bytes, { mode: 0o600 });
  const before = await readFile(inputPath);

  const result = spawnSync(
    process.execPath,
    [toolPath, "evaluate", "--input", inputPath],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), packet);
  assert.deepEqual(await readFile(inputPath), before);
  console.log("cli_and_input_bytes_unchanged_exact_green=true");
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const toolText = await readFile(toolPath, "utf8");

for (const prohibited of [
  "node:child_process",
  "spawnSync",
  "execFile",
  "writeFile",
  "appendFile",
  "createWriteStream",
  "node:http",
  "node:https",
  ".listen(",
  "createServer",
  "systemctl",
]) {
  assert.equal(toolText.includes(prohibited), false, prohibited);
}

console.log("non_executable_packet_tool_exact_green=true");
console.log("configuration_written=false");
console.log("production_root_created=false");
console.log("http_route_registered=false");
console.log("network_listener_created=false");
console.log("service_unit_created=false");
console.log("service_restarted=false");
console.log("deployment_performed=false");
console.log("activation_performed=false");
console.log("quote_acceptance=false");
console.log("payment_authority=false");
console.log("payment_execution=false");
console.log("transaction_broadcast=false");
console.log("wallet_access=false");
console.log("work_credit_write=false");
console.log("void_settlement=false");
console.log("fund_movement=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DISABLED_PRODUCTION_DEPLOYMENT_PACKET_V1_PROOF_GREEN=true",
);
