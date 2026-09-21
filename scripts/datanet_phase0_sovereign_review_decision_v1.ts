import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  verifyVoidEd25519SignatureAgainstFingerprintV1,
} from "../src/security/void_sovereign_emergency_control_v1.js";
import {
  datanetPromotionCanonicalJsonV1,
} from "./datanet_promotion_independent_attestation_set_v1.js";

export const DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_MARKER_V1 =
  "VOID_DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_V1" as const;
export const DATANET_PHASE0_SOVEREIGN_REVIEW_STATE_MARKER_V1 =
  "VOID_DATANET_PHASE0_SOVEREIGN_REVIEW_STATE_V1" as const;
export const DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNATURE_DOMAIN_V1 =
  "void.datanet.phase0.sovereign-review-decision.v1" as const;
export const DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNER_ROLE_V1 =
  "sovereign_primary_governance_attestation" as const;

const ZERO_SHA256 = "0".repeat(64);
const SHA256 = /^[0-9a-f]{64}$/;
const ASSEMBLY_ID = /^voiddppa1_[0-9a-f]{64}$/;
const CANDIDATE_ID = /^voiddcp1_[0-9a-f]{32}$/;
const DECISION_ID = /^voiddpsr1_[0-9a-f]{64}$/;
const MAX_JSON_BYTES = 2 * 1024 * 1024;

type RecordValue = Record<string, unknown>;

export type DatanetPhase0SovereignReviewDecisionKindV1 =
  | "HOLD"
  | "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION"
  | "REJECT";

export type DatanetPhase0SovereignReviewStateV1 = {
  marker: typeof DATANET_PHASE0_SOVEREIGN_REVIEW_STATE_MARKER_V1;
  version: 1;
  assembly_id: string;
  last_sequence: string | null;
  last_decision_sha256: string;
  status:
    | "PENDING_REVIEW"
    | "HOLD"
    | "APPROVED_FOR_SEPARATE_CANONICAL_PREPARATION"
    | "REJECTED";
  terminal: boolean;
  separate_canonical_preparation_eligible: boolean;
  chain2050_write_authorized: false;
  automatic_promotion: false;
};

const DECISION_KEYS = [
  "marker",
  "version",
  "chain_id",
  "phase",
  "authority_mode",
  "assembly_id",
  "assembly_manifest_sha256",
  "candidate_id",
  "promotion_candidate_sha256",
  "sequence",
  "previous_decision_sha256",
  "decision",
  "reason_code",
  "review_evidence_sha256",
  "decided_at_utc",
  "signer_role",
  "signer_public_key_der_sha256",
  "signature_algorithm",
  "signature_domain",
  "preparation_boundary",
  "signature_base64",
  "decision_id",
] as const;

const PREPARATION_KEYS = [
  "separate_canonical_preparation_eligible",
  "chain2050_write_authorized",
  "transaction_construction_authorized",
  "transaction_signing_authorized",
  "transaction_broadcast_authorized",
  "validator_authority_granted",
  "governance_mutation_authorized",
  "automatic_promotion",
  "runtime_service_action",
  "funds_action",
] as const;

const PACKET_FILES = [
  "assembly-manifest.json",
  "evidence-map.json",
  "external-evidence.json",
  "promotion-candidate.json",
  "source-bundle.json",
] as const;

