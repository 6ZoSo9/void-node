#!/usr/bin/env -S node --experimental-strip-types
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createServer } from "node:http";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Interface } from "ethers";

import {
  appendChain2050RoleAuthorityRecordV1,
  createEmptyChain2050RoleAuthorityRegistryV1,
} from "../src/security/chain2050_role_authority_registry_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_ABI_V1,
} from "../tools/chain2050-role-authority-live-rpc-observer-v1.mjs";
import {
  EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1,
  VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_AUTHORITY_V1,
  VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1,
  buildRoleAuthorityParticipantLiveBindingPreflightV1,
} from "../tools/chain2050-role-authority-participant-live-binding-preflight-v1.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const checkpoint = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/chain2050-role-authority-checkpoint-verified-attestation-evidence-v1.json",
    ),
    "utf8",
  ),
);
const genesisEvidence = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-reconciliation-evidence-v1.json",
    ),
    "utf8",
  ),
);
const genesisPreparation = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/chain2050-role-authority-sovereign-genesis-preparation-v1.json",
    ),
    "utf8",
  ),
);

const runtimeFile =
  process.env.VOID_ROLE_AUTHORITY_ACCEPTED_RUNTIME_HEX_FILE;
assert.ok(
  runtimeFile && path.isAbsolute(runtimeFile),
  "accepted runtime hex file required",
);
const runtimeCode = fs.readFileSync(runtimeFile, "utf8").trim().toLowerCase();
assert.match(runtimeCode, /^0x(?:[0-9a-f]{2})+$/);
const runtimeSha = crypto.createHash("sha256")
  .update(Buffer.from(runtimeCode.slice(2), "hex"))
  .digest("hex");
assert.equal(
  runtimeSha,
  EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.accepted_runtime_sha256,
  "compiled fixture runtime does not match accepted deployed identity",
);

const genesis = appendChain2050RoleAuthorityRecordV1(
  createEmptyChain2050RoleAuthorityRegistryV1(),
  genesisPreparation.candidate.record,
);
assert.equal(genesis.ok, true);
if (genesis.ok === false) throw new Error(genesis.reason);

const state = genesis.state;
assert.equal(state.entry_count, "1");
assert.equal(
  state.registry_root_sha256,
  EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
    .sovereign_genesis_registry_root_sha256,
);

const ABI = new Interface(
  VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_ABI_V1,
);
const selectors = new Map(
  [
    "emptyRegistryRootSha256",
    "registryRootSha256",
    "entryCount",
    "getEntry",
  ].map((name) => [
    ABI.getFunction(name)!.selector.toLowerCase(),
    name,
  ]),
);

function contractEntry(entry: (typeof state.entries)[number]) {
  return {
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
  };
}

function canonicalSnapshot() {
  return {
    schema:
      "void.chain2050-role-authority-contract-snapshot.v1",
    chain_id: 2050,
    contract_address:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.contract_address,
    runtime_code_sha256:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
        .accepted_runtime_sha256,
    empty_registry_root_sha256:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
        .empty_registry_root_sha256,
    entry_count: state.entry_count,
    registry_root_sha256: state.registry_root_sha256,
    entries: state.entries.map(contractEntry),
  };
}

function solidityEntry(entry: ReturnType<typeof contractEntry>) {
  const status = entry.record.authority_status === "active" ? 0 : 1;
  const transition = {
    genesis_grant: 0,
    revoke: 1,
    restore: 2,
    subject_binding_change: 3,
    policy_change: 4,
    role_change: 5,
  }[entry.record.transition];
  assert.notEqual(transition, undefined);
  return {
    entryIndex: BigInt(entry.entry_index),
    previousRegistryRootSha256:
      "0x" + entry.previous_registry_root_sha256,
    roleRecordSha256: "0x" + entry.role_record_sha256,
    registryRootSha256: "0x" + entry.registry_root_sha256,
    record: {
      identityId: entry.record.identity_id,
      role: entry.record.role,
      authorityStatus: status,
      roleAuthorityGeneration:
        BigInt(entry.record.role_authority_generation),
      subjectBindingSha256:
        "0x" + entry.record.subject_binding_sha256,
      authorityPolicySha256:
        "0x" + entry.record.authority_policy_sha256,
      hasPredecessor:
        entry.record.predecessor_role_record_sha256 !== null,
      predecessorRoleRecordSha256:
        entry.record.predecessor_role_record_sha256 === null
          ? "0x" + "00".repeat(32)
          : "0x" + entry.record.predecessor_role_record_sha256,
      transition,
      roleRecordSha256: "0x" + entry.record.role_record_sha256,
    },
  };
}

type FixtureOptions = {
  initialSnapshot?: ReturnType<typeof canonicalSnapshot>;
  laterSnapshot?: ReturnType<typeof canonicalSnapshot>;
  observationBlockNumber?: string;
  runtimeCode?: string;
  chainId?: string;
};

