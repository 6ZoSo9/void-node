#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";
import {
  Interface,
  getAddress,
} from "ethers";

export const VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1 =
  "VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1";

export const VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_AUTHORITY_V1 =
  Object.freeze({
    canonical_chain_id: "2050",
    loopback_http_only: true,
    fixed_block_observation: true,
    block_hash_revalidation_required: true,
    runtime_code_revalidation_required: true,
    terminal_state_revalidation_required: true,
    read_only_rpc_methods: Object.freeze([
      "eth_chainId",
      "eth_blockNumber",
      "eth_getBlockByNumber",
      "eth_getCode",
      "eth_call",
    ]),
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    deployment: false,
    chain2050_mutation: false,
    validator_mutation: false,
    governance_mutation: false,
    work_credit_mutation: false,
    runtime_service_action: false,
    automatic_retry: false,
    funds_action: false,
  });

export const VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_ABI_V1 =
  Object.freeze([
    "function emptyRegistryRootSha256() view returns (bytes32)",
    "function registryRootSha256() view returns (bytes32)",
    "function entryCount() view returns (uint256)",
    "function getEntry(uint256 index) view returns (tuple(uint64 entryIndex, bytes32 previousRegistryRootSha256, bytes32 roleRecordSha256, bytes32 registryRootSha256, tuple(string identityId, string role, uint8 authorityStatus, uint64 roleAuthorityGeneration, bytes32 subjectBindingSha256, bytes32 authorityPolicySha256, bool hasPredecessor, bytes32 predecessorRoleRecordSha256, uint8 transition, bytes32 roleRecordSha256) record) entry)",
  ]);

const QUERY_CONTRACT = Object.freeze({
  schema: "void.chain2050-role-authority-live-rpc-query-contract.v1",
  chain_id: 2050,
  transport: "loopback_http_json_rpc",
  fixed_block_observation: true,
  block_hash_revalidation_required: true,
  runtime_code_revalidation_required: true,
  terminal_state_revalidation_required: true,
  read_only_rpc_methods: [
    "eth_blockNumber",
    "eth_call",
    "eth_chainId",
    "eth_getBlockByNumber",
    "eth_getCode",
  ],
  views: [
    "emptyRegistryRootSha256",
    "entryCount",
    "getEntry",
    "registryRootSha256",
  ],
});

