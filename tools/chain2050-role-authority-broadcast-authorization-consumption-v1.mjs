import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  EXPECTED,
  verifyRoleAuthoritySingleTransactionBroadcastAuthorizationV1,
} from "./chain2050-role-authority-single-transaction-broadcast-authorization-v1.mjs";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_BROADCAST_AUTHORIZATION_CONSUMPTION_V1";

export const AUTHORITY_V1 = Object.freeze({
  durable_single_use_consumption: true,
  fresh_execution_preflight_required: true,
  maximum_preflight_age_ms: 120000,
  exact_state_store_realpath_scoped_replay_prevention: true,
  global_replay_prevention_claimed: false,
  canonical_state_store_runtime_binding_required: true,
  filesystem_read: true,
  filesystem_mutation_one_consumption_record_may_occur: true,
  raw_signed_transaction_access: false,
  private_key_access: false,
  wallet_or_signer_access: false,
  broadcaster_access: false,
  rpc_call: false,
  transaction_broadcast_performed: false,
  chain2050_write_performed: false,
  additional_funds_action: false,
  automatic_retry: false,
});

const MAX_RECORD_BYTES = 64 * 1024;
const MAX_PREFLIGHT_AGE_MS = 120000;
const MIN_DEPLOYER_BALANCE_WEI = 7208943000000000n;

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" +
    Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}";
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function held(reason, detail = {}) {
  return {
    ok: false,
    marker: MARKER,
    version: 1,
    status: "held",
    reason,
    authorization_consumed: false,
    raw_signed_transaction_accessed: false,
    broadcaster_access_performed: false,
    rpc_call_performed: false,
    transaction_broadcast_performed: false,
    chain2050_write_performed: false,
    authority: AUTHORITY_V1,
    ...detail,
  };
}

function assertNoSymlinkAncestors(target) {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  const relative = resolved.slice(parsed.root.length);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error("symlink_ancestor_rejected");
  }
}

function validateStateRoot(raw) {
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    return { ok: false, reason: "state_root_must_be_absolute" };
  }
  const resolved = path.resolve(raw);
  try {
    assertNoSymlinkAncestors(resolved);
    const stat = fs.lstatSync(resolved);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      return { ok: false, reason: "state_root_not_direct_directory" };
    }
    if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
      return { ok: false, reason: "state_root_owner_mismatch" };
    }
    if ((stat.mode & 0o777) !== 0o700) {
      return { ok: false, reason: "state_root_mode_must_be_0700" };
    }
    const real = fs.realpathSync(resolved);
    if (real !== resolved) {
      return { ok: false, reason: "state_root_realpath_mismatch" };
    }
    return { ok: true, realpath: real, realpath_sha256: sha256(real) };
  } catch {
    return { ok: false, reason: "state_root_invalid" };
  }
}

