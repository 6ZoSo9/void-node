import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1,
} from "./void-participant-postpurchase-production-runtime-binding-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "./void-coupled-economic-successor-gate-v1.mjs";

export const VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_V1";

export const VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1 =
  Object.freeze({
    source_promotion_artifact_only: true,
    canonical_candidate_read: true,
    successor_candidate_read: true,
    runtime_binding_receipt_read: true,
    create_only_private_output: true,
    external_network_request: false,
    raw_public_rpc: false,
    canonical_candidate_file_update: false,
    runtime_mutation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    credential_content_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    inventory_funding: false,
    work_credit_mutation: false,
    validator_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const CANDIDATE_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR_REL =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const CANDIDATE_PATH = path.join(REPO_ROOT, CANDIDATE_REL);
const SUCCESSOR_PATH = path.join(REPO_ROOT, SUCCESSOR_REL);

const MAX_RUNTIME_BINDING_BYTES = 1024 * 1024;
const MAX_CANDIDATE_BYTES = 2 * 1024 * 1024;
const HEX64 = /^[0-9a-f]{64}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const EVIDENCE_ID = /^sha256:[0-9a-f]{64}$/u;
const IMPORT_ID = /^voidppfri1_[0-9a-f]{64}$/u;
const FINALITY_BINDING_ID = /^voidppfrb1_[0-9a-f]{64}$/u;
const RUNTIME_BINDING_ID = /^voidpprtb1_[0-9a-f]{64}$/u;
const EXPECTED_GENESIS_BLOCK_HASH =
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const EXPECTED_GENESIS_STATE_ROOT =
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";
const CANONICAL_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const RUNTIME_MARKER =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1";
const PARTICIPANT_MISSING_GATE =
  "participant_post_purchase_voidtoken_control_required";

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return (
    value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactObject(value, keys, label) {
  if (!plain(value)) fail(label + "_invalid");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    fail(label + "_keys_mismatch");
  }
  return value;
}

function canonicalize(value) {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!plain(value)) fail("canonical_json_value_invalid");
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sameStamp(a, b) {
  return (
    a.dev === b.dev
    && a.ino === b.ino
    && a.size === b.size
    && a.mtimeNs === b.mtimeNs
    && a.ctimeNs === b.ctimeNs
  );
}

function readStableJsonFile(
  file,
  {
    label,
    maxBytes,
    expectedSha256 = null,
    requirePrivate = false,
    requireCollectorSerialization = false,
  },
) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
    || path.resolve(file) !== file
  ) {
    fail(label + "_path_must_be_absolute_canonical");
  }
  let real;
  try {
    real = fs.realpathSync.native(file);
  } catch {
    fail(label + "_path_unavailable");
  }
  if (real !== file) fail(label + "_path_alias_forbidden");

  const flags =
    fs.constants.O_RDONLY
    | Number(fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(file, flags);
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile()) fail(label + "_not_regular_file");
    if (
      before.size < 2n
      || before.size > BigInt(maxBytes)
      || before.size > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      fail(label + "_size_invalid");
    }
    if (
      requirePrivate
      && (Number(before.mode) & 0o077) !== 0
    ) {
      fail(label + "_must_be_private");
    }

    const size = Number(before.size);
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        size - offset,
        offset,
      );
      if (count <= 0) fail(label + "_short_read");
      offset += count;
    }
    const probe = Buffer.alloc(1);
    if (fs.readSync(fd, probe, 0, 1, size) !== 0) {
      fail(label + "_grew_during_read");
    }

    const after = fs.fstatSync(fd, { bigint: true });
    const pathAfter = fs.lstatSync(file, { bigint: true });
    if (
      pathAfter.isSymbolicLink()
      || !pathAfter.isFile()
      || !sameStamp(before, after)
      || !sameStamp(after, pathAfter)
      || fs.realpathSync.native(file) !== file
    ) {
      fail(label + "_changed_during_read");
    }

    const digest = sha256(bytes);
    if (
      expectedSha256 !== null
      && digest !== expectedSha256
    ) {
      fail(label + "_sha256_mismatch");
    }

    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      fail(label + "_utf8_invalid");
    }
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      fail(label + "_json_invalid");
    }
    if (
      requireCollectorSerialization
      && text !== JSON.stringify(value, null, 2) + "\n"
    ) {
      fail(label + "_serialization_not_canonical_collector_form");
    }
    return Object.freeze({ value, bytes, sha256: digest });
  } finally {
    fs.closeSync(fd);
  }
}

