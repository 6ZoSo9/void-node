#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1,
  inspectWcVoidOpeningClaimBindingPersistenceV1,
} from "./void-wc-void-opening-claim-binding-persistence-v1.mjs";
import {
  VOID_WC_VOID_OPENING_REPLAY_INSPECTION_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1,
  inspectWcVoidOpeningReplayTerminalV1,
} from "./void-wc-void-opening-replay-persistence-v1.mjs";
import {
  initialWcVoidOpeningReplayStateV1,
} from "./void-wc-void-opening-replay-protection-v1.mjs";
import {
  classifyVoidWcVoidProductionReadinessV1,
} from "./void-wc-void-production-readiness-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "./void-coupled-economic-successor-gate-v1.mjs";

export const VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1 =
  "VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1";

export const VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_AUTHORITY_V1 =
  Object.freeze({
    durable_opening_evidence_read: true,
    canonical_candidate_read: true,
    successor_candidate_read: true,
    git_repository_identity_read: true,
    clean_worktree_required: true,
    create_only_private_output: true,
    production_candidate_file_updated: false,
    coupled_candidate_file_updated: false,
    filesystem_write_outside_private_output: false,
    production_ledger_write: false,
    wc_balance_mutation: false,
    token_transfer: false,
    refund_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const PRODUCTION_REL =
  "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR_REL =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const PRODUCTION_PATH = path.join(REPO_ROOT, PRODUCTION_REL);
const COUPLED_PATH = path.join(REPO_ROOT, COUPLED_REL);
const SUCCESSOR_PATH = path.join(REPO_ROOT, SUCCESSOR_REL);

const REQUEST_KEYS = Object.freeze([
  "commitments",
  "coupled_launch_id",
  "data_dir",
  "dispositions",
  "ledger_debits",
  "mode",
]);
const MAX_REQUEST_BYTES = 16 * 1024 * 1024;
const MAX_SOURCE_JSON_BYTES = 4 * 1024 * 1024;
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;

const PROD_CLAIM_MISSING =
  "participant_opening_claim_policy_required";
const PROD_REPLAY_MISSING =
  "duplicate_replay_protection_required";
const COUPLED_CLAIM_MISSING =
  "opening_claim_transfer_or_refund_binding_required";

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
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

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
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

function isInsideRepo(file) {
  const relative = path.relative(REPO_ROOT, file);
  return (
    relative === ""
    || (
      relative !== ".."
      && !relative.startsWith(".." + path.sep)
      && !path.isAbsolute(relative)
    )
  );
}

function gitRead(args, code) {
  const result = spawnSync(
    "git",
    ["-C", REPO_ROOT, ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0",
      },
    },
  );
  if (result.status !== 0) fail(code);
  return String(result.stdout || "").trim();
}

function readRepositoryIdentityV1() {
  const head = gitRead(
    ["rev-parse", "HEAD"],
    "promotion_repository_head_unavailable",
  );
  const tree = gitRead(
    ["rev-parse", "HEAD^{tree}"],
    "promotion_repository_tree_unavailable",
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("promotion_repository_identity_invalid");
  }
  if (
    gitRead(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "promotion_repository_status_unavailable",
    ) !== ""
  ) {
    fail("promotion_repository_must_be_clean");
  }
  return Object.freeze({
    repository_head_sha: head,
    repository_tree_sha: tree,
  });
}

function readStableJsonFile(
  file,
  {
    label,
    maxBytes,
    expectedSha256 = null,
    requirePrivate = false,
    requirePrettyJson = true,
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
  });
}

