#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { once } from "node:events";

import { Interface } from "ethers";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
  deriveChain2050RoleAuthorityPairV1,
  type Chain2050RoleAuthorityRecordV1,
} from "../src/security/chain2050_role_authority_record_v1.js";
import {
  readChain2050RoleAuthorityStateV1,
} from "../src/security/chain2050_role_authority_read_adapter_v1.js";
import {
  appendChain2050RoleAuthorityRecordV1,
  createEmptyChain2050RoleAuthorityRegistryV1,
} from "../src/security/chain2050_role_authority_registry_v1.js";
import {
  createChain2050RoleAuthorityLiveRpcBindingV1,
} from "../src/security/chain2050_role_authority_live_rpc_binding_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_ABI_V1,
  VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1,
  computeChain2050RoleAuthorityLiveRpcFinalityPolicySha256V1,
  createChain2050RoleAuthorityLiveRpcObserverV1,
} from "../tools/chain2050-role-authority-live-rpc-observer-v1.mjs";

const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1_PROOF_GREEN";
const ABI = new Interface(
  VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_ABI_V1,
);
const CONTRACT = "0x1111111111111111111111111111111111111111";
const CODE = "0x6001600055";
const CODE_SHA = crypto.createHash("sha256")
  .update(Buffer.from(CODE.slice(2), "hex"))
  .digest("hex");
const REGISTRY_CONTRACT_SHA = "aa".repeat(32);
const SUBJECT_A = "11".repeat(32);
const POLICY_A = "22".repeat(32);
const ID = "participant.alice";
const BLOCK_HASH = "0x" + "33".repeat(32);
const HEAD = 100n;
const DEPTH = 12n;
const OBSERVED = HEAD - (DEPTH - 1n);
const OBSERVED_TAG = "0x" + OBSERVED.toString(16);

function genesis(): Chain2050RoleAuthorityRecordV1 {
  return {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
    chain_id: 2050,
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

const initial = appendChain2050RoleAuthorityRecordV1(
  createEmptyChain2050RoleAuthorityRegistryV1(),
  genesis(),
);
assert.equal(initial.ok, true);
if (initial.ok === false) throw new Error(initial.reason);

function solidityEntry(entry: typeof initial.state.entries[number]) {
  const status = entry.record.authority_status === "active" ? 0 : 1;
  const transition = {
    genesis_grant: 0,
    revoke: 1,
    restore: 2,
    subject_binding_change: 3,
    policy_change: 4,
    role_change: 5,
  }[entry.record.transition];
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
      roleRecordSha256: "0x" + entry.role_record_sha256,
    },
  };
}

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

type FixtureOptions = {
  chainId?: string;
  code?: string;
  codeTamperAfterFirst?: boolean;
  reorgAfterFirstBlock?: boolean;
  countOverride?: bigint | null;
};