const VIEWS = new Interface(
  VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_ABI_V1,
);
const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const HEX_BYTES = /^0x(?:[0-9a-f]{2})*$/i;
const HASH = /^0x[0-9a-f]{64}$/;
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_ENTRIES = 4096;
const MAX_ENTRIES = 100000;
const MAX_REQUEST_BYTES = 32768;

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256Utf8(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1 =
  sha256Utf8(canonicalJson(QUERY_CONTRACT));

function text(value) {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function address(value) {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function quantity(value) {
  const raw = text(value);
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function bytes(value) {
  const raw = text(value).toLowerCase();
  return HEX_BYTES.test(raw) ? raw : "";
}

function hash(value) {
  const raw = text(value).toLowerCase();
  return HASH.test(raw) ? raw : "";
}

function hex32NoPrefix(value) {
  const raw = text(value).toLowerCase();
  return /^0x[0-9a-f]{64}$/.test(raw) ? raw.slice(2) : "";
}

function decimalUint(value, max = null) {
  try {
    const parsed = BigInt(value);
    if (parsed < 0n) return "";
    if (max !== null && parsed > max) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function boundedPositive(value, fallback, maximum) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) &&
    parsed > 0 &&
    parsed <= maximum
    ? parsed
    : null;
}

function normalizeRpcPolicy(input) {
  let url;
  try {
    url = new URL(text(input?.rpc_url));
  } catch {
    return null;
  }
  const host = url.hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");
  const hostname = host === "127.0.0.1"
    ? "127.0.0.1"
    : host === "::1"
      ? "::1"
      : null;
  const port = Number(url.port || 0);
  const timeout = boundedPositive(
    input?.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxResponseBytes = boundedPositive(
    input?.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  const maxEntries = boundedPositive(
    input?.max_entries,
    DEFAULT_MAX_ENTRIES,
    MAX_ENTRIES,
  );

  if (
    !hostname ||
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535 ||
    !url.pathname.startsWith("/") ||
    url.pathname.length > 256 ||
    timeout === null ||
    maxResponseBytes === null ||
    maxEntries === null
  ) {
    return null;
  }

  const rendered = hostname === "::1" ? "[::1]" : hostname;
  const normalized =
    "http://" + rendered + ":" + String(port) + url.pathname;

  return Object.freeze({
    rpc_url: normalized,
    rpc_url_fingerprint_sha256: sha256Utf8(normalized),
    hostname,
    port,
    path: url.pathname,
    request_timeout_ms: timeout,
    max_response_bytes: maxResponseBytes,
    max_entries: maxEntries,
  });
}

function normalizeConfirmationDepth(value) {
  const parsed = boundedPositive(value, 1, 1000000);
  return parsed === null ? null : BigInt(parsed);
}

export function computeChain2050RoleAuthorityLiveRpcFinalityPolicySha256V1(
  input,
) {
  const depth = normalizeConfirmationDepth(input?.confirmation_depth);
  if (depth === null) return null;
  return sha256Utf8(canonicalJson({
    schema: "void.chain2050-role-authority-live-rpc-finality-policy.v1",
    chain_id: 2050,
    confirmation_depth: depth.toString(),
    fixed_block_observation: true,
    block_hash_revalidation_required: true,
    runtime_code_revalidation_required: true,
    terminal_state_revalidation_required: true,
  }));
}

function createHttpTransport(policy) {
  let nextId = 0;
  return async (call) => {
    const id = ++nextId;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: call.method,
      params: call.params,
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("role_authority_live_rpc_request_too_large");
    }

    return await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, value = undefined) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(value);
      };

      const request = http.request({
        protocol: "http:",
        hostname: policy.hostname,
        port: policy.port,
        path: policy.path,
        method: "POST",
        family: policy.hostname === "::1" ? 6 : 4,
        agent: false,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(body, "utf8")),
          Connection: "close",
          "User-Agent":
            "void-chain2050-role-authority-live-rpc-observer-v1",
        },
      }, (response) => {
        const chunks = [];
        let total = 0;

        response.on("data", (chunk) => {
          const buffer = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);
          total += buffer.length;
          if (total > policy.max_response_bytes) {
            request.destroy(
              new Error("role_authority_live_rpc_response_too_large"),
            );
            return;
          }
          chunks.push(buffer);
        });

        response.on("end", () => {
          if (Number(response.statusCode || 0) !== 200) {
            finish(
              new Error("role_authority_live_rpc_http_status_invalid"),
            );
            return;
          }
          let payload;
          try {
            payload = JSON.parse(
              Buffer.concat(chunks).toString("utf8"),
            );
          } catch {
            finish(
              new Error("role_authority_live_rpc_json_invalid"),
            );
            return;
          }
          if (
            !payload ||
            payload.jsonrpc !== "2.0" ||
            payload.id !== id ||
            payload.error ||
            !Object.prototype.hasOwnProperty.call(payload, "result")
          ) {
            finish(
              new Error("role_authority_live_rpc_envelope_invalid"),
            );
            return;
          }
          finish(null, payload.result);
        });
      });

      request.setTimeout(policy.request_timeout_ms);
      request.on("timeout", () => {
        request.destroy(
          new Error("role_authority_live_rpc_timeout"),
        );
      });
      request.on("error", (error) => finish(error));
      request.end(body);
    });
  };
}

function callData(contract, name, args = []) {
  return {
    to: contract,
    data: VIEWS.encodeFunctionData(name, args),
  };
}

function decodeBytes32(name, raw) {
  const data = bytes(raw);
  if (!data) {
    throw new Error(
      "role_authority_live_rpc_view_result_invalid:" + name,
    );
  }
  const decoded = VIEWS.decodeFunctionResult(name, data);
  const value = hex32NoPrefix(decoded[0]);
  if (!value) {
    throw new Error(
      "role_authority_live_rpc_view_bytes32_invalid:" + name,
    );
  }
  return value;
}

