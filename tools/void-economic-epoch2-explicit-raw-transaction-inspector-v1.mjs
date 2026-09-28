#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Transaction, getAddress } from "ethers";

export const VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1 =
  "VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1";
export const VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1 =
  "inspectApprovedVoidSignedTransaction";

export const VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_operator_file_only: true,
    raw_signed_transaction_content_read: true,
    arbitrary_file_scan: false,
    credential_content_access: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    rpc_call: false,
    authoritative_chain2050_write: false,
    replay_gate_promotion: false,
    token_movement: false,
    funds_movement: false,
  });

const MAX_RAW_FILE_BYTES = 256 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024;
const REGISTRY_PATH =
  "ops/mainnet0/economic-epoch2-known-signed-transaction-lineages-v1.json";
const NONCE_PATH =
  "ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json";
const REGISTRY_GIT_BLOB_SHA1 =
  "f96d7d4d5857a33bc292dce677678db026aabf2f";
const NONCE_GIT_BLOB_SHA1 =
  "83191d30131a2c99ef0cf51e43d2954fc34ffd06";
const CHAIN_ID = 2050n;

export class VoidEconomicEpoch2ExplicitRawTransactionInspectorHoldV1
  extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2ExplicitRawTransactionInspectorHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2ExplicitRawTransactionInspectorHoldV1(
    reason,
    detail,
  );
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Text(value) {
  return sha256Bytes(Buffer.from(value, "utf8"));
}