async function fixture(options: FixtureOptions = {}) {
  const initialSnapshot =
    structuredClone(options.initialSnapshot ?? canonicalSnapshot());
  const laterSnapshot =
    structuredClone(options.laterSnapshot ?? initialSnapshot);
  const observed = BigInt(options.observationBlockNumber ?? "37403");
  const head = observed + 11n;
  const blockTag = "0x" + observed.toString(16);
  const blockHash = "0x" + "7a".repeat(32);
  const servedRuntime = options.runtimeCode ?? runtimeCode;
  const calls: Array<{ method: string; params: unknown[] }> = [];
  let snapshotRead = 0;

  const currentSnapshot = () =>
    snapshotRead <= 1 ? initialSnapshot : laterSnapshot;

  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const envelope = JSON.parse(
      Buffer.concat(chunks).toString("utf8"),
    );
    const method = String(envelope.method);
    const params = Array.isArray(envelope.params)
      ? envelope.params
      : [];
    calls.push({ method, params });

    let result: unknown;
    if (method === "eth_chainId") {
      result = options.chainId ?? "0x802";
    } else if (method === "eth_blockNumber") {
      snapshotRead += 1;
      result = "0x" + head.toString(16);
    } else if (method === "eth_getBlockByNumber") {
      assert.equal(params[0], blockTag);
      result = {
        number: blockTag,
        hash: blockHash,
      };
    } else if (method === "eth_getCode") {
      assert.equal(
        String(params[0]).toLowerCase(),
        EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.contract_address,
      );
      assert.equal(params[1], blockTag);
      result = servedRuntime;
    } else if (method === "eth_call") {
      const tx = params[0] as { to?: string; data?: string };
      assert.equal(
        String(tx.to).toLowerCase(),
        EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.contract_address,
      );
      assert.equal(params[1], blockTag);
      const data = String(tx.data || "").toLowerCase();
      const selector = data.slice(0, 10);
      const name = selectors.get(selector);
      assert.ok(name, "unexpected selector " + selector);
      const snapshot = currentSnapshot();

      if (name === "emptyRegistryRootSha256") {
        result = ABI.encodeFunctionResult(name, [
          "0x" + snapshot.empty_registry_root_sha256,
        ]);
      } else if (name === "registryRootSha256") {
        result = ABI.encodeFunctionResult(name, [
          "0x" + snapshot.registry_root_sha256,
        ]);
      } else if (name === "entryCount") {
        result = ABI.encodeFunctionResult(name, [
          BigInt(snapshot.entry_count),
        ]);
      } else {
        const [index] = ABI.decodeFunctionData("getEntry", data);
        const entry = snapshot.entries[Number(index)];
        assert.ok(entry, "entry fixture missing");
        result = ABI.encodeFunctionResult(
          "getEntry",
          [solidityEntry(entry)],
        );
      }
    } else {
      throw new Error("unexpected RPC method " + method);
    }

    const body = Buffer.from(JSON.stringify({
      jsonrpc: "2.0",
      id: envelope.id,
      result,
    }));
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(body.length),
    });
    res.end(body);
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("fixture address unavailable");
  }

  return {
    server,
    calls,
    rpcUrl: "http://127.0.0.1:" + address.port + "/",
  };
}

async function closeFixture(server: ReturnType<typeof createServer>) {
  server.close();
  await once(server, "close");
}

async function runFixture(
  options: FixtureOptions = {},
  overrides: Record<string, unknown> = {},
) {
  const f = await fixture(options);
  try {
    const result =
      await buildRoleAuthorityParticipantLiveBindingPreflightV1({
        checkpoint_evidence: structuredClone(checkpoint),
        genesis_reconciliation_evidence:
          structuredClone(genesisEvidence),
        rpc_url: f.rpcUrl,
        ...overrides,
      });
    return { result, calls: f.calls };
  } finally {
    await closeFixture(f.server);
  }
}

{
  const { result: green, calls } = await runFixture();
  assert.equal(green.ok, true);
  if (green.ok === false) throw new Error(green.reason);
  assert.equal(
    green.marker,
    VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1,
  );
  assert.match(green.preflight_id, /^voidcrapalb1_[a-f0-9]{64}$/);
  assert.equal(
    green.contract_address,
    EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.contract_address,
  );
  assert.match(green.rpc_url_fingerprint_sha256, /^[a-f0-9]{64}$/);
  assert.equal(green.confirmation_depth, "12");
  assert.equal(green.initial_observed_registry_entry_count, "1");
  assert.equal(
    green.initial_observed_registry_root_sha256,
    EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
      .sovereign_genesis_registry_root_sha256,
  );
  assert.equal(
    green.facts.canonical_live_rpc_observer_constructed_inside_preflight,
    true,
  );
  assert.equal(green.facts.live_chain_registry_bound, true);
  assert.equal(green.facts.participant_role_source_ready, true);
  assert.equal(
    green.facts.canonical_snapshot_validation_exercised,
    true,
  );
  assert.equal(green.facts.bound_sovereign_read_verified, true);
  assert.equal(
    green.facts.durable_participant_session_state_bound,
    false,
  );
  assert.equal(
    green.facts.public_session_route_mount_authorized,
    false,
  );
  assert.equal(green.facts.runtime_activation_authorized, false);
  assert.equal(
    green.next_gate,
    "merge_durable_participant_session_state_then_review_composition_wiring_and_restart_rollback_preflight",
  );
  assert.ok(calls.some((call) => call.method === "eth_getCode"));
  assert.ok(calls.some((call) => call.method === "eth_call"));
  assert.ok(calls.filter((call) => call.method === "eth_blockNumber").length >= 2);
}