function exactUrlForReceipt(transactionHash) {
  return (
    VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1
    + "/public-node/economic/epoch2/receipt-v1?tx="
    + transactionHash
  );
}

function positiveUint(value, label) {
  if (typeof value !== "string" || !UINT.test(value)) {
    fail(label + "_invalid");
  }
  if (BigInt(value) <= 0n) fail(label + "_must_be_positive");
  return value;
}

function validateNormalizedReceipt(receipt) {
  exactObject(
    receipt,
    [
      "authority",
      "candidate_promotion_required",
      "coupled_candidate_updated",
      "finality",
      "funds_movement_authorized",
      "marker",
      "market_activation_authorized",
      "participant_control_finality_evidence_imported",
      "participant_post_purchase_voidtoken_control_ready",
      "participant_postpurchase_voidtoken_control_runtime_binding_source_ready",
      "production_runtime_binding_verified",
      "public_presale_activation_authorized",
      "runtime",
      "runtime_binding_id",
      "status",
      "version",
    ],
    "runtime_binding_receipt",
  );
  if (
    receipt.marker
      !== VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1
    || receipt.version !== 1
    || receipt.status
      !== "PRODUCTION_RUNTIME_FINALITY_BINDING_VERIFIED_SOURCE_PROMOTION_HOLD"
    || !RUNTIME_BINDING_ID.test(String(receipt.runtime_binding_id || ""))
    || receipt.production_runtime_binding_verified !== true
    || receipt.participant_control_finality_evidence_imported !== true
    || receipt
      .participant_postpurchase_voidtoken_control_runtime_binding_source_ready
      !== true
    || receipt.participant_post_purchase_voidtoken_control_ready !== false
    || receipt.coupled_candidate_updated !== false
    || receipt.candidate_promotion_required !== true
    || receipt.market_activation_authorized !== false
    || receipt.public_presale_activation_authorized !== false
    || receipt.funds_movement_authorized !== false
  ) {
    fail("runtime_binding_receipt_contract_invalid");
  }

  const finality = exactObject(
    receipt.finality,
    [
      "binding_id",
      "control_transfer_amount_atoms",
      "control_transfer_recipient",
      "delivered_token_amount_atoms",
      "import_id",
      "observed_control_confirmation_count",
      "observed_delivery_confirmation_count",
      "participant_address",
      "source_evidence_id",
    ],
    "runtime_binding_finality",
  );
  if (
    !IMPORT_ID.test(String(finality.import_id || ""))
    || !FINALITY_BINDING_ID.test(String(finality.binding_id || ""))
    || !EVIDENCE_ID.test(String(finality.source_evidence_id || ""))
    || !ADDRESS.test(String(finality.participant_address || ""))
    || !ADDRESS.test(String(finality.control_transfer_recipient || ""))
  ) {
    fail("runtime_binding_finality_identity_invalid");
  }
  const delivered = positiveUint(
    finality.delivered_token_amount_atoms,
    "runtime_binding_delivered_atoms",
  );
  const controlled = positiveUint(
    finality.control_transfer_amount_atoms,
    "runtime_binding_control_atoms",
  );
  if (BigInt(controlled) > BigInt(delivered)) {
    fail("runtime_binding_control_atoms_exceed_delivery");
  }
  positiveUint(
    String(finality.observed_delivery_confirmation_count || ""),
    "runtime_binding_delivery_confirmations",
  );
  positiveUint(
    String(finality.observed_control_confirmation_count || ""),
    "runtime_binding_control_confirmations",
  );

  const runtime = exactObject(
    receipt.runtime,
    [
      "chain_id",
      "control",
      "delivery",
      "execution_epoch",
      "external_public_receipt_route_verified",
      "public_origin",
      "raw_public_rpc_used",
      "status",
    ],
    "runtime_binding_runtime",
  );
  if (
    runtime.public_origin
      !== VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1
    || runtime.chain_id !== 2050
    || runtime.execution_epoch !== 2
    || runtime.external_public_receipt_route_verified !== true
    || runtime.raw_public_rpc_used !== false
  ) {
    fail("runtime_binding_runtime_contract_invalid");
  }

  const status = exactObject(
    runtime.status,
    [
      "artifact_sha256",
      "chain_id",
      "execution_epoch",
      "genesis_block_hash",
      "genesis_state_root",
      "status",
      "url",
    ],
    "runtime_binding_status",
  );
  if (
    status.url
      !== VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1
        + "/public-node/economic/epoch2/read-status-v1.json"
    || !HEX64.test(String(status.artifact_sha256 || ""))
    || status.status !== "INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY"
    || status.chain_id !== 2050
    || status.execution_epoch !== 2
    || status.genesis_block_hash !== EXPECTED_GENESIS_BLOCK_HASH
    || status.genesis_state_root !== EXPECTED_GENESIS_STATE_ROOT
  ) {
    fail("runtime_binding_status_contract_invalid");
  }

  const receiptKeys = [
    "artifact_sha256",
    "block_hash",
    "block_number",
    "exact_block_identity_revalidated",
    "exact_receipt_identity_revalidated",
    "receipt_from",
    "receipt_status",
    "receipt_to",
    "source_evidence_id",
    "state_root",
    "transaction_hash",
    "url",
  ];

  const delivery = exactObject(
    runtime.delivery,
    receiptKeys,
    "runtime_binding_delivery",
  );
  const control = exactObject(
    runtime.control,
    receiptKeys,
    "runtime_binding_control",
  );

  for (const [label, item] of [
    ["delivery", delivery],
    ["control", control],
  ]) {
    if (
      !HEX64.test(String(item.artifact_sha256 || ""))
      || !HASH.test(String(item.transaction_hash || ""))
      || !UINT.test(String(item.block_number || ""))
      || !HASH.test(String(item.block_hash || ""))
      || !HASH.test(String(item.state_root || ""))
      || item.receipt_status !== "0x1"
      || !ADDRESS.test(String(item.receipt_from || ""))
      || item.receipt_to !== CANONICAL_VOID_TOKEN
      || !EVIDENCE_ID.test(String(item.source_evidence_id || ""))
      || item.exact_receipt_identity_revalidated !== true
      || item.exact_block_identity_revalidated !== true
      || item.url !== exactUrlForReceipt(item.transaction_hash)
    ) {
      fail("runtime_binding_" + label + "_contract_invalid");
    }
  }
  if (delivery.receipt_from === control.receipt_from) {
    // A participant may also be the fulfillment wallet in theory. Do not
    // reject equality; the branch exists only to keep this comparison explicit.
  }
  if (control.receipt_from !== finality.participant_address) {
    fail("runtime_binding_control_participant_mismatch");
  }
  if (BigInt(control.block_number) < BigInt(delivery.block_number)) {
    fail("runtime_binding_control_before_delivery");
  }

  exactObject(
    receipt.authority,
    Object.keys(
      VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1,
    ),
    "runtime_binding_authority",
  );
  if (
    canonicalJson(receipt.authority)
      !== canonicalJson(
        VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1,
      )
  ) {
    fail("runtime_binding_authority_mismatch");
  }

  const identity = Object.freeze({
    finality_import_id: finality.import_id,
    finality_binding_id: finality.binding_id,
    source_finality_evidence_id: finality.source_evidence_id,
    public_origin:
      VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1,
    chain_id: 2050,
    execution_epoch: 2,
    status_artifact_sha256: status.artifact_sha256,
    delivery_artifact_sha256: delivery.artifact_sha256,
    control_artifact_sha256: control.artifact_sha256,
    delivery_source_evidence_id: delivery.source_evidence_id,
    control_source_evidence_id: control.source_evidence_id,
    delivery_transaction_hash: delivery.transaction_hash,
    delivery_receipt_block_number: delivery.block_number,
    delivery_receipt_block_hash: delivery.block_hash,
    control_transaction_hash: control.transaction_hash,
    control_receipt_block_number: control.block_number,
    control_receipt_block_hash: control.block_hash,
  });
  const expectedRuntimeBindingId =
    "voidpprtb1_"
    + sha256(Buffer.from(canonicalJson(identity), "utf8"));
  if (receipt.runtime_binding_id !== expectedRuntimeBindingId) {
    fail("runtime_binding_id_mismatch");
  }

  return Object.freeze(structuredClone(receipt));
}