function currentUid() {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

function assertNoSymlinkAncestors(target) {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  for (const segment of resolved.slice(parsed.root.length).split(path.sep)) {
    if (!segment) continue;
    cursor = path.join(cursor, segment);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch {
      hold("path_component_missing", { path: cursor });
    }
    if (stat.isSymbolicLink()) {
      hold("symlink_path_rejected", { path: cursor });
    }
  }
  return resolved;
}

function openNoSymlinkPathBoundToAncestors(filePath) {
  if (
    process.platform !== "linux" ||
    typeof fs.constants.O_NOFOLLOW !== "number" ||
    typeof fs.constants.O_DIRECTORY !== "number"
  ) {
    hold("descriptor_bound_path_walk_unavailable");
  }

  const parsed = path.parse(filePath);
  const segments = filePath
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  if (parsed.root !== path.sep || segments.length === 0) {
    hold("explicit_file_path_invalid");
  }

  let directoryFd = null;
  try {
    try {
      directoryFd = fs.openSync(
        parsed.root,
        fs.constants.O_RDONLY |
          fs.constants.O_DIRECTORY |
          fs.constants.O_NOFOLLOW,
      );
    } catch {
      hold("path_root_open_failed");
    }

    for (const segment of segments.slice(0, -1)) {
      const anchoredPath = `/proc/self/fd/${directoryFd}/${segment}`;
      let nextDirectoryFd = null;
      try {
        nextDirectoryFd = fs.openSync(
          anchoredPath,
          fs.constants.O_RDONLY |
            fs.constants.O_DIRECTORY |
            fs.constants.O_NOFOLLOW,
        );
        const stat = fs.fstatSync(nextDirectoryFd);
        if (!stat.isDirectory()) {
          hold("path_component_not_directory", { segment });
        }
      } catch (error) {
        if (
          error instanceof VoidEconomicEpoch2ExplicitRawTransactionInspectorHoldV1
        ) {
          throw error;
        }
        hold("symlink_or_invalid_path_component_rejected", {
          segment,
          code: error?.code ?? null,
        });
      }

      fs.closeSync(directoryFd);
      directoryFd = nextDirectoryFd;
    }

    const basename = segments.at(-1);
    const anchoredFilePath = `/proc/self/fd/${directoryFd}/${basename}`;
    try {
      return fs.openSync(
        anchoredFilePath,
        fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
      );
    } catch (error) {
      if (error?.code === "ELOOP") {
        hold("symlink_path_rejected", { path: filePath });
      }
      hold("explicit_file_open_failed", {
        path: filePath,
        code: error?.code ?? null,
      });
    }
  } finally {
    if (directoryFd !== null) {
      try {
        fs.closeSync(directoryFd);
      } catch {
        // The returned file descriptor, if any, is independent of this directory fd.
      }
    }
  }
}

function readBoundedRawSignedTransaction(file) {
  if (typeof file !== "string" || !path.isAbsolute(file)) {
    hold("explicit_file_must_be_absolute");
  }

  const filePath = path.resolve(file);

  let fd = null;
  let bytes;
  try {
    fd = openNoSymlinkPathBoundToAncestors(filePath);

    let before;
    try {
      before = fs.fstatSync(fd);
    } catch {
      hold("explicit_file_metadata_read_failed", { path: filePath });
    }

    if (!before.isFile()) {
      hold("explicit_file_not_direct_regular_file", { path: filePath });
    }
    const uid = currentUid();
    if (uid !== null && before.uid !== uid) {
      hold("explicit_file_owner_mismatch", { path: filePath });
    }
    if (before.size < 4 || before.size > MAX_RAW_FILE_BYTES) {
      hold("explicit_file_size_out_of_bounds", {
        path: filePath,
        size_bytes: before.size,
        maximum_bytes: MAX_RAW_FILE_BYTES,
      });
    }

    const buffer = Buffer.allocUnsafe(MAX_RAW_FILE_BYTES + 1);
    let total = 0;
    try {
      while (total < buffer.length) {
        const count = fs.readSync(
          fd,
          buffer,
          total,
          buffer.length - total,
          total,
        );
        if (count === 0) break;
        total += count;
      }
    } catch {
      hold("explicit_file_content_read_failed", { path: filePath });
    }
    if (total > MAX_RAW_FILE_BYTES) {
      hold("explicit_file_size_out_of_bounds", {
        path: filePath,
        size_bytes: total,
        maximum_bytes: MAX_RAW_FILE_BYTES,
      });
    }

    let after;
    try {
      after = fs.fstatSync(fd);
    } catch {
      hold("explicit_file_postread_metadata_failed", { path: filePath });
    }
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      total !== before.size
    ) {
      hold("explicit_file_changed_during_read", { path: filePath });
    }

    bytes = Buffer.from(buffer.subarray(0, total));
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // Closing the already-read descriptor cannot upgrade evidence.
      }
    }
  }

  const text = bytes.toString("utf8").trim();
  if (text.length < 4 || text.length > MAX_RAW_FILE_BYTES * 2 + 2) {
    hold("raw_transaction_text_length_invalid");
  }
  if (!/^0x[0-9a-fA-F]+$/.test(text) || (text.length - 2) % 2 !== 0) {
    hold("raw_transaction_encoding_invalid");
  }

  return Object.freeze({
    file_path: filePath,
    file_path_sha256: sha256Text(filePath),
    file_basename: path.basename(filePath),
    file_size_bytes: bytes.length,
    file_sha256: sha256Bytes(bytes),
    raw_transaction: text,
  });
}

