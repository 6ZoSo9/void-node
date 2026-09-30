#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {computeAddress} from "ethers";

import {
  VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1,
  VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
  VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_V1,
  VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
  buildVoidDatanetRegistryDeployerCredentialBindingV1,
  observeVoidDatanetRegistryDeployerCredentialFileV1,
  runVoidDatanetRegistryDeployerCredentialBindingV1,
  validateVoidDatanetRegistryDeployerCredentialBindingV1,
  validateVoidDatanetRegistryDeployerSelectionV1,
} from "../tools/void-datanet-registry-deployer-credential-binding-v1.mjs";

import {
  buildVoidDatanetRegistryUnsignedCandidateFixtureV1,
} from "./fixtures/void-datanet-registry-unsigned-candidate-fixture-v1.mjs";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function rehashBinding(value){
  const x=structuredClone(value);
  delete x.credential_binding_id;
  return "voiddrcb1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}

const selection=JSON.parse(fs.readFileSync(
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
  "utf8",
));
assert.equal(
  validateVoidDatanetRegistryDeployerSelectionV1(selection),
  selection,
);
assert.equal(
  selection.credential_id,
  VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
);
assert.equal(
  selection.deployer_address,
  VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1,
);

const tmp=fs.mkdtempSync(
  path.join(os.tmpdir(),"void-registry-deployer-binding-proof-"),
);
try{
  const unconfirmed=
    observeVoidDatanetRegistryDeployerCredentialFileV1({
      credentials_directory:tmp,
    });
  assert.equal(unconfirmed.ok,false);
  assert.equal(
    unconfirmed.reason,
    "registry_deployer_credential_binding_confirmation_required",
  );
  assert.equal(unconfirmed.credential_content_access_performed,false);
  assert.equal(unconfirmed.private_key_access_performed,false);

  const wrongConfirmation=
    observeVoidDatanetRegistryDeployerCredentialFileV1({
      confirmation:"bindDatanetRegistryDeployerCredentialIdentityV2",
      credentials_directory:tmp,
    });
  assert.equal(wrongConfirmation.ok,false);
  assert.equal(
    wrongConfirmation.reason,
    "registry_deployer_credential_binding_confirmation_required",
  );
  assert.equal(wrongConfirmation.credential_content_access_performed,false);
  assert.equal(wrongConfirmation.private_key_access_performed,false);

  fs.chmodSync(tmp,0o700);
  const credential=path.join(
    tmp,
    VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
  );
  const testPrivateKey="0x"+"11".repeat(32);
  const expectedTestAddress=computeAddress(testPrivateKey).toLowerCase();
  fs.writeFileSync(credential,testPrivateKey+"\n",{mode:0o600});
  fs.chmodSync(credential,0o600);

  const observed=observeVoidDatanetRegistryDeployerCredentialFileV1({
    confirmation:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
    credentials_directory:tmp,
  });
  assert.equal(observed.ok,true);
  assert.equal(
    observed.marker,
    "VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_FILE_OBSERVATION_V1",
  );
  assert.equal(observed.derived_address,expectedTestAddress);
  assert.equal(observed.credential_source.canonical_directory,true);
  assert.equal(observed.credential_source.directory_private_mode,true);
  assert.equal(observed.credential_source.regular_file,true);
  assert.equal(observed.credential_source.symbolic_link,false);
  assert.equal(observed.credential_source.single_hard_link,true);
  assert.equal(observed.credential_source.owner_current_user,true);
  assert.equal(observed.credential_source.mode,"600");
  assert.equal(observed.credential_content_access_performed,true);
  assert.equal(observed.private_key_access_performed,true);
  assert.equal(observed.raw_private_key_output,false);
  assert.equal(observed.private_key_digest_output,false);
  assert.equal(observed.signer_object_exposed,false);
  assert.equal(observed.transaction_signing_performed,false);
  assert.equal(Object.hasOwn(observed,"credential_path"),false);
  assert.equal(Object.hasOwn(observed,"credentials_directory"),false);
  assert.equal(Object.hasOwn(observed,"private_key"),false);

  fs.chmodSync(credential,0o644);
  const publicMode=observeVoidDatanetRegistryDeployerCredentialFileV1({
    confirmation:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
    credentials_directory:tmp,
  });
  assert.equal(publicMode.ok,false);
  assert.equal(
    publicMode.reason,
    "registry_deployer_credential_file_out_of_policy",
  );
  assert.equal(publicMode.credential_content_access_performed,false);
  assert.equal(publicMode.private_key_access_performed,false);
  fs.chmodSync(credential,0o600);

  const extra=path.join(tmp,"extra-hardlink");
  fs.linkSync(credential,extra);
  const hardlinked=observeVoidDatanetRegistryDeployerCredentialFileV1({
    confirmation:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
    credentials_directory:tmp,
  });
  assert.equal(hardlinked.ok,false);
  assert.equal(
    hardlinked.reason,
    "registry_deployer_credential_file_out_of_policy",
  );
  fs.unlinkSync(extra);

  fs.unlinkSync(credential);
  const target=path.join(tmp,"target-key");
  fs.writeFileSync(target,testPrivateKey+"\n",{mode:0o600});
  fs.symlinkSync(target,credential);
  const symlinked=observeVoidDatanetRegistryDeployerCredentialFileV1({
    confirmation:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
    credentials_directory:tmp,
  });
  assert.equal(symlinked.ok,false);
  assert.equal(
    symlinked.reason,
    "registry_deployer_credential_open_or_read_failed",
  );
  assert.equal(symlinked.raw_private_key_output,false);
  fs.unlinkSync(credential);
  fs.unlinkSync(target);

  fs.chmodSync(tmp,0o755);
  const publicDirectory=observeVoidDatanetRegistryDeployerCredentialFileV1({
    confirmation:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
    credentials_directory:tmp,
  });
  assert.equal(publicDirectory.ok,false);
  assert.equal(
    publicDirectory.reason,
    "registry_deployer_credential_directory_out_of_policy",
  );
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}

const canonicalFixture=
  await buildVoidDatanetRegistryUnsignedCandidateFixtureV1();
const candidate=canonicalFixture.candidate;
const candidateEvidence=canonicalFixture.candidateEvidence;
assert.equal(
  canonicalFixture.deployerSelection.deployer_address,
  selection.deployer_address,
);
const goodCredentialObservation={
  ok:true,
  marker:"VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_FILE_OBSERVATION_V1",
  version:1,
  status:"credential_identity_observed_without_signer_object",
  credential_id:VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
  derived_address:VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1,
  credential_source:{
    canonical_directory:true,
    directory_private_mode:true,
    regular_file:true,
    symbolic_link:false,
    single_hard_link:true,
    owner_current_user:true,
    mode:"600",
    size_bytes:67,
  },
  credential_content_access_performed:true,
  private_key_access_performed:true,
  raw_private_key_output:false,
  private_key_digest_output:false,
  signer_object_exposed:false,
  transaction_signing_performed:false,
};

const binding=buildVoidDatanetRegistryDeployerCredentialBindingV1({
  deployer_selection:selection,
  unsigned_transaction_candidate:candidate,
  candidate_evidence:candidateEvidence,
  credential_observation:goodCredentialObservation,
  bound_at_utc:"2030-01-01T00:07:00.000Z",
  bound_on_host:"Nimo",
  observed_repo_head:"a".repeat(40),
});
assert.equal(
  binding.marker,
  VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_V1,
);
assert.equal(binding.status,"DEPLOYER_CREDENTIAL_IDENTITY_BOUND_SIGNING_HOLD");
assert.match(binding.credential_binding_id,/^voiddrcb1_[0-9a-f]{64}$/u);
assert.equal(binding.bound_on_host,"Nimo");
assert.equal(binding.observed_repo_head,"a".repeat(40));
assert.equal(binding.candidate_id,candidate.candidate_id);
assert.equal(
  binding.unsigned_transaction_hash,
  candidate.transaction.unsigned_transaction_hash,
);
assert.equal(
  binding.transaction_fingerprint_sha256,
  candidate.transaction_fingerprint_sha256,
);
assert.equal(binding.deployer_address,VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1);
assert.equal(
  binding.credential_id,
  VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
);
assert.equal(binding.credential_source.private_path_not_recorded,true);
assert.equal(binding.binding.exact_candidate_deployer_match,true);
assert.equal(binding.binding.credential_address_derived,true);
assert.equal(binding.binding.derived_address_matches_selected_deployer,true);
assert.equal(binding.binding.candidate_still_unexpired_at_binding,true);
assert.equal(binding.binding.identity_binding_only,true);
assert.equal(binding.binding.prior_candidate_does_not_authorize_signing,true);
assert.equal(binding.binding.rebind_immediately_before_signing_required,true);
assert.equal(binding.authority.identity_binding_only,true);
assert.equal(binding.authority.credential_content_access_performed,true);
assert.equal(binding.authority.private_key_access_performed,true);
assert.equal(binding.authority.raw_private_key_output,false);
assert.equal(binding.authority.private_key_digest_output,false);
assert.equal(binding.authority.signer_object_exposed,false);
assert.equal(binding.authority.wallet_access,false);
assert.equal(binding.authority.transaction_signing_authorized,false);
assert.equal(binding.authority.transaction_signing_performed,false);
assert.equal(binding.authority.transaction_broadcast_authorized,false);
assert.equal(binding.authority.chain2050_write_authorized,false);
assert.equal(binding.authority.funds_movement,false);
assert.equal(binding.signing_authorized,false);

{
  const badObservation={
    ...goodCredentialObservation,
    derived_address:"0x"+"4".repeat(40),
  };
  assert.throws(
    ()=>buildVoidDatanetRegistryDeployerCredentialBindingV1({
      deployer_selection:selection,
      unsigned_transaction_candidate:candidate,
      candidate_evidence:candidateEvidence,
      credential_observation:badObservation,
      bound_at_utc:"2030-01-01T00:07:00.000Z",
      bound_on_host:"Nimo",
      observed_repo_head:"a".repeat(40),
    }),
    /registry_deployer_credential_observation_invalid/u,
  );
}
{
  assert.throws(
    ()=>buildVoidDatanetRegistryDeployerCredentialBindingV1({
      deployer_selection:selection,
      unsigned_transaction_candidate:candidate,
      candidate_evidence:candidateEvidence,
      credential_observation:goodCredentialObservation,
      bound_at_utc:"2030-01-01T00:09:00.000Z",
      bound_on_host:"Nimo",
      observed_repo_head:"a".repeat(40),
    }),
    /registry_deployer_candidate_expired_for_binding/u,
  );
}
{
  const bad=structuredClone(binding);
  bad.authority.transaction_signing_authorized=true;
  bad.credential_binding_id=rehashBinding(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryDeployerCredentialBindingV1(
      bad,
      {
        deployer_selection:selection,
        unsigned_transaction_candidate:candidate,
        candidate_evidence:candidateEvidence,
      },
    ),
    /registry_deployer_binding_authority_mismatch:transaction_signing_authorized/u,
  );
}

{
  const held=await runVoidDatanetRegistryDeployerCredentialBindingV1({
    confirmation:"wrong",
    deployer_selection:selection,
    unsigned_transaction_candidate:candidate,
    candidate_evidence:candidateEvidence,
    credentials_directory:"/not/used",
    bound_at_utc:"2030-01-01T00:07:00.000Z",
    bound_on_host:"Nimo",
    observed_repo_head:"a".repeat(40),
  });
  assert.equal(held.ok,false);
  assert.equal(
    held.reason,
    "registry_deployer_credential_binding_confirmation_required",
  );
  assert.equal(held.credential_content_access_performed,false);
  assert.equal(held.private_key_access_performed,false);
}
{
  const badCandidate=structuredClone(candidate);
  badCandidate.candidate_id="voiddrtxc1_"+"0".repeat(64);
  const held=await runVoidDatanetRegistryDeployerCredentialBindingV1({
    confirmation:
      VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
    deployer_selection:selection,
    unsigned_transaction_candidate:badCandidate,
    candidate_evidence:candidateEvidence,
    credentials_directory:"/not/used",
    bound_at_utc:"2030-01-01T00:07:00.000Z",
    bound_on_host:"Nimo",
    observed_repo_head:"a".repeat(40),
  });
  assert.equal(held.ok,false);
  assert.equal(held.reason,"registry_deployer_public_binding_input_invalid");
  assert.equal(held.credential_content_access_performed,false);
  assert.equal(held.private_key_access_performed,false);
}
{
  const expiredCandidate=structuredClone(candidate);
  expiredCandidate.valid_until_utc="2030-01-01T00:06:59.000Z";
  const held=await runVoidDatanetRegistryDeployerCredentialBindingV1({
    confirmation:
      VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
    deployer_selection:selection,
    unsigned_transaction_candidate:expiredCandidate,
    candidate_evidence:candidateEvidence,
    credentials_directory:"/not/used",
    bound_at_utc:"2030-01-01T00:07:00.000Z",
    bound_on_host:"Nimo",
    observed_repo_head:"a".repeat(40),
  });
  assert.equal(held.ok,false);
  assert.equal(held.reason,"registry_deployer_public_binding_input_invalid");
  assert.equal(held.credential_content_access_performed,false);
  assert.equal(held.private_key_access_performed,false);
}
for(const badContext of [
  {
    bound_at_utc:"2030-02-30T00:07:00.000Z",
    bound_on_host:"Nimo",
    observed_repo_head:"a".repeat(40),
  },
  {
    bound_at_utc:"2030-01-01T00:07:00.000Z",
    bound_on_host:"Precision",
    observed_repo_head:"a".repeat(40),
  },
  {
    bound_at_utc:"2030-01-01T00:07:00.000Z",
    bound_on_host:"Nimo",
    observed_repo_head:"not-a-sha",
  },
]){
  const held=await runVoidDatanetRegistryDeployerCredentialBindingV1({
    confirmation:
      VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_CONFIRMATION_V1,
    deployer_selection:selection,
    unsigned_transaction_candidate:candidate,
    candidate_evidence:candidateEvidence,
    credentials_directory:"/not/used",
    ...badContext,
  });
  assert.equal(held.ok,false);
  assert.equal(held.reason,"registry_deployer_public_binding_input_invalid");
  assert.equal(held.credential_content_access_performed,false);
  assert.equal(held.private_key_access_performed,false);
}

const toolSource=fs.readFileSync(
  "tools/void-datanet-registry-deployer-credential-binding-v1.mjs",
  "utf8",
);
for(const required of [
  "O_NOFOLLOW",
  "stat.nlink!==1",
  "stat.uid!==process.getuid()",
  "bytes.fill(0)",
  'privateKey=""',
  "validateVoidDatanetRegistryUnsignedTransactionCandidateV1",
  "validateCandidateForCredentialBindingV1",
  "observeVoidDatanetRegistryDeployerCredentialFileV1",
  "registry_deployer_credential_binding_confirmation_required",
  "registry_deployer_public_binding_input_invalid",
  "private_path_not_recorded:true",
  '"bindDatanetRegistryDeployerCredentialIdentityV1"',
]){
  assert.ok(toolSource.includes(required),required);
}
for(const forbidden of [
  "input?.candidate_validator",
  "dependencies.candidate_validator",
  "dependencies.credential_observer",
  "dependencies={}",
  "candidate_validator:candidateValidator",
  "console.log(privateKey",
  "console.log(bytes",
  "sha256(privateKey",
  "sha256(bytes",
  "new Wallet",
  "SigningKey",
  "signTransaction",
]){
  assert.equal(toolSource.includes(forbidden),false,forbidden);
}

const runner=fs.readFileSync(
  "ops/nimo/void-nimo-datanet-registry-deployer-credential-binding-v1.mjs",
  "utf8",
);
for(const required of [
  'os.hostname()!=="Nimo"',
  "explicit_confirmation_required:",
  "validateVoidDatanetRegistryDeployerCredentialBindingV1",
  "credential_content_access_performed=true",
  "private_key_access_performed=true",
  "raw_private_key_output=false",
  "private_key_digest_output=false",
  "transaction_signing_authorized=false",
  "transaction_broadcast=false",
  "chain2050_write=false",
  "funds_movement=false",
]){
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  'console.log("credentials_directory',
  'console.log("credential_path',
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "Wallet(",
  "SigningKey",
  "signTransaction",
  "systemctl",
  "docker ",
  "ssh ",
  "sudo ",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_V1_PROOF_GREEN");
console.log("fixed_credential_id=true");
console.log("explicit_identity_binding_confirmation_required=true");
console.log("public_candidate_validated_before_key_access=true");
console.log("candidate_expiry_checked_before_key_access=true");
console.log("canonical_binding_context_checked_before_key_access=true");
console.log("private_directory_required=true");
console.log("credential_no_follow=true");
console.log("credential_single_hard_link_required=true");
console.log("credential_owner_current_user_required=true");
console.log("credential_mode_0400_or_0600=true");
console.log("private_key_address_derivation_only=true");
console.log("private_path_not_recorded=true");
console.log("raw_private_key_output=false");
console.log("private_key_digest_output=false");
console.log("signer_object_exposed=false");
console.log("transaction_signing_authorized=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
