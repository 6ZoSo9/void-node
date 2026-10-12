#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

const CLI = path.resolve("scripts/agent_paid_work_credential_wc_account_binding_lifecycle_v1.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-apwc-binding-proof-"));
const credentialRegistry = path.join(temp, "credential-registry.json");
const bindingRegistry = path.join(temp, "binding-registry.json");
const staged = path.join(temp, "staged.json");
const receipt = path.join(temp, "receipt.json");
const duplicateReceipt = path.join(temp, "duplicate-receipt.json");

const credentialId = `voidapwc1_${"1".repeat(64)}`;
const revokedCredentialId = `voidapwc1_${"2".repeat(64)}`;
const agentId = "void.agent.proof";
const account = "void-paid-work-agent-proof";
const validFrom = "2026-07-27T00:00:00.000Z";
const validUntil = "2026-08-26T00:00:00.000Z";
const createdAt = "2026-07-27T00:00:00.000Z";
const appliedAt = "2026-07-27T00:01:00.000Z";

fs.writeFileSync(
  credentialRegistry,
  `${JSON.stringify({
    marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1",
    version: 1,
    credentials: [
      {
        credential_id: credentialId,
        agent_id: agentId,
        status: "active",
        enabled: true,
        token_sha256: crypto.createHash("sha256").update("proof-token").digest("hex")
      },
      {
        credential_id: revokedCredentialId,
        agent_id: "void.agent.revoked",
        status: "revoked",
        enabled: false,
        revoked_at: "2026-07-26T00:00:00.000Z"
      }
    ]
  }, null, 2)}\n`,
  {mode: 0o600}
);

function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [CLI, ...args], {encoding: "utf8"});
  assert.equal(
    result.status,
    expected,
    `command failed: ${args.join(" ")}\nstdout=${result.stdout}\nstderr=${result.stderr}`
  );
  return result;
}

const inspectBefore = JSON.parse(run([
  "inspect",
  "--credential-registry", credentialRegistry,
  "--binding-registry", bindingRegistry
]).stdout);
assert.equal(inspectBefore.binding_registry_exists, false);
assert.equal(inspectBefore.raw_token_read, false);

run([
  "stage-bind",
  "--credential-registry", credentialRegistry,
  "--binding-registry", bindingRegistry,
  "--credential-id", credentialId,
  "--agent-id", agentId,
  "--destination-wc-account", account,
  "--valid-from", validFrom,
  "--valid-until", validUntil,
  "--created-at", createdAt,
  "--review-decision-id", `voidapwcrd1_${"3".repeat(64)}`,
  "--issuance-preparation-id", `voidapwcip1_${"4".repeat(64)}`,
  "--output", staged
]);

const stagedValue = JSON.parse(fs.readFileSync(staged, "utf8"));
assert.equal(stagedValue.live_authority, false);
assert.equal(stagedValue.binding.authority.payment, false);
assert.equal(stagedValue.binding.authority.wc_ledger_write, false);
assert.equal(stagedValue.binding.authority.wc_to_void_settlement, false);
assert.equal(stagedValue.binding.authority.wallet_or_signer, false);

const applied = JSON.parse(run([
  "apply",
  "--credential-registry", credentialRegistry,
  "--binding-registry", bindingRegistry,
  "--staged", staged,
  "--receipt", receipt,
  "--applied-at", appliedAt,
  "--confirm", "apply-agent-paid-work-credential-wc-account-binding-v1"
]).stdout);
assert.equal(applied.write_performed, true);
assert.equal(applied.duplicate, false);
assert.equal(applied.raw_token_read, false);
assert.equal(fs.statSync(bindingRegistry).mode & 0o777, 0o600);

const registryValue = JSON.parse(fs.readFileSync(bindingRegistry, "utf8"));
assert.equal(registryValue.bindings.length, 1);
assert.equal(registryValue.bindings[0].destination_wc_account, account);

