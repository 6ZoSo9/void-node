#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_CONFIRMATION_V1,
  VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1,
  VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_V1,
  buildVoidDatanetRegistrySigningStateIdentityProvisionReceiptV1,
  buildVoidDatanetRegistrySigningStateIdentityV1,
  validateVoidDatanetRegistrySigningStateIdentityV1,
  voidDatanetRegistrySigningStateIdentityCanonicalJsonV1,
} from "../tools/void-datanet-registry-signing-state-identity-provision-v1.mjs";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

const input={
  state_root_realpath:"/home/zoso/.local/state/void/datanet-registry-signing-v1",
  state_root_dev:"123",
  state_root_ino:"456",
};
const identity=buildVoidDatanetRegistrySigningStateIdentityV1(input);

assert.equal(identity.marker,VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_V1);
assert.equal(identity.version,1);
assert.equal(identity.state_root_realpath,input.state_root_realpath);
assert.equal(identity.state_root_dev,"123");
assert.equal(identity.state_root_ino,"456");
assert.match(identity.state_store_id,/^voiddrssi1_[0-9a-f]{64}$/u);

const material={
  marker:VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_V1,
  version:1,
  state_root_realpath:input.state_root_realpath,
  state_root_dev:"123",
  state_root_ino:"456",
};
assert.equal(
  identity.state_store_id,
  "voiddrssi1_"+
    sha256(Buffer.from(
      voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(material),
    )),
);
assert.deepEqual(
  validateVoidDatanetRegistrySigningStateIdentityV1(structuredClone(identity)),
  identity,
);

{
  const bad=structuredClone(identity);
  bad.state_store_id="voiddrssi1_"+"0".repeat(64);
  assert.throws(
    ()=>validateVoidDatanetRegistrySigningStateIdentityV1(bad),
    /signing_state_identity_id_mismatch/u,
  );
}
{
  const bad={...identity,unexpected:true};
  assert.throws(
    ()=>validateVoidDatanetRegistrySigningStateIdentityV1(bad),
    /signing_state_identity_keys_invalid/u,
  );
}
{
  assert.throws(
    ()=>buildVoidDatanetRegistrySigningStateIdentityV1({
      ...input,
      state_root_realpath:"relative/path",
    }),
    /signing_state_identity_path_invalid/u,
  );
}
{
  assert.throws(
    ()=>buildVoidDatanetRegistrySigningStateIdentityV1({
      ...input,
      state_root_ino:"0",
    }),
    /signing_state_identity_ino_zero_forbidden/u,
  );
}

const identityBytes=Buffer.from(
  voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(identity)+"\n",
  "utf8",
);
const receipt=buildVoidDatanetRegistrySigningStateIdentityProvisionReceiptV1({
  identity,
  observed_repo_head:"a".repeat(40),
  provisioned_at_utc:"2030-01-01T00:00:00.000Z",
  identity_file_sha256:sha256(identityBytes),
});
assert.equal(
  receipt.marker,
  VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1,
);
assert.equal(
  receipt.status,
  "SIGNING_STATE_GENERATION_IDENTITY_PROVISIONED_SIGNING_HOLD",
);
assert.equal(receipt.state_store_id,identity.state_store_id);
assert.match(receipt.provision_receipt_id,/^voiddrssip1_[0-9a-f]{64}$/u);
assert.equal(receipt.authority.filesystem_identity_write,true);
for(const key of [
  "state_root_mutation",
  "consumption_record_mutation",
  "credential_access",
  "private_key_access",
  "signer_object_exposed",
  "transaction_signing",
  "signed_transaction_export",
  "transaction_submission",
  "transaction_broadcast",
  "deployment",
  "chain2050_mutation",
  "funds_movement",
  "automatic_retry",
]){
  assert.equal(receipt.authority[key],false,key);
}
assert.equal(
  receipt.next_gate,
  "durable_single_use_registry_signing_authorization_consumption_with_external_state_generation_identity",
);
assert.equal(
  VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_CONFIRMATION_V1,
  "provisionDatanetRegistrySigningStateIdentityV1",
);

const runner=fs.readFileSync(
  "ops/nimo/void-nimo-datanet-registry-signing-state-identity-provision-v1.mjs",
  "utf8",
);

for(const required of [
  '.local/state/void/datanet-registry-signing-v1',
  '.config/void',
  'datanet-registry-signing-state-identity-v1.json',
  'provisionDatanetRegistrySigningStateIdentityV1',
  'signing_state_identity_prior_consumption_present',
  'entries.includes("consumed")',
  'signing_consumed_dir',
  'signing_state_identity_existing_conflict',
  'fs.constants.O_NOFOLLOW',
  'fs.constants.O_EXCL',
  'fs.linkSync(temp,IDENTITY_FILE)',
  'fs.fsyncSync(fd)',
  'fsyncDir(CONFIG_DIR)',
  'identity_file_mode=0600',
  'state_root_mutation=false',
  'consumption_record_mutation=false',
  'credential_access=false',
  'private_key_access=false',
  'transaction_signing=false',
  'signed_transaction_export=false',
  'transaction_submission=false',
  'transaction_broadcast=false',
  'deployment=false',
  'chain2050_mutation=false',
  'funds_movement=false',
]){
  assert.ok(runner.includes(required),required);
}

const confirmAt=runner.indexOf(
  'args.confirmation!==\n    VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_CONFIRMATION_V1',
);
const publishAt=runner.lastIndexOf("writeExclusiveIdentity(expectedBytes)");
assert.ok(confirmAt>=0,"confirmation check missing");
assert.ok(publishAt>confirmAt,"identity publication must follow confirmation");

for(const forbidden of [
  "SigningKey",
  "Wallet(",
  "privateKey",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
  "systemctl",
  "docker ",
  "ssh ",
  "sudo ",
  "fs.mkdirSync(STATE_ROOT",
  "fs.rmSync(STATE_ROOT",
  "fs.renameSync(STATE_ROOT",
  "fs.existsSync(consumed)",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1_PROOF_GREEN");
console.log("state_generation_device_inode_bound=true");
console.log("state_store_id_content_addressed=true");
console.log("prior_consumption_rejected=true");
console.log("existing_identity_conflict_rejected=true");
console.log("exclusive_hardlink_publication=true");
console.log("identity_file_mode=0600");
console.log("state_root_mutation=false");
console.log("consumption_record_mutation=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("signer_object_exposed=false");
console.log("transaction_signing=false");
console.log("signed_transaction_export=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
