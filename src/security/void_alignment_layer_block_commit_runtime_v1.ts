import { createHash } from "node:crypto";

import {
  VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1,
  VOID_ALIGNMENT_LAYER_VERSION_V1,
  VOID_MAINNET_CHAIN_ID_V1,
  evaluateVoidAlignmentLayerV1,
  getVoidAlignmentLayerRequiredChecksV1,
  type VoidAlCheckResultV1,
  type VoidAlDecisionV1,
} from "./void_alignment_layer_v1.js";
import {
  blockProposerAuthorityRequiredFromEnv,
  validateBlockForAppend,
  verifyBlockSignatureWithPubkey,
  type Block,
} from "../chain/block.js";
import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  validateLegacyCommitDirectV2fsForAppendV1,
} from "../chain/legacy_commit_direct_v2fs_v1.js";
import { SegStore } from "../chain/seg_store.js";

export const VOID_AL_BLOCK_COMMIT_RUNTIME_V1 =
  "VOID_AL_BLOCK_COMMIT_RUNTIME_V1" as const;
export const VOID_AL_BLOCK_COMMIT_RUNTIME_ENABLE_ENV_V1 =
  "VOID_AL_BLOCK_COMMIT_RUNTIME_V1" as const;
export const VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1 =
  "VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1" as const;
export const VOID_AL_BLOCK_HEAD_DIRECT_BYPASS_V1 =
  "VOID_AL_BLOCK_HEAD_DIRECT_BYPASS_V1" as const;
export const VOID_AL_BLOCK_HEAD_RECOVERY_V1 =
  "VOID_AL_BLOCK_HEAD_RECOVERY_V1" as const;
export const VOID_AL_BLOCK_COMMIT_MUTATION_EXCEPTION_V1 =
  "VOID_AL_BLOCK_COMMIT_MUTATION_EXCEPTION_V1" as const;
export const VOID_AL_BLOCK_COMMIT_POLICY_DRIFT_V1 =
  "VOID_AL_BLOCK_COMMIT_POLICY_DRIFT_V1" as const;
export const VOID_AL_BLOCK_COMMIT_SAFE_MODE_V1 =
  "VOID_AL_BLOCK_COMMIT_SAFE_MODE_V1" as const;
export const VOID_AL_BLOCK_HEAD_RECOVERY_MAX_SPAN_V1 = 10_000;

export type VoidAlBlockCommitModeV1 = "modern" | "legacy-v2fs";

type HeldDisposition = "reject" | "quarantine" | "safe_mode";
type ValidationLike = { ok: boolean; reason?: string };
type ReplayPending = {
  candidate: any;
  mode: VoidAlBlockCommitModeV1;
  pre_head: number;
  mutation_sha256: string;
  actor_id_sha256: string;
};
type GateContext = {
  kind: "canonical" | "wal-replay";
  pending_replay?: ReplayPending;
};
type RuntimeState = {
  safe_mode: boolean;
  safe_mode_reason: string;
  authority_policy_sha256: string;
  quarantined_actors: Set<string>;
  contexts: WeakMap<object, GateContext>;
  counters: {
    pre_accept_total: number;
    post_apply_total: number;
    rejected_total: number;
    quarantined_total: number;
    safe_mode_total: number;
    direct_bypass_total: number;
    direct_head_bypass_total: number;
    direct_head_recovery_total: number;
    mutation_exception_total: number;
  };
};

export type VoidAlBlockCommitRuntimeStatusV1 = {
  marker: typeof VOID_AL_BLOCK_COMMIT_RUNTIME_V1;
  version: 1;
  enabled: boolean;
  installed: boolean;
  safe_mode: boolean;
  safe_mode_reason: string;
  quarantined_actor_count: number;
  pre_accept_total: number;
  post_apply_total: number;
  rejected_total: number;
  quarantined_total: number;
  safe_mode_total: number;
  direct_bypass_total: number;
  direct_head_bypass_total: number;
  direct_head_recovery_total: number;
  mutation_exception_total: number;
  ordinary_authentication_changed: false;
  sovereign_usb_access: false;
  production_signature_required_to_install: false;
  money_movement: false;
};

