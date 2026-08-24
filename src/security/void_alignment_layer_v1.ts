import { createHash } from "node:crypto";

export const VOID_ALIGNMENT_LAYER_MARKER_V1 = "VOID_ALIGNMENT_LAYER_V1" as const;
export const VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1 =
  "VOID_ALIGNMENT_LAYER_EVALUATION_REQUEST_V1" as const;
export const VOID_ALIGNMENT_LAYER_DECISION_MARKER_V1 =
  "VOID_ALIGNMENT_LAYER_DECISION_V1" as const;
export const VOID_ALIGNMENT_LAYER_VERSION_V1 = 1 as const;
export const VOID_MAINNET_CHAIN_ID_V1 = 2050 as const;

export type VoidAlPhaseV1 = "pre_accept" | "post_apply";
export type VoidAlMutationClassV1 =
  | "ordinary_state"
  | "governance"
  | "economic"
  | "validator"
  | "work_credit"
  | "emergency_control";
export type VoidAlFailureSeverityV1 = "reject" | "quarantine" | "safe_mode";
export type VoidAlDispositionV1 = "allow" | VoidAlFailureSeverityV1;

export interface VoidAlCheckResultV1 {
  check_id: string;
  passed: boolean;
  evidence_sha256: string;
}

export interface VoidAlEvaluationRequestV1 {
  marker: typeof VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1;
  version: typeof VOID_ALIGNMENT_LAYER_VERSION_V1;
  chain_id: typeof VOID_MAINNET_CHAIN_ID_V1;
  phase: VoidAlPhaseV1;
  mutation_class: VoidAlMutationClassV1;
  mutation_sha256: string;
  actor_id_sha256: string;
  checks: VoidAlCheckResultV1[];
}

export interface VoidAlDecisionV1 {
  marker: typeof VOID_ALIGNMENT_LAYER_DECISION_MARKER_V1;
  version: typeof VOID_ALIGNMENT_LAYER_VERSION_V1;
  chain_id: typeof VOID_MAINNET_CHAIN_ID_V1;
  phase: VoidAlPhaseV1;
  mutation_class: VoidAlMutationClassV1;
  mutation_sha256: string;
  actor_id_sha256: string;
  disposition: VoidAlDispositionV1;
  failed_check_ids: string[];
  evidence_sha256: string;
  reason_code: string;
  safe_mode_required: boolean;
}

export interface VoidAlRequiredCheckV1 {
  check_id: string;
  severity: VoidAlFailureSeverityV1;
}

export interface VoidSafeModePolicyV1 {
  marker: "VOID_ALIGNMENT_LAYER_SAFE_MODE_POLICY_V1";
  version: 1;
  block_sealing: false;
  block_import: false;
  transaction_admission: false;
  governance_mutation: false;
  validator_mutation: false;
  economic_settlement: false;
  work_credit_mutation: false;
  treasury_mutation: false;
  runtime_activation: false;
  read_only_health: true;
  read_only_diagnostics: true;
  evidence_export: true;
  automatic_resume_allowed: false;
  sovereign_resume_required: true;
}

const HEX64_RE = /^[0-9a-f]{64}$/;
const ZERO_SHA256 = "0".repeat(64);

function requiredChecks(
  ...entries: VoidAlRequiredCheckV1[]
): readonly VoidAlRequiredCheckV1[] {
  return Object.freeze(
    entries.map((entry) => Object.freeze({ ...entry })),
  );
}

const PRE_COMMON = requiredChecks(
  { check_id: "void.al.policy_integrity.v1", severity: "safe_mode" },
  { check_id: "void.al.chain_binding.v1", severity: "reject" },
  { check_id: "void.al.closed_schema.v1", severity: "reject" },
  { check_id: "void.al.authority.v1", severity: "reject" },
  { check_id: "void.al.actor_security_boundary.v1", severity: "quarantine" },
  { check_id: "void.al.replay.v1", severity: "reject" },
  { check_id: "void.al.transition.v1", severity: "reject" },
);

const PRE_ADDITIONS: Readonly<
  Record<VoidAlMutationClassV1, readonly VoidAlRequiredCheckV1[]>
> = Object.freeze({
  ordinary_state: requiredChecks(),
  governance: requiredChecks(
    { check_id: "void.al.key_role.v1", severity: "reject" },
    { check_id: "void.al.constitutional_scope.v1", severity: "reject" },
  ),
  economic: requiredChecks(
    { check_id: "void.al.economic_conservation.v1", severity: "reject" },
    { check_id: "void.al.treasury_boundary.v1", severity: "reject" },
  ),
  validator: requiredChecks(
    { check_id: "void.al.validator_authority.v1", severity: "reject" },
    { check_id: "void.al.consensus_boundary.v1", severity: "reject" },
  ),
  work_credit: requiredChecks(
    { check_id: "void.al.work_credit_authority.v1", severity: "reject" },
    { check_id: "void.al.settlement_boundary.v1", severity: "reject" },
  ),
  emergency_control: requiredChecks(
    { check_id: "void.al.sovereign_emergency_signature.v1", severity: "reject" },
    { check_id: "void.al.pause_state_machine.v1", severity: "reject" },
  ),
});

