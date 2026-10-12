#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
  readChain2050RoleAuthorityStateV1,
  type Chain2050RoleAuthorityReadSourceV1,
} from "../src/security/chain2050_role_authority_read_adapter_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
  deriveChain2050RoleAuthorityPairV1,
  type Chain2050RoleAuthorityRecordV1,
} from "../src/security/chain2050_role_authority_record_v1.js";

const MARKER = "VOID_CHAIN2050_ROLE_AUTHORITY_READ_ADAPTER_V1_PROOF_GREEN";
const SUBJECT_A = "11".repeat(32);
const POLICY_A = "aa".repeat(32);

function genesis(
  overrides: Partial<Chain2050RoleAuthorityRecordV1> = {},
): Chain2050RoleAuthorityRecordV1 {
  return {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
    chain_id: 2050,
    identity_id: "void-id:apollyon-v2r13",
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

function sourceFor(value: unknown, options: { throws?: boolean } = {}) {
  let reads = 0;
  let mutations = 0;
  const source = {
    chain_id: 2050 as const,
    source_kind: VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
    async readCurrentRoleAuthorityRecordV1(_identityId: string) {
      reads += 1;
      if (options.throws) throw new Error("synthetic read failure");
      return value;
    },
    mutateForProofOnly() {
      mutations += 1;
    },
  } satisfies Chain2050RoleAuthorityReadSourceV1 & {
    mutateForProofOnly(): void;
  };
  return {
    source,
    stats: () => ({ reads, mutations }),
  };
}

async function main() {
  const active = genesis();
  const activePair = deriveChain2050RoleAuthorityPairV1(active);

  {
    const fixture = sourceFor(active);
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: activePair,
      require_active: true,
    });
    assert.equal(result.ok, true);
    if (result.ok === false) throw new Error(result.reason);
    assert.equal(result.view.chain_id, 2050);
    assert.equal(result.view.identity_id, active.identity_id);
    assert.equal(result.view.role, active.role);
    assert.equal(result.view.authority_status, "active");
    assert.equal(
      result.view.role_authority_generation,
      activePair.role_authority_generation,
    );
    assert.equal(result.view.role_record_sha256, activePair.role_record_sha256);
    assert.equal(Object.isFrozen(result.view), true);
    assert.deepEqual(fixture.stats(), { reads: 1, mutations: 0 });
  }

  {
    const fixture = sourceFor(active);
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: {
        ...activePair,
        role_authority_generation: "1",
      },
      require_active: true,
    });
    assert.deepEqual(result, {
      ok: false,
      reason: "role_authority_generation_mismatch",
    });
    assert.deepEqual(fixture.stats(), { reads: 1, mutations: 0 });
  }

  {
    const fixture = sourceFor(active);
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: {
        ...activePair,
        role_record_sha256: "ff".repeat(32),
      },
      require_active: true,
    });
    assert.deepEqual(result, {
      ok: false,
      reason: "role_authority_record_hash_mismatch",
    });
  }

  {
    const revoked: Chain2050RoleAuthorityRecordV1 = {
      ...active,
      authority_status: "revoked",
      role_authority_generation: "1",
      predecessor_role_record_sha256: activePair.role_record_sha256,
      transition: "revoke",
    };
    const fixture = sourceFor(revoked);
    const inspect = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: revoked.identity_id,
      expected_pair: null,
      require_active: false,
    });
    assert.equal(inspect.ok, true);
    if (inspect.ok === false) throw new Error(inspect.reason);
    assert.equal(inspect.view.authority_status, "revoked");

    const activeRequired = await readChain2050RoleAuthorityStateV1(
      fixture.source,
      {
        identity_id: revoked.identity_id,
        expected_pair: null,
        require_active: true,
      },
    );
    assert.deepEqual(activeRequired, {
      ok: false,
      reason: "role_authority_revoked",
    });
  }

  {
    const fixture = sourceFor({
      ...active,
      identity_id: "void-id:different",
    });
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: null,
      require_active: false,
    });
    assert.deepEqual(result, {
      ok: false,
      reason: "role_authority_identity_mismatch",
    });
  }

  {
    const fixture = sourceFor({ ...active, chain_id: 1 });
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: null,
      require_active: false,
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("wrong-chain record unexpectedly accepted");
    assert.match(result.reason, /role_authority_record_invalid:role_authority_chain_id_mismatch/);
  }

  {
    const fixture = sourceFor({ ...active, capability_grant: ["restart"] });
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: null,
      require_active: false,
    });
    assert.deepEqual(result, {
      ok: false,
      reason: "role_authority_record_invalid:role_authority_record_keys_mismatch",
    });
  }

  {
    const fixture = sourceFor(null);
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: null,
      require_active: false,
    });
    assert.deepEqual(result, {
      ok: false,
      reason: "role_authority_record_not_found",
    });
  }

  {
    const fixture = sourceFor(active, { throws: true });
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: null,
      require_active: false,
    });
    assert.deepEqual(result, {
      ok: false,
      reason: "role_authority_source_read_failed",
    });
  }

  {
    const badSource = {
      chain_id: 1,
      source_kind: VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
      readCurrentRoleAuthorityRecordV1() {
        return active;
      },
    };
    const result = await readChain2050RoleAuthorityStateV1(badSource, {
      identity_id: active.identity_id,
      expected_pair: null,
      require_active: false,
    });
    assert.deepEqual(result, {
      ok: false,
      reason: "role_authority_read_source_invalid",
    });
  }

  {
    const fixture = sourceFor(active);
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: {
        role_authority_generation: "00",
        role_record_sha256: activePair.role_record_sha256,
      },
      require_active: false,
    });
    assert.deepEqual(result, {
      ok: false,
      reason: "role_authority_read_request_invalid",
    });
    assert.deepEqual(fixture.stats(), { reads: 0, mutations: 0 });
  }

  {
    const fixture = sourceFor(active);
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: null,
      require_active: false,
      capability: "service_restart",
    });
    assert.deepEqual(result, {
      ok: false,
      reason: "role_authority_read_request_invalid",
    });
    assert.deepEqual(fixture.stats(), { reads: 0, mutations: 0 });
  }

  {
    const mutable = structuredClone(active);
    const fixture = sourceFor(mutable);
    const result = await readChain2050RoleAuthorityStateV1(fixture.source, {
      identity_id: active.identity_id,
      expected_pair: null,
      require_active: false,
    });
    assert.equal(result.ok, true);
    if (result.ok === false) throw new Error(result.reason);
    mutable.role = "MUTATED_AFTER_READ";
    assert.equal(result.view.role, active.role);
  }

  console.log(MARKER);
  console.log("chain_id=2050");
  console.log("single_source_read=true");
  console.log("record_validated_by_merged_primitive=true");
  console.log("record_hash_derived_locally=true");
  console.log("stale_generation_rejected=true");
  console.log("same_generation_wrong_hash_rejected=true");
  console.log("revocation_inspectable=true");
  console.log("revocation_active_use_rejected=true");
  console.log("wrong_chain_rejected=true");
  console.log("unknown_fields_rejected=true");
  console.log("source_failure_fail_closed=true");
  console.log("returned_view_frozen=true");
  console.log("role_is_not_capability=true");
  console.log("source_mutation_called=false");
  console.log("runtime_activation=false");
  console.log("chain_mutation=false");
  console.log("model_invoked=false");
  console.log("authority_granted=false");
  console.log("capability_promoted=false");
  console.log("office_designated=false");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
