import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_EXACT_SINGLE_SUBMISSION_V1";

const MAX_RECORD_BYTES = 64 * 1024;

const LIVE_PROFILE = Object.freeze({
  proof_only: false,
  authorization_id:
    "voidcraba1_66779fab9c8657d7f038585525dfc2ac688adfe33cf10a5d5827abb140e04c85",
  broadcast_authorization_request_id:
    "voidcrabr1_661c57638e7c9904df997da50841811f509239495891a965aebd46fece405a51",
  signed_transaction_file_sha256:
    "96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d",
  signed_transaction_hash:
    "0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4",
  predicted_contract_address:
    "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  chain_id: "2050",
  nonce: "0",
});

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" +
    Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}";
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Text(value) {
  return sha256Bytes(Buffer.from(value, "utf8"));
}

function held(reason, detail = {}) {
  return {
    ok: false,
    marker: MARKER,
    version: 1,
    status: "held",
    reason,
    transaction_broadcast_performed: false,
    automatic_retry_performed: false,
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

function validatePrivateDirectory(raw) {
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
    return {
      ok: true,
      realpath: real,
      realpath_sha256: sha256Text(real),
    };
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

function ensurePrivateDirectory(parent, name) {
  const directory = path.join(parent, name);
  try {
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("private_child_not_directory");
    }
    if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
      throw new Error("private_child_owner_mismatch");
    }
    if ((stat.mode & 0o777) !== 0o700) {
      throw new Error("private_child_mode_must_be_0700");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    fs.mkdirSync(directory, { mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    fsyncDirectory(parent);
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

function readPrivateJson(file) {
  assertNoSymlinkAncestors(file);
  const stat = fs.lstatSync(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o777) !== 0o600 ||
    stat.size < 2 ||
    stat.size > MAX_RECORD_BYTES
  ) {
    throw new Error("private_record_invalid");
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function verifyConsumptionRecord(record, profile, stateRootSha) {
  if (
    !record ||
    record.marker !==
      "VOID_CHAIN2050_ROLE_AUTHORITY_BROADCAST_AUTHORIZATION_CONSUMPTION_V1" ||
    record.version !== 1 ||
    record.status !==
      "broadcast_authorization_consumed_before_broadcaster_access" ||
    record.authorization_id !== profile.authorization_id ||
    record.broadcast_authorization_request_id !==
      profile.broadcast_authorization_request_id ||
    String(record.signed_transaction_hash).toLowerCase() !==
      profile.signed_transaction_hash ||
    record.signed_transaction_file_sha256 !==
      profile.signed_transaction_file_sha256 ||
    String(record.chain_id) !== profile.chain_id ||
    String(record.nonce) !== profile.nonce ||
    String(record.predicted_contract_address).toLowerCase() !==
      profile.predicted_contract_address ||
    record.state_store_realpath_sha256 !== stateRootSha ||
    record.consumption?.single_use !== true ||
    record.consumption?.authorization_consumed !== true ||
    record.consumption?.immutable_consumption_record !== true ||
    record.consumption?.replay_rejected_within_exact_state_store !== true ||
    record.consumption?.canonical_state_store_runtime_binding_required !== true ||
    record.consumption?.fresh_execution_preflight_bound !== true ||
    record.consumption?.consumption_precedes_any_broadcaster_access !== true ||
    record.consumption?.one_submission_attempt_only !== true ||
    record.consumption?.replacement_transaction_authorized !== false ||
    record.consumption?.automatic_retry_authorized !== false
  ) {
    throw new Error("consumption_record_binding_invalid");
  }

  const material = { ...record };
  delete material.broadcast_consumption_record_id;
  const expectedId = "voidcrabc1_" + sha256Text(canonical(material));
  if (record.broadcast_consumption_record_id !== expectedId) {
    throw new Error("consumption_record_id_invalid");
  }
  return expectedId;
}

function normalizeRpcError(error) {
  return {
    error_class:
      /^[A-Za-z0-9._:-]{1,80}$/.test(String(error?.name || "Error"))
        ? String(error?.name || "Error")
        : "Error",
    rpc_code:
      Number.isInteger(error?.code) ? error.code : null,
  };
}

async function reconcile(rpc, profile) {
  const [transaction, receipt, latestNonce, pendingNonce, code] =
    await Promise.all([
      rpc("eth_getTransactionByHash", [profile.signed_transaction_hash]),
      rpc("eth_getTransactionReceipt", [profile.signed_transaction_hash]),
      rpc("eth_getTransactionCount", [
        "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
        "latest",
      ]),
      rpc("eth_getTransactionCount", [
        "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
        "pending",
      ]),
      rpc("eth_getCode", [profile.predicted_contract_address, "latest"]),
    ]);

  return {
    transaction_seen: transaction !== null,
    receipt_seen: receipt !== null,
    receipt_status:
      receipt?.status === undefined || receipt?.status === null
        ? null
        : String(receipt.status).toLowerCase(),
    receipt_contract_address:
      receipt?.contractAddress
        ? String(receipt.contractAddress).toLowerCase()
        : null,
    latest_nonce_hex: String(latestNonce),
    pending_nonce_hex: String(pendingNonce),
    predicted_contract_code_present:
      typeof code === "string" && !/^0x0*$/.test(code.toLowerCase()),
  };
}

async function submitCore({
  profile,
  state_dir,
  signed_transaction_file,
  rpc,
  now = () => new Date(),
}) {
  const root = validatePrivateDirectory(state_dir);
  if (!root.ok) return held(root.reason);

  const consumedFile = path.join(
    root.realpath,
    "broadcast-consumed",
    profile.authorization_id + ".json",
  );

  let consumption;
  try {
    consumption = readPrivateJson(consumedFile);
    verifyConsumptionRecord(
      consumption,
      profile,
      root.realpath_sha256,
    );
  } catch (error) {
    return held("verified_consumption_record_required", {
      error_class: String(error?.message || "Error"),
    });
  }

  let signedBytes;
  try {
    const stat = fs.lstatSync(signed_transaction_file);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      return held("signed_transaction_file_invalid");
    }
    signedBytes = fs.readFileSync(signed_transaction_file);
  } catch {
    return held("signed_transaction_file_unreadable");
  }

  if (sha256Bytes(signedBytes) !== profile.signed_transaction_file_sha256) {
    return held("signed_transaction_file_sha256_mismatch");
  }

  const raw = signedBytes.toString("utf8").trim().toLowerCase();
  if (!/^0x02[0-9a-f]+$/.test(raw)) {
    return held("signed_transaction_encoding_invalid");
  }

  const attempts = ensurePrivateDirectory(root.realpath, "broadcast-attempts");
  const intentFile = path.join(
    attempts,
    profile.authorization_id + ".intent.json",
  );
  const resultFile = path.join(
    attempts,
    profile.authorization_id + ".result.json",
  );

  const intentMaterial = {
    marker: MARKER,
    version: 1,
    status: "single_submission_intent_durable_before_rpc",
    authorization_id: profile.authorization_id,
    broadcast_consumption_record_id:
      consumption.broadcast_consumption_record_id,
    signed_transaction_file_sha256:
      profile.signed_transaction_file_sha256,
    signed_transaction_hash:
      profile.signed_transaction_hash,
    predicted_contract_address:
      profile.predicted_contract_address,
    one_submission_attempt_only: true,
    automatic_retry_authorized: false,
    created_at_utc: now().toISOString(),
  };
  const intent = {
    ...intentMaterial,
    submission_intent_id:
      "voidcrasi1_" + sha256Text(canonical(intentMaterial)),
  };

  let intentPublished;
  try {
    intentPublished = atomicCreate(intentFile, intent);
  } catch {
    return held("submission_intent_publication_failed");
  }
  if (intentPublished === "exists") {
    return held("submission_attempt_already_recorded");
  }

  let sendResult = null;
  let sendError = null;
  let sendCount = 0;
  try {
    sendCount += 1;
    if (sendCount !== 1) throw new Error("send_count_invariant");
    sendResult = await rpc("eth_sendRawTransaction", [raw]);
  } catch (error) {
    sendError = normalizeRpcError(error);
  }

  let reconciliation = null;
  let reconciliationError = null;
  try {
    reconciliation = await reconcile(rpc, profile);
  } catch (error) {
    reconciliationError = normalizeRpcError(error);
  }

  let classification;
  if (
    reconciliation?.receipt_seen === true &&
    reconciliation.receipt_status === "0x1" &&
    reconciliation.receipt_contract_address ===
      profile.predicted_contract_address
  ) {
    classification =
      "RECEIPT_SUCCESS_RUNTIME_BYTECODE_VERIFICATION_REQUIRED";
  } else if (
    reconciliation?.receipt_seen === true &&
    reconciliation.receipt_status !== "0x1"
  ) {
    classification =
      "RECEIPT_FAILURE_AUTHORIZATION_CONSUMED_NO_RETRY";
  } else if (reconciliation?.transaction_seen === true) {
    classification =
      "TRANSACTION_SEEN_RECEIPT_PENDING_NO_RETRY_RECONCILE";
  } else if (sendError !== null) {
    classification =
      "SEND_ERROR_AMBIGUOUS_OR_REJECTED_AUTHORIZATION_CONSUMED_NO_RETRY";
  } else {
    classification =
      "SUBMISSION_RETURNED_NO_CONFIRMED_RECEIPT_AUTHORIZATION_CONSUMED_NO_RETRY";
  }

  const resultMaterial = {
    marker: MARKER,
    version: 1,
    status: "single_submission_attempt_terminal_record",
    authorization_id: profile.authorization_id,
    submission_intent_id: intent.submission_intent_id,
    signed_transaction_hash:
      profile.signed_transaction_hash,
    rpc_send_invocation_count: sendCount,
    rpc_send_result:
      typeof sendResult === "string" ? sendResult.toLowerCase() : null,
    rpc_send_result_matches_expected_hash:
      typeof sendResult === "string" &&
      sendResult.toLowerCase() === profile.signed_transaction_hash,
    rpc_send_error: sendError,
    immediate_reconciliation: reconciliation,
    reconciliation_error: reconciliationError,
    classification,
    automatic_retry_performed: false,
    replacement_transaction_created: false,
    finished_at_utc: now().toISOString(),
  };
  const result = {
    ...resultMaterial,
    submission_result_id:
      "voidcrasub1_" + sha256Text(canonical(resultMaterial)),
  };

  try {
    const published = atomicCreate(resultFile, result);
    if (published !== "created") {
      throw new Error("result_exists");
    }
  } catch {
    return {
      ok: false,
      ...result,
      reason: "submission_result_publication_failed_after_attempt",
      transaction_broadcast_performed: sendCount === 1,
    };
  }

  return {
    ok: true,
    ...result,
    transaction_broadcast_performed: sendCount === 1,
  };
}

export async function submitRoleAuthorityExactSingleTransactionV1(input) {
  return submitCore({
    profile: LIVE_PROFILE,
    ...input,
  });
}

export async function runRoleAuthorityExactSingleSubmissionSelfTestV1() {
  const signed = Buffer.from("0x02deadbeef\n", "utf8");
  const profile = {
    proof_only: true,
    authorization_id:
      "voidcraba1_" + "1".repeat(64),
    broadcast_authorization_request_id:
      "voidcrabr1_" + "2".repeat(64),
    signed_transaction_file_sha256:
      sha256Bytes(signed),
    signed_transaction_hash:
      "0x" + "3".repeat(64),
    predicted_contract_address:
      "0x" + "4".repeat(40),
    chain_id: "2050",
    nonce: "0",
  };

  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-role-authority-single-submit-proof-"),
  );
  fs.chmodSync(root, 0o700);
  const signedFile = path.join(root, "signed.txt");
  fs.writeFileSync(signedFile, signed, { mode: 0o600 });

  const consumed = ensurePrivateDirectory(root, "broadcast-consumed");
  const material = {
    marker:
      "VOID_CHAIN2050_ROLE_AUTHORITY_BROADCAST_AUTHORIZATION_CONSUMPTION_V1",
    version: 1,
    status:
      "broadcast_authorization_consumed_before_broadcaster_access",
    authorization_id: profile.authorization_id,
    broadcast_authorization_request_id:
      profile.broadcast_authorization_request_id,
    fresh_execution_preflight_id:
      "voidcrapx1_" + "5".repeat(64),
    signed_transaction_hash:
      profile.signed_transaction_hash,
    signed_transaction_file_sha256:
      profile.signed_transaction_file_sha256,
    signer_address:
      "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
    chain_id: "2050",
    nonce: "0",
    transaction_value_wei: "0",
    predicted_contract_address:
      profile.predicted_contract_address,
    consumed_at_utc:
      "2026-09-22T22:30:00.000Z",
    state_store_realpath_sha256:
      sha256Text(fs.realpathSync(root)),
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
      automatic_retry_authorized: false
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
      automatic_retry_performed: false
    },
    next_gate:
      "exact_broadcaster_access_and_single_submission_from_consumed_authorization_v1"
  };
  const consumptionRecord = {
    ...material,
    broadcast_consumption_record_id:
      "voidcrabc1_" + sha256Text(canonical(material)),
  };
  const consumedFile = path.join(
    consumed,
    profile.authorization_id + ".json",
  );
  fs.writeFileSync(
    consumedFile,
    canonical(consumptionRecord) + "\n",
    { mode: 0o600 },
  );

  let sendCount = 0;
  const rpc = async (method) => {
    if (method === "eth_sendRawTransaction") {
      sendCount += 1;
      return profile.signed_transaction_hash;
    }
    if (method === "eth_getTransactionByHash") {
      return { hash: profile.signed_transaction_hash };
    }
    if (method === "eth_getTransactionReceipt") {
      return {
        status: "0x1",
        contractAddress: profile.predicted_contract_address,
      };
    }
    if (method === "eth_getTransactionCount") return "0x1";
    if (method === "eth_getCode") return "0x6000";
    throw new Error("unexpected_method");
  };

  try {
    const first = await submitCore({
      profile,
      state_dir: root,
      signed_transaction_file: signedFile,
      rpc,
      now: () => new Date("2026-09-22T22:31:00.000Z"),
    });
    if (
      first.ok !== true ||
      first.rpc_send_invocation_count !== 1 ||
      first.classification !==
        "RECEIPT_SUCCESS_RUNTIME_BYTECODE_VERIFICATION_REQUIRED" ||
      sendCount !== 1
    ) {
      throw new Error("self_test_first_attempt_failed");
    }

    const second = await submitCore({
      profile,
      state_dir: root,
      signed_transaction_file: signedFile,
      rpc,
      now: () => new Date("2026-09-22T22:32:00.000Z"),
    });
    if (
      second.ok !== false ||
      second.reason !== "submission_attempt_already_recorded" ||
      sendCount !== 1
    ) {
      throw new Error("self_test_duplicate_not_blocked");
    }

    return Object.freeze({
      ok: true,
      first,
      duplicate: second,
      send_count_after_duplicate: sendCount,
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
