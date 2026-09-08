#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
  deriveChain2050RoleAuthorityPairV1,
  type Chain2050RoleAuthorityRecordV1,
} from "../src/security/chain2050_role_authority_record_v1.js";
import {
  readChain2050RoleAuthorityStateV1,
} from "../src/security/chain2050_role_authority_read_adapter_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_EMPTY_ROOT_SHA256,
  appendChain2050RoleAuthorityRecordV1,
  createEmptyChain2050RoleAuthorityRegistryV1,
  readCurrentChain2050RoleAuthorityRecordFromRegistryV1,
  validateChain2050RoleAuthorityRegistryV1,
} from "../src/security/chain2050_role_authority_registry_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1,
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA,
  computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1,
  createChain2050RoleAuthorityRegistryReadSourceBindingV1,
  type Chain2050RoleAuthorityRegistryBindingDescriptorV1,
} from "../src/security/chain2050_role_authority_registry_read_source_binding_v1.js";

const MARKER = "VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_PROOF_GREEN";
const ID_A = "void-id:apollyon-v2r13";
const ID_B = "void-id:registry-proof-peer";
const SUBJECT_A = "11".repeat(32);
const SUBJECT_B = "22".repeat(32);
const POLICY_A = "aa".repeat(32);
const POLICY_B = "bb".repeat(32);

function genesis(
  identityId: string,
  overrides: Partial<Chain2050RoleAuthorityRecordV1> = {},
): Chain2050RoleAuthorityRecordV1 {
  return {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
    chain_id: 2050,
    identity_id: identityId,
    role: "APOLLYON_CANDIDATE",
    authority_status: "active",
    role_authority_generation: "0",
    subject_binding_sha256: SUBJECT_A,
    authority_policy_sha256: POLICY_A,
    predecessor_role_record_sha256: null,
    transition: "genesis_grant",
    ...overrides,
  };
}

function successor(
  previous: Chain2050RoleAuthorityRecordV1,
  overrides: Partial<Chain2050RoleAuthorityRecordV1>,
): Chain2050RoleAuthorityRecordV1 {
  const previousPair = deriveChain2050RoleAuthorityPairV1(previous);
  return {
    ...previous,
    role_authority_generation:
      (BigInt(previous.role_authority_generation) + 1n).toString(),
    predecessor_role_record_sha256: previousPair.role_record_sha256,
    ...overrides,
  };
}

let state = createEmptyChain2050RoleAuthorityRegistryV1();
assert.equal(state.entry_count, "0");
assert.equal(
  state.registry_root_sha256,
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_EMPTY_ROOT_SHA256,
);
assert.equal(validateChain2050RoleAuthorityRegistryV1(state).ok, true);
assert.equal(Object.isFrozen(state), true);
assert.equal(Object.isFrozen(state.entries), true);

const a0 = genesis(ID_A);
const a0InputBefore = JSON.stringify(a0);
const appendA0 = appendChain2050RoleAuthorityRecordV1(state, a0);
assert.equal(appendA0.ok, true);
assert.equal(appendA0.ok ? appendA0.kind : null, "genesis");
assert.equal(JSON.stringify(a0), a0InputBefore);
if (appendA0.ok === false) throw new Error(appendA0.reason);
state = appendA0.state;
const a0Pair = appendA0.pair;
assert.equal(state.entry_count, "1");
assert.equal(state.entries[0]?.record.identity_id, ID_A);
assert.notEqual(
  state.registry_root_sha256,
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_EMPTY_ROOT_SHA256,
);

const replayA0 = appendChain2050RoleAuthorityRecordV1(
  state,
  structuredClone(a0),
);
assert.equal(replayA0.ok, true);
assert.equal(replayA0.ok ? replayA0.kind : null, "idempotent_replay");
if (replayA0.ok === false) throw new Error(replayA0.reason);
assert.equal(replayA0.state.entry_count, "1");
assert.equal(replayA0.state.registry_root_sha256, state.registry_root_sha256);

const b0 = genesis(ID_B, {
  subject_binding_sha256: SUBJECT_B,
  role: "AGENT",
});
const appendB0 = appendChain2050RoleAuthorityRecordV1(state, b0);
assert.equal(appendB0.ok, true);
if (appendB0.ok === false) throw new Error(appendB0.reason);
state = appendB0.state;
assert.equal(state.entry_count, "2");

const a1Revoked = successor(a0, {
  authority_status: "revoked",
  transition: "revoke",
});
const appendA1 = appendChain2050RoleAuthorityRecordV1(state, a1Revoked);
assert.equal(appendA1.ok, true);
if (appendA1.ok === false) throw new Error(appendA1.reason);
const revokedState = appendA1.state;
state = appendA1.state;
assert.equal(state.entry_count, "3");

