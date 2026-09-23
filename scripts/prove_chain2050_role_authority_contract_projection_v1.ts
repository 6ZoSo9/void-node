import assert from "node:assert/strict";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
  deriveChain2050RoleAuthorityPairV1,
  type Chain2050RoleAuthorityRecordV1,
} from "../src/security/chain2050_role_authority_record_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
  readChain2050RoleAuthorityStateV1,
} from "../src/security/chain2050_role_authority_read_adapter_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_EMPTY_ROOT_SHA256,
  appendChain2050RoleAuthorityRecordV1,
  createEmptyChain2050RoleAuthorityRegistryV1,
  type Chain2050RoleAuthorityRegistryV1,
} from "../src/security/chain2050_role_authority_registry_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1,
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA,
  computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1,
  createChain2050RoleAuthorityRegistryReadSourceBindingV1,
  type Chain2050RoleAuthorityRegistryBindingDescriptorV1,
} from "../src/security/chain2050_role_authority_registry_read_source_binding_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CONTRACT_SNAPSHOT_V1_SCHEMA,
  computeChain2050RoleAuthorityContractNamespaceSha256V1,
  createChain2050RoleAuthorityContractSnapshotProviderV1,
  projectChain2050RoleAuthorityContractSnapshotV1,
  type Chain2050RoleAuthorityContractSnapshotV1,
} from "../src/security/chain2050_role_authority_contract_projection_v1.js";

const CONTRACT = "0x1111111111111111111111111111111111111111";
const CODE_SHA = "aa".repeat(32);
const SUBJECT_A = "11".repeat(32);
const SUBJECT_B = "33".repeat(32);
const POLICY_A = "22".repeat(32);
const POLICY_B = "44".repeat(32);
const ID = "participant.alice";

function genesis(): Chain2050RoleAuthorityRecordV1 {
  return {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    identity_id: ID,
    role: "AGENT",
    authority_status: "active",
    role_authority_generation: "0",
    subject_binding_sha256: SUBJECT_A,
    authority_policy_sha256: POLICY_A,
    predecessor_role_record_sha256: null,
    transition: "genesis_grant",
  };
}

function successor(
  previous: Chain2050RoleAuthorityRecordV1,
  overrides: Partial<Chain2050RoleAuthorityRecordV1>,
): Chain2050RoleAuthorityRecordV1 {
  return {
    ...previous,
    role_authority_generation:
      (BigInt(previous.role_authority_generation) + 1n).toString(),
    predecessor_role_record_sha256:
      deriveChain2050RoleAuthorityPairV1(previous).role_record_sha256,
    ...overrides,
  };
}

let state = createEmptyChain2050RoleAuthorityRegistryV1();
const a0 = genesis();
const a0Append = appendChain2050RoleAuthorityRecordV1(state, a0);
assert.equal(a0Append.ok, true);
if (!a0Append.ok) throw new Error(a0Append.reason);
state = a0Append.state;

const a1 = successor(a0, {
  authority_status: "revoked",
  transition: "revoke",
});
const a1Append = appendChain2050RoleAuthorityRecordV1(state, a1);
assert.equal(a1Append.ok, true);
if (!a1Append.ok) throw new Error(a1Append.reason);
state = a1Append.state;

const a2 = successor(a1, {
  authority_status: "active",
  transition: "restore",
});
const a2Append = appendChain2050RoleAuthorityRecordV1(state, a2);
assert.equal(a2Append.ok, true);
if (!a2Append.ok) throw new Error(a2Append.reason);
state = a2Append.state;

const a3 = successor(a2, {
  subject_binding_sha256: SUBJECT_B,
  transition: "subject_binding_change",
});
const a3Append = appendChain2050RoleAuthorityRecordV1(state, a3);
assert.equal(a3Append.ok, true);
if (!a3Append.ok) throw new Error(a3Append.reason);
state = a3Append.state;

const a4 = successor(a3, {
  authority_policy_sha256: POLICY_B,
  transition: "policy_change",
});
const a4Append = appendChain2050RoleAuthorityRecordV1(state, a4);
assert.equal(a4Append.ok, true);
if (!a4Append.ok) throw new Error(a4Append.reason);
state = a4Append.state;

const a5 = successor(a4, {
  role: "VALIDATOR",
  transition: "role_change",
});
const a5Append = appendChain2050RoleAuthorityRecordV1(state, a5);
assert.equal(a5Append.ok, true);
if (!a5Append.ok) throw new Error(a5Append.reason);
state = a5Append.state;