for (const [key, value] of Object.entries(
  VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_AUTHORITY_V1,
)) {
  if (
    [
      "source_only_preflight",
      "accepted_deployment_checkpoint_required",
      "reconciled_sovereign_genesis_required",
      "fresh_live_rpc_observer_required",
      "canonical_observer_constructed_inside_preflight",
      "read_only_loopback_rpc_required",
      "fixed_block_revalidation_required",
      "twelve_confirmation_policy_required",
      "canonical_binding_descriptor_required",
      "canonical_snapshot_validation_required",
      "bound_sovereign_read_required",
      "live_chain_registry_binding_claim_green_only",
      "durable_participant_session_state_required_separately",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

{
  const bad = structuredClone(checkpoint);
  bad.checkpoint_hash = "0x" + "00".repeat(32);
  const { result } = await runFixture({}, {
    checkpoint_evidence: bad,
  });
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("bad checkpoint admitted");
  assert.match(
    result.reason,
    /role_authority_deployment_checkpoint_invalid/,
  );
}

{
  const bad = structuredClone(genesisEvidence);
  bad.post_state.registry_root_sha256 = "00".repeat(32);
  const { result } = await runFixture({}, {
    genesis_reconciliation_evidence: bad,
  });
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("bad genesis admitted");
  assert.match(
    result.reason,
    /role_authority_sovereign_genesis_invalid/,
  );
}

{
  const { result } = await runFixture({
    observationBlockNumber: "37391",
  });
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("pre-genesis observation admitted");
  assert.equal(
    result.reason,
    "role_authority_live_observation_invalid",
  );
}

{
  const bad = canonicalSnapshot();
  bad.entries[0]!.record.role = "AGENT";
  const { result } = await runFixture({
    initialSnapshot: bad,
    laterSnapshot: bad,
  });
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("bad genesis prefix admitted");
  assert.equal(
    result.reason,
    "role_authority_sovereign_genesis_prefix_mismatch",
  );
}

{
  const { result } = await runFixture({
    runtimeCode: "0x6000",
  });
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("wrong runtime admitted");
  assert.equal(
    result.reason,
    "role_authority_live_observer_result_invalid",
  );
}

{
  const badLater = canonicalSnapshot();
  badLater.registry_root_sha256 = "00".repeat(32);
  const { result } = await runFixture({
    laterSnapshot: badLater,
  });
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("invalid later snapshot admitted");
  assert.equal(
    result.reason,
    "role_authority_bound_sovereign_read_failed",
  );
}

{
  const forgedObserver = {
    marker: "VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1",
    source: {
      async readContractSnapshotV1() {
        return canonicalSnapshot();
      },
    },
  };
  const result =
    await buildRoleAuthorityParticipantLiveBindingPreflightV1({
      checkpoint_evidence: structuredClone(checkpoint),
      genesis_reconciliation_evidence:
        structuredClone(genesisEvidence),
      rpc_url: "http://127.0.0.1:1/",
      observer_result: forgedObserver,
    });
  assert.equal(result.ok, false);
  if (result.ok === true) {
    throw new Error("caller-supplied executable observer admitted");
  }
  assert.equal(
    result.reason,
    "role_authority_participant_live_binding_input_shape_invalid",
  );
}

{
  const result =
    await buildRoleAuthorityParticipantLiveBindingPreflightV1({
      checkpoint_evidence: structuredClone(checkpoint),
      genesis_reconciliation_evidence:
        structuredClone(genesisEvidence),
      rpc_url: "https://example.invalid/",
    });
  assert.equal(result.ok, false);
  if (result.ok === true) throw new Error("non-loopback RPC admitted");
  assert.equal(
    result.reason,
    "role_authority_live_observer_result_invalid",
  );
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("accepted_deployment_checkpoint_verified=true");
console.log("sovereign_genesis_reconciled=true");
console.log("sovereign_genesis_prefix_exact=true");
console.log("accepted_runtime_fixture_sha256_exact=true");
console.log("canonical_live_rpc_observer_constructed_inside_preflight=true");
console.log("caller_supplied_observer_result_rejected=true");
console.log("fresh_live_12_confirmation_observation_required=true");
console.log("runtime_code_identity_revalidated=true");
console.log("canonical_binding_constructed_inside_preflight=true");
console.log("caller_supplied_binding_result_rejected=true");
console.log("canonical_binding_descriptor_recomputed=true");
console.log("canonical_snapshot_validation_exercised=true");
console.log("bound_sovereign_read_verified=true");
console.log("live_chain_registry_bound=true");
console.log("participant_role_source_ready=true");
console.log("durable_participant_session_state_bound=false");
console.log("public_session_route_mount_authorized=false");
console.log("runtime_activation_authorized=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("registry_append=false");
console.log("funds_action=false");