const POST_COMMON = requiredChecks(
  { check_id: "void.al.post.policy_integrity.v1", severity: "safe_mode" },
  { check_id: "void.al.post.state_root.v1", severity: "safe_mode" },
  { check_id: "void.al.post.invariant_recheck.v1", severity: "safe_mode" },
);

const POST_ADDITIONS: Readonly<
  Record<VoidAlMutationClassV1, readonly VoidAlRequiredCheckV1[]>
> = Object.freeze({
  ordinary_state: requiredChecks(
    { check_id: "void.al.post.canonical_state.v1", severity: "safe_mode" },
  ),
  governance: requiredChecks(
    { check_id: "void.al.post.role_generation.v1", severity: "safe_mode" },
  ),
  economic: requiredChecks(
    { check_id: "void.al.post.economic_conservation.v1", severity: "safe_mode" },
  ),
  validator: requiredChecks(
    { check_id: "void.al.post.validator_set.v1", severity: "safe_mode" },
  ),
  work_credit: requiredChecks(
    { check_id: "void.al.post.work_credit_ledger.v1", severity: "safe_mode" },
  ),
  emergency_control: requiredChecks(
    { check_id: "void.al.post.pause_state.v1", severity: "safe_mode" },
  ),
});

const PHASES = new Set<VoidAlPhaseV1>(["pre_accept", "post_apply"]);
const MUTATION_CLASSES = new Set<VoidAlMutationClassV1>([
  "ordinary_state",
  "governance",
  "economic",
  "validator",
  "work_credit",
  "emergency_control",
]);
const DISPOSITION_RANK: Readonly<Record<VoidAlFailureSeverityV1, number>> =
  Object.freeze({
    reject: 1,
    quarantine: 2,
    safe_mode: 3,
  });

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function isHex64(value: unknown): value is string {
  return typeof value === "string" && HEX64_RE.test(value);
}

function validPhase(value: unknown): value is VoidAlPhaseV1 {
  return typeof value === "string" && PHASES.has(value as VoidAlPhaseV1);
}

function validMutationClass(value: unknown): value is VoidAlMutationClassV1 {
  return (
    typeof value === "string" &&
    MUTATION_CLASSES.has(value as VoidAlMutationClassV1)
  );
}

function malformedDecision(raw: unknown, reasonCode: string): VoidAlDecisionV1 {
  const record = isRecord(raw) ? raw : {};
  const phase: VoidAlPhaseV1 = validPhase(record.phase)
    ? record.phase
    : "post_apply";
  const mutationClass: VoidAlMutationClassV1 = validMutationClass(
    record.mutation_class,
  )
    ? record.mutation_class
    : "ordinary_state";
  const mutationSha = isHex64(record.mutation_sha256)
    ? record.mutation_sha256
    : ZERO_SHA256;
  const actorSha = isHex64(record.actor_id_sha256)
    ? record.actor_id_sha256
    : ZERO_SHA256;
  const disposition: VoidAlFailureSeverityV1 =
    phase === "post_apply" ? "safe_mode" : "reject";

  return {
    marker: VOID_ALIGNMENT_LAYER_DECISION_MARKER_V1,
    version: VOID_ALIGNMENT_LAYER_VERSION_V1,
    chain_id: VOID_MAINNET_CHAIN_ID_V1,
    phase,
    mutation_class: mutationClass,
    mutation_sha256: mutationSha,
    actor_id_sha256: actorSha,
    disposition,
    failed_check_ids: [],
    evidence_sha256: sha256(
      JSON.stringify([
        VOID_ALIGNMENT_LAYER_MARKER_V1,
        "malformed",
        reasonCode,
        phase,
        mutationClass,
        mutationSha,
        actorSha,
      ]),
    ),
    reason_code: reasonCode,
    safe_mode_required: disposition === "safe_mode",
  };
}

export function getVoidAlignmentLayerRequiredChecksV1(
  phase: VoidAlPhaseV1,
  mutationClass: VoidAlMutationClassV1,
): VoidAlRequiredCheckV1[] {
  const common = phase === "pre_accept" ? PRE_COMMON : POST_COMMON;
  const additions =
    phase === "pre_accept"
      ? PRE_ADDITIONS[mutationClass]
      : POST_ADDITIONS[mutationClass];
  return [...common, ...additions].map((entry) => ({ ...entry }));
}