function snapshotFromState(
  source: Readonly<Chain2050RoleAuthorityRegistryV1>,
  overrides: Partial<Chain2050RoleAuthorityContractSnapshotV1> = {},
): Chain2050RoleAuthorityContractSnapshotV1 {
  return {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_CONTRACT_SNAPSHOT_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    contract_address: CONTRACT,
    runtime_code_sha256: CODE_SHA,
    empty_registry_root_sha256:
      VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_EMPTY_ROOT_SHA256,
    entry_count: source.entry_count,
    registry_root_sha256: source.registry_root_sha256,
    entries: source.entries.map((entry) => ({
      entry_index: entry.entry_index,
      previous_registry_root_sha256:
        entry.previous_registry_root_sha256,
      role_record_sha256: entry.role_record_sha256,
      registry_root_sha256: entry.registry_root_sha256,
      record: {
        identity_id: entry.record.identity_id,
        role: entry.record.role,
        authority_status: entry.record.authority_status,
        role_authority_generation:
          entry.record.role_authority_generation,
        subject_binding_sha256:
          entry.record.subject_binding_sha256,
        authority_policy_sha256:
          entry.record.authority_policy_sha256,
        predecessor_role_record_sha256:
          entry.record.predecessor_role_record_sha256,
        transition: entry.record.transition,
        role_record_sha256: entry.role_record_sha256,
      },
    })),
    ...overrides,
  };
}

const snapshot = snapshotFromState(state);
const namespace =
  computeChain2050RoleAuthorityContractNamespaceSha256V1({
    contract_address: CONTRACT,
    runtime_code_sha256: CODE_SHA,
  });
assert.match(namespace ?? "", /^[a-f0-9]{64}$/);
if (namespace === null) throw new Error("namespace missing");

const projection =
  projectChain2050RoleAuthorityContractSnapshotV1(snapshot);
assert.equal(projection.ok, true);
if (!projection.ok) throw new Error(projection.reason);
assert.deepEqual(projection.state, state);
assert.equal(projection.contract_namespace_sha256, namespace);

const descriptor: Chain2050RoleAuthorityRegistryBindingDescriptorV1 = {
  schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA,
  chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  binding_kind:
    VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1,
  binding_id: "void-chain2050-role-authority-contract-proof-v1",
  registry_namespace_sha256: namespace,
  registry_contract_sha256: "55".repeat(32),
  query_contract_sha256: "66".repeat(32),
  finality_policy_sha256: "77".repeat(32),
};
assert.match(
  computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1(
    descriptor,
  ) ?? "",
  /^[a-f0-9]{64}$/,
);

let currentSnapshot: unknown = structuredClone(snapshot);
const source = {
  contract_address: CONTRACT,
  runtime_code_sha256: CODE_SHA,
  async readContractSnapshotV1(): Promise<unknown> {
    return structuredClone(currentSnapshot);
  },
};

const providerResult =
  createChain2050RoleAuthorityContractSnapshotProviderV1(
    source,
    descriptor,
  );
assert.equal(providerResult.ok, true);
if (!providerResult.ok) throw new Error(providerResult.reason);
assert.equal(providerResult.contract_namespace_sha256, namespace);

const bound = createChain2050RoleAuthorityRegistryReadSourceBindingV1(
  providerResult.provider,
  descriptor,
);
assert.equal(bound.ok, true);
if (!bound.ok) throw new Error(bound.reason);
assert.equal(
  bound.source.source_kind,
  VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
);

const currentPair = deriveChain2050RoleAuthorityPairV1(a5);
const currentRead = await readChain2050RoleAuthorityStateV1(
  bound.source,
  {
    identity_id: ID,
    expected_pair: currentPair,
    require_active: true,
  },
);
assert.equal(currentRead.ok, true);
if (!currentRead.ok) throw new Error(currentRead.reason);
assert.equal(currentRead.view.role, "VALIDATOR");
assert.equal(currentRead.view.subject_binding_sha256, SUBJECT_B);
assert.equal(currentRead.view.authority_policy_sha256, POLICY_B);

const entryHashTamper = structuredClone(snapshot);
entryHashTamper.entries[2]!.role_record_sha256 = "88".repeat(32);
assert.equal(
  projectChain2050RoleAuthorityContractSnapshotV1(entryHashTamper).ok,
  false,
);

const nestedHashTamper = structuredClone(snapshot);
nestedHashTamper.entries[1]!.record.role_record_sha256 = "99".repeat(32);
assert.deepEqual(
  projectChain2050RoleAuthorityContractSnapshotV1(nestedHashTamper),
  {
    ok: false,
    reason: "role_authority_contract_snapshot_invalid",
  },
);

const rootTamper = structuredClone(snapshot);
rootTamper.registry_root_sha256 = "ab".repeat(32);
const rootRejected =
  projectChain2050RoleAuthorityContractSnapshotV1(rootTamper);