function parseCanonicalData(registry, nonceCandidate) {
  if (
    !registry ||
    registry.marker !==
      "VOID_ECONOMIC_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1" ||
    registry.version !== 1 ||
    !Array.isArray(registry.lineages) ||
    registry.interpretation?.pending_legacy_signed_transaction_census_complete !==
      false
  ) {
    hold("known_lineage_registry_invalid");
  }
  if (
    !nonceCandidate ||
    nonceCandidate.marker !==
      "VOID_ECONOMIC_EPOCH2_ACCOUNT_NONCE_CONTINUITY_CANDIDATE_V1" ||
    nonceCandidate.version !== 1 ||
    !Array.isArray(nonceCandidate.accounts)
  ) {
    hold("frozen_nonce_candidate_invalid");
  }

  const byHash = new Map();
  for (const row of registry.lineages) {
    const hash = String(row?.signed_transaction_hash || "").toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(hash)) {
      hold("known_lineage_hash_invalid");
    }
    if (byHash.has(hash)) hold("known_lineage_hash_duplicate");
    byHash.set(hash, row);
  }

  const nonceByAddress = new Map();
  for (const row of nonceCandidate.accounts) {
    const address = String(row?.address || "").toLowerCase();
    const nonce = String(row?.frozen_final_nonce ?? "");
    if (
      !/^0x[0-9a-f]{40}$/.test(address) ||
      !/^(?:0|[1-9][0-9]*)$/.test(nonce) ||
      BigInt(nonce) <= 0n
    ) {
      hold("frozen_nonce_entry_invalid");
    }
    if (nonceByAddress.has(address)) hold("frozen_nonce_address_duplicate");
    nonceByAddress.set(address, BigInt(nonce));
  }

  return Object.freeze({ byHash, nonceByAddress });
}

export function inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
  rawTransaction,
  registry,
  nonceCandidate,
}) {
  if (
    typeof rawTransaction !== "string" ||
    rawTransaction.length < 4 ||
    rawTransaction.length > MAX_RAW_FILE_BYTES * 2 + 2 ||
    !/^0x[0-9a-fA-F]+$/.test(rawTransaction) ||
    (rawTransaction.length - 2) % 2 !== 0
  ) {
    hold("raw_transaction_encoding_invalid");
  }

  let transaction;
  try {
    transaction = Transaction.from(rawTransaction);
  } catch {
    hold("raw_transaction_decode_failed");
  }
  if (!transaction.isSigned()) hold("raw_transaction_signature_required");

  let signer;
  try {
    signer = getAddress(transaction.from).toLowerCase();
  } catch {
    hold("raw_transaction_signer_recovery_failed");
  }

  const chainId = BigInt(transaction.chainId);
  if (chainId !== CHAIN_ID) {
    hold("raw_transaction_chain_id_mismatch", {
      observed_chain_id: chainId.toString(),
      required_chain_id: CHAIN_ID.toString(),
    });
  }

  const hash = String(transaction.hash || "").toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(hash)) {
    hold("raw_transaction_hash_invalid");
  }
  if (!Number.isSafeInteger(transaction.nonce) || transaction.nonce < 0) {
    hold("raw_transaction_nonce_invalid");
  }

  const canonical = parseCanonicalData(registry, nonceCandidate);
  const known = canonical.byHash.get(hash) || null;
  const frozen = canonical.nonceByAddress.get(signer) ?? null;
  const nonce = BigInt(transaction.nonce);

  let replayStalenessProven = false;
  let classification;
  let basis;

  if (known?.stale_under_exact_nonce_continuity === true) {
    replayStalenessProven = true;
    classification = "KNOWN_LINEAGE_STALE";
    basis = "canonical_lineage_registry";
  } else if (frozen !== null && nonce < frozen) {
    replayStalenessProven = true;
    classification = known
      ? "KNOWN_LINEAGE_STALE_BY_RECOVERED_NONCE"
      : "UNKNOWN_HASH_STALE_BY_RECOVERED_NONCE";
    basis = "recovered_signer_nonce_below_frozen_final_nonce";
  } else if (
    known?.historical_disposition === "SUPERSEDED_BY_RECOVERY" &&
    known?.replay_staleness_proven !== true
  ) {
    classification = "KNOWN_SUPERSEDED_REPLAY_STALENESS_UNPROVEN";
    basis = "canonical_lineage_superseded_but_nonce_staleness_unproven";
  } else if (known) {
    classification = "KNOWN_LINEAGE_REPLAY_REVIEW_REQUIRED";
    basis = "canonical_lineage_staleness_unproven";
  } else {
    classification = "UNKNOWN_HASH_REPLAY_RELEVANT";
    basis =
      frozen === null
        ? "signer_not_in_nonzero_frozen_nonce_census"
        : "transaction_nonce_not_below_frozen_final_nonce";
  }

  if (known?.signer_address !== null && known?.signer_address !== undefined) {
    if (String(known.signer_address).toLowerCase() !== signer) {
      hold("known_lineage_signer_mismatch");
    }
  }
  if (
    known?.transaction_nonce !== null &&
    known?.transaction_nonce !== undefined
  ) {
    if (BigInt(String(known.transaction_nonce)) !== nonce) {
      hold("known_lineage_nonce_mismatch");
    }
  }

  return Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1,
    version: 1,
    status: classification,
    chain_id: "2050",
    transaction_hash: hash,
    signer_address: signer,
    transaction_nonce: nonce.toString(),
    transaction_type: transaction.type,
    frozen_final_nonce:
      frozen === null ? null : frozen.toString(),
    signer_present_in_nonzero_frozen_nonce_census: frozen !== null,
    known_repository_lineage: known !== null,
    known_repository_lineage_id: known?.id ?? null,
    known_repository_historical_disposition:
      known?.historical_disposition ?? null,
    replay_staleness_proven: replayStalenessProven,
    replay_staleness_basis: basis,
    requires_operator_followup: !replayStalenessProven,
    pending_legacy_signed_transaction_census_complete: false,
    privileged_signer_nonce_or_key_replay_fence_proven: false,
    cross_epoch_replay_protection_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
    authority:
      VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_AUTHORITY_V1,
  });
}

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
}