function summarizeDecision(decision) {
  return Object.freeze({
    ok: decision?.ok === true,
    status: String(decision?.status || ""),
    reason: String(decision?.reason || ""),
    missing_gates: Object.freeze(
      Array.isArray(decision?.missing_gates)
        ? [...decision.missing_gates]
        : [],
    ),
    market_activation_authorized:
      decision?.market_activation_authorized === true,
    public_presale_activation_authorized:
      decision?.public_presale_activation_authorized === true,
    funds_movement_authorized:
      decision?.funds_movement_authorized === true,
  });
}

export function buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
  candidate,
  successorMigrationCandidate,
  runtimeBindingReceipt,
  runtimeBindingFileSha256,
  candidateFileSha256,
  successorCandidateFileSha256,
} = {}) {
  if (
    typeof runtimeBindingFileSha256 !== "string"
    || !HEX64.test(runtimeBindingFileSha256)
    || typeof candidateFileSha256 !== "string"
    || !HEX64.test(candidateFileSha256)
    || typeof successorCandidateFileSha256 !== "string"
    || !HEX64.test(successorCandidateFileSha256)
  ) {
    fail("promotion_source_sha256_invalid");
  }
  const runtimeBinding =
    validateNormalizedReceipt(runtimeBindingReceipt);

  if (
    !plain(candidate)
    || !plain(candidate.gates)
    || candidate.status !== "HOLD"
    || candidate.gates
      .participant_post_purchase_voidtoken_control_ready !== false
    || candidate.gates.coupled_activation_ready !== false
  ) {
    fail("promotion_candidate_prestate_invalid");
  }

  const beforeDecision =
    classifyVoidCoupledEconomicSuccessorGateV1(
      candidate,
      successorMigrationCandidate,
    );
  if (
    beforeDecision?.ok !== false
    || beforeDecision?.status !== "HOLD"
    || beforeDecision?.reason !== "coupled_economic_gates_incomplete"
    || !Array.isArray(beforeDecision.missing_gates)
    || !beforeDecision.missing_gates.includes(PARTICIPANT_MISSING_GATE)
  ) {
    fail("promotion_candidate_prestate_classification_invalid");
  }

  const promotedCandidate = structuredClone(candidate);
  promotedCandidate.gates =
    structuredClone(candidate.gates);
  promotedCandidate.gates
    .participant_post_purchase_voidtoken_control_ready = true;

  if (
    promotedCandidate.status !== "HOLD"
    || promotedCandidate.gates.coupled_activation_ready !== false
    || canonicalJson({
      ...promotedCandidate,
      gates: {
        ...promotedCandidate.gates,
        participant_post_purchase_voidtoken_control_ready: false,
      },
    }) !== canonicalJson(candidate)
  ) {
    fail("promotion_candidate_change_scope_invalid");
  }

  const afterDecision =
    classifyVoidCoupledEconomicSuccessorGateV1(
      promotedCandidate,
      successorMigrationCandidate,
    );
  const expectedMissing =
    beforeDecision.missing_gates.filter(
      (value) => value !== PARTICIPANT_MISSING_GATE,
    );
  if (
    afterDecision?.ok !== false
    || afterDecision?.status !== "HOLD"
    || !Array.isArray(afterDecision.missing_gates)
    || canonicalJson(afterDecision.missing_gates)
      !== canonicalJson(expectedMissing)
    || afterDecision.missing_gates.includes(PARTICIPANT_MISSING_GATE)
    || afterDecision.market_activation_authorized !== false
    || afterDecision.public_presale_activation_authorized !== false
    || afterDecision.funds_movement_authorized !== false
  ) {
    fail("promotion_candidate_poststate_classification_invalid");
  }

  const promotedCandidateSha256 =
    sha256(Buffer.from(canonicalJson(promotedCandidate), "utf8"));
  const material = Object.freeze({
    marker:
      VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_V1,
    version: 1,
    status: "PARTICIPANT_CONTROL_GATE_PROMOTION_ARTIFACT_READY_CANDIDATE_HOLD",
    source_candidate_path: CANDIDATE_REL,
    source_candidate_sha256: candidateFileSha256,
    successor_migration_candidate_path: SUCCESSOR_REL,
    successor_migration_candidate_sha256:
      successorCandidateFileSha256,
    runtime_binding_file_sha256: runtimeBindingFileSha256,
    runtime_binding_id: runtimeBinding.runtime_binding_id,
    finality_import_id: runtimeBinding.finality.import_id,
    participant_address: runtimeBinding.finality.participant_address,
    promoted_gate:
      "participant_post_purchase_voidtoken_control_ready",
    promoted_gate_value: true,
    promoted_candidate_sha256: promotedCandidateSha256,
    promoted_candidate: Object.freeze(promotedCandidate),
    candidate_before: summarizeDecision(beforeDecision),
    candidate_after: summarizeDecision(afterDecision),
    candidate_promotion_artifact_ready: true,
    canonical_candidate_file_updated: false,
    candidate_promotion_application_required: true,
    coupled_activation_ready: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1,
  });
  return Object.freeze({
    ...material,
    promotion_id:
      "voidppccp1_"
      + sha256(Buffer.from(canonicalJson(material), "utf8")),
  });
}