export class VoidAlBlockCommitRuntimeHeldErrorV1 extends Error {
  readonly marker = VOID_AL_BLOCK_COMMIT_RUNTIME_V1;
  readonly version = 1 as const;

  constructor(
    readonly code: string,
    readonly disposition: HeldDisposition,
    readonly evidence_sha256: string,
  ) {
    super(`${code}:${disposition}:${evidence_sha256}`);
    this.name = "VoidAlBlockCommitRuntimeHeldErrorV1";
  }
}

const installations = new WeakMap<object, RuntimeState>();
const ZERO_SHA256 = "0".repeat(64);
const HEX64_RE = /^[0-9a-f]{64}$/;
const VOLATILE_AUTHORITY_CONTEXT_KEYS = new Set([
  "VOID_BLOCK_PROPOSER_EPOCH",
  "VOID_BLOCK_PROPOSER_SLOT",
  "VOID_VALIDATOR_RUNTIME_EPOCH",
  "VOID_VALIDATOR_RUNTIME_SLOT",
]);

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non_finite_number");
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") return JSON.stringify(value.toString(10));
  if (typeof value === "undefined") return "null";
  if (typeof value !== "object") throw new Error("unsupported_json_value");
  if (seen.has(value as object)) throw new Error("cyclic_json_value");
  seen.add(value as object);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => stableJson(item, seen)).join(",")}]`;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error("non_plain_json_object");
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => typeof record[key] !== "undefined")
      .sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key], seen)}`)
      .join(",")}}`;
  } finally {
    seen.delete(value as object);
  }
}

function digestCandidate(value: unknown): string {
  return sha256(stableJson(value));
}

function digestCandidateOrZero(value: unknown): string {
  try {
    return digestCandidate(value);
  } catch {
    return ZERO_SHA256;
  }
}

function evidence(id: string, ...parts: unknown[]): string {
  return sha256(stableJson([VOID_AL_BLOCK_COMMIT_RUNTIME_V1, id, ...parts]));
}

function resultReason(result: ValidationLike): string {
  return result.ok ? "valid" : String(result.reason || "invalid");
}

function isAuthorityPolicyEnvironmentKey(key: string): boolean {
  if (VOLATILE_AUTHORITY_CONTEXT_KEYS.has(key)) return false;
  return (
    key === "CHAIN_ID" ||
    key === "DATA_DIR" ||
    key === "VOID_CHAIN_ID" ||
    key === "VOID_DATA_DIR" ||
    key.startsWith("VOID_BLOCK_") ||
    key.startsWith("VOID_VALIDATOR_") ||
    key.startsWith("VOID_REQUIRE_") ||
    key.startsWith("VOID_TRUSTED_")
  );
}

function authorityPolicyDigest(env: NodeJS.ProcessEnv): string {
  const entries = Object.keys(env)
    .filter(isAuthorityPolicyEnvironmentKey)
    .sort()
    .map((key) => [key, String(env[key] ?? "")]);
  return sha256(stableJson(entries));
}

function authorityPolicyInvariant(
  latchedSha256: string,
  env: NodeJS.ProcessEnv,
): { passed: boolean; captured: string; runtime: string; process: string } {
  const runtime = authorityPolicyDigest(env);
  const process = authorityPolicyDigest(process.env);
  return {
    passed:
      runtime === latchedSha256 &&
      process === latchedSha256 &&
      blockProposerAuthorityRequiredFromEnv(env) &&
      blockProposerAuthorityRequiredFromEnv(process.env),
    captured: latchedSha256,
    runtime,
    process,
  };
}

function checksFor(
  phase: "pre_accept" | "post_apply",
  facts: Readonly<Record<string, { passed: boolean; parts: unknown[] }>>,
): VoidAlCheckResultV1[] {
  return getVoidAlignmentLayerRequiredChecksV1(phase, "ordinary_state").map(
    ({ check_id }) => {
      const fact = facts[check_id];
      if (!fact) throw new Error(`missing_internal_al_fact:${check_id}`);
      return {
        check_id,
        passed: fact.passed,
        evidence_sha256: evidence(check_id, ...fact.parts),
      };
    },
  );
}

function chainBinding(env: NodeJS.ProcessEnv) {
  const observed = String(
    env.VOID_CHAIN_ID ?? env.CHAIN_ID ?? VOID_MAINNET_CHAIN_ID_V1,
  ).trim();
  return {
    observed,
    passed: observed === String(VOID_MAINNET_CHAIN_ID_V1),
  };
}

function modeForReplay(candidate: any): VoidAlBlockCommitModeV1 {
  return candidate?._commit === VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1
    ? "legacy-v2fs"
    : "modern";
}

function validateByMode(
  candidate: any,
  parent: Block | null,
  mode: VoidAlBlockCommitModeV1,
): ValidationLike {
  return mode === "legacy-v2fs"
    ? validateLegacyCommitDirectV2fsForAppendV1(candidate, parent as any)
    : validateBlockForAppend(candidate, parent as any);
}

function candidateMatches(a: unknown, b: unknown): boolean {
  const left = digestCandidateOrZero(a);
  return left !== ZERO_SHA256 && left === digestCandidateOrZero(b);
}

function actorSecurity(candidate: any, mode: VoidAlBlockCommitModeV1) {
  if (mode === "legacy-v2fs") {
    const passed =
      candidate?._commit === VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1;
    return {
      passed,
      actor: "legacy-v2fs-authorized-compatibility",
      reason: passed ? "explicit_authorized_legacy_method" : "legacy_marker_missing",
    };
  }

  const proposer = String(candidate?.proposer || "").trim();
  const pubkey = String(candidate?.proposerPubkey || "");
  if (!proposer || !pubkey.trim()) {
    return {
      passed: false,
      actor: proposer || "modern-proposer-missing",
      reason: "proposer_or_pubkey_missing",
    };
  }
  const verified: ValidationLike = verifyBlockSignatureWithPubkey(candidate, pubkey);
  return {
    passed: verified.ok,
    actor: proposer,
    reason: verified.ok ? "block_signature_verified" : resultReason(verified),
  };
}

function evaluatePre(
  store: any,
  candidate: any,
  mode: VoidAlBlockCommitModeV1,
  env: NodeJS.ProcessEnv,
  authorityPolicySha256: string,
) {
  const mutationSha = digestCandidateOrZero(candidate);
  const n = Number(candidate?.number);
  const numberOk = Number.isSafeInteger(n) && n >= 0;

  let head = -1;
  let existing: any = null;
  let parent: Block | null = null;
  let observationOk = true;
  try {
    head = Number(store.loadHeadNumber());
    if (!Number.isSafeInteger(head) || head < -1) observationOk = false;
    if (numberOk && head >= n) existing = store.loadBlock(n);
    if (numberOk && n > 0) parent = store.loadBlock(n - 1);
  } catch {
    observationOk = false;
  }

  const existingExact =
    observationOk && numberOk && head >= n && existing != null &&
    candidateMatches(existing, candidate);
  const nextNumber = observationOk && numberOk && head < n && n === head + 1;
  const validation: ValidationLike =
    observationOk && numberOk
      ? existingExact
        ? { ok: true }
        : validateByMode(candidate, parent, mode)
      : { ok: false, reason: "storage_observation_failed" };

  const actor = actorSecurity(candidate, mode);
  const actorSha = sha256(actor.actor);
  const chain = chainBinding(env);
  const policy = authorityPolicyInvariant(authorityPolicySha256, env);
  const replayPassed = observationOk && (existingExact || nextNumber);
  const transitionPassed =
    observationOk && numberOk && validation.ok && (existingExact || nextNumber);

  const checks = checksFor("pre_accept", {
    "void.al.policy_integrity.v1": {
      passed: policy.passed,
      parts: [
        "latched_proposer_authority_policy",
        VOID_AL_BLOCK_COMMIT_RUNTIME_V1,
        policy.captured,
        policy.runtime,
        policy.process,
      ],
    },
    "void.al.chain_binding.v1": {
      passed: chain.passed,
      parts: [chain.observed, VOID_MAINNET_CHAIN_ID_V1],
    },
    "void.al.closed_schema.v1": {
      passed: HEX64_RE.test(mutationSha) && mutationSha !== ZERO_SHA256,
      parts: [mutationSha],
    },
    "void.al.authority.v1": {
      passed: policy.passed && actor.passed && validation.ok,
      parts: [mode, policy.captured, actor.reason, resultReason(validation)],
    },
    "void.al.actor_security_boundary.v1": {
      passed: actor.passed,
      parts: [mode, actor.reason, actorSha],
    },
    "void.al.replay.v1": {
      passed: replayPassed,
      parts: [head, numberOk ? n : "invalid", existingExact, nextNumber],
    },
    "void.al.transition.v1": {
      passed: transitionPassed,
      parts: [mode, resultReason(validation), head, numberOk ? n : "invalid"],
    },
  });

  return {
    pre_head: head,
    mutation_sha256: mutationSha,
    actor_id_sha256: actorSha,
    decision: evaluateVoidAlignmentLayerV1({
      marker: VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1,
      version: VOID_ALIGNMENT_LAYER_VERSION_V1,
      chain_id: VOID_MAINNET_CHAIN_ID_V1,
      phase: "pre_accept",
      mutation_class: "ordinary_state",
      mutation_sha256: mutationSha,
      actor_id_sha256: actorSha,
      checks,
    }),
  };
}

function evaluatePost(
  store: any,
  candidate: any,
  mode: VoidAlBlockCommitModeV1,
  preHead: number,
  mutationSha: string,
  actorSha: string,
  env: NodeJS.ProcessEnv,
  authorityPolicySha256: string,
): VoidAlDecisionV1 {
  const n = Number(candidate?.number);
  let head = -1;
  let stored: any = null;
  let parent: Block | null = null;
  let observationOk = true;
  try {
    head = Number(store.loadHeadNumber());
    stored = Number.isSafeInteger(n) && n >= 0 ? store.loadBlock(n) : null;
    parent = Number.isSafeInteger(n) && n > 0 ? store.loadBlock(n - 1) : null;
  } catch {
    observationOk = false;
  }

  const storedMatches =
    observationOk && stored != null && candidateMatches(stored, candidate);
  const validation: ValidationLike = storedMatches
    ? validateByMode(stored, parent, mode)
    : { ok: false, reason: "stored_candidate_mismatch" };
  const headConsistent =
    observationOk && Number.isSafeInteger(head) &&
    (n <= preHead ? head >= n : head === n);
  const policy = authorityPolicyInvariant(authorityPolicySha256, env);

  return evaluateVoidAlignmentLayerV1({
    marker: VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1,
    version: VOID_ALIGNMENT_LAYER_VERSION_V1,
    chain_id: VOID_MAINNET_CHAIN_ID_V1,
    phase: "post_apply",
    mutation_class: "ordinary_state",
    mutation_sha256: mutationSha,
    actor_id_sha256: actorSha,
    checks: checksFor("post_apply", {
      "void.al.post.policy_integrity.v1": {
        passed: policy.passed,
        parts: [
          "latched_proposer_authority_policy",
          policy.captured,
          policy.runtime,
          policy.process,
        ],
      },
      "void.al.post.state_root.v1": {
        passed: storedMatches,
        parts: [mutationSha, storedMatches],
      },
      "void.al.post.invariant_recheck.v1": {
        passed: policy.passed && validation.ok,
        parts: [mode, policy.captured, resultReason(validation)],
      },
      "void.al.post.canonical_state.v1": {
        passed: storedMatches && headConsistent,
        parts: [preHead, head, n, storedMatches, headConsistent],
      },
    }),
  });
}

function latch(state: RuntimeState, decision: VoidAlDecisionV1): void {
  if (decision.disposition === "allow") return;
  if (decision.disposition === "reject") {
    state.counters.rejected_total++;
  } else if (decision.disposition === "quarantine") {
    state.counters.quarantined_total++;
    state.quarantined_actors.add(decision.actor_id_sha256);
  } else {
    state.counters.safe_mode_total++;
    state.safe_mode = true;
    state.safe_mode_reason = decision.reason_code;
  }
}

function held(decision: VoidAlDecisionV1): never {
  throw new VoidAlBlockCommitRuntimeHeldErrorV1(
    decision.reason_code,
    decision.disposition === "allow" ? "reject" : decision.disposition,
    decision.evidence_sha256,
  );
}

function assertWritable(state: RuntimeState, actorSha?: string): void {
  if (state.safe_mode) {
    throw new VoidAlBlockCommitRuntimeHeldErrorV1(
      VOID_AL_BLOCK_COMMIT_SAFE_MODE_V1,
      "safe_mode",
      evidence("safe_mode", state.safe_mode_reason),
    );
  }
  if (actorSha && state.quarantined_actors.has(actorSha)) {
    throw new VoidAlBlockCommitRuntimeHeldErrorV1(
      "VOID_AL_BLOCK_COMMIT_ACTOR_QUARANTINED_V1",
      "quarantine",
      evidence("actor_quarantined", actorSha),
    );
  }
}

function safeModeDirectHeadBypass(
  state: RuntimeState,
  reason: string,
  ...parts: unknown[]
): never {
  state.counters.direct_head_bypass_total++;
  state.counters.safe_mode_total++;
  state.safe_mode = true;
  state.safe_mode_reason = VOID_AL_BLOCK_HEAD_DIRECT_BYPASS_V1;
  throw new VoidAlBlockCommitRuntimeHeldErrorV1(
    VOID_AL_BLOCK_HEAD_DIRECT_BYPASS_V1,
    "safe_mode",
    evidence(reason, ...parts),
  );
}

function canonicalCall(
  state: RuntimeState,
  store: any,
  candidate: any,
  mode: VoidAlBlockCommitModeV1,
  original: Function,
  callArgs: any[],
  env: NodeJS.ProcessEnv,
) {
  assertWritable(state);
  const pre = evaluatePre(
    store,
    candidate,
    mode,
    env,
    state.authority_policy_sha256,
  );
  state.counters.pre_accept_total++;
  assertWritable(state, pre.actor_id_sha256);
  if (pre.decision.disposition !== "allow") {
    latch(state, pre.decision);
    held(pre.decision);
  }
  if (state.contexts.has(store)) {
    state.safe_mode = true;
    state.safe_mode_reason = "AL_BLOCK_COMMIT_REENTRANT_CONTEXT";
    state.counters.safe_mode_total++;
    throw new VoidAlBlockCommitRuntimeHeldErrorV1(
      "AL_BLOCK_COMMIT_REENTRANT_CONTEXT",
      "safe_mode",
      evidence("reentrant_context", mode, pre.mutation_sha256),
    );
  }

  state.contexts.set(store, { kind: "canonical" });
  let result: any;
  try {
    result = original.apply(store, callArgs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state.safe_mode = true;
    state.safe_mode_reason = VOID_AL_BLOCK_COMMIT_MUTATION_EXCEPTION_V1;
    state.counters.safe_mode_total++;
    state.counters.mutation_exception_total++;
    throw new VoidAlBlockCommitRuntimeHeldErrorV1(
      VOID_AL_BLOCK_COMMIT_MUTATION_EXCEPTION_V1,
      "safe_mode",
      evidence(
        "canonical_mutation_exception",
        mode,
        pre.pre_head,
        pre.mutation_sha256,
        pre.actor_id_sha256,
        message,
      ),
    );
  } finally {
    state.contexts.delete(store);
  }

  const post = evaluatePost(
    store,
    candidate,
    mode,
    pre.pre_head,
    pre.mutation_sha256,
    pre.actor_id_sha256,
    env,
    state.authority_policy_sha256,
  );
  state.counters.post_apply_total++;
  if (post.disposition !== "allow") {
    latch(state, post);
    held(post);
  }
  return result;
}

function parseEnabled(env: NodeJS.ProcessEnv): boolean {
  const raw = String(env[VOID_AL_BLOCK_COMMIT_RUNTIME_ENABLE_ENV_V1] ?? "").trim();
  if (raw === "" || raw === "0") return false;
  if (raw === "1") return true;
  throw new Error(
    `${VOID_AL_BLOCK_COMMIT_RUNTIME_V1}: ${VOID_AL_BLOCK_COMMIT_RUNTIME_ENABLE_ENV_V1} must be 0 or 1`,
  );
}

function status(
  state: RuntimeState | null,
  installed: boolean,
  enabled: boolean,
): VoidAlBlockCommitRuntimeStatusV1 {
  return {
    marker: VOID_AL_BLOCK_COMMIT_RUNTIME_V1,
    version: 1,
    enabled,
    installed,
    safe_mode: state?.safe_mode ?? false,
    safe_mode_reason: state?.safe_mode_reason ?? "",
    quarantined_actor_count: state?.quarantined_actors.size ?? 0,
    pre_accept_total: state?.counters.pre_accept_total ?? 0,
    post_apply_total: state?.counters.post_apply_total ?? 0,
    rejected_total: state?.counters.rejected_total ?? 0,
    quarantined_total: state?.counters.quarantined_total ?? 0,
    safe_mode_total: state?.counters.safe_mode_total ?? 0,
    direct_bypass_total: state?.counters.direct_bypass_total ?? 0,
    direct_head_bypass_total: state?.counters.direct_head_bypass_total ?? 0,
    direct_head_recovery_total: state?.counters.direct_head_recovery_total ?? 0,
    mutation_exception_total: state?.counters.mutation_exception_total ?? 0,
    ordinary_authentication_changed: false,
    sovereign_usb_access: false,
    production_signature_required_to_install: false,
    money_movement: false,
  };
}

export function installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1(args: {
  prototype: any;
  enabled: boolean;
  env?: NodeJS.ProcessEnv;
}): VoidAlBlockCommitRuntimeStatusV1 {
  const proto = args.prototype;
  if (!proto || typeof proto !== "object") {
    throw new Error(`${VOID_AL_BLOCK_COMMIT_RUNTIME_V1}: prototype required`);
  }
  const prior = installations.get(proto);
  if (prior) return status(prior, true, true);
  if (!args.enabled) return status(null, false, false);

  const env = args.env ?? process.env;
  if (
    !blockProposerAuthorityRequiredFromEnv(env) ||
    !blockProposerAuthorityRequiredFromEnv(process.env)
  ) {
    throw new Error(
      `${VOID_AL_BLOCK_COMMIT_RUNTIME_V1}: proposer authority must remain required`,
    );
  }
  const authorityPolicySha256 = authorityPolicyDigest(env);
  if (authorityPolicyDigest(process.env) !== authorityPolicySha256) {
    throw new Error(
      `${VOID_AL_BLOCK_COMMIT_RUNTIME_V1}: authority policy environment mismatch`,
    );
  }

  const originalSave = proto.saveBlock;
  const originalLegacy = proto.saveAuthorizedLegacyCommitDirectV2fs;
  const originalRaw = proto.saveBlockCommit;
  const originalHead = proto.persistHeadAtomic;
  const originalReplay = proto.replayWalAllBestEffort;
  if (
    typeof originalSave !== "function" ||
    typeof originalLegacy !== "function" ||
    typeof originalRaw !== "function" ||
    typeof originalHead !== "function" ||
    typeof originalReplay !== "function"
  ) {
    throw new Error(`${VOID_AL_BLOCK_COMMIT_RUNTIME_V1}: SegStore commit surface mismatch`);
  }

  const state: RuntimeState = {
    safe_mode: false,
    safe_mode_reason: "",
    authority_policy_sha256: authorityPolicySha256,
    quarantined_actors: new Set<string>(),
    contexts: new WeakMap<object, GateContext>(),
    counters: {
      pre_accept_total: 0,
      post_apply_total: 0,
      rejected_total: 0,
      quarantined_total: 0,
      safe_mode_total: 0,
      direct_bypass_total: 0,
      direct_head_bypass_total: 0,
      direct_head_recovery_total: 0,
      mutation_exception_total: 0,
    },
  };
  installations.set(proto, state);

  proto.saveBlock = function guardedSaveBlock(this: any, ...callArgs: any[]) {
    return canonicalCall(state, this, callArgs[0], "modern", originalSave, callArgs, env);
  };

  proto.saveAuthorizedLegacyCommitDirectV2fs = function guardedLegacy(
    this: any,
    ...callArgs: any[]
  ) {
    return canonicalCall(
      state,
      this,
      callArgs[0],
      "legacy-v2fs",
      originalLegacy,
      callArgs,
      env,
    );
  };

  proto.saveBlockCommit = function guardedRawCommit(this: any, ...callArgs: any[]) {
    assertWritable(state);
    const context = state.contexts.get(this);
    if (context?.kind === "canonical") return originalRaw.apply(this, callArgs);

    if (context?.kind === "wal-replay") {
      if (context.pending_replay) {
        state.safe_mode = true;
        state.safe_mode_reason = "AL_WAL_REPLAY_PENDING_COMMIT_REENTRANT";
        state.counters.safe_mode_total++;
        throw new VoidAlBlockCommitRuntimeHeldErrorV1(
          "AL_WAL_REPLAY_PENDING_COMMIT_REENTRANT",
          "safe_mode",
          evidence("wal_replay_pending_reentrant"),
        );
      }
      const candidate = callArgs[0];
      const mode = modeForReplay(candidate);
      const pre = evaluatePre(
        this,
        candidate,
        mode,
        env,
        state.authority_policy_sha256,
      );
      state.counters.pre_accept_total++;
      assertWritable(state, pre.actor_id_sha256);
      if (pre.decision.disposition !== "allow") {
        latch(state, pre.decision);
        held(pre.decision);
      }
      context.pending_replay = {
        candidate,
        mode,
        pre_head: pre.pre_head,
        mutation_sha256: pre.mutation_sha256,
        actor_id_sha256: pre.actor_id_sha256,
      };
      return originalRaw.apply(this, callArgs);
    }

    state.counters.direct_bypass_total++;
    state.counters.safe_mode_total++;
    state.safe_mode = true;
    state.safe_mode_reason = VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1;
    throw new VoidAlBlockCommitRuntimeHeldErrorV1(
      VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1,
      "safe_mode",
      evidence("direct_raw_commit_bypass", digestCandidateOrZero(callArgs[0] ?? null)),
    );
  };

  proto.persistHeadAtomic = function guardedPersistHead(this: any, ...callArgs: any[]) {
    assertWritable(state);
    const context = state.contexts.get(this);

    if (context?.kind === "canonical") {
      return originalHead.apply(this, callArgs);
    }

    if (context?.kind === "wal-replay") {
      const result = originalHead.apply(this, callArgs);
      if (context.pending_replay) {
        const pending = context.pending_replay;
        context.pending_replay = undefined;
        const post = evaluatePost(
          this,
          pending.candidate,
          pending.mode,
          pending.pre_head,
          pending.mutation_sha256,
          pending.actor_id_sha256,
          env,
          state.authority_policy_sha256,
        );
        state.counters.post_apply_total++;
        if (post.disposition !== "allow") {
          latch(state, post);
          held(post);
        }
      }
      return result;
    }

    const target = Number(callArgs[0]);
    const current = Number(this.loadHeadNumber?.());
    if (
      !Number.isSafeInteger(target) ||
      target < 0 ||
      !Number.isSafeInteger(current) ||
      current < -1 ||
      target < current ||
      target - current > VOID_AL_BLOCK_HEAD_RECOVERY_MAX_SPAN_V1
    ) {
      return safeModeDirectHeadBypass(
        state,
        "direct_head_recovery_shape_invalid",
        current,
        target,
      );
    }
    if (target === current) return undefined;

    for (let n = current + 1; n <= target; n++) {
      const candidate = this.loadBlock?.(n);
      if (!candidate || Number(candidate.number) !== n) {
        return safeModeDirectHeadBypass(
          state,
          "direct_head_recovery_block_missing",
          current,
          target,
          n,
        );
      }

      const mode = modeForReplay(candidate);
      if (mode === "legacy-v2fs") {
        if (typeof this.saveAuthorizedLegacyCommitDirectV2fs !== "function") {
          return safeModeDirectHeadBypass(
            state,
            "direct_head_recovery_legacy_method_missing",
            current,
            target,
            n,
          );
        }
        this.saveAuthorizedLegacyCommitDirectV2fs(candidate);
      } else {
        if (typeof this.saveBlock !== "function") {
          return safeModeDirectHeadBypass(
            state,
            "direct_head_recovery_modern_method_missing",
            current,
            target,
            n,
          );
        }
        this.saveBlock(candidate);
      }

      const observed = Number(this.loadHeadNumber?.());
      if (observed !== n) {
        return safeModeDirectHeadBypass(
          state,
          "direct_head_recovery_head_not_advanced",
          n,
          observed,
        );
      }
      state.counters.direct_head_recovery_total++;
    }

    return undefined;
  };

  proto.replayWalAllBestEffort = function guardedReplay(this: any, ...callArgs: any[]) {
    assertWritable(state);
    const policy = authorityPolicyInvariant(state.authority_policy_sha256, env);
    if (!policy.passed) {
      state.safe_mode = true;
      state.safe_mode_reason = VOID_AL_BLOCK_COMMIT_POLICY_DRIFT_V1;
      state.counters.safe_mode_total++;
      throw new VoidAlBlockCommitRuntimeHeldErrorV1(
        VOID_AL_BLOCK_COMMIT_POLICY_DRIFT_V1,
        "safe_mode",
        evidence("wal_replay_policy_drift", policy.captured, policy.runtime, policy.process),
      );
    }
    if (state.contexts.has(this)) {
      state.safe_mode = true;
      state.safe_mode_reason = "AL_WAL_REPLAY_REENTRANT_CONTEXT";
      state.counters.safe_mode_total++;
      throw new VoidAlBlockCommitRuntimeHeldErrorV1(
        "AL_WAL_REPLAY_REENTRANT_CONTEXT",
        "safe_mode",
        evidence("wal_replay_reentrant_context"),
      );
    }
    const context: GateContext = { kind: "wal-replay" };
    state.contexts.set(this, context);
    try {
      return originalReplay.apply(this, callArgs);
    } finally {
      if (context.pending_replay) {
        state.safe_mode = true;
        state.safe_mode_reason = "AL_WAL_REPLAY_COMMIT_WITHOUT_HEAD_TERMINAL";
        state.counters.safe_mode_total++;
      }
      state.contexts.delete(this);
    }
  };

  return status(state, true, true);
}

export function installVoidAlignmentLayerBlockCommitRuntimeFromEnvironmentV1(
  env: NodeJS.ProcessEnv = process.env,
): VoidAlBlockCommitRuntimeStatusV1 {
  return installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
    prototype: SegStore.prototype as any,
    enabled: parseEnabled(env),
    env,
  });
}

export function getVoidAlignmentLayerBlockCommitRuntimeStatusV1(
  prototype: any = SegStore.prototype as any,
): VoidAlBlockCommitRuntimeStatusV1 {
  const state = installations.get(prototype) ?? null;
  return status(state, state !== null, state !== null);
}