function readCanonicalRepoJson(relativePath, expectedGitBlobSha1) {
  let bytes;
  try {
    const stat = fs.lstatSync(relativePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      hold("canonical_repository_evidence_not_direct_file", {
        path: relativePath,
      });
    }
    bytes = fs.readFileSync(relativePath);
  } catch (error) {
    if (
      error instanceof VoidEconomicEpoch2ExplicitRawTransactionInspectorHoldV1
    ) {
      throw error;
    }
    hold("canonical_repository_evidence_read_failed", {
      path: relativePath,
    });
  }

  const observedGitBlobSha1 = gitBlobSha1(bytes);
  if (observedGitBlobSha1 !== expectedGitBlobSha1) {
    hold("canonical_repository_evidence_identity_mismatch", {
      path: relativePath,
      expected_git_blob_sha1: expectedGitBlobSha1,
      observed_git_blob_sha1: observedGitBlobSha1,
    });
  }

  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    hold("canonical_repository_evidence_json_invalid", {
      path: relativePath,
    });
  }
}

function atomicPrivateCreate(outputPath, value) {
  if (typeof outputPath !== "string" || !path.isAbsolute(outputPath)) {
    hold("output_path_must_be_absolute");
  }
  const resolved = path.resolve(outputPath);
  const parent = path.dirname(resolved);
  assertNoSymlinkAncestors(parent);
  let parentStat;
  try {
    parentStat = fs.lstatSync(parent);
  } catch {
    hold("output_parent_metadata_read_failed");
  }
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    hold("output_parent_invalid");
  }
  const uid = currentUid();
  if (uid !== null && parentStat.uid !== uid) hold("output_parent_owner_mismatch");

  const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
  if (bytes.length > MAX_OUTPUT_BYTES) hold("output_receipt_too_large");

  const temporary = path.join(
    parent,
    "." + path.basename(resolved) +
      ".tmp-" + process.pid + "-" + crypto.randomBytes(8).toString("hex"),
  );

  let fd = null;
  try {
    fd = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } catch {
    hold("output_receipt_write_failed");
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }

  try {
    try {
      fs.linkSync(temporary, resolved);
    } catch (error) {
      if (error?.code === "EEXIST") {
        hold("output_receipt_already_exists", { path: resolved });
      }
      hold("output_receipt_publish_failed");
    }
    const dirFd = fs.openSync(parent, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
    try {
      fs.fsyncSync(dirFd);
    } finally {
      fs.closeSync(dirFd);
    }
  } finally {
    try {
      fs.unlinkSync(temporary);
    } catch (error) {
      // The create-once receipt is already durable at this point. Temporary-file
      // cleanup failure must not delete, rewrite, or invalidate that evidence.
      void error;
    }
  }
  return resolved;
}