function authorityEqual(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function validateClaimEvidence(value, request) {
  if (
    value?.ok !== true
    || value?.status !== "PERSISTENCE_VERIFIED"
    || value?.marker !==
      VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1
    || value?.version !== 1
    || value?.coupled_launch_id !== request.coupled_launch_id
    || value?.mode !== request.mode
    || !SHA256_ID.test(String(value?.binding_id || ""))
    || !HEX64.test(String(value?.persisted_file_sha256 || ""))
    || value?.binding_persistence_verified !== true
    || value?.opening_claim_transfer_or_refund_binding_persistence_verified
      !== true
    || value?.ledger_write_performed !== false
    || value?.wc_balance_mutation_performed !== false
    || value?.token_transfer_performed !== false
    || value?.refund_write_performed !== false
    || value?.market_activation_authority !== false
    || value?.public_presale_activation_authority !== false
    || value?.funds_movement_authority !== false
    || !authorityEqual(
      value?.authority,
      VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_AUTHORITY_V1,
    )
  ) {
    fail("promotion_claim_persistence_evidence_invalid");
  }
}

function validateReplayEvidence(value, request, bindingId) {
  if (
    value?.ok !== true
    || value?.status !== "verified"
    || value?.marker !== VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1
    || value?.version !== 1
    || value?.coupled_launch_id !== request.coupled_launch_id
    || value?.mode !== request.mode
    || value?.binding_id !== bindingId
    || !SHA256_ID.test(String(value?.transition_id || ""))
    || !HEX64.test(String(value?.terminal_capsule_sha256 || ""))
    || value?.terminal_replay_state_persisted !== true
    || value?.durable_replay_state_persistence_verified !== true
    || value?.duplicate_replay_protection_verified_for_launch !== true
    || value?.production_duplicate_replay_gate_updated !== false
    || value?.market_activation_authority !== false
    || value?.public_presale_activation_authority !== false
    || value?.funds_movement_authority !== false
    || !authorityEqual(
      value?.authority,
      VOID_WC_VOID_OPENING_REPLAY_INSPECTION_AUTHORITY_V1,
    )
  ) {
    fail("promotion_replay_persistence_evidence_invalid");
  }
}

function filtered(values, rejected) {
  return values.filter((value) => !rejected.has(value));
}

function sameStringArray(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

export function prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
  requestFile,
  requestFileSha256,
} = {}) {
  if (
    typeof requestFile !== "string"
    || !path.isAbsolute(requestFile)
    || path.resolve(requestFile) !== requestFile
  ) {
    fail("promotion_request_path_invalid");
  }
  if (isInsideRepo(requestFile)) {
    fail("promotion_request_must_be_outside_repository");
  }
  if (
    typeof requestFileSha256 !== "string"
    || !HEX64.test(requestFileSha256)
  ) {
    fail("promotion_request_sha256_invalid");
  }

  const repositoryBefore = readRepositoryIdentityV1();
  const requestSource = readStableJsonFile(
    requestFile,
    {
      label: "promotion_request",
      maxBytes: MAX_REQUEST_BYTES,
      expectedSha256: requestFileSha256,
      requirePrivate: true,
      requirePrettyJson: true,
    },
  );
  const request = exactObject(
    requestSource.value,
    REQUEST_KEYS,
    "promotion_request",
  );

  if (
    typeof request.coupled_launch_id !== "string"
    || !SHA256_ID.test(request.coupled_launch_id)
    || typeof request.data_dir !== "string"
    || !path.isAbsolute(request.data_dir)
    || !["finalize", "abort"].includes(request.mode)
    || !Array.isArray(request.commitments)
    || !Array.isArray(request.ledger_debits)
    || !Array.isArray(request.dispositions)
  ) {
    fail("promotion_request_value_invalid");
  }

  const productionSource = readStableJsonFile(
    PRODUCTION_PATH,
    {
      label: "production_candidate",
      maxBytes: MAX_SOURCE_JSON_BYTES,
    },
  );
  const coupledSource = readStableJsonFile(
    COUPLED_PATH,
    {
      label: "coupled_candidate",
      maxBytes: MAX_SOURCE_JSON_BYTES,
    },
  );
  const successorSource = readStableJsonFile(
    SUCCESSOR_PATH,
    {
      label: "successor_candidate",
      maxBytes: MAX_SOURCE_JSON_BYTES,
    },
  );

  const productionCandidate = productionSource.value;
  const coupledCandidate = coupledSource.value;
  const successorCandidate = successorSource.value;

  if (
    !plain(productionCandidate)
    || productionCandidate.status !== "hold"
    || productionCandidate.participant_opening_claim_policy_ready !== false
    || productionCandidate.duplicate_replay_protection_proven !== false
    || productionCandidate.coupled_activation_ready !== false
    || !plain(coupledCandidate)
    || coupledCandidate.status !== "HOLD"
    || !plain(coupledCandidate.gates)
    || !plain(coupledCandidate.shared_post_discovery_reconciliation)
    || coupledCandidate.gates
      .opening_claim_transfer_or_refund_binding_ready !== false
    || coupledCandidate.gates.coupled_activation_ready !== false
  ) {
    fail("promotion_candidate_prestate_invalid");
  }

  if (
    coupledCandidate.shared_post_discovery_reconciliation.coupled_launch_id
      !== request.coupled_launch_id
  ) {
    fail("promotion_coupled_launch_id_mismatch");
  }

  const commonInspection = {
    data_dir: request.data_dir,
    coupled_launch_id: request.coupled_launch_id,
    commitments: request.commitments,
    ledger_debits: request.ledger_debits,
    mode: request.mode,
    dispositions: request.dispositions,
  };

  const claimEvidence =
    inspectWcVoidOpeningClaimBindingPersistenceV1(
      commonInspection,
    );
  validateClaimEvidence(claimEvidence, request);

  const replayEvidence =
    inspectWcVoidOpeningReplayTerminalV1({
      ...commonInspection,
      before_state:
        initialWcVoidOpeningReplayStateV1(
          request.coupled_launch_id,
        ),
    });
  validateReplayEvidence(
    replayEvidence,
    request,
    claimEvidence.binding_id,
  );

  const productionBefore =
    classifyVoidWcVoidProductionReadinessV1(
      productionCandidate,
    );
  if (
    productionBefore?.ok !== false
    || productionBefore?.status !== "HOLD"
    || productionBefore?.reason !== "production_gates_incomplete"
    || !Array.isArray(productionBefore?.missing_gates)
    || !productionBefore.missing_gates.includes(PROD_CLAIM_MISSING)
    || !productionBefore.missing_gates.includes(PROD_REPLAY_MISSING)
  ) {
    fail("promotion_production_prestate_classification_invalid");
  }

  const coupledBefore =
    classifyVoidCoupledEconomicSuccessorGateV1(
      coupledCandidate,
      successorCandidate,
    );
  if (
    coupledBefore?.ok !== false
    || coupledBefore?.status !== "HOLD"
    || coupledBefore?.reason !== "coupled_economic_gates_incomplete"
    || !Array.isArray(coupledBefore?.missing_gates)
    || !coupledBefore.missing_gates.includes(COUPLED_CLAIM_MISSING)
  ) {
    fail("promotion_coupled_prestate_classification_invalid");
  }

  const promotedProduction = structuredClone(productionCandidate);
  promotedProduction.participant_opening_claim_policy_ready = true;
  promotedProduction.duplicate_replay_protection_proven = true;

  const productionReset = structuredClone(promotedProduction);
  productionReset.participant_opening_claim_policy_ready = false;
  productionReset.duplicate_replay_protection_proven = false;
  if (canonicalJson(productionReset) !== canonicalJson(productionCandidate)) {
    fail("promotion_production_change_scope_invalid");
  }

  const promotedCoupled = structuredClone(coupledCandidate);
  promotedCoupled.gates = structuredClone(coupledCandidate.gates);
  promotedCoupled.gates.opening_claim_transfer_or_refund_binding_ready = true;

  const coupledReset = structuredClone(promotedCoupled);
  coupledReset.gates = structuredClone(promotedCoupled.gates);
  coupledReset.gates.opening_claim_transfer_or_refund_binding_ready = false;
  if (canonicalJson(coupledReset) !== canonicalJson(coupledCandidate)) {
    fail("promotion_coupled_change_scope_invalid");
  }

  const productionAfter =
    classifyVoidWcVoidProductionReadinessV1(
      promotedProduction,
    );
  const expectedProductionMissing = filtered(
    productionBefore.missing_gates,
    new Set([PROD_CLAIM_MISSING, PROD_REPLAY_MISSING]),
  );
  if (
    productionAfter?.ok !== false
    || productionAfter?.status !== "HOLD"
    || productionAfter?.reason !== "production_gates_incomplete"
    || !Array.isArray(productionAfter?.missing_gates)
    || !sameStringArray(
      productionAfter.missing_gates,
      expectedProductionMissing,
    )
  ) {
    fail("promotion_production_poststate_classification_invalid");
  }

  const coupledAfter =
    classifyVoidCoupledEconomicSuccessorGateV1(
      promotedCoupled,
      successorCandidate,
    );
  const expectedCoupledMissing = filtered(
    coupledBefore.missing_gates,
    new Set([COUPLED_CLAIM_MISSING]),
  );
  if (
    coupledAfter?.ok !== false
    || coupledAfter?.status !== "HOLD"
    || coupledAfter?.reason !== "coupled_economic_gates_incomplete"
    || !Array.isArray(coupledAfter?.missing_gates)
    || !sameStringArray(
      coupledAfter.missing_gates,
      expectedCoupledMissing,
    )
  ) {
    fail("promotion_coupled_poststate_classification_invalid");
  }

  if (
    promotedProduction.status !== "hold"
    || promotedProduction.coupled_activation_ready !== false
    || Object.values(promotedProduction.authority || {})
      .some((value) => value !== false)
    || promotedCoupled.status !== "HOLD"
    || promotedCoupled.gates.coupled_activation_ready !== false
    || Object.values(promotedCoupled.authority || {})
      .some((value) => value !== false)
  ) {
    fail("promotion_authority_boundary_invalid");
  }

  const repositoryAfter = readRepositoryIdentityV1();
  if (
    repositoryAfter.repository_head_sha
      !== repositoryBefore.repository_head_sha
    || repositoryAfter.repository_tree_sha
      !== repositoryBefore.repository_tree_sha
  ) {
    fail("promotion_repository_changed_during_evidence_read");
  }

  const material = Object.freeze({
    marker:
      VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1,
    version: 1,
    status:
      "OPENING_DURABLE_EVIDENCE_PROMOTION_ARTIFACT_READY_CANDIDATES_HOLD",
    repository_head_sha: repositoryAfter.repository_head_sha,
    repository_tree_sha: repositoryAfter.repository_tree_sha,
    request_file_sha256: requestSource.sha256,
    request_file_bytes: requestSource.bytes,
    coupled_launch_id: request.coupled_launch_id,
    mode: request.mode,
    binding_id: claimEvidence.binding_id,
    claim_binding_persisted_file_sha256:
      claimEvidence.persisted_file_sha256,
    replay_terminal_capsule_id: replayEvidence.capsule_id,
    replay_terminal_capsule_sha256:
      replayEvidence.terminal_capsule_sha256,
    replay_transition_id: replayEvidence.transition_id,
    production_candidate_path: PRODUCTION_REL,
    production_candidate_sha256: productionSource.sha256,
    coupled_candidate_path: COUPLED_REL,
    coupled_candidate_sha256: coupledSource.sha256,
    successor_candidate_path: SUCCESSOR_REL,
    successor_candidate_sha256: successorSource.sha256,
    promoted_production_fields: Object.freeze([
      "duplicate_replay_protection_proven",
      "participant_opening_claim_policy_ready",
    ]),
    promoted_coupled_gates: Object.freeze([
      "opening_claim_transfer_or_refund_binding_ready",
    ]),
    promoted_production_candidate_sha256:
      sha256(Buffer.from(canonicalJson(promotedProduction), "utf8")),
    promoted_coupled_candidate_sha256:
      sha256(Buffer.from(canonicalJson(promotedCoupled), "utf8")),
    promoted_production_candidate:
      Object.freeze(promotedProduction),
    promoted_coupled_candidate:
      Object.freeze(promotedCoupled),
    production_before: summarizeDecision(productionBefore),
    production_after: summarizeDecision(productionAfter),
    coupled_before: summarizeDecision(coupledBefore),
    coupled_after: summarizeDecision(coupledAfter),
    durable_claim_binding_verified: true,
    durable_replay_terminal_verified: true,
    production_candidate_file_updated: false,
    coupled_candidate_file_updated: false,
    candidate_promotion_application_required: true,
    bounded_canary_green: false,
    coupled_activation_ready: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_AUTHORITY_V1,
  });

  return Object.freeze({
    ...material,
    promotion_id:
      "voidwcodecp1_"
      + sha256(Buffer.from(canonicalJson(material), "utf8")),
  });
}

