#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_AUTHORITY_V1,
  VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1,
  importWcVoidLedgerPersistenceV1,
} from "./void-wc-void-ledger-persistence-import-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "./void-coupled-economic-successor-gate-v1.mjs";

export const VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1 =
  "VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1";

export const VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1 =
  Object.freeze({
    source_promotion_artifact_only: true,
    canonical_candidate_read: true,
    successor_candidate_read: true,
    ledger_persistence_import_input_read: true,
    ledger_persistence_import_recomputed: true,
    create_only_private_output: true,
    canonical_candidate_file_update: false,
    production_ledger_read: false,
    production_ledger_write: false,
    wc_balance_mutation: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    external_network_request: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
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

const MAX_IMPORT_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_CANDIDATE_BYTES = 2 * 1024 * 1024;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const IMPORT_ID = /^voidwclpri1_[0-9a-f]{64}$/u;
const BINDING_ID = /^voidwclprb1_[0-9a-f]{64}$/u;
const PERSISTENCE_MISSING =
  "wc_ledger_persistence_verification_required";
const CUSTODY_MISSING =
  "quote_reserve_custody_verification_required";

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
  if (typeof value === "number" && Number.isSafeInteger(value)) {
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

function prettyJsonBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function prettyJsonSha256(value) {
  return sha256(prettyJsonBytes(value));
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
    requirePrettyJson = false,
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

  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY
      | Number(fs.constants.O_NOFOLLOW || 0),
  );
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
      requirePrettyJson
      && text !== JSON.stringify(value, null, 2) + "\n"
    ) {
      fail(label + "_serialization_not_pretty_json");
    }

    return Object.freeze({
      value,
      sha256: digest,
      bytes: bytes.length,
    });
  } finally {
    fs.closeSync(fd);
  }
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

function validateImportedPersistence(imported) {
  exactObject(
    imported,
    [
      "append_line_count",
      "append_window_bytes",
      "append_window_sha256",
      "authority",
      "binding_id",
      "coupled_launch_id",
      "expected_settlement_count",
      "funds_movement_authorized",
      "import_id",
      "market_activation_authorized",
      "observed_file_size_bytes",
      "ok",
      "opening_settlement_line_count",
      "prestate_bytes",
      "production_candidate_binding_allowed",
      "production_candidate_updated",
      "public_presale_activation_authorized",
      "quote_reserve_custody_verified",
      "settlement_adapter_id",
      "settlement_set_root",
      "source_receipt_sha256",
      "status",
      "total_settled_wc_units",
      "version",
      "wc_ledger_persistence_verified",
      "marker",
    ],
    "ledger_persistence_import",
  );

  if (
    imported.ok !== true
    || imported.marker !== VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1
    || imported.version !== 1
    || imported.status !== "VERIFIED_LEDGER_PERSISTENCE_IMPORT"
    || !IMPORT_ID.test(String(imported.import_id || ""))
    || !BINDING_ID.test(String(imported.binding_id || ""))
    || !SHA256_ID.test(String(imported.source_receipt_sha256 || ""))
    || imported.wc_ledger_persistence_verified !== true
    || imported.quote_reserve_custody_verified !== true
    || imported.production_candidate_binding_allowed !== true
    || imported.production_candidate_updated !== false
    || imported.market_activation_authorized !== false
    || imported.public_presale_activation_authorized !== false
    || imported.funds_movement_authorized !== false
    || canonicalJson(imported.authority)
      !== canonicalJson(
        VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_AUTHORITY_V1,
      )
  ) {
    fail("ledger_persistence_import_contract_invalid");
  }
  return imported;
}

export function buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1({
  candidate,
  successorMigrationCandidate,
  ledgerPersistenceImportInput,
  ledgerPersistenceImportInputFileSha256,
  candidateFileSha256,
  successorCandidateFileSha256,
} = {}) {
  if (
    typeof ledgerPersistenceImportInputFileSha256 !== "string"
    || !HEX64.test(ledgerPersistenceImportInputFileSha256)
    || typeof candidateFileSha256 !== "string"
    || !HEX64.test(candidateFileSha256)
    || typeof successorCandidateFileSha256 !== "string"
    || !HEX64.test(successorCandidateFileSha256)
  ) {
    fail("promotion_source_sha256_invalid");
  }

  if (
    ledgerPersistenceImportInputFileSha256
      !== prettyJsonSha256(ledgerPersistenceImportInput)
  ) {
    fail("promotion_import_input_file_sha256_unbound");
  }
  if (candidateFileSha256 !== prettyJsonSha256(candidate)) {
    fail("promotion_candidate_file_sha256_unbound");
  }
  if (
    successorCandidateFileSha256
      !== prettyJsonSha256(successorMigrationCandidate)
  ) {
    fail("promotion_successor_file_sha256_unbound");
  }

  const imported = validateImportedPersistence(
    importWcVoidLedgerPersistenceV1(
      ledgerPersistenceImportInput,
    ),
  );

  if (
    !plain(candidate)
    || !plain(candidate.gates)
    || !plain(candidate.shared_post_discovery_reconciliation)
    || candidate.status !== "HOLD"
    || candidate.gates.wc_ledger_persistence_verified !== false
    || candidate.gates.quote_reserve_custody_verified !== false
    || candidate.gates.coupled_activation_ready !== false
  ) {
    fail("promotion_candidate_prestate_invalid");
  }

  if (
    imported.coupled_launch_id
      !== candidate.shared_post_discovery_reconciliation.coupled_launch_id
  ) {
    fail("promotion_coupled_launch_id_mismatch");
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
    || !beforeDecision.missing_gates.includes(PERSISTENCE_MISSING)
    || !beforeDecision.missing_gates.includes(CUSTODY_MISSING)
  ) {
    fail("promotion_candidate_prestate_classification_invalid");
  }

  const promotedCandidate = structuredClone(candidate);
  promotedCandidate.gates = structuredClone(candidate.gates);
  promotedCandidate.gates.wc_ledger_persistence_verified = true;
  promotedCandidate.gates.quote_reserve_custody_verified = true;

  if (
    promotedCandidate.status !== "HOLD"
    || promotedCandidate.gates.coupled_activation_ready !== false
    || canonicalJson({
      ...promotedCandidate,
      gates: {
        ...promotedCandidate.gates,
        wc_ledger_persistence_verified: false,
        quote_reserve_custody_verified: false,
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
  const expectedMissing = beforeDecision.missing_gates.filter(
    (value) =>
      value !== PERSISTENCE_MISSING
      && value !== CUSTODY_MISSING,
  );

  if (
    afterDecision?.ok !== false
    || afterDecision?.status !== "HOLD"
    || !Array.isArray(afterDecision.missing_gates)
    || canonicalJson(afterDecision.missing_gates)
      !== canonicalJson(expectedMissing)
    || afterDecision.missing_gates.includes(PERSISTENCE_MISSING)
    || afterDecision.missing_gates.includes(CUSTODY_MISSING)
    || afterDecision.market_activation_authorized !== false
    || afterDecision.public_presale_activation_authorized !== false
    || afterDecision.funds_movement_authorized !== false
  ) {
    fail("promotion_candidate_poststate_classification_invalid");
  }

  const importInputCanonicalSha256 = sha256(
    Buffer.from(
      canonicalJson(ledgerPersistenceImportInput),
      "utf8",
    ),
  );
  const promotedCandidateSha256 = sha256(
    Buffer.from(canonicalJson(promotedCandidate), "utf8"),
  );

  const material = Object.freeze({
    marker:
      VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1,
    version: 1,
    status:
      "WC_LEDGER_CUSTODY_PROMOTION_ARTIFACT_READY_CANDIDATE_HOLD",
    source_candidate_path: CANDIDATE_REL,
    source_candidate_sha256: candidateFileSha256,
    successor_migration_candidate_path: SUCCESSOR_REL,
    successor_migration_candidate_sha256:
      successorCandidateFileSha256,
    ledger_persistence_import_input_file_sha256:
      ledgerPersistenceImportInputFileSha256,
    ledger_persistence_import_input_canonical_sha256:
      importInputCanonicalSha256,
    ledger_persistence_import_id: imported.import_id,
    ledger_persistence_review_binding_id: imported.binding_id,
    ledger_persistence_source_receipt_sha256:
      imported.source_receipt_sha256,
    coupled_launch_id: imported.coupled_launch_id,
    settlement_adapter_id: imported.settlement_adapter_id,
    prestate_bytes: imported.prestate_bytes,
    settlement_set_root: imported.settlement_set_root,
    total_settled_wc_units: imported.total_settled_wc_units,
    expected_settlement_count: imported.expected_settlement_count,
    promoted_gates: Object.freeze([
      "quote_reserve_custody_verified",
      "wc_ledger_persistence_verified",
    ]),
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
      VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1,
  });

  return Object.freeze({
    ...material,
    promotion_id:
      "voidwclccp1_"
      + sha256(Buffer.from(canonicalJson(material), "utf8")),
  });
}

export function readVoidWcVoidLedgerCustodyPromotionSourcesV1({
  ledgerPersistenceImportInputFile,
  ledgerPersistenceImportInputFileSha256,
} = {}) {
  if (
    typeof ledgerPersistenceImportInputFileSha256 !== "string"
    || !HEX64.test(ledgerPersistenceImportInputFileSha256)
  ) {
    fail("ledger_persistence_import_input_file_sha256_invalid");
  }

  const importInput = readStableJsonFile(
    ledgerPersistenceImportInputFile,
    {
      label: "ledger_persistence_import_input",
      maxBytes: MAX_IMPORT_INPUT_BYTES,
      expectedSha256: ledgerPersistenceImportInputFileSha256,
      requirePrivate: true,
      requirePrettyJson: true,
    },
  );
  const candidate = readStableJsonFile(
    CANDIDATE_PATH,
    {
      label: "coupled_candidate",
      maxBytes: MAX_CANDIDATE_BYTES,
      requirePrettyJson: true,
    },
  );
  const successor = readStableJsonFile(
    SUCCESSOR_PATH,
    {
      label: "successor_candidate",
      maxBytes: MAX_CANDIDATE_BYTES,
      requirePrettyJson: true,
    },
  );

  return Object.freeze({
    ledgerPersistenceImportInput: importInput.value,
    ledgerPersistenceImportInputFileSha256: importInput.sha256,
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
    if (error?.message === "promotion_output_already_exists") {
      throw error;
    }
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
    const bytes = prettyJsonBytes(value);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    const stat = fs.fstatSync(fd);
    if (
      !stat.isFile()
      || (stat.mode & 0o077) !== 0
    ) {
      fail("promotion_output_private_file_required");
    }
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
      "import-input": { type: "string" },
      "import-input-sha256": { type: "string" },
      output: { type: "string" },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
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
    "usage: node tools/void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs prepare "
      + "--import-input /absolute/ledger-persistence-import-input.json "
      + "--import-input-sha256 <64hex> "
      + "--output /absolute/ledger-custody-promotion.json",
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
        !values["import-input"]
        || !values["import-input-sha256"]
        || !values.output
      ) {
        fail("prepare_requires_import_input_sha256_and_output");
      }

      const sources =
        readVoidWcVoidLedgerCustodyPromotionSourcesV1({
          ledgerPersistenceImportInputFile:
            values["import-input"],
          ledgerPersistenceImportInputFileSha256:
            values["import-input-sha256"],
        });
      const promotion =
        buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1(
          sources,
        );
      const output = canonicalOutputPath(values.output);
      const written = writePrivateJson(output, promotion);

      console.log(
        VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1,
      );
      console.log("status=" + promotion.status);
      console.log("promotion_id=" + promotion.promotion_id);
      console.log(
        "ledger_persistence_import_id="
          + promotion.ledger_persistence_import_id,
      );
      console.log(
        "wc_ledger_persistence_verified=true",
      );
      console.log(
        "quote_reserve_custody_verified=true",
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
      "VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1_HOLD",
    );
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
}
