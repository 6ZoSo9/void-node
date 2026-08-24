import { createHash } from "node:crypto";

import {
  VOID_MAINNET_CHAIN_ID_V1,
  VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1,
  VOID_ALIGNMENT_LAYER_VERSION_V1,
  evaluateVoidAlignmentLayerV1,
  getVoidAlignmentLayerRequiredChecksV1,
  type VoidAlCheckResultV1,
  type VoidAlDecisionV1,
} from "./void_alignment_layer_v1.js";
import {
  blockHash,
  validateBlockForAppend,
  verifyBlockSignatureWithPubkey,
} from "../chain/block.js";
import type { Block } from "../chain/block.js";
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
export const VOID_AL_BLOCK_COMMIT_SAFE_MODE_V1 =
  "VOID_AL_BLOCK_COMMIT_SAFE_MODE_V1" as const;

export type VoidAlBlockCommitModeV1 = "modern" | "legacy-v2fs";
export type VoidAlBlockCommitLeaseKindV1 = "canonical" | "wal-replay";

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
  ordinary_authentication_changed: false;
  sovereign_usb_access: false;
  production_signature_required_to_install: false;
  money_movement: false;
};

export class VoidAlBlockCommitRuntimeHeldErrorV1 extends Error {
  readonly marker = VOID_AL_BLOCK_COMMIT_RUNTIME_V1;
  readonly version = 1 as const;
  readonly code: string;
  readonly disposition: "reject" | "quarantine" | "safe_mode";
  readonly evidence_sha256: string;

  constructor(
    code: string,
    disposition: "reject" | "quarantine" | "safe_mode",
    evidenceSha256: string,
  ) {
    super(`${code}:${disposition}:${evidenceSha256}`);
    this.name = "VoidAlBlockCommitRuntimeHeldErrorV1";
    this.code = code;
    this.disposition = disposition;
    this.evidence_sha256 = evidenceSha256;
  }
}

type GateContextV1 = {
  kind: VoidAlBlockCommitLeaseKindV1;
  mode?: VoidAlBlockCommitModeV1;
  pending_replay?: {
    candidate: any;
    mode: VoidAlBlockCommitModeV1;
    pre_head: number;
    mutation_sha256: string;
    actor_id_sha256: string;
  };
};

type InstallationStateV1 = {
  enabled: boolean;
  safe_mode: boolean;
  safe_mode_reason: string;
  quarantined_actors: Set<string>;
  contexts: WeakMap<object, GateContextV1>;
  counters: {
    pre_accept_total: number;
    post_apply_total: number;
    rejected_total: number;
    quarantined_total: number;
    safe_mode_total: number;
    direct_bypass_total: number;
  };
};

const installations = new WeakMap<object, InstallationStateV1>();
const HEX64_RE = /^[0-9a-f]{64}$/;
const ZERO_SHA256 = "0".repeat(64);