export function evaluateVoidAlignmentLayerV1(raw: unknown): VoidAlDecisionV1 {
  if (!isRecord(raw)) return malformedDecision(raw, "AL_REQUEST_NOT_OBJECT");
  if (
    !hasExactKeys(raw, [
      "marker",
      "version",
      "chain_id",
      "phase",
      "mutation_class",
      "mutation_sha256",
      "actor_id_sha256",
      "checks",
    ])
  ) {
    return malformedDecision(raw, "AL_REQUEST_SCHEMA_NOT_CLOSED");
  }
  if (raw.marker !== VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1) {
    return malformedDecision(raw, "AL_REQUEST_MARKER_MISMATCH");
  }
  if (raw.version !== VOID_ALIGNMENT_LAYER_VERSION_V1) {
    return malformedDecision(raw, "AL_REQUEST_VERSION_MISMATCH");
  }
  if (raw.chain_id !== VOID_MAINNET_CHAIN_ID_V1) {
    return malformedDecision(raw, "AL_REQUEST_CHAIN_MISMATCH");
  }
  if (!validPhase(raw.phase)) {
    return malformedDecision(raw, "AL_REQUEST_PHASE_INVALID");
  }
  if (!validMutationClass(raw.mutation_class)) {
    return malformedDecision(raw, "AL_REQUEST_MUTATION_CLASS_INVALID");
  }
  if (!isHex64(raw.mutation_sha256) || !isHex64(raw.actor_id_sha256)) {
    return malformedDecision(raw, "AL_REQUEST_IDENTITY_HASH_INVALID");
  }
  if (!Array.isArray(raw.checks)) {
    return malformedDecision(raw, "AL_CHECKS_NOT_ARRAY");
  }

  const required = getVoidAlignmentLayerRequiredChecksV1(
    raw.phase,
    raw.mutation_class,
  );
  const requiredById = new Map(
    required.map((entry) => [entry.check_id, entry] as const),
  );
  const checksById = new Map<string, VoidAlCheckResultV1>();

  for (const candidate of raw.checks) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ["check_id", "passed", "evidence_sha256"])
    ) {
      return malformedDecision(raw, "AL_CHECK_SCHEMA_NOT_CLOSED");
    }
    if (
      typeof candidate.check_id !== "string" ||
      typeof candidate.passed !== "boolean" ||
      !isHex64(candidate.evidence_sha256)
    ) {
      return malformedDecision(raw, "AL_CHECK_VALUE_INVALID");
    }
    if (!requiredById.has(candidate.check_id)) {
      return malformedDecision(raw, "AL_UNKNOWN_CHECK_ID");
    }
    if (checksById.has(candidate.check_id)) {
      return malformedDecision(raw, "AL_DUPLICATE_CHECK_ID");
    }
    checksById.set(candidate.check_id, {
      check_id: candidate.check_id,
      passed: candidate.passed,
      evidence_sha256: candidate.evidence_sha256,
    });
  }

  if (checksById.size !== required.length) {
    return malformedDecision(raw, "AL_REQUIRED_CHECK_MISSING");
  }

  const ordered = required
    .map((entry) => {
      const check = checksById.get(entry.check_id);
      if (!check) throw new Error("unreachable_required_check_missing");
      return { ...entry, ...check };
    })
    .sort((a, b) =>
      a.check_id < b.check_id ? -1 : a.check_id > b.check_id ? 1 : 0,
    );

  const failed = ordered.filter((entry) => !entry.passed);
  let disposition: VoidAlDispositionV1 = "allow";
  for (const entry of failed) {
    if (
      disposition === "allow" ||
      DISPOSITION_RANK[entry.severity] >
        DISPOSITION_RANK[disposition as VoidAlFailureSeverityV1]
    ) {
      disposition = entry.severity;
    }
  }

  const evidenceSha = sha256(
    JSON.stringify([
      VOID_ALIGNMENT_LAYER_MARKER_V1,
      VOID_ALIGNMENT_LAYER_VERSION_V1,
      VOID_MAINNET_CHAIN_ID_V1,
      raw.phase,
      raw.mutation_class,
      raw.mutation_sha256,
      raw.actor_id_sha256,
      ordered.map((entry) => [
        entry.check_id,
        entry.severity,
        entry.passed,
        entry.evidence_sha256,
      ]),
    ]),
  );

  return {
    marker: VOID_ALIGNMENT_LAYER_DECISION_MARKER_V1,
    version: VOID_ALIGNMENT_LAYER_VERSION_V1,
    chain_id: VOID_MAINNET_CHAIN_ID_V1,
    phase: raw.phase,
    mutation_class: raw.mutation_class,
    mutation_sha256: raw.mutation_sha256,
    actor_id_sha256: raw.actor_id_sha256,
    disposition,
    failed_check_ids: failed.map((entry) => entry.check_id),
    evidence_sha256: evidenceSha,
    reason_code:
      disposition === "allow" ? "AL_ALLOW" : "AL_REQUIRED_CHECK_FAILED",
    safe_mode_required: disposition === "safe_mode",
  };
}

export function getVoidAlignmentLayerSafeModePolicyV1(): VoidSafeModePolicyV1 {
  return {
    marker: "VOID_ALIGNMENT_LAYER_SAFE_MODE_POLICY_V1",
    version: 1,
    block_sealing: false,
    block_import: false,
    transaction_admission: false,
    governance_mutation: false,
    validator_mutation: false,
    economic_settlement: false,
    work_credit_mutation: false,
    treasury_mutation: false,
    runtime_activation: false,
    read_only_health: true,
    read_only_diagnostics: true,
    evidence_export: true,
    automatic_resume_allowed: false,
    sovereign_resume_required: true,
  };
}