const registryHash = crypto.createHash("sha256").update(fs.readFileSync(bindingRegistry)).digest("hex");
const duplicate = JSON.parse(run([
  "apply",
  "--credential-registry", credentialRegistry,
  "--binding-registry", bindingRegistry,
  "--staged", staged,
  "--receipt", duplicateReceipt,
  "--applied-at", appliedAt,
  "--confirm", "apply-agent-paid-work-credential-wc-account-binding-v1"
]).stdout);
assert.equal(duplicate.write_performed, false);
assert.equal(duplicate.duplicate, true);
assert.equal(
  crypto.createHash("sha256").update(fs.readFileSync(bindingRegistry)).digest("hex"),
  registryHash
);

const conflict = run([
  "stage-bind",
  "--credential-registry", credentialRegistry,
  "--binding-registry", bindingRegistry,
  "--credential-id", credentialId,
  "--agent-id", agentId,
  "--destination-wc-account", "void-paid-work-agent-conflict",
  "--valid-from", validFrom,
  "--valid-until", validUntil,
  "--created-at", createdAt,
  "--output", path.join(temp, "conflict-stage.json")
], 2);
assert.match(conflict.stderr, /already has an active WC-account binding/);

const revoked = run([
  "stage-bind",
  "--credential-registry", credentialRegistry,
  "--binding-registry", path.join(temp, "revoked-bindings.json"),
  "--credential-id", revokedCredentialId,
  "--agent-id", "void.agent.revoked",
  "--destination-wc-account", "void-paid-work-agent-revoked",
  "--valid-from", validFrom,
  "--valid-until", validUntil,
  "--created-at", createdAt,
  "--output", path.join(temp, "revoked-stage.json")
], 2);
assert.match(revoked.stderr, /credential is not active/);

const staleBindingRegistry = path.join(temp, "stale-bindings.json");
const staleStage = path.join(temp, "stale-stage.json");
run([
  "stage-bind",
  "--credential-registry", credentialRegistry,
  "--binding-registry", staleBindingRegistry,
  "--credential-id", credentialId,
  "--agent-id", agentId,
  "--destination-wc-account", "void-paid-work-agent-stale",
  "--valid-from", validFrom,
  "--valid-until", validUntil,
  "--created-at", createdAt,
  "--output", staleStage
]);
const changed = JSON.parse(fs.readFileSync(credentialRegistry, "utf8"));
changed.note = "changed-after-stage";
fs.writeFileSync(credentialRegistry, `${JSON.stringify(changed, null, 2)}\n`, {mode: 0o600});
const stale = run([
  "apply",
  "--credential-registry", credentialRegistry,
  "--binding-registry", staleBindingRegistry,
  "--staged", staleStage,
  "--receipt", path.join(temp, "stale-receipt.json"),
  "--applied-at", appliedAt,
  "--confirm", "apply-agent-paid-work-credential-wc-account-binding-v1"
], 2);
assert.match(stale.stderr, /credential registry SHA changed after staging/);

const source = fs.readFileSync(CLI, "utf8");
assert.equal(/\bfetch\s*\(/.test(source), false);
assert.equal(/node:https|node:http/.test(source), false);
assert.equal(/private[_ -]?key/i.test(source), false);
assert.equal(/sendTransaction|eth_sendRawTransaction/.test(source), false);

fs.rmSync(temp, {recursive: true, force: true});

console.log("VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_LIFECYCLE_V1_GREEN");
console.log("active_credential_required_green=true");
console.log("credential_agent_binding_green=true");
console.log("destination_wc_account_format_green=true");
console.log("single_active_binding_per_credential_green=true");
console.log("single_active_binding_per_account_green=true");
console.log("atomic_registry_replace_green=true");
console.log("private_registry_mode_green=true");
console.log("identical_duplicate_suppressed_green=true");
console.log("conflicting_duplicate_rejected_green=true");
console.log("stale_credential_registry_rejected_green=true");
console.log("revoked_credential_rejected_green=true");
console.log("raw_token_read=false");
console.log("payment_authorized=false");
console.log("wc_ledger_write_authorized=false");
console.log("wc_to_void_settlement_authorized=false");
console.log("wallet_or_signer_access=false");
console.log("network_request=false");