function parseArgs(argv) {
  const out = {
    file: "",
    receipt: "",
    apply: false,
    confirmation: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--file") {
      if (!argv[index + 1]) hold("file_value_missing");
      out.file = argv[++index];
    } else if (key === "--out") {
      if (!argv[index + 1]) hold("out_value_missing");
      out.receipt = argv[++index];
    } else if (key === "--apply") {
      out.apply = true;
    } else if (key === "--confirmation") {
      if (!argv[index + 1]) hold("confirmation_value_missing");
      out.confirmation = argv[++index];
    } else if (key === "--help") {
      out.help = true;
    } else {
      hold("unknown_argument", { key });
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.apply) {
    process.stdout.write(
      JSON.stringify(
        {
          marker: VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1,
          status: "PLAN_READY",
          required_confirmation:
            VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1,
          explicit_operator_file_required: true,
          arbitrary_file_scan: false,
          raw_signed_transaction_content_read_on_apply: true,
          transaction_submission: false,
          pending_legacy_signed_transaction_census_complete: false,
          authority:
            VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_AUTHORITY_V1,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1
  ) {
    hold("explicit_confirmation_required");
  }
  if (!args.file) hold("explicit_file_required");
  if (!args.receipt) hold("output_path_required");

  const selected = readBoundedRawSignedTransaction(args.file);
  const registry = readCanonicalRepoJson(
    REGISTRY_PATH,
    REGISTRY_GIT_BLOB_SHA1,
  );
  const nonceCandidate = readCanonicalRepoJson(
    NONCE_PATH,
    NONCE_GIT_BLOB_SHA1,
  );
  const inspected = inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
    rawTransaction: selected.raw_transaction,
    registry,
    nonceCandidate,
  });

  const receipt = Object.freeze({
    ...inspected,
    inspected_file: Object.freeze({
      path_sha256: selected.file_path_sha256,
      basename: selected.file_basename,
      size_bytes: selected.file_size_bytes,
      file_sha256: selected.file_sha256,
      raw_transaction_persisted: false,
    }),
  });

  const output = atomicPrivateCreate(args.receipt, receipt);
  process.stdout.write(
    JSON.stringify(
      {
        marker: receipt.marker,
        status: receipt.status,
        output_path: output,
        transaction_hash: receipt.transaction_hash,
        signer_address: receipt.signer_address,
        transaction_nonce: receipt.transaction_nonce,
        frozen_final_nonce: receipt.frozen_final_nonce,
        known_repository_lineage: receipt.known_repository_lineage,
        known_repository_lineage_id: receipt.known_repository_lineage_id,
        replay_staleness_proven: receipt.replay_staleness_proven,
        requires_operator_followup: receipt.requires_operator_followup,
        raw_transaction_persisted: false,
        transaction_submission: false,
        pending_legacy_signed_transaction_census_complete: false,
      },
      null,
      2,
    ) + "\n",
  );
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (invoked) {
  main().catch((error) => {
    const reason =
      error instanceof VoidEconomicEpoch2ExplicitRawTransactionInspectorHoldV1
        ? error.reason
        : String(error?.message || error);
    const detail =
      error instanceof VoidEconomicEpoch2ExplicitRawTransactionInspectorHoldV1 &&
      error.detail !== null
        ? " detail=" + JSON.stringify(error.detail)
        : "";
    process.stderr.write(
      VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1 +
        "_HOLD reason=" + reason + detail + "\n",
    );
    process.exitCode = 2;
  });
}