function decodeUint(name, raw) {
  const data = bytes(raw);
  if (!data) {
    throw new Error(
      "role_authority_live_rpc_view_result_invalid:" + name,
    );
  }
  const decoded = VIEWS.decodeFunctionResult(name, data);
  const value = decimalUint(decoded[0]);
  if (!value) {
    throw new Error(
      "role_authority_live_rpc_view_uint_invalid:" + name,
    );
  }
  return value;
}

function statusString(value) {
  const index = Number(value);
  if (index === 0) return "active";
  if (index === 1) return "revoked";
  throw new Error("role_authority_live_rpc_status_invalid");
}

function transitionString(value) {
  const index = Number(value);
  if (index === 0) return "genesis_grant";
  if (index === 1) return "revoke";
  if (index === 2) return "restore";
  if (index === 3) return "subject_binding_change";
  if (index === 4) return "policy_change";
  if (index === 5) return "role_change";
  throw new Error("role_authority_live_rpc_transition_invalid");
}

function decodeEntry(raw, expectedIndex) {
  const data = bytes(raw);
  if (!data) {
    throw new Error("role_authority_live_rpc_entry_result_invalid");
  }
  const decoded = VIEWS.decodeFunctionResult("getEntry", data);
  const entry = decoded[0];
  const record = entry.record ?? entry[4];
  const entryIndex = decimalUint(
    entry.entryIndex ?? entry[0],
    18446744073709551615n,
  );
  const expected = String(expectedIndex);
  if (!entryIndex || entryIndex !== expected) {
    throw new Error("role_authority_live_rpc_entry_index_mismatch");
  }

  const previousRoot = hex32NoPrefix(
    entry.previousRegistryRootSha256 ?? entry[1],
  );
  const entryRoleHash = hex32NoPrefix(
    entry.roleRecordSha256 ?? entry[2],
  );
  const registryRoot = hex32NoPrefix(
    entry.registryRootSha256 ?? entry[3],
  );
  const subjectHash = hex32NoPrefix(
    record.subjectBindingSha256 ?? record[4],
  );
  const policyHash = hex32NoPrefix(
    record.authorityPolicySha256 ?? record[5],
  );
  const predecessorRaw = hex32NoPrefix(
    record.predecessorRoleRecordSha256 ?? record[7],
  );
  const nestedRoleHash = hex32NoPrefix(
    record.roleRecordSha256 ?? record[9],
  );
  const generation = decimalUint(
    record.roleAuthorityGeneration ?? record[3],
    18446744073709551615n,
  );
  const identityId = text(record.identityId ?? record[0]);
  const role = text(record.role ?? record[1]);
  const hasPredecessor = Boolean(
    record.hasPredecessor ?? record[6],
  );

  if (
    !previousRoot ||
    !entryRoleHash ||
    !registryRoot ||
    !subjectHash ||
    !policyHash ||
    !predecessorRaw ||
    !nestedRoleHash ||
    !generation ||
    !/^[a-z0-9][a-z0-9._:-]{2,191}$/.test(identityId) ||
    !/^[A-Z][A-Z0-9_]{1,63}$/.test(role) ||
    nestedRoleHash !== entryRoleHash
  ) {
    throw new Error("role_authority_live_rpc_entry_shape_invalid");
  }

  if (
    (!hasPredecessor && predecessorRaw !== "0".repeat(64)) ||
    (hasPredecessor && predecessorRaw === "0".repeat(64))
  ) {
    throw new Error(
      "role_authority_live_rpc_predecessor_shape_invalid",
    );
  }

  return Object.freeze({
    entry_index: entryIndex,
    previous_registry_root_sha256: previousRoot,
    role_record_sha256: entryRoleHash,
    registry_root_sha256: registryRoot,
    record: Object.freeze({
      identity_id: identityId,
      role,
      authority_status: statusString(
        record.authorityStatus ?? record[2],
      ),
      role_authority_generation: generation,
      subject_binding_sha256: subjectHash,
      authority_policy_sha256: policyHash,
      predecessor_role_record_sha256:
        hasPredecessor ? predecessorRaw : null,
      transition: transitionString(
        record.transition ?? record[8],
      ),
      role_record_sha256: nestedRoleHash,
    }),
  });
}