export function readVoidParticipantPostpurchasePromotionSourcesV1({
  runtimeBindingFile,
  runtimeBindingFileSha256,
} = {}) {
  if (
    typeof runtimeBindingFileSha256 !== "string"
    || !HEX64.test(runtimeBindingFileSha256)
  ) {
    fail("runtime_binding_file_sha256_invalid");
  }
  const runtimeBinding =
    readStableJsonFile(
      runtimeBindingFile,
      {
        label: "runtime_binding_receipt",
        maxBytes: MAX_RUNTIME_BINDING_BYTES,
        expectedSha256: runtimeBindingFileSha256,
        requirePrivate: true,
        requireCollectorSerialization: true,
      },
    );
  const candidate =
    readStableJsonFile(
      CANDIDATE_PATH,
      {
        label: "coupled_candidate",
        maxBytes: MAX_CANDIDATE_BYTES,
      },
    );
  const successor =
    readStableJsonFile(
      SUCCESSOR_PATH,
      {
        label: "successor_candidate",
        maxBytes: MAX_CANDIDATE_BYTES,
      },
    );

  return Object.freeze({
    runtimeBindingReceipt: runtimeBinding.value,
    runtimeBindingFileSha256: runtimeBinding.sha256,
    candidate: candidate.value,
    candidateFileSha256: candidate.sha256,
    successorMigrationCandidate: successor.value,
    successorCandidateFileSha256: successor.sha256,
  });
}