function fsyncDirectory(directory) {
  const fd = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function ensureConsumedDirectory(root) {
  const directory = path.join(root, "broadcast-consumed");
  try {
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("consumed_dir_not_direct_directory");
    }
    if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
      throw new Error("consumed_dir_owner_mismatch");
    }
    if ((stat.mode & 0o777) !== 0o700) {
      throw new Error("consumed_dir_mode_must_be_0700");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    fs.mkdirSync(directory, { recursive: false, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    fsyncDirectory(root);
  }
  assertNoSymlinkAncestors(directory);
  return directory;
}

function atomicCreate(file, value) {
  const parent = path.dirname(file);
  const temporary = path.join(
    parent,
    "." + path.basename(file) + ".tmp-" + process.pid + "-" +
      crypto.randomBytes(8).toString("hex"),
  );
  const bytes = Buffer.from(canonical(value) + "\n", "utf8");
  if (bytes.length > MAX_RECORD_BYTES) throw new Error("record_too_large");
  const fd = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    try {
      fs.linkSync(temporary, file);
      fsyncDirectory(parent);
      return "created";
    } catch (error) {
      if (error?.code === "EEXIST") return "exists";
      throw error;
    }
  } finally {
    try {
      fs.unlinkSync(temporary);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

function verifyFreshExecutionPreflight(preflight, nowMs) {
  if (
    !preflight ||
    preflight.marker !== "VOID_ROLE_AUTHORITY_FRESH_EXECUTION_PREFLIGHT_V1" ||
    preflight.version !== 1
  ) {
    return { ok: false, reason: "fresh_execution_preflight_shape_invalid" };
  }

  const exact = [
    [preflight.broadcast_authorization_request_id, EXPECTED.broadcast_authorization_request_id],
    [String(preflight.signed_transaction_hash).toLowerCase(), EXPECTED.signed_transaction_hash],
    [preflight.signed_transaction_file_sha256, EXPECTED.signed_transaction_file_sha256],
    [String(preflight.signer_address).toLowerCase(), EXPECTED.signer_address],
    [String(preflight.chain_id), EXPECTED.chain_id],
    [String(preflight.latest_nonce), EXPECTED.nonce],
    [String(preflight.pending_nonce), EXPECTED.nonce],
    [String(preflight.predicted_contract_address).toLowerCase(), EXPECTED.predicted_contract_address],
  ];
  for (const [actual, expected] of exact) {
    if (actual !== expected) {
      return { ok: false, reason: "fresh_execution_preflight_exact_binding_mismatch" };
    }
  }

  if (
    preflight.pending_transactions_present !== false ||
    preflight.predicted_contract_address_vacant !== true ||
    preflight.signed_transaction_seen_by_hash !== false ||
    preflight.signed_transaction_receipt_seen !== false ||
    preflight.authority?.loopback_rpc_only !== true ||
    preflight.authority?.transaction_broadcast !== false ||
    preflight.authority?.chain2050_mutation !== false ||
    preflight.authority?.funds_action !== false
  ) {
    return { ok: false, reason: "fresh_execution_preflight_state_invalid" };
  }

  let balance;
  let estimate;
  let baseFee;
  let priority;
  try {
    balance = BigInt(preflight.deployer_balance_wei);
    estimate = BigInt(preflight.deployment_gas_estimate);
    baseFee = BigInt(preflight.base_fee_per_gas_wei);
    priority = BigInt(preflight.observed_priority_fee_per_gas_wei);
  } catch {
    return { ok: false, reason: "fresh_execution_preflight_numeric_invalid" };
  }

  if (
    balance < MIN_DEPLOYER_BALANCE_WEI ||
    estimate <= 0n ||
    estimate > BigInt(EXPECTED.signed_gas_limit) ||
    priority > BigInt(EXPECTED.signed_max_priority_fee_per_gas_wei) ||
    2n * baseFee + priority > BigInt(EXPECTED.signed_max_fee_per_gas_wei)
  ) {
    return { ok: false, reason: "fresh_execution_preflight_envelope_invalid" };
  }

  const observedMs = Date.parse(String(preflight.observed_at_utc || ""));
  if (
    !Number.isSafeInteger(nowMs) ||
    nowMs <= 0 ||
    !Number.isFinite(observedMs) ||
    observedMs > nowMs + 5000 ||
    nowMs - observedMs > MAX_PREFLIGHT_AGE_MS
  ) {
    return { ok: false, reason: "fresh_execution_preflight_stale_or_clock_invalid" };
  }

  const normalized = {
    broadcast_authorization_request_id:
      preflight.broadcast_authorization_request_id,
    signed_transaction_hash:
      preflight.signed_transaction_hash.toLowerCase(),
    signed_transaction_file_sha256:
      preflight.signed_transaction_file_sha256,
    signer_address:
      preflight.signer_address.toLowerCase(),
    chain_id:
      String(preflight.chain_id),
    observation_block_number:
      String(preflight.observation_block_number),
    observation_block_hash:
      String(preflight.observation_block_hash).toLowerCase(),
    observed_at_utc:
      new Date(observedMs).toISOString(),
    latest_nonce:
      String(preflight.latest_nonce),
    pending_nonce:
      String(preflight.pending_nonce),
    pending_transactions_present: false,
    deployer_balance_wei:
      String(preflight.deployer_balance_wei),
    predicted_contract_address:
      preflight.predicted_contract_address.toLowerCase(),
    predicted_contract_address_vacant: true,
    deployment_gas_estimate:
      String(preflight.deployment_gas_estimate),
    base_fee_per_gas_wei:
      String(preflight.base_fee_per_gas_wei),
    observed_priority_fee_per_gas_wei:
      String(preflight.observed_priority_fee_per_gas_wei),
    signed_transaction_seen_by_hash: false,
    signed_transaction_receipt_seen: false,
  };

  return {
    ok: true,
    normalized,
    preflight_id:
      "voidcrapx1_" + sha256(canonical(normalized)),
  };
}

export function consumeRoleAuthorityBroadcastAuthorizationWithClockV1(
  input,
  nowMs,
) {
  let authorization;
  try {
    authorization =
      verifyRoleAuthoritySingleTransactionBroadcastAuthorizationV1(
        input?.authorization,
      );
  } catch (error) {
    return held("broadcast_authorization_verification_failed", {
      error_class: String(error?.message || "Error"),
    });
  }

  const preflight = verifyFreshExecutionPreflight(input?.fresh_preflight, nowMs);
  if (!preflight.ok) return held(preflight.reason, {
    authorization_id: authorization.authorization_id,
  });

  const root = validateStateRoot(input?.state_dir);
  if (!root.ok) return held(root.reason, {
    authorization_id: authorization.authorization_id,
    fresh_execution_preflight_id: preflight.preflight_id,
  });

  let consumedDirectory;
  try {
    consumedDirectory = ensureConsumedDirectory(root.realpath);
  } catch {
    return held("consumption_store_prepare_failed", {
      authorization_id: authorization.authorization_id,
      fresh_execution_preflight_id: preflight.preflight_id,
      state_store_realpath_sha256: root.realpath_sha256,
    });
  }

  const material = {
    marker: MARKER,
    version: 1,
    status: "broadcast_authorization_consumed_before_broadcaster_access",
    authorization_id: authorization.authorization_id,
    broadcast_authorization_request_id:
      authorization.broadcast_authorization_request_id,
    fresh_execution_preflight_id:
      preflight.preflight_id,
    signed_transaction_hash:
      authorization.signed_transaction_hash,
    signed_transaction_file_sha256:
      authorization.signed_transaction_file_sha256,
    signer_address:
      authorization.signer_address,
    chain_id:
      authorization.chain_id,
    nonce:
      authorization.nonce,
    transaction_value_wei:
      authorization.transaction_value_wei,
    predicted_contract_address:
      authorization.predicted_contract_address,
    consumed_at_utc:
      new Date(nowMs).toISOString(),
    state_store_realpath_sha256:
      root.realpath_sha256,
    consumption: {
      single_use: true,
      authorization_consumed: true,
      immutable_consumption_record: true,
      replay_rejected_within_exact_state_store: true,
      replay_prevention_scope: "exact_state_store_realpath",
      global_replay_prevention_claimed: false,
      canonical_state_store_runtime_binding_required: true,
      fresh_execution_preflight_bound: true,
      consumption_precedes_any_broadcaster_access: true,
      exact_signed_transaction_hash_bound: true,
      exact_signed_transaction_file_sha256_bound: true,
      one_submission_attempt_only: true,
      replacement_transaction_authorized: false,
      automatic_retry_authorized: false,
    },
    authority: {
      filesystem_mutation_performed: true,
      raw_signed_transaction_accessed: false,
      private_key_accessed: false,
      wallet_or_signer_accessed: false,
      broadcaster_access_performed: false,
      rpc_call_performed_by_consumption_gate: false,
      transaction_broadcast_performed: false,
      chain2050_write_performed: false,
      additional_funds_action_performed: false,
      automatic_retry_performed: false,
    },
    next_gate:
      "exact_broadcaster_access_and_single_submission_from_consumed_authorization_v1",
  };

  const record = {
    ...material,
    broadcast_consumption_record_id:
      "voidcrabc1_" + sha256(canonical(material)),
  };

  const finalFile = path.join(
    consumedDirectory,
    authorization.authorization_id + ".json",
  );

  let publication;
  try {
    publication = atomicCreate(finalFile, record);
  } catch {
    return held("consumption_record_publication_failed", {
      authorization_id: authorization.authorization_id,
      fresh_execution_preflight_id: preflight.preflight_id,
      state_store_realpath_sha256: root.realpath_sha256,
    });
  }

  if (publication === "exists") {
    return held("broadcast_authorization_already_consumed", {
      authorization_id: authorization.authorization_id,
      fresh_execution_preflight_id: preflight.preflight_id,
      state_store_realpath_sha256: root.realpath_sha256,
    });
  }

  const stat = fs.lstatSync(finalFile);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o777) !== 0o600
  ) {
    throw new Error("published_consumption_record_invalid");
  }

  return Object.freeze({
    ok: true,
    ...record,
    authorization_consumed: true,
    raw_signed_transaction_accessed: false,
    broadcaster_access_performed: false,
    rpc_call_performed: false,
    transaction_broadcast_performed: false,
    chain2050_write_performed: false,
  });
}