assert.equal(rootRejected.ok, false);
if (!rootRejected.ok) {
  assert.match(
    rootRejected.reason,
    /^role_authority_contract_projection_rejected:/,
  );
}

const previousRootTamper = structuredClone(snapshot);
previousRootTamper.entries[3]!.previous_registry_root_sha256 =
  "cd".repeat(32);
assert.equal(
  projectChain2050RoleAuthorityContractSnapshotV1(
    previousRootTamper,
  ).ok,
  false,
);

const indexTamper = structuredClone(snapshot);
indexTamper.entries[4]!.entry_index = "9";
assert.deepEqual(
  projectChain2050RoleAuthorityContractSnapshotV1(indexTamper),
  {
    ok: false,
    reason: "role_authority_contract_entry_index_mismatch",
  },
);

const countTamper = structuredClone(snapshot);
countTamper.entry_count = "99";
assert.deepEqual(
  projectChain2050RoleAuthorityContractSnapshotV1(countTamper),
  {
    ok: false,
    reason: "role_authority_contract_snapshot_invalid",
  },
);

const emptyRootTamper = structuredClone(snapshot);
emptyRootTamper.empty_registry_root_sha256 = "ef".repeat(32);
assert.deepEqual(
  projectChain2050RoleAuthorityContractSnapshotV1(emptyRootTamper),
  {
    ok: false,
    reason: "role_authority_contract_snapshot_invalid",
  },
);

const wrongNamespaceDescriptor = {
  ...descriptor,
  registry_namespace_sha256: "01".repeat(32),
};
assert.deepEqual(
  createChain2050RoleAuthorityContractSnapshotProviderV1(
    source,
    wrongNamespaceDescriptor,
  ),
  {
    ok: false,
    reason: "role_authority_contract_namespace_binding_mismatch",
  },
);

currentSnapshot = snapshotFromState(state, {
  runtime_code_sha256: "bb".repeat(32),
});
const codeDriftRead = await readChain2050RoleAuthorityStateV1(
  bound.source,
  {
    identity_id: ID,
    expected_pair: null,
    require_active: false,
  },
);
assert.deepEqual(codeDriftRead, {
  ok: false,
  reason: "role_authority_source_read_failed",
});

currentSnapshot = snapshotFromState(state, {
  contract_address:
    "0x2222222222222222222222222222222222222222",
});
const addressDriftRead = await readChain2050RoleAuthorityStateV1(
  bound.source,
  {
    identity_id: ID,
    expected_pair: null,
    require_active: false,
  },
);
assert.deepEqual(addressDriftRead, {
  ok: false,
  reason: "role_authority_source_read_failed",
});

currentSnapshot = structuredClone(snapshot);
const throwingSource = {
  contract_address: CONTRACT,
  runtime_code_sha256: CODE_SHA,
  async readContractSnapshotV1(): Promise<unknown> {
    throw new Error("synthetic transport failure");
  },
};
const throwingProvider =
  createChain2050RoleAuthorityContractSnapshotProviderV1(
    throwingSource,
    descriptor,
  );
assert.equal(throwingProvider.ok, true);
if (!throwingProvider.ok) throw new Error(throwingProvider.reason);
const throwingBound =
  createChain2050RoleAuthorityRegistryReadSourceBindingV1(
    throwingProvider.provider,
    descriptor,
  );
assert.equal(throwingBound.ok, true);
if (!throwingBound.ok) throw new Error(throwingBound.reason);
const transportFailure = await readChain2050RoleAuthorityStateV1(
  throwingBound.source,
  {
    identity_id: ID,
    expected_pair: null,
    require_active: false,
  },
);
assert.deepEqual(transportFailure, {
  ok: false,
  reason: "role_authority_source_read_failed",
});

console.log("VOID_CHAIN2050_ROLE_AUTHORITY_CONTRACT_PROJECTION_V1_GREEN");
console.log("chain_id=2050");
console.log("canonical_registry_projection=true");
console.log("existing_registry_validator_reused=true");
console.log("existing_read_adapter_reused=true");
console.log("contract_address_bound=true");
console.log("runtime_code_sha256_bound=true");
console.log("entry_hash_tamper_rejected=true");
console.log("registry_root_tamper_rejected=true");
console.log("entry_index_tamper_rejected=true");
console.log("source_identity_drift_rejected=true");
console.log("live_rpc_transport=false");
console.log("deployment=false");
console.log("registry_mutation=false");
console.log("session_issuance=false");
console.log("wallet_access=false");
console.log("transaction_broadcast=false");
console.log("funds_action=false");