const a2Restored = successor(a1Revoked, {
  authority_status: "active",
  transition: "restore",
});
const appendA2 = appendChain2050RoleAuthorityRecordV1(state, a2Restored);
assert.equal(appendA2.ok, true);
if (appendA2.ok === false) throw new Error(appendA2.reason);
state = appendA2.state;
const a2Pair = appendA2.pair;
assert.equal(state.entry_count, "4");
assert.notEqual(a2Pair.role_authority_generation, a0Pair.role_authority_generation);
assert.notEqual(a2Pair.role_record_sha256, a0Pair.role_record_sha256);

const readA = readCurrentChain2050RoleAuthorityRecordFromRegistryV1(state, ID_A);
assert.equal(readA.ok, true);
if (readA.ok === false || readA.record === null) {
  throw new Error("current A record missing");
}
assert.equal(readA.record.role_authority_generation, "2");
assert.equal(readA.record.authority_status, "active");
assert.equal(Object.isFrozen(readA.record), true);
assert.equal(
  deriveChain2050RoleAuthorityPairV1(readA.record).role_record_sha256,
  a2Pair.role_record_sha256,
);

const readB = readCurrentChain2050RoleAuthorityRecordFromRegistryV1(state, ID_B);
assert.equal(readB.ok, true);
assert.equal(readB.ok && readB.record !== null ? readB.record.role : null, "AGENT");

const stateBeforeRejectedAppend = JSON.stringify(state);
const sameGenerationDifferentHash: Chain2050RoleAuthorityRecordV1 = {
  ...a2Restored,
  authority_policy_sha256: POLICY_B,
  transition: "policy_change",
};
const conflict = appendChain2050RoleAuthorityRecordV1(
  state,
  sameGenerationDifferentHash,
);
assert.deepEqual(conflict, {
  ok: false,
  reason:
    "role_authority_registry_append_rejected:role_authority_same_generation_different_hash",
});
assert.equal(JSON.stringify(state), stateBeforeRejectedAppend);

const skippedGeneration = successor(a2Restored, {
  role_authority_generation: "4",
  authority_policy_sha256: POLICY_B,
  transition: "policy_change",
});
const skipped = appendChain2050RoleAuthorityRecordV1(state, skippedGeneration);
assert.deepEqual(skipped, {
  ok: false,
  reason:
    "role_authority_registry_append_rejected:role_authority_generation_must_increment_by_one",
});

const wrongPredecessor = successor(a2Restored, {
  authority_policy_sha256: POLICY_B,
  transition: "policy_change",
  predecessor_role_record_sha256: "00".repeat(32),
});
const predecessorRejected = appendChain2050RoleAuthorityRecordV1(
  state,
  wrongPredecessor,
);
assert.deepEqual(predecessorRejected, {
  ok: false,
  reason:
    "role_authority_registry_append_rejected:role_authority_predecessor_hash_mismatch",
});

const nonGenesisFirst = genesis("void-id:new-non-genesis", {
  role_authority_generation: "1",
  predecessor_role_record_sha256: "33".repeat(32),
  authority_policy_sha256: POLICY_B,
  transition: "policy_change",
});
const nonGenesisRejected = appendChain2050RoleAuthorityRecordV1(
  createEmptyChain2050RoleAuthorityRegistryV1(),
  nonGenesisFirst,
);
assert.equal(nonGenesisRejected.ok, false);
assert.match(
  nonGenesisRejected.ok ? "" : nonGenesisRejected.reason,
  /role_authority_genesis_generation_must_be_zero/,
);

const terminalRootTamper = {
  ...structuredClone(state),
  registry_root_sha256: "ff".repeat(32),
};
assert.deepEqual(validateChain2050RoleAuthorityRegistryV1(terminalRootTamper), {
  ok: false,
  reason: "role_authority_registry_terminal_root_mismatch",
});

const entryRootTamper = structuredClone(state);
entryRootTamper.entries[1]!.registry_root_sha256 = "ee".repeat(32);
assert.deepEqual(validateChain2050RoleAuthorityRegistryV1(entryRootTamper), {
  ok: false,
  reason: "role_authority_registry_entry_root_mismatch",
});

const countTamper = {
  ...structuredClone(state),
  entry_count: "99",
};
assert.deepEqual(validateChain2050RoleAuthorityRegistryV1(countTamper), {
  ok: false,
  reason: "role_authority_registry_entry_count_mismatch",
});

const unknownRegistryField = {
  ...structuredClone(state),
  capability_grant: ["service_restart"],
};
assert.deepEqual(validateChain2050RoleAuthorityRegistryV1(unknownRegistryField), {
  ok: false,
  reason: "role_authority_registry_keys_mismatch",
});