function sha256Bytes(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
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
      return `[${value.map((entry) => stableJson(entry, seen)).join(",")}]`;
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

function canonicalCandidateDigest(candidate: unknown): string {
  return sha256Bytes(stableJson(candidate));
}

function evidence(checkId: string, ...parts: unknown[]): string {
  return sha256Bytes(
    stableJson([
      VOID_AL_BLOCK_COMMIT_RUNTIME_V1,
      checkId,
      ...parts,
    ]),
  );
}

function exactBooleanCheckSet(
  phase: "pre_accept" | "post_apply",
  facts: Readonly<Record<string, { passed: boolean; evidence_parts: unknown[] }>>,
): VoidAlCheckResultV1[] {
  return getVoidAlignmentLayerRequiredChecksV1(phase, "ordinary_state").map(
    ({ check_id }) => {
      const fact = facts[check_id];
      if (!fact) throw new Error(`missing_internal_al_fact:${check_id}`);
      return {
        check_id,
        passed: fact.passed,
        evidence_sha256: evidence(check_id, ...fact.evidence_parts),
      };
    },
  );
}

function runtimeChainBindingV1(env: NodeJS.ProcessEnv): {
  passed: boolean;
  observed: string;
} {
  const observed = String(
    env.VOID_CHAIN_ID ?? env.CHAIN_ID ?? VOID_MAINNET_CHAIN_ID_V1,
  ).trim();
  return {
    passed: observed === String(VOID_MAINNET_CHAIN_ID_V1),
    observed,
  };
}

function modeForReplayCandidate(candidate: any): VoidAlBlockCommitModeV1 {
  return candidate?._commit === VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1
    ? "legacy-v2fs"
    : "modern";
}

function candidateMatches(
  existing: any,
  candidate: any,
): boolean {
  try {
    return canonicalCandidateDigest(existing) === canonicalCandidateDigest(candidate);
  } catch {
    return false;
  }
}

function validateByMode(
  candidate: any,
  parent: Block | null,
  mode: VoidAlBlockCommitModeV1,
) {
  return mode === "legacy-v2fs"
    ? validateLegacyCommitDirectV2fsForAppendV1(candidate, parent as any)
    : validateBlockForAppend(candidate, parent as any);
}

function actorSecurity(
  candidate: any,
  mode: VoidAlBlockCommitModeV1,
): { passed: boolean; actor_material: string; reason: string } {
  if (mode === "legacy-v2fs") {
    const markerOk =
      candidate?._commit === VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1;
    return {
      passed: markerOk,
      actor_material: "legacy-v2fs-authorized-compatibility",
      reason: markerOk ? "explicit_authorized_legacy_method" : "legacy_marker_missing",
    };
  }

  const proposer = String(candidate?.proposer || "").trim();
  const proposerPubkey = String(candidate?.proposerPubkey || "");
  if (!proposer || !proposerPubkey.trim()) {
    return {
      passed: false,
      actor_material: proposer || "modern-proposer-missing",
      reason: "proposer_or_pubkey_missing",
    };
  }
  const verified = verifyBlockSignatureWithPubkey(candidate, proposerPubkey);
  return {
    passed: verified.ok,
    actor_material: proposer,
    reason: verified.ok ? "block_signature_verified" : verified.reason,
  };
}

function evaluatePreAccept(
  store: any,
  candidate: any,
  mode: VoidAlBlockCommitModeV1,
  env: NodeJS.ProcessEnv,
): {
  decision: VoidAlDecisionV1;
  pre_head: number;
  mutation_sha256: string;
  actor_id_sha256: string;
} {
  let mutationSha = ZERO_SHA256;
  let closedSchema = false;
  try {
    mutationSha = canonicalCandidateDigest(candidate);
    closedSchema = HEX64_RE.test(mutationSha);
  } catch {
    closedSchema = false;
  }

  const n = Number(candidate?.number);
  const numberOk = Number.isSafeInteger(n) && n >= 0;
  let head = -1;
  let existing: any = null;
  let parent: Block | null = null;
  let storageObservationOk = true;
  try {
    head = Number(store.loadHeadNumber());
    if (!Number.isSafeInteger(head) || head < -1) storageObservationOk = false;
    if (numberOk && head >= n) existing = store.loadBlock(n);
    if (numberOk && n > 0) parent = store.loadBlock(n - 1);
  } catch {
    storageObservationOk = false;
  }

  const existingExact =
    numberOk && head >= n && existing != null && candidateMatches(existing, candidate);
  const nextNumber = numberOk && head < n && n === head + 1;
  let validation = { ok: false, reason: "storage_observation_failed" } as
    | { ok: true }
    | { ok: false; reason: string };
  if (storageObservationOk && numberOk) {
    validation = existingExact
      ? { ok: true }
      : validateByMode(candidate, parent, mode);
  }

  const actor = actorSecurity(candidate, mode);
  const actorIdSha = sha256Bytes(actor.actor_material);
  const chain = runtimeChainBindingV1(env);
  const replayPassed = storageObservationOk && (existingExact || nextNumber);
  const transitionPassed =
    storageObservationOk && numberOk && validation.ok && (existingExact || nextNumber);

  const checks = exactBooleanCheckSet("pre_accept", {
    "void.al.policy_integrity.v1": {
      passed: true,
      evidence_parts: ["fixed_profile", VOID_AL_BLOCK_COMMIT_RUNTIME_V1],
    },
    "void.al.chain_binding.v1": {
      passed: chain.passed,
      evidence_parts: [chain.observed, VOID_MAINNET_CHAIN_ID_V1],
    },
    "void.al.closed_schema.v1": {
      passed: closedSchema,
      evidence_parts: [closedSchema, mutationSha],
    },
    "void.al.authority.v1": {
      passed: actor.passed && validation.ok,
      evidence_parts: [mode, actor.reason, validation.ok ? "valid" : validation.reason],
    },
    "void.al.actor_security_boundary.v1": {
      passed: actor.passed,
      evidence_parts: [mode, actor.reason, actorIdSha],
    },
    "void.al.replay.v1": {
      passed: replayPassed,
      evidence_parts: [head, numberOk ? n : "invalid", existingExact, nextNumber],
    },
    "void.al.transition.v1": {
      passed: transitionPassed,
      evidence_parts: [mode, validation.ok ? "valid" : validation.reason, head, numberOk ? n : "invalid"],
    },
  });

  return {
    decision: evaluateVoidAlignmentLayerV1({
      marker: VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1,
      version: VOID_ALIGNMENT_LAYER_VERSION_V1,
      chain_id: VOID_MAINNET_CHAIN_ID_V1,
      phase: "pre_accept",
      mutation_class: "ordinary_state",
      mutation_sha256: mutationSha,
      actor_id_sha256: actorIdSha,
      checks,
    }),
    pre_head: head,
    mutation_sha256: mutationSha,
    actor_id_sha256: actorIdSha,
  };
}

function evaluatePostApply(
  store: any,
  candidate: any,
  mode: VoidAlBlockCommitModeV1,
  preHead: number,
  mutationSha: string,
  actorIdSha: string,
): VoidAlDecisionV1 {
  const n = Number(candidate?.number);
  let afterHead = -1;
  let stored: any = null;
  let parent: Block | null = null;
  let observationOk = true;
  try {
    afterHead = Number(store.loadHeadNumber());
    stored = Number.isSafeInteger(n) && n >= 0 ? store.loadBlock(n) : null;
    parent = Number.isSafeInteger(n) && n > 0 ? store.loadBlock(n - 1) : null;
  } catch {
    observationOk = false;
  }

  const storedMatches =
    observationOk && stored != null && candidateMatches(stored, candidate);
  const revalidated = storedMatches
    ? validateByMode(stored, parent, mode)
    : { ok: false, reason: "stored_candidate_mismatch" };
  const headConsistent =
    observationOk &&
    Number.isSafeInteger(afterHead) &&
    (n <= preHead ? afterHead >= n : afterHead === n);

  const checks = exactBooleanCheckSet("post_apply", {
    "void.al.post.policy_integrity.v1": {
      passed: true,
      evidence_parts: ["fixed_profile", VOID_AL_BLOCK_COMMIT_RUNTIME_V1],
    },
    "void.al.post.state_root.v1": {
      passed: storedMatches,
      evidence_parts: [mutationSha, storedMatches],
    },
    "void.al.post.invariant_recheck.v1": {
      passed: revalidated.ok,
      evidence_parts: [mode, revalidated.ok ? "valid" : revalidated.reason],
    },
    "void.al.post.canonical_state.v1": {
      passed: storedMatches && headConsistent,
      evidence_parts: [preHead, afterHead, n, storedMatches, headConsistent],
    },
  });

  return evaluateVoidAlignmentLayerV1({
    marker: VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1,
    version: VOID_ALIGNMENT_LAYER_VERSION_V1,
    chain_id: VOID_MAINNET_CHAIN_ID_V1,
    phase: "post_apply",
    mutation_class: "ordinary_state",
    mutation_sha256: mutationSha,
    actor_id_sha256: actorIdSha,
    checks,
  });
}

function latchDisposition(
  state: InstallationStateV1,
  decision: VoidAlDecisionV1,
): void {
  if (decision.disposition === "allow") return;
  if (decision.disposition === "reject") {
    state.counters.rejected_total++;
    return;
  }
  if (decision.disposition === "quarantine") {
    state.counters.quarantined_total++;
    state.quarantined_actors.add(decision.actor_id_sha256);
    return;
  }
  state.counters.safe_mode_total++;
  state.safe_mode = true;
  state.safe_mode_reason = decision.reason_code;
}

function heldFromDecision(decision: VoidAlDecisionV1): never {
  const disposition =
    decision.disposition === "allow" ? "reject" : decision.disposition;
  throw new VoidAlBlockCommitRuntimeHeldErrorV1(
    decision.reason_code,
    disposition,
    decision.evidence_sha256,
  );
}

function assertRuntimeWritable(
  state: InstallationStateV1,
  actorIdSha?: string,
): void {
  if (state.safe_mode) {
    throw new VoidAlBlockCommitRuntimeHeldErrorV1(
      VOID_AL_BLOCK_COMMIT_SAFE_MODE_V1,
      "safe_mode",
      evidence("safe_mode", state.safe_mode_reason),
    );
  }
  if (actorIdSha && state.quarantined_actors.has(actorIdSha)) {
    throw new VoidAlBlockCommitRuntimeHeldErrorV1(
      "VOID_AL_BLOCK_COMMIT_ACTOR_QUARANTINED_V1",
      "quarantine",
      evidence("actor_quarantined", actorIdSha),
    );
  }
}

function withCanonicalGate(
  state: InstallationStateV1,
  store: any,
  candidate: any,
  mode: VoidAlBlockCommitModeV1,
  original: Function,
  args: any[],
  env: NodeJS.ProcessEnv,
) {
  assertRuntimeWritable(state);
  const pre = evaluatePreAccept(store, candidate, mode, env);
  state.counters.pre_accept_total++;
  assertRuntimeWritable(state, pre.actor_id_sha256);
  if (pre.decision.disposition !== "allow") {
    latchDisposition(state, pre.decision);
    heldFromDecision(pre.decision);
  }

  const previous = state.contexts.get(store);
  if (previous) {
    const decision: VoidAlDecisionV1 = {
      ...pre.decision,
      disposition: "safe_mode",
      reason_code: "AL_BLOCK_COMMIT_REENTRANT_CONTEXT",
      safe_mode_required: true,
      evidence_sha256: evidence(
        "reentrant_context",
        previous.kind,
        mode,
        pre.mutation_sha256,
      ),
    };
    latchDisposition(state, decision);
    heldFromDecision(decision);
  }

  state.contexts.set(store, { kind: "canonical", mode });
  let result: any;
  try {
    result = original.apply(store, args);
  } finally {
    state.contexts.delete(store);
  }

  const post = evaluatePostApply(
    store,
    candidate,
    mode,
    pre.pre_head,
    pre.mutation_sha256,
    pre.actor_id_sha256,
  );
  state.counters.post_apply_total++;
  if (post.disposition !== "allow") {
    latchDisposition(state, post);
    heldFromDecision(post);
  }
  return result;
}

function parseEnableFromEnvironment(env: NodeJS.ProcessEnv): boolean {
  const raw = String(env[VOID_AL_BLOCK_COMMIT_RUNTIME_ENABLE_ENV_V1] ?? "").trim();
  if (raw === "" || raw === "0") return false;
  if (raw === "1") return true;
  throw new Error(
    `${VOID_AL_BLOCK_COMMIT_RUNTIME_V1}: ${VOID_AL_BLOCK_COMMIT_RUNTIME_ENABLE_ENV_V1} must be 0 or 1`,
  );
}

function statusFor(
  state: InstallationStateV1 | null,
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
  const existing = installations.get(proto);
  if (existing) return statusFor(existing, true, existing.enabled);
  if (!args.enabled) return statusFor(null, false, false);

  const originalSaveBlock = proto.saveBlock;
  const originalLegacy = proto.saveAuthorizedLegacyCommitDirectV2fs;
  const originalRawCommit = proto.saveBlockCommit;
  const originalPersistHead = proto.persistHeadAtomic;
  const originalReplay = proto.replayWalAllBestEffort;
  if (
    typeof originalSaveBlock !== "function" ||
    typeof originalLegacy !== "function" ||
    typeof originalRawCommit !== "function" ||
    typeof originalPersistHead !== "function" ||
    typeof originalReplay !== "function"
  ) {
    throw new Error(`${VOID_AL_BLOCK_COMMIT_RUNTIME_V1}: SegStore commit surface mismatch`);
  }

  const state: InstallationStateV1 = {
    enabled: true,
    safe_mode: false,
    safe_mode_reason: "",
    quarantined_actors: new Set<string>(),
    contexts: new WeakMap<object, GateContextV1>(),
    counters: {
      pre_accept_total: 0,
      post_apply_total: 0,
      rejected_total: 0,
      quarantined_total: 0,
      safe_mode_total: 0,
      direct_bypass_total: 0,
    },
  };
  installations.set(proto, state);
  const env = args.env ?? process.env;

  proto.saveBlock = function voidAlGuardedSaveBlockV1(this: any, ...callArgs: any[]) {
    return withCanonicalGate(
      state,
      this,
      callArgs[0],
      "modern",
      originalSaveBlock,
      callArgs,
      env,
    );
  };

  proto.saveAuthorizedLegacyCommitDirectV2fs =
    function voidAlGuardedSaveAuthorizedLegacyV2fsV1(this: any, ...callArgs: any[]) {
      return withCanonicalGate(
        state,
        this,
        callArgs[0],
        "legacy-v2fs",
        originalLegacy,
        callArgs,
        env,
      );
    };

  proto.saveBlockCommit = function voidAlGuardedRawSaveBlockCommitV1(
    this: any,
    ...callArgs: any[]
  ) {
    assertRuntimeWritable(state);
    const context = state.contexts.get(this);
    if (context?.kind === "canonical") {
      return originalRawCommit.apply(this, callArgs);
    }
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
      const mode = modeForReplayCandidate(candidate);
      const pre = evaluatePreAccept(this, candidate, mode, env);
      state.counters.pre_accept_total++;
      assertRuntimeWritable(state, pre.actor_id_sha256);
      if (pre.decision.disposition !== "allow") {
        latchDisposition(state, pre.decision);
        heldFromDecision(pre.decision);
      }
      context.pending_replay = {
        candidate,
        mode,
        pre_head: pre.pre_head,
        mutation_sha256: pre.mutation_sha256,
        actor_id_sha256: pre.actor_id_sha256,
      };
      return originalRawCommit.apply(this, callArgs);
    }

    state.counters.direct_bypass_total++;
    state.counters.safe_mode_total++;
    state.safe_mode = true;
    state.safe_mode_reason = VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1;
    throw new VoidAlBlockCommitRuntimeHeldErrorV1(
      VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1,
      "safe_mode",
      evidence("direct_raw_commit_bypass", canonicalCandidateDigest(callArgs[0] ?? null)),
    );
  };

  proto.persistHeadAtomic = function voidAlGuardedPersistHeadAtomicV1(
    this: any,
    ...callArgs: any[]
  ) {
    assertRuntimeWritable(state);
    const context = state.contexts.get(this);
    const result = originalPersistHead.apply(this, callArgs);
    if (context?.kind === "wal-replay" && context.pending_replay) {
      const pending = context.pending_replay;
      context.pending_replay = undefined;
      const post = evaluatePostApply(
        this,
        pending.candidate,
        pending.mode,
        pending.pre_head,
        pending.mutation_sha256,
        pending.actor_id_sha256,
      );
      state.counters.post_apply_total++;
      if (post.disposition !== "allow") {
        latchDisposition(state, post);
        heldFromDecision(post);
      }
    }
    return result;
  };

  proto.replayWalAllBestEffort = function voidAlGuardedReplayWalV1(
    this: any,
    ...callArgs: any[]
  ) {
    assertRuntimeWritable(state);
    const previous = state.contexts.get(this);
    if (previous) {
      state.safe_mode = true;
      state.safe_mode_reason = "AL_WAL_REPLAY_REENTRANT_CONTEXT";
      state.counters.safe_mode_total++;
      throw new VoidAlBlockCommitRuntimeHeldErrorV1(
        "AL_WAL_REPLAY_REENTRANT_CONTEXT",
        "safe_mode",
        evidence("wal_replay_reentrant_context", previous.kind),
      );
    }
    const context: GateContextV1 = { kind: "wal-replay" };
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

  return statusFor(state, true, true);
}

export function installVoidAlignmentLayerBlockCommitRuntimeFromEnvironmentV1(
  env: NodeJS.ProcessEnv = process.env,
): VoidAlBlockCommitRuntimeStatusV1 {
  const enabled = parseEnableFromEnvironment(env);
  return installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
    prototype: SegStore.prototype as any,
    enabled,
    env,
  });
}

export function getVoidAlignmentLayerBlockCommitRuntimeStatusV1(
  prototype: any = SegStore.prototype as any,
): VoidAlBlockCommitRuntimeStatusV1 {
  const state = installations.get(prototype) ?? null;
  return statusFor(state, state !== null, state?.enabled ?? false);
}