function canonicalOutputPath(file) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
    || path.resolve(file) !== file
  ) {
    fail("promotion_output_path_must_be_absolute_canonical");
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) {
    fail("promotion_output_parent_alias_forbidden");
  }
  try {
    fs.lstatSync(file);
    fail("promotion_output_already_exists");
  } catch (error) {
    if (error?.message === "promotion_output_already_exists") throw error;
    if (error?.code !== "ENOENT") throw error;
  }
  return file;
}

function writePrivateJson(file, value) {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY
      | fs.constants.O_CREAT
      | fs.constants.O_EXCL
      | Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    const bytes = Buffer.from(
      JSON.stringify(value, null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    return Object.freeze({
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  } finally {
    fs.closeSync(fd);
  }
}

function parseCli(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      "runtime-binding": { type: "string" },
      "runtime-binding-sha256": { type: "string" },
      output: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: true,
  });
  return {
    command: positionals[0] || "",
    values,
  };
}

function usage() {
  console.log(
    "usage: node tools/void-participant-postpurchase-coupled-candidate-promotion-v1.mjs prepare "
      + "--runtime-binding /absolute/runtime-binding.json "
      + "--runtime-binding-sha256 <64hex> "
      + "--output /absolute/promotion.json",
  );
}

const direct =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (direct) {
  try {
    const { command, values } =
      parseCli(process.argv.slice(2));
    if (
      values.help
      || command === "help"
      || command === "--help"
      || command === "-h"
    ) {
      usage();
    } else if (command === "prepare") {
      if (
        !values["runtime-binding"]
        || !values["runtime-binding-sha256"]
        || !values.output
      ) {
        fail("prepare_requires_runtime_binding_sha256_and_output");
      }
      const sources =
        readVoidParticipantPostpurchasePromotionSourcesV1({
          runtimeBindingFile: values["runtime-binding"],
          runtimeBindingFileSha256:
            values["runtime-binding-sha256"],
        });
      const promotion =
        buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1(
          sources,
        );
      const output = canonicalOutputPath(values.output);
      const written = writePrivateJson(output, promotion);
      console.log(
        VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_V1,
      );
      console.log("status=" + promotion.status);
      console.log("promotion_id=" + promotion.promotion_id);
      console.log(
        "runtime_binding_id=" + promotion.runtime_binding_id,
      );
      console.log(
        "promoted_gate="
        + promotion.promoted_gate
        + "=true",
      );
      console.log("canonical_candidate_file_updated=false");
      console.log("candidate_promotion_application_required=true");
      console.log("coupled_activation_ready=false");
      console.log("market_activation=false");
      console.log("public_presale_activation=false");
      console.log("funds_movement=false");
      console.log("artifact_sha256=" + written.sha256);
    } else {
      usage();
      fail("unknown_command");
    }
  } catch (error) {
    console.error(
      "VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_V1_HOLD",
    );
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
}