const descriptor: Chain2050RoleAuthorityRegistryBindingDescriptorV1 = {
  schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA,
  chain_id: 2050,
  binding_kind: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1,
  binding_id: "void-chain2050-role-authority-registry-proof-v1",
  registry_namespace_sha256: "10".repeat(32),
  registry_contract_sha256: "20".repeat(32),
  query_contract_sha256: "30".repeat(32),
  finality_policy_sha256: "40".repeat(32),
};
const descriptorSha =
  computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1(descriptor);
assert.match(descriptorSha ?? "", /^[a-f0-9]{64}$/);

let providerReads = 0;
let providerState: unknown = state;
const provider = {
  descriptor: structuredClone(descriptor),
  async readCanonicalRoleAuthorityRegistryV1(): Promise<unknown> {
    providerReads += 1;
    return providerState;
  },
};
const bound = createChain2050RoleAuthorityRegistryReadSourceBindingV1(
  provider,
  descriptor,
);
assert.equal(bound.ok, true);
if (bound.ok === false) throw new Error(bound.reason);
assert.equal(bound.binding_descriptor_sha256, descriptorSha);

const adapterA = await readChain2050RoleAuthorityStateV1(bound.source, {
  identity_id: ID_A,
  expected_pair: a2Pair,
  require_active: true,
});
assert.equal(adapterA.ok, true);
assert.equal(providerReads, 1);
if (adapterA.ok === false) throw new Error(adapterA.reason);
assert.equal(adapterA.view.role_authority_generation, "2");
assert.equal(adapterA.view.role_record_sha256, a2Pair.role_record_sha256);
assert.equal(Object.isFrozen(adapterA.view), true);

providerState = revokedState;
const revokedRead = await readChain2050RoleAuthorityStateV1(bound.source, {
  identity_id: ID_A,
  expected_pair: null,
  require_active: false,
});
assert.equal(revokedRead.ok, true);
assert.equal(
  revokedRead.ok ? revokedRead.view.authority_status : null,
  "revoked",
);
const revokedRequiredActive = await readChain2050RoleAuthorityStateV1(
  bound.source,
  {
    identity_id: ID_A,
    expected_pair: null,
    require_active: true,
  },
);
assert.deepEqual(revokedRequiredActive, {
  ok: false,
  reason: "role_authority_revoked",
});

providerState = terminalRootTamper;
const tamperedSnapshotRead = await readChain2050RoleAuthorityStateV1(
  bound.source,
  {
    identity_id: ID_A,
    expected_pair: null,
    require_active: false,
  },
);
assert.deepEqual(tamperedSnapshotRead, {
  ok: false,
  reason: "role_authority_source_read_failed",
});

providerState = state;
provider.descriptor = {
  ...descriptor,
  finality_policy_sha256: "55".repeat(32),
};
const driftedBindingRead = await readChain2050RoleAuthorityStateV1(
  bound.source,
  {
    identity_id: ID_A,
    expected_pair: null,
    require_active: false,
  },
);
assert.deepEqual(driftedBindingRead, {
  ok: false,
  reason: "role_authority_source_read_failed",
});
provider.descriptor = structuredClone(descriptor);

const wrongBinding = createChain2050RoleAuthorityRegistryReadSourceBindingV1(
  provider,
  {
    ...descriptor,
    query_contract_sha256: "66".repeat(32),
  },
);
assert.deepEqual(wrongBinding, {
  ok: false,
  reason: "role_authority_registry_binding_mismatch",
});

const throwingProvider = {
  descriptor: structuredClone(descriptor),
  async readCanonicalRoleAuthorityRegistryV1(): Promise<unknown> {
    throw new Error("synthetic provider failure");
  },
};
const throwingBound = createChain2050RoleAuthorityRegistryReadSourceBindingV1(
  throwingProvider,
  descriptor,
);
assert.equal(throwingBound.ok, true);
if (throwingBound.ok === false) throw new Error(throwingBound.reason);
const providerFailure = await readChain2050RoleAuthorityStateV1(
  throwingBound.source,
  {
    identity_id: ID_A,
    expected_pair: null,
    require_active: false,
  },
);
assert.deepEqual(providerFailure, {
  ok: false,
  reason: "role_authority_source_read_failed",
});

console.log(MARKER);
console.log("chain_id=2050");
console.log("append_only_registry=true");
console.log("rolling_content_addressed_root=true");
console.log("interleaved_identity_continuity=true");
console.log("idempotent_replay_appends=false");
console.log("same_generation_different_hash_rejected=true");
console.log("generation_skip_rejected=true");
console.log("predecessor_mismatch_rejected=true");
console.log("revoke_restore_aba_old_pair_revived=false");
console.log("registry_root_tamper_rejected=true");
console.log("binding_descriptor_drift_rejected=true");
console.log("adapter_end_to_end_read=true");
console.log("durable_storage_integrated=false");
console.log("live_chain_registry_bound=false");
console.log("apollyon_invoked=false");
console.log("authority_granted=false");
console.log("capability_promoted=false");
console.log("office_designated=false");