const APPROVE_REASONS = new Set([
  "SOVEREIGN_REVIEW_ACCEPTED",
]);
const HOLD_REASONS = new Set([
  "MORE_EVIDENCE_REQUIRED",
  "REVIEW_DEFERRED",
  "POLICY_REVIEW_REQUIRED",
  "CONFLICT_REQUIRES_REVIEW",
]);
const REJECT_REASONS = new Set([
  "SOVEREIGN_REVIEW_REJECTED",
  "POLICY_INELIGIBLE",
  "PROVENANCE_CONCERN",
  "SEMANTIC_TRUTH_NOT_ACCEPTED",
]);

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function record(value: unknown, label: string): RecordValue {
  assertCondition(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as RecordValue;
}

function exactKeys(
  value: RecordValue,
  label: string,
  expected: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} keys must be exactly: ${wanted.join(", ")}`,
  );
}

function sha256Hex(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function shaJson(value: unknown): string {
  return sha256Hex(datanetPromotionCanonicalJsonV1(value));
}

function canonicalUtc(value: unknown, label: string): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value),
    `${label} must be second-precision UTC`,
  );
  const ms = Date.parse(value);
  assertCondition(Number.isFinite(ms), `${label} invalid UTC`);
  assertCondition(
    new Date(ms).toISOString() === value.replace("Z", ".000Z"),
    `${label} not canonical UTC`,
  );
  return value;
}

function canonicalUint64(value: unknown, label: string): string {
  assertCondition(
    typeof value === "string" && /^(0|[1-9][0-9]{0,19})$/.test(value),
    `${label} must be canonical uint64 text`,
  );
  const n = BigInt(value);
  assertCondition(n <= 18446744073709551615n, `${label} exceeds uint64`);
  return value;
}

function readJsonFile(file: string, label: string): unknown {
  const resolved = path.resolve(file);
  const stat = fs.lstatSync(resolved);
  assertCondition(!stat.isSymbolicLink(), `${label} symlink forbidden`);
  assertCondition(stat.isFile(), `${label} must be a regular file`);
  assertCondition(stat.size <= MAX_JSON_BYTES, `${label} exceeds size bound`);
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

export function verifyDatanetPromotionPacketDirectoryV1(
  packetDir: string,
): {
  assembly_id: string;
  assembly_manifest_sha256: string;
  candidate_id: string;
  promotion_candidate_sha256: string;
} {
  const resolved = path.resolve(packetDir);
  const stat = fs.lstatSync(resolved);
  assertCondition(!stat.isSymbolicLink(), "packet directory symlink forbidden");
  assertCondition(stat.isDirectory(), "packet directory must be a directory");
  const files = fs.readdirSync(resolved).sort();
  assertCondition(
    JSON.stringify(files) === JSON.stringify([...PACKET_FILES].sort()),
    "packet file set invalid",
  );

  const manifest = record(
    readJsonFile(path.join(resolved, "assembly-manifest.json"), "assembly manifest"),
    "assembly manifest",
  );
  assertCondition(
    manifest.marker === "VOID_DATANET_PROMOTION_PACKET_ASSEMBLY_V1",
    "assembly manifest marker invalid",
  );
  assertCondition(manifest.version === 1, "assembly manifest version invalid");
  const assemblyId = String(manifest.assembly_id ?? "");
  assertCondition(ASSEMBLY_ID.test(assemblyId), "assembly_id invalid");

  const manifestBody = { ...manifest };
  delete manifestBody.assembly_id;
  assertCondition(
    assemblyId === "voiddppa1_" + shaJson(manifestBody),
    "assembly_id does not match canonical manifest body",
  );

  const phase = record(manifest.phase_context, "manifest phase_context");
  assertCondition(phase.phase === 0, "packet phase must be 0");
  assertCondition(
    phase.authority_mode === "PHASE0_OPERATOR_ROOTED",
    "packet authority mode changed",
  );
  assertCondition(
    phase.validator_admission_authority_active === false,
    "validator admission authority must remain inactive",
  );

  const admission = record(manifest.admission, "manifest admission");
  assertCondition(
    admission.disposition === "PHASE0_OPERATOR_REVIEW_ONLY",
    "packet disposition must remain operator-review-only",
  );
  assertCondition(
    admission.operator_review_required === true,
    "packet must require operator review",
  );
  assertCondition(
    admission.canonical_write_authorized === false,
    "packet must not authorize canonical write",
  );
  assertCondition(
    admission.automatic_promotion === false,
    "packet must not enable automatic promotion",
  );

  const authority = record(manifest.authority, "manifest authority");
  assertCondition(authority.evidence_only === true, "manifest must be evidence only");
  for (const [key, value] of Object.entries(authority)) {
    if (key === "evidence_only") continue;
    assertCondition(value === false, `manifest authority ${key} must be false`);
  }

  const external = readJsonFile(
    path.join(resolved, "external-evidence.json"),
    "external evidence",
  );
  const source = readJsonFile(
    path.join(resolved, "source-bundle.json"),
    "source bundle",
  );
  const evidenceMap = readJsonFile(
    path.join(resolved, "evidence-map.json"),
    "evidence map",
  );
  const candidate = record(
    readJsonFile(
      path.join(resolved, "promotion-candidate.json"),
      "promotion candidate",
    ),
    "promotion candidate",
  );

  const evidence = record(manifest.evidence, "manifest evidence");
  const externalAttestation = record(
    manifest.external_attestation,
    "manifest external_attestation",
  );
  assertCondition(
    externalAttestation.external_evidence_sha256 === shaJson(external),
    "external evidence hash mismatch",
  );
  assertCondition(
    evidence.source_bundle_sha256 === shaJson(source),
    "source bundle hash mismatch",
  );
  assertCondition(
    evidence.evidence_map_sha256 === shaJson(evidenceMap),
    "evidence map hash mismatch",
  );
  const candidateSha = shaJson(candidate);
  assertCondition(
    evidence.promotion_candidate_sha256 === candidateSha,
    "promotion candidate hash mismatch",
  );

  assertCondition(
    candidate.marker === "VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1",
    "promotion candidate marker invalid",
  );
  const candidateObject = record(candidate.candidate, "candidate candidate");
  const candidateId = String(candidateObject.candidate_id ?? "");
  assertCondition(CANDIDATE_ID.test(candidateId), "candidate_id invalid");
  assertCondition(
    evidence.candidate_id === candidateId,
    "manifest/candidate candidate_id mismatch",
  );
  const candidatePhase = record(candidate.phase_context, "candidate phase_context");
  assertCondition(candidatePhase.phase === 0, "candidate phase must be 0");
  assertCondition(
    candidatePhase.authority_mode === "PHASE0_OPERATOR_ROOTED",
    "candidate authority mode changed",
  );
  const candidateAdmission = record(candidate.admission, "candidate admission");
  assertCondition(
    candidateAdmission.disposition === "PHASE0_OPERATOR_REVIEW_ONLY",
    "candidate disposition changed",
  );
  assertCondition(
    candidateAdmission.canonical_write_authorized === false,
    "candidate must not authorize canonical write",
  );
  assertCondition(
    candidateAdmission.automatic_promotion === false,
    "candidate must not enable automatic promotion",
  );

  return {
    assembly_id: assemblyId,
    assembly_manifest_sha256: shaJson(manifest),
    candidate_id: candidateId,
    promotion_candidate_sha256: candidateSha,
  };
}

export function initialDatanetPhase0SovereignReviewStateV1(
  assemblyId: string,
): DatanetPhase0SovereignReviewStateV1 {
  assertCondition(ASSEMBLY_ID.test(assemblyId), "initial assembly_id invalid");
  return {
    marker: DATANET_PHASE0_SOVEREIGN_REVIEW_STATE_MARKER_V1,
    version: 1,
    assembly_id: assemblyId,
    last_sequence: null,
    last_decision_sha256: ZERO_SHA256,
    status: "PENDING_REVIEW",
    terminal: false,
    separate_canonical_preparation_eligible: false,
    chain2050_write_authorized: false,
    automatic_promotion: false,
  };
}

function validateState(
  value: unknown,
): DatanetPhase0SovereignReviewStateV1 {
  const state = record(value, "review state");
  exactKeys(state, "review state", [
    "marker",
    "version",
    "assembly_id",
    "last_sequence",
    "last_decision_sha256",
    "status",
    "terminal",
    "separate_canonical_preparation_eligible",
    "chain2050_write_authorized",
    "automatic_promotion",
  ]);
  assertCondition(
    state.marker === DATANET_PHASE0_SOVEREIGN_REVIEW_STATE_MARKER_V1,
    "review state marker invalid",
  );
  assertCondition(state.version === 1, "review state version invalid");
  assertCondition(
    typeof state.assembly_id === "string" && ASSEMBLY_ID.test(state.assembly_id),
    "review state assembly_id invalid",
  );
  if (state.last_sequence !== null) {
    canonicalUint64(state.last_sequence, "review state last_sequence");
  }
  assertCondition(
    typeof state.last_decision_sha256 === "string"
      && SHA256.test(state.last_decision_sha256),
    "review state last_decision_sha256 invalid",
  );
  assertCondition(typeof state.terminal === "boolean", "review state terminal invalid");
  assertCondition(
    typeof state.separate_canonical_preparation_eligible === "boolean",
    "review state preparation eligibility invalid",
  );
  assertCondition(
    state.chain2050_write_authorized === false,
    "review state must not authorize Chain-2050 write",
  );
  assertCondition(
    state.automatic_promotion === false,
    "review state must not enable automatic promotion",
  );
  assertCondition(
    state.status === "PENDING_REVIEW"
      || state.status === "HOLD"
      || state.status === "APPROVED_FOR_SEPARATE_CANONICAL_PREPARATION"
      || state.status === "REJECTED",
    "review state status invalid",
  );

  if (state.status === "PENDING_REVIEW") {
    assertCondition(
      state.last_sequence === null,
      "pending review state must not have a sequence",
    );
    assertCondition(
      state.last_decision_sha256 === ZERO_SHA256,
      "pending review state predecessor must be zero",
    );
    assertCondition(
      state.terminal === false
        && state.separate_canonical_preparation_eligible === false,
      "pending review state flags invalid",
    );
  } else {
    assertCondition(
      state.last_sequence !== null,
      "decided review state must have a sequence",
    );
    assertCondition(
      state.last_decision_sha256 !== ZERO_SHA256,
      "decided review state must have a nonzero decision hash",
    );
    if (state.status === "HOLD") {
      assertCondition(
        state.terminal === false
          && state.separate_canonical_preparation_eligible === false,
        "HOLD review state flags invalid",
      );
    } else if (
      state.status === "APPROVED_FOR_SEPARATE_CANONICAL_PREPARATION"
    ) {
      assertCondition(
        state.terminal === true
          && state.separate_canonical_preparation_eligible === true,
        "approved review state flags invalid",
      );
    } else {
      assertCondition(
        state.terminal === true
          && state.separate_canonical_preparation_eligible === false,
        "rejected review state flags invalid",
      );
    }
  }

  return state as DatanetPhase0SovereignReviewStateV1;
}

function validatePreparationBoundary(
  value: unknown,
  decision: DatanetPhase0SovereignReviewDecisionKindV1,
): void {
  const boundary = record(value, "preparation boundary");
  exactKeys(boundary, "preparation boundary", PREPARATION_KEYS);
  const eligible =
    decision === "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION";
  assertCondition(
    boundary.separate_canonical_preparation_eligible === eligible,
    "preparation eligibility does not match decision",
  );
  for (const key of PREPARATION_KEYS) {
    if (key === "separate_canonical_preparation_eligible") continue;
    assertCondition(boundary[key] === false, `${key} must remain false`);
  }
}

function validateReason(
  decision: DatanetPhase0SovereignReviewDecisionKindV1,
  reason: unknown,
): string {
  assertCondition(typeof reason === "string", "reason_code must be a string");
  const allowed =
    decision === "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION"
      ? APPROVE_REASONS
      : decision === "HOLD"
        ? HOLD_REASONS
        : REJECT_REASONS;
  assertCondition(allowed.has(reason), "reason_code invalid for decision");
  return reason;
}

function decisionBody(
  decision: RecordValue,
): RecordValue {
  const body = { ...decision };
  delete body.signature_base64;
  delete body.decision_id;
  return body;
}

export function canonicalDatanetPhase0SovereignReviewPayloadV1(
  decision: RecordValue,
): Buffer {
  return Buffer.from(
    DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNATURE_DOMAIN_V1
      + "\n"
      + datanetPromotionCanonicalJsonV1(decisionBody(decision)),
    "utf8",
  );
}

export function hashDatanetPhase0SovereignReviewDecisionV1(
  decision: RecordValue,
): string {
  return shaJson(decision);
}

export function admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1(
  input: {
    state: unknown;
    packet_dir: string;
    decision: unknown;
    public_key_pem: string | Buffer;
    expected_signer_der_sha256: string;
  },
): DatanetPhase0SovereignReviewStateV1 {
  const state = validateState(input.state);
  assertCondition(!state.terminal, "review state is terminal");

  const packet = verifyDatanetPromotionPacketDirectoryV1(input.packet_dir);
  assertCondition(
    state.assembly_id === packet.assembly_id,
    "review state assembly does not match packet",
  );

  const decision = record(input.decision, "review decision");
  exactKeys(decision, "review decision", DECISION_KEYS);
  assertCondition(
    decision.marker === DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_MARKER_V1,
    "review decision marker invalid",
  );
  assertCondition(decision.version === 1, "review decision version invalid");
  assertCondition(decision.chain_id === 2050, "review decision chain_id invalid");
  assertCondition(decision.phase === 0, "review decision phase invalid");
  assertCondition(
    decision.authority_mode === "PHASE0_OPERATOR_ROOTED",
    "review decision authority mode invalid",
  );
  assertCondition(decision.assembly_id === packet.assembly_id, "decision assembly mismatch");
  assertCondition(
    decision.assembly_manifest_sha256 === packet.assembly_manifest_sha256,
    "decision assembly manifest hash mismatch",
  );
  assertCondition(decision.candidate_id === packet.candidate_id, "decision candidate mismatch");
  assertCondition(
    decision.promotion_candidate_sha256 === packet.promotion_candidate_sha256,
    "decision candidate hash mismatch",
  );

  const sequence = canonicalUint64(decision.sequence, "decision sequence");
  const expectedSequence =
    state.last_sequence === null
      ? "0"
      : String(BigInt(state.last_sequence) + 1n);
  assertCondition(sequence === expectedSequence, "review decision sequence mismatch");
  assertCondition(
    decision.previous_decision_sha256 === state.last_decision_sha256,
    "review decision predecessor mismatch",
  );

  assertCondition(
    decision.decision === "HOLD"
      || decision.decision === "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION"
      || decision.decision === "REJECT",
    "review decision kind invalid",
  );
  const kind = decision.decision as DatanetPhase0SovereignReviewDecisionKindV1;
  validateReason(kind, decision.reason_code);
  assertCondition(
    typeof decision.review_evidence_sha256 === "string"
      && SHA256.test(decision.review_evidence_sha256),
    "review evidence hash invalid",
  );
  canonicalUtc(decision.decided_at_utc, "decided_at_utc");
  assertCondition(
    decision.signer_role === DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNER_ROLE_V1,
    "review signer role invalid",
  );
  assertCondition(
    decision.signer_public_key_der_sha256 === input.expected_signer_der_sha256,
    "review signer fingerprint field mismatch",
  );
  assertCondition(
    decision.signature_algorithm === "Ed25519",
    "review signature algorithm invalid",
  );
  assertCondition(
    decision.signature_domain === DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNATURE_DOMAIN_V1,
    "review signature domain invalid",
  );
  validatePreparationBoundary(decision.preparation_boundary, kind);

  assertCondition(
    typeof decision.signature_base64 === "string",
    "review signature must be base64 text",
  );
  assertCondition(
    typeof decision.decision_id === "string" && DECISION_ID.test(decision.decision_id),
    "review decision_id invalid",
  );

  const withoutId = { ...decision };
  delete withoutId.decision_id;
  assertCondition(
    decision.decision_id === "voiddpsr1_" + shaJson(withoutId),
    "review decision_id does not match canonical envelope",
  );

  const signature = verifyVoidEd25519SignatureAgainstFingerprintV1(
    input.public_key_pem,
    input.expected_signer_der_sha256,
    canonicalDatanetPhase0SovereignReviewPayloadV1(decision),
    decision.signature_base64,
  );
  assertCondition(signature.ok === true, `review signature rejected: ${signature.code}`);

  const decisionHash = hashDatanetPhase0SovereignReviewDecisionV1(decision);
  if (kind === "HOLD") {
    return {
      ...state,
      last_sequence: sequence,
      last_decision_sha256: decisionHash,
      status: "HOLD",
      terminal: false,
      separate_canonical_preparation_eligible: false,
    };
  }
  if (kind === "REJECT") {
    return {
      ...state,
      last_sequence: sequence,
      last_decision_sha256: decisionHash,
      status: "REJECTED",
      terminal: true,
      separate_canonical_preparation_eligible: false,
    };
  }
  return {
    ...state,
    last_sequence: sequence,
    last_decision_sha256: decisionHash,
    status: "APPROVED_FOR_SEPARATE_CANONICAL_PREPARATION",
    terminal: true,
    separate_canonical_preparation_eligible: true,
  };
}

export function admitDatanetPhase0SovereignReviewDecisionV1(
  input: {
    state: unknown;
    packet_dir: string;
    decision: unknown;
    public_key_pem: string | Buffer;
  },
): DatanetPhase0SovereignReviewStateV1 {
  return admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    ...input,
    expected_signer_der_sha256:
      VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  });
}

function main(): void {
  const [mode, packetDir, statePath, decisionPath, publicKeyPath, outPath, ...extra] =
    process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected extra arguments");
  assertCondition(
    mode === "verify",
    "usage: verify <packet-dir> <state.json> <decision.json> <public-key.pem> <next-state.json>",
  );
  assertCondition(
    Boolean(packetDir && statePath && decisionPath && publicKeyPath && outPath),
    "missing required arguments",
  );
  const output = path.resolve(outPath!);
  assertCondition(!fs.existsSync(output), "refusing to overwrite next-state output");
  const state = readJsonFile(statePath!, "review state");
  const decision = readJsonFile(decisionPath!, "review decision");
  const publicKey = fs.readFileSync(path.resolve(publicKeyPath!), "utf8");
  const next = admitDatanetPhase0SovereignReviewDecisionV1({
    state,
    packet_dir: packetDir!,
    decision,
    public_key_pem: publicKey,
  });
  fs.writeFileSync(
    output,
    JSON.stringify(next, null, 2) + "\n",
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  console.log("VOID_DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_V1_GREEN");
  console.log(`assembly_id=${next.assembly_id}`);
  console.log(`status=${next.status}`);
  console.log(`terminal=${String(next.terminal)}`);
  console.log(
    `separate_canonical_preparation_eligible=${String(next.separate_canonical_preparation_eligible)}`,
  );
  console.log("chain2050_write_authorized=false");
  console.log("automatic_promotion=false");
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (invokedUrl === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(
      "HOLD: " + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 1;
  }
}