function canonicalOutputPath(file) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
    || path.resolve(file) !== file
  ) {
    fail("promotion_output_path_invalid");
  }
  if (isInsideRepo(file)) {
    fail("promotion_output_must_be_outside_repository");
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
    const bytes = prettyBytes(value);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || (stat.mode & 0o077) !== 0) {
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
      request: { type: "string" },
      "request-sha256": { type: "string" },
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
    "usage: node tools/void-wc-void-opening-durable-evidence-candidate-promotion-v1.mjs prepare "
      + "--request /absolute/private/opening-evidence-request.json "
      + "--request-sha256 <64hex> "
      + "--output /absolute/private/opening-promotion.json",
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
        !values.request
        || !values["request-sha256"]
        || !values.output
      ) {
        fail("prepare_requires_request_sha256_and_output");
      }

      const promotion =
        prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
          requestFile: values.request,
          requestFileSha256: values["request-sha256"],
        });
      const output = canonicalOutputPath(values.output);
      const written = writePrivateJson(output, promotion);

      console.log(
        VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1,
      );
      console.log("status=" + promotion.status);
      console.log("promotion_id=" + promotion.promotion_id);
      console.log("binding_id=" + promotion.binding_id);
      console.log("durable_claim_binding_verified=true");
      console.log("durable_replay_terminal_verified=true");
      console.log("production_candidate_file_updated=false");
      console.log("coupled_candidate_file_updated=false");
      console.log("candidate_promotion_application_required=true");
      console.log("bounded_canary_green=false");
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
      "VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1_HOLD",
    );
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
}