function held(reason, details = {}) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1,
    version: 1,
    reason,
    rpc_url_fingerprint_sha256:
      details.rpc_url_fingerprint_sha256 ?? null,
    rpc_methods_used: details.rpc_methods_used ?? [],
    rpc_call_performed:
      (details.rpc_methods_used ?? []).length > 0,
    snapshot: null,
    source: null,
    deployment_verified: false,
    mutation_performed: false,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_constructed: false,
    transaction_broadcast_performed: false,
    chain2050_mutation_performed: false,
    runtime_service_action_performed: false,
    automatic_retry_allowed: false,
    funds_action_performed: false,
    ...(details.detail ? { detail: details.detail } : {}),
  });
}

export async function createChain2050RoleAuthorityLiveRpcObserverV1(
  input,
) {
  const rpcPolicy = normalizeRpcPolicy(input);
  const contract = address(input?.contract_address);
  const expectedRuntimeCodeSha = text(
    input?.expected_runtime_code_sha256,
  ).toLowerCase();
  const registryContractSha = text(
    input?.expected_registry_contract_sha256,
  ).toLowerCase();
  const confirmationDepth = normalizeConfirmationDepth(
    input?.confirmation_depth,
  );
  const finalityPolicySha =
    computeChain2050RoleAuthorityLiveRpcFinalityPolicySha256V1({
      confirmation_depth: input?.confirmation_depth,
    });

  if (
    !rpcPolicy ||
    !contract ||
    !HEX64.test(expectedRuntimeCodeSha) ||
    !HEX64.test(registryContractSha) ||
    confirmationDepth === null ||
    finalityPolicySha === null
  ) {
    return held("role_authority_live_rpc_input_invalid", {
      rpc_url_fingerprint_sha256:
        rpcPolicy?.rpc_url_fingerprint_sha256 ?? null,
    });
  }

  const methods = [];
  const transport = createHttpTransport(rpcPolicy);
  const call = async (method, params) => {
    methods.push(method);
    return await transport({ method, params });
  };

  const readSnapshot = async () => {
    const chainId = quantity(await call("eth_chainId", []));
    if (chainId !== 2050n) {
      throw new Error("role_authority_live_rpc_chain_id_mismatch");
    }

    const head = quantity(await call("eth_blockNumber", []));
    if (head === null) {
      throw new Error("role_authority_live_rpc_head_invalid");
    }
    if (head + 1n < confirmationDepth) {
      throw new Error(
        "role_authority_live_rpc_confirmation_depth_unavailable",
      );
    }

    const observed = head - (confirmationDepth - 1n);
    const blockTag = "0x" + observed.toString(16);
    const blockA = await call(
      "eth_getBlockByNumber",
      [blockTag, false],
    );
    const blockHashA = hash(blockA?.hash);
    if (
      !blockHashA ||
      quantity(blockA?.number) !== observed
    ) {
      throw new Error(
        "role_authority_live_rpc_observation_block_invalid",
      );
    }

    const runtimeCode = bytes(
      await call("eth_getCode", [contract, blockTag]),
    );
    if (!runtimeCode || runtimeCode === "0x") {
      throw new Error(
        "role_authority_live_rpc_contract_code_absent",
      );
    }
    const runtimeCodeSha = sha256Bytes(
      Buffer.from(runtimeCode.slice(2), "hex"),
    );
    if (runtimeCodeSha !== expectedRuntimeCodeSha) {
      throw new Error(
        "role_authority_live_rpc_runtime_code_mismatch",
      );
    }

    const emptyRoot = decodeBytes32(
      "emptyRegistryRootSha256",
      await call("eth_call", [
        callData(contract, "emptyRegistryRootSha256"),
        blockTag,
      ]),
    );
    const count = decodeUint(
      "entryCount",
      await call("eth_call", [
        callData(contract, "entryCount"),
        blockTag,
      ]),
    );
    const terminalRoot = decodeBytes32(
      "registryRootSha256",
      await call("eth_call", [
        callData(contract, "registryRootSha256"),
        blockTag,
      ]),
    );

    const countNumber = Number(count);
    if (
      !Number.isSafeInteger(countNumber) ||
      countNumber < 0 ||
      countNumber > rpcPolicy.max_entries
    ) {
      throw new Error(
        "role_authority_live_rpc_entry_count_limit_exceeded",
      );
    }

    const entries = [];
    for (let index = 0; index < countNumber; index += 1) {
      entries.push(
        decodeEntry(
          await call("eth_call", [
            callData(contract, "getEntry", [index]),
            blockTag,
          ]),
          index,
        ),
      );
    }

    const countB = decodeUint(
      "entryCount",
      await call("eth_call", [
        callData(contract, "entryCount"),
        blockTag,
      ]),
    );
    const terminalRootB = decodeBytes32(
      "registryRootSha256",
      await call("eth_call", [
        callData(contract, "registryRootSha256"),
        blockTag,
      ]),
    );
    const runtimeCodeB = bytes(
      await call("eth_getCode", [contract, blockTag]),
    );
    const blockB = await call(
      "eth_getBlockByNumber",
      [blockTag, false],
    );

    if (
      countB !== count ||
      terminalRootB !== terminalRoot ||
      runtimeCodeB !== runtimeCode ||
      hash(blockB?.hash) !== blockHashA ||
      quantity(blockB?.number) !== observed
    ) {
      throw new Error(
        "role_authority_live_rpc_revalidation_mismatch",
      );
    }

    return Object.freeze({
      snapshot: Object.freeze({
        schema:
          "void.chain2050-role-authority-contract-snapshot.v1",
        chain_id: 2050,
        contract_address: contract,
        runtime_code_sha256: runtimeCodeSha,
        empty_registry_root_sha256: emptyRoot,
        entry_count: count,
        registry_root_sha256: terminalRoot,
        entries: Object.freeze(entries),
      }),
      observation: Object.freeze({
        chain_id: "2050",
        head_block_number: head.toString(),
        observation_block_number: observed.toString(),
        observation_block_hash: blockHashA,
        confirmation_depth: confirmationDepth.toString(),
        fixed_block_observation: true,
        observation_block_hash_revalidated: true,
        runtime_code_revalidated: true,
        terminal_state_revalidated: true,
      }),
    });
  };

  try {
    const initial = await readSnapshot();

    const source = Object.freeze({
      marker: VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1,
      chain_id: 2050,
      contract_address: contract,
      runtime_code_sha256: expectedRuntimeCodeSha,
      registry_contract_sha256: registryContractSha,
      query_contract_sha256:
        VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1,
      finality_policy_sha256: finalityPolicySha,
      rpc_url_fingerprint_sha256:
        rpcPolicy.rpc_url_fingerprint_sha256,
      transport_kind: "loopback_http_json_rpc",
      synthetic_transport: false,
      authority:
        VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_AUTHORITY_V1,
      async readContractSnapshotV1() {
        return (await readSnapshot()).snapshot;
      },
    });

    return Object.freeze({
      ok: true,
      status: "read_only_live_rpc_observer_ready",
      marker: VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1,
      version: 1,
      rpc_url_fingerprint_sha256:
        rpcPolicy.rpc_url_fingerprint_sha256,
      rpc_methods_used: Object.freeze([...methods]),
      initial_snapshot: initial.snapshot,
      observation: initial.observation,
      source,
      deployment_verified: false,
      production_activation_authorized: false,
      mutation_performed: false,
      credential_access_performed: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_constructed: false,
      transaction_broadcast_performed: false,
      chain2050_mutation_performed: false,
      runtime_service_action_performed: false,
      automatic_retry_allowed: false,
      funds_action_performed: false,
      authority:
        VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_AUTHORITY_V1,
    });
  } catch (error) {
    return held("role_authority_live_rpc_observer_held", {
      rpc_url_fingerprint_sha256:
        rpcPolicy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      detail: Object.freeze({
        error_class: text(error?.name || "Error").slice(0, 80),
        message: text(error?.message || error).slice(0, 240),
      }),
    });
  }
}