async function fixture(options: FixtureOptions = {}) {
  const calls: Array<{ method: string; params: unknown[] }> = [];
  let blockReads = 0;
  let codeReads = 0;

  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
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
      result = "0x" + HEAD.toString(16);
    } else if (method === "eth_getBlockByNumber") {
      assert.equal(params[0], OBSERVED_TAG);
      blockReads += 1;
      result = {
        number: OBSERVED_TAG,
        hash:
          options.reorgAfterFirstBlock && blockReads > 1
            ? "0x" + "44".repeat(32)
            : BLOCK_HASH,
      };
    } else if (method === "eth_getCode") {
      assert.equal(params[0], CONTRACT);
      assert.equal(params[1], OBSERVED_TAG);
      codeReads += 1;
      result =
        options.codeTamperAfterFirst && codeReads > 1
          ? "0x6002600055"
          : options.code ?? CODE;
    } else if (method === "eth_call") {
      const tx = params[0] as { to?: string; data?: string };
      assert.equal(String(tx.to).toLowerCase(), CONTRACT);
      assert.equal(params[1], OBSERVED_TAG);
      const data = String(tx.data || "").toLowerCase();
      const selector = data.slice(0, 10);
      const name = selectors.get(selector);
      assert.ok(name, "unexpected selector " + selector);

      if (name === "emptyRegistryRootSha256") {
        result = ABI.encodeFunctionResult(name, [
          "0x" +
          initial.state.entries[0]!.previous_registry_root_sha256,
        ]);
      } else if (name === "registryRootSha256") {
        result = ABI.encodeFunctionResult(name, [
          "0x" + initial.state.registry_root_sha256,
        ]);
      } else if (name === "entryCount") {
        result = ABI.encodeFunctionResult(name, [
          options.countOverride ?? BigInt(initial.state.entry_count),
        ]);
      } else {
        const [index] = ABI.decodeFunctionData("getEntry", data);
        const entry = initial.state.entries[Number(index)];
        assert.ok(entry, "entry fixture missing");
        result = ABI.encodeFunctionResult(
          "getEntry",
          [solidityEntry(entry)],
        );
      }
    } else {
      throw new Error("unexpected method " + method);
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

async function close(server: http.Server) {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

const finalitySha =
  computeChain2050RoleAuthorityLiveRpcFinalityPolicySha256V1({
    confirmation_depth: Number(DEPTH),
  });
assert.match(finalitySha ?? "", /^[a-f0-9]{64}$/);
assert.match(
  VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1,
  /^[a-f0-9]{64}$/,
);

{
  const f = await fixture();
  try {
    const observed =
      await createChain2050RoleAuthorityLiveRpcObserverV1({
        rpc_url: f.rpcUrl,
        contract_address: CONTRACT,
        expected_runtime_code_sha256: CODE_SHA,
        expected_registry_contract_sha256:
          REGISTRY_CONTRACT_SHA,
        confirmation_depth: Number(DEPTH),
        max_entries: 16,
      });
    assert.equal(observed.ok, true);
    if (observed.ok === false) throw new Error(observed.reason);
    assert.equal(observed.deployment_verified, false);
    assert.equal(observed.production_activation_authorized, false);
    assert.equal(observed.source.synthetic_transport, false);
    assert.equal(
      observed.source.query_contract_sha256,
      VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1,
    );
    assert.equal(
      observed.source.finality_policy_sha256,
      finalitySha,
    );
    assert.equal(
      observed.observation.observation_block_number,
      OBSERVED.toString(),
    );
    assert.deepEqual(
      observed.initial_snapshot.entries,
      initial.state.entries.map((entry) => ({
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
    );

    const bound = createChain2050RoleAuthorityLiveRpcBindingV1({
      observer: observed.source,
      binding_id: "participant-role-live-rpc-proof-v1",
    });
    assert.equal(bound.ok, true);
    if (bound.ok === false) throw new Error(bound.reason);
    assert.equal(
      bound.descriptor.registry_contract_sha256,
      REGISTRY_CONTRACT_SHA,
    );
    assert.equal(
      bound.descriptor.query_contract_sha256,
      VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1,
    );
    assert.equal(
      bound.descriptor.finality_policy_sha256,
      finalitySha,
    );

    const pair = deriveChain2050RoleAuthorityPairV1(genesis());
    const read = await readChain2050RoleAuthorityStateV1(
      bound.source,
      {
        identity_id: ID,
        expected_pair: pair,
        require_active: true,
      },
    );
    assert.equal(read.ok, true);
    if (read.ok === false) throw new Error(read.reason);
    assert.equal(read.view.role, "AGENT");

    const methods = new Set(f.calls.map((call) => call.method));
    assert.deepEqual(
      [...methods].sort(),
      [
        "eth_blockNumber",
        "eth_call",
        "eth_chainId",
        "eth_getBlockByNumber",
        "eth_getCode",
      ].sort(),
    );
    for (const call of f.calls) {
      if (call.method === "eth_call") {
        assert.equal(call.params[1], OBSERVED_TAG);
      }
      if (call.method === "eth_getCode") {
        assert.equal(call.params[1], OBSERVED_TAG);
      }
    }
  } finally {
    await close(f.server);
  }
}

for (const [label, options, expected] of [
  [
    "wrong_chain",
    { chainId: "0x1" },
    "role_authority_live_rpc_chain_id_mismatch",
  ],
  [
    "code_absent",
    { code: "0x" },
    "role_authority_live_rpc_contract_code_absent",
  ],
  [
    "code_mismatch",
    { code: "0x6002" },
    "role_authority_live_rpc_runtime_code_mismatch",
  ],
  [
    "reorg",
    { reorgAfterFirstBlock: true },
    "role_authority_live_rpc_revalidation_mismatch",
  ],
  [
    "code_revalidation",
    { codeTamperAfterFirst: true },
    "role_authority_live_rpc_revalidation_mismatch",
  ],
] as const) {
  const f = await fixture(options);
  try {
    const result =
      await createChain2050RoleAuthorityLiveRpcObserverV1({
        rpc_url: f.rpcUrl,
        contract_address: CONTRACT,
        expected_runtime_code_sha256: CODE_SHA,
        expected_registry_contract_sha256:
          REGISTRY_CONTRACT_SHA,
        confirmation_depth: Number(DEPTH),
        max_entries: 16,
      });
    assert.equal(result.ok, false, label);
    if (result.ok === true) throw new Error(label + " unexpectedly green");
    assert.match(
      String(result.detail?.message || ""),
      new RegExp(expected),
      label,
    );
  } finally {
    await close(f.server);
  }
}

{
  const f = await fixture({ countOverride: 17n });
  try {
    const result =
      await createChain2050RoleAuthorityLiveRpcObserverV1({
        rpc_url: f.rpcUrl,
        contract_address: CONTRACT,
        expected_runtime_code_sha256: CODE_SHA,
        expected_registry_contract_sha256:
          REGISTRY_CONTRACT_SHA,
        confirmation_depth: Number(DEPTH),
        max_entries: 16,
      });
    assert.equal(result.ok, false);
    if (result.ok === true) throw new Error("count limit unexpectedly green");
    assert.match(
      String(result.detail?.message || ""),
      /entry_count_limit_exceeded/,
    );
  } finally {
    await close(f.server);
  }
}

assert.equal(
  (
    await createChain2050RoleAuthorityLiveRpcObserverV1({
      rpc_url: "https://127.0.0.1:8545/",
      contract_address: CONTRACT,
      expected_runtime_code_sha256: CODE_SHA,
      expected_registry_contract_sha256:
        REGISTRY_CONTRACT_SHA,
      confirmation_depth: Number(DEPTH),
    })
  ).ok,
  false,
);

console.log(MARKER);
console.log("chain_id=2050");
console.log("loopback_http_only=true");
console.log("fixed_finality_block=true");
console.log("block_hash_revalidated=true");
console.log("runtime_code_sha256_revalidated=true");
console.log("terminal_state_revalidated=true");
console.log("full_registry_snapshot_decoded=true");
console.log("canonical_projection_reused=true");
console.log("canonical_binding_reused=true");
console.log("read_only_rpc_method_allowlist=true");
console.log("entry_count_bounded=true");
console.log("deployment_verified=false");
console.log("production_activation_authorized=false");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_mutation=false");
console.log("funds_action=false");
