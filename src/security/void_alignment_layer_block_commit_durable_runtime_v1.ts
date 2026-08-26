import { createHash } from "node:crypto";

import {
  VOID_AL_BLOCK_COMMIT_RUNTIME_ENABLE_ENV_V1,
  VoidAlBlockCommitRuntimeHeldErrorV1,
  getVoidAlignmentLayerBlockCommitRuntimeStatusV1,
  installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1,
  type VoidAlBlockCommitRuntimeStatusV1,
} from "./void_alignment_layer_block_commit_runtime_v1.js";
import {
  VOID_AL_DURABLE_SAFE_MODE_ROOT_ENV_V1,
  VoidAlDurableSafeModeLatchErrorV1,
  admitDurableRootPathnameV1,
  pinDurableRootGenerationV1,
  closePinnedDurableRootV1,
  withHeldAuthorityV1,
  readVoidAlDurableSafeModeLatchGivenPinnedRootV1,
  readVoidAlDurableSafeModeStateWhileHeldV1,
  readVoidAlDurableSafeModeStateSnapshotV1,
  latchWithinHeldAuthorityV1,
  type AuthorityTokenV1,
  type PinnedDurableRootV1,
  type VoidAlDurableSafeModeStateV1,
} from "./void_al_durable_safe_mode_latch_v1.js";
import { SegStore } from "../chain/seg_store.js";

export const VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1 =
  "VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1" as const;
export const VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1 =
  "VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1" as const;
export const VOID_AL_DURABLE_SAFE_MODE_PERSISTENCE_FAILURE_V1 =
  "VOID_AL_DURABLE_SAFE_MODE_PERSISTENCE_FAILURE_V1" as const;
export const VOID_AL_DURABLE_SAFE_MODE_CHILD_LATCHED_V1 =
  "VOID_AL_DURABLE_SAFE_MODE_CHILD_LATCHED_V1" as const;
export const VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1 =
  "VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1" as const;

/**
 * Only the three true top-level entry points are individually serialized
 * under the unified authority. saveBlock funnels into saveBlockCommit and
 * persistHeadAtomic internally; wrapping those nested private helpers
 * independently would open a gap BETWEEN two acquire/release cycles inside
 * one logical commit, exactly the race this design closes. They remain
 * guarded by the existing, separate child AL runtime (void_alignment_
 * layer_block_commit_runtime_v1.ts, unrelated to this file) untouched.
 */
const TOP_LEVEL_MUTATION_METHODS = Object.freeze([
  "saveBlock",
  "saveAuthorizedLegacyCommitDirectV2fs",
  "replayWalAllBestEffort",
] as const);

/**
 * Test-only injection points. Every field is left `undefined` on every
 * production call path (`installVoidAlignmentLayerBlockCommitDurableRuntime
 * FromEnvironmentV1` never sets `test_hooks`); it exists solely so
 * scripts/prove_void_al_durable_safe_mode_latch_v1.ts can deterministically
 * simulate an adversary acting inside a window that has no real
 * interleaving point to race for real in this single-threaded, fully
 * synchronous design.
 */
type VoidAlDurableRuntimeTestHooksV1 = {
  /** Invoked synchronously as the very first thing inside the top-level
   * mutation authority's own held callback — after acquisition, before
   * `verifyRootGenerationCurrentWhileHeldV1` runs. Exists only to prove the
   * Blocker-1 (V4) fix: that nothing but this synchronous canary check runs
   * between acquisition and the canary, so a root-generation change landed
   * here is still caught before any durable-state read or SegStore
   * mutation. */
  afterMutationAuthorityAcquiredBeforeCanaryV1?: () => void;
};

type DurableRuntimeStateV1 = {
  rootPath: string;
  pinned: PinnedDurableRootV1;
  /** Last-known durable state — informational/status only. NEVER consulted
   * for a mutation-admission decision; every admission decision rereads
   * the state file fresh while the authority is held. */
  durable: VoidAlDurableSafeModeStateV1;
  testHooks?: VoidAlDurableRuntimeTestHooksV1;
};

export type VoidAlBlockCommitDurableRuntimeStatusV1 = {
  marker: typeof VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1;
  version: 1;
  enabled: boolean;
  installed: boolean;
  effective_safe_mode: boolean;
  durable_mode: "running" | "safe_mode";
  durable_generation: string | null;
  durable_state_fingerprint_sha256: string | null;
  durable_reason_code: string | null;
  durable_evidence_sha256: string | null;
  /** Whether durable_* above came from a fresh on-disk read taken during
   * THIS status() call (true) or, when that fresh read itself failed OR was
   * skipped because the canonical root has drifted (`root_generation_current
   * === false`), the last-known cached value (false) — see status()'s doc
   * comment. */
  durable_read_fresh: boolean;
  durable_read_error_code: string | null;
  /** READ-ONLY re-check (no authority acquired, nothing latched or mutated)
   * of whether the configured canonical root pathname still names the
   * retained descriptor's generation, taken fresh on THIS status() call.
   * `false` means the canonical root has drifted (missing, replaced, wrong
   * owner/mode, or any other admission failure) while the installed writer
   * was possibly otherwise idle — see status()'s doc comment. Always `true`
   * when `installed` is `false` (nothing to check). */
  root_generation_current: boolean;
  restart_restores_safe_mode: true;
  automatic_resume_allowed: false;
  resume_api_implemented: false;
  root_generation_pinned_for_process_lifetime: true;
  cross_process_mutation_serialized: true;
  /** Data form of the same scope stated in VOID_AL_DURABLE_SAFE_MODE_
   * AUTHORITY_V1's comment: `cross_process_mutation_serialized` above claims
   * serialization among compliant same-UID processes only, never resilience
   * against a hostile same-UID racer. */
  cross_process_mutation_serialized_scope: string;
  child: VoidAlBlockCommitRuntimeStatusV1;
  ordinary_authentication_changed: false;
  sovereign_usb_access: false;
  chain2050_live_mutation: false;
  money_movement: false;
};

const installations = new WeakMap<object, DurableRuntimeStateV1>();

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function evidence(id: string, ...parts: unknown[]): string {
  return sha256(JSON.stringify([VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1, id, ...parts]));
}

function parseEnabled(env: NodeJS.ProcessEnv): boolean {
  const raw = String(env[VOID_AL_BLOCK_COMMIT_RUNTIME_ENABLE_ENV_V1] ?? "").trim();
  if (raw === "" || raw === "0") return false;
  if (raw === "1") return true;
  throw new Error(
    `${VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1}: ${VOID_AL_BLOCK_COMMIT_RUNTIME_ENABLE_ENV_V1} must be 0 or 1`,
  );
}

function requiredRoot(
  explicitRoot: string | undefined,
  env: NodeJS.ProcessEnv,
): string {
  const root = String(
    explicitRoot ?? env[VOID_AL_DURABLE_SAFE_MODE_ROOT_ENV_V1] ?? "",
  ).trim();
  if (!root) {
    throw new Error(
      `${VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1}: ${VOID_AL_DURABLE_SAFE_MODE_ROOT_ENV_V1} required when AL is enabled`,
    );
  }
  return root;
}

/**
 * Truth-Gap-3 (V4) fix: a READ-ONLY canonical-root generation/admission
 * check, used only by `status()`. It reuses the identical admission logic
 * the mutation-path canary (`verifyRootGenerationCurrentWhileHeldV1`) uses,
 * but never acquires the authority and never latches or mutates anything —
 * safe to call at any time, including concurrently with another holder.
 *
 * This exists because `status()`'s own fresh on-disk read
 * (readVoidAlDurableSafeModeStateSnapshotV1) goes through the RETAINED fd
 * (`/proc/self/fd/<fd>/...`), never through the configured canonical
 * pathname — so on its own it cannot detect that the pathname no longer
 * names that retained generation. Without this separate check, status()
 * could keep reporting the retained generation's last-known `running` state
 * even after the canonical root had gone missing or been replaced while the
 * installed writer was otherwise idle, right up until that writer's next
 * mutation attempt independently tripped its own canary.
 */
function checkRootGenerationCurrentReadOnlyV1(
  durableState: DurableRuntimeStateV1,
): { current: true } | { current: false; code: string } {
  try {
    const admission = admitDurableRootPathnameV1(durableState.rootPath);
    if (
      admission.admittedDev === durableState.pinned.dev &&
      admission.admittedIno === durableState.pinned.ino
    ) {
      return { current: true };
    }
    return { current: false, code: VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1 };
  } catch (error) {
    return {
      current: false,
      code:
        error instanceof VoidAlDurableSafeModeLatchErrorV1
          ? error.code
          : VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
    };
  }
}

/**
 * Truth-surface status. Finding-4 fix: this must NEVER answer
 * effective_safe_mode purely from `durableState.durable`, since that field
 * is only ever refreshed as a side effect of THIS process's own mutation
 * calls and install-time read — an external watchdog can durably latch
 * safe mode at any moment while this writer is otherwise idle, and a
 * caller of status() must observe that immediately, not only after this
 * process's next mutation attempt. So every call here takes a fresh,
 * lock-free on-disk snapshot read (readVoidAlDurableSafeModeStateSnapshot
 * V1 — safe to call at any time, including while some other holder
 * currently has the authority) and answers from THAT, updating the cache
 * as a side effect for callers that only need the cheap last-known value
 * elsewhere. If the fresh read itself fails (state tampering, corruption,
 * an unexpected I/O error — installed state is otherwise always present
 * post-install), this fails CLOSED: effective_safe_mode is reported true
 * rather than silently falling back to a last-known-good cache that could
 * itself be stale in exactly the way this fix exists to prevent.
 *
 * Truth-Gap-3 (V4) fix: BEFORE that on-disk read, this also takes the
 * read-only root-generation check above. If the canonical root has
 * drifted, the on-disk read is skipped entirely (there is nothing trustable
 * left to read fresh through a drifted pathname's admission, even though
 * the retained fd itself would still technically resolve) and this reports
 * `effective_safe_mode=true` / `root_generation_current=false` immediately
 * — it does not wait for, and does not require, an actual mutation attempt
 * to surface that drift. The cached `durable_*` fields are still returned
 * in that case (never cleared), but only as explicitly stale evidence:
 * `durable_read_fresh` is `false` whenever `root_generation_current` is
 * `false`, exactly as it already is whenever the fresh on-disk read itself
 * fails.
 */
function status(
  proto: any,
  durableState: DurableRuntimeStateV1 | null,
  enabled: boolean,
): VoidAlBlockCommitDurableRuntimeStatusV1 {
  const child = getVoidAlignmentLayerBlockCommitRuntimeStatusV1(proto);

  const rootCheck: { current: boolean; code?: string } = durableState
    ? checkRootGenerationCurrentReadOnlyV1(durableState)
    : { current: true };

  let fresh: VoidAlDurableSafeModeStateV1 | null = null;
  let readErrorCode: string | null = rootCheck.current ? null : (rootCheck.code as string);
  if (durableState && rootCheck.current) {
    try {
      fresh = readVoidAlDurableSafeModeStateSnapshotV1(durableState.pinned);
      durableState.durable = fresh;
    } catch (error) {
      readErrorCode =
        error instanceof VoidAlDurableSafeModeLatchErrorV1
          ? error.code
          : "AL_DURABLE_SAFE_MODE_STATUS_READ_FAILED";
    }
  }
  const effective = fresh ?? durableState?.durable ?? null;

  return {
    marker: VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1,
    version: 1,
    enabled,
    installed: durableState !== null,
    effective_safe_mode:
      readErrorCode !== null || effective?.mode === "safe_mode" || child.safe_mode,
    durable_mode: effective?.mode ?? "running",
    durable_generation: effective?.generation ?? null,
    durable_state_fingerprint_sha256: effective?.state_fingerprint_sha256 ?? null,
    durable_reason_code: effective?.latest_reason_code ?? null,
    durable_evidence_sha256: effective?.latest_evidence_sha256 ?? null,
    durable_read_fresh: durableState !== null && rootCheck.current && readErrorCode === null,
    durable_read_error_code: readErrorCode,
    root_generation_current: rootCheck.current,
    restart_restores_safe_mode: true,
    automatic_resume_allowed: false,
    resume_api_implemented: false,
    root_generation_pinned_for_process_lifetime: true,
    cross_process_mutation_serialized: true,
    cross_process_mutation_serialized_scope:
      "compliant_same_uid_processes_only_hostile_eviction_out_of_scope",
    child,
    ordinary_authentication_changed: false,
    sovereign_usb_access: false,
    chain2050_live_mutation: false,
    money_movement: false,
  };
}

function wrapLatchFailureV1(
  reasonCode: string,
  evidenceSha256: string,
  error: unknown,
): VoidAlBlockCommitRuntimeHeldErrorV1 {
  const detail =
    error instanceof VoidAlDurableSafeModeLatchErrorV1
      ? `${error.code}:${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);
  const wrapped = new VoidAlBlockCommitRuntimeHeldErrorV1(
    VOID_AL_DURABLE_SAFE_MODE_PERSISTENCE_FAILURE_V1,
    "safe_mode",
    evidence("durable_persistence_failure", reasonCode, evidenceSha256, detail),
  );
  // Preserve the raw latch-layer error as `.cause`. `persistSafeModeWhileHeldV1`
  // calls this wrapper INSIDE the outer withHeldAuthorityV1's own held
  // callback — without this, an AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS
  // thrown by latchWithinHeldAuthorityV1 would already be hidden behind
  // this wrap by the time it reaches withHeldAuthorityV1's retain-vs-release
  // decision. `isAmbiguousPersistenceErrorV1` walks `.cause` specifically to
  // still see it.
  (wrapped as Error & { cause?: unknown }).cause = error;
  return wrapped;
}

/**
 * Latches a safe-mode incident using the RETAINED pinned root, assuming
 * the unified authority is ALREADY held by the caller (invokeDurableGuardV1's
 * own held critical section). Never acquires or releases anything itself —
 * doing so would be the exact nested-reacquisition mistake this design
 * forbids for saveBlockCommit/persistHeadAtomic, just one level up.
 */
function persistSafeModeWhileHeldV1(
  state: DurableRuntimeStateV1,
  token: AuthorityTokenV1,
  reasonCode: string,
  evidenceSha256: string,
): void {
  try {
    state.durable = latchWithinHeldAuthorityV1(state.pinned, token, {
      reason_code: reasonCode,
      evidence_sha256: evidenceSha256,
    });
  } catch (error) {
    throw wrapLatchFailureV1(reasonCode, evidenceSha256, error);
  }
}

/**
 * The Blocker-1 (V4) canary: run as the FIRST OPERATION inside the
 * top-level mutation authority's own held callback — never before
 * acquisition, and never via a separate acquisition of its own. Re-admits
 * the CONFIGURED CANONICAL PATHNAME and requires its dev/ino to still equal
 * the retained fd's admitted generation. On mismatch this HOLDs — using the
 * SAME authority token already held, never a fresh acquisition — before any
 * durable-state read or SegStore mutation is attempted; it never adopts the
 * replacement generation. All safety-critical operations (including
 * latching this very incident) continue through the retained fd, never
 * through the drifted/unavailable pathname.
 *
 * Ordering rationale (this is the actual Blocker-1 fix): an earlier
 * revision ran this canary BEFORE acquiring the mutation authority, which
 * left a check-then-acquire gap — a canonical-root pathname generation
 * could move after that standalone canary passed but before the
 * separately-acquired critical section actually began. Running the canary
 * only AFTER acquisition, as the first thing inside the SAME held callback
 * as the durable-state read and the mutation itself, closes that gap by
 * construction: in this single-threaded, fully synchronous design, nothing
 * but this canary check itself runs between "authority acquired" and
 * "canary evaluated," so there is no window left for a generation change to
 * land in and go unobserved. (See the deterministic post-acquire/pre-canary
 * falsifier in scripts/prove_void_al_durable_safe_mode_latch_v1.ts, which
 * simulates landing exactly there via a test-only hook — there is no real
 * interleaving point to race for real once this ordering holds.)
 *
 * Finding-3 fix (retained): `admitDurableRootPathnameV1` itself THROWS
 * (rather than returning a mismatched admission) for a missing path, a
 * symlink substituted at the canonical name, wrong owner/mode, or any
 * lstat/open failure — every one of those is exactly as much a canary trip
 * as an outright dev/ino mismatch, and must convert to the SAME durable,
 * fail-closed ROOT_DRIFTED latch via the retained root. The admission call
 * is therefore wrapped, and ANY failure path — thrown or a plain generation
 * mismatch — is normalized into one fail-closed outcome below.
 */
function verifyRootGenerationCurrentWhileHeldV1(
  state: DurableRuntimeStateV1,
  token: AuthorityTokenV1,
): void {
  let driftDetail: string;
  try {
    const admission = admitDurableRootPathnameV1(state.rootPath);
    if (
      admission.admittedDev === state.pinned.dev &&
      admission.admittedIno === state.pinned.ino
    ) {
      return;
    }
    driftDetail = `generation_mismatch:${admission.admittedDev}:${admission.admittedIno}`;
  } catch (error) {
    driftDetail =
      error instanceof VoidAlDurableSafeModeLatchErrorV1
        ? `admission_failed:${error.code}`
        : `admission_failed:${error instanceof Error ? error.message : String(error)}`;
  }
  const evidenceSha = evidence(
    "root_generation_drifted",
    state.rootPath,
    state.pinned.dev,
    state.pinned.ino,
    driftDetail,
  );
  // Latch via the token already held — NOT persistSafeModeAcquiringV1 (that
  // acquire-first fallback no longer exists): re-acquiring here would be
  // the exact nested-reacquisition mistake this design forbids elsewhere,
  // one level up, and would in any case reopen the very gap this ordering
  // fix closes.
  persistSafeModeWhileHeldV1(state, token, VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1, evidenceSha);
  throw new VoidAlBlockCommitRuntimeHeldErrorV1(
    VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
    "safe_mode",
    evidenceSha,
  );
}

function persistLatentChildSafeModeV1(
  proto: any,
  state: DurableRuntimeStateV1,
  methodName: string,
  token: AuthorityTokenV1,
): boolean {
  const child = getVoidAlignmentLayerBlockCommitRuntimeStatusV1(proto);
  if (!child.safe_mode) return false;
  const reason = child.safe_mode_reason || VOID_AL_DURABLE_SAFE_MODE_CHILD_LATCHED_V1;
  const childEvidence = evidence(
    "latent_child_safe_mode",
    methodName,
    reason,
    child.safe_mode_total,
    child.direct_bypass_total,
    child.direct_head_bypass_total,
    child.mutation_exception_total,
  );
  persistSafeModeWhileHeldV1(state, token, reason, childEvidence);
  return true;
}

/**
 * Acquire the unified authority FIRST, then — as the first operation inside
 * that SAME held callback, before the durable-state read and before any
 * SegStore mutation — run the in-authority root-generation canary
 * (verifyRootGenerationCurrentWhileHeldV1). Only once that canary passes:
 * reread durable state fresh while still held, refuse if already
 * safe_mode, perform the complete top-level mutation, persist any
 * child/latent safe-mode transition discovered during that mutation — all
 * inside the SAME held authority — then release. This is the entire
 * acquire/canary/check/mutate/latch/release critical section for one
 * top-level call; see verifyRootGenerationCurrentWhileHeldV1's doc comment
 * for why the canary must run in this position, not before acquisition.
 */
function invokeDurableGuardV1(
  proto: any,
  state: DurableRuntimeStateV1,
  methodName: string,
  inner: Function,
  thisArg: any,
  callArgs: any[],
): any {
  return withHeldAuthorityV1(state.pinned, { boundedRetry: true, intent: "mutation" }, (token) => {
    state.testHooks?.afterMutationAuthorityAcquiredBeforeCanaryV1?.();
    verifyRootGenerationCurrentWhileHeldV1(state, token);

    const current = readVoidAlDurableSafeModeStateWhileHeldV1(state.pinned, token);
    state.durable = current;
    if (current.mode === "safe_mode") {
      throw new VoidAlBlockCommitRuntimeHeldErrorV1(
        VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1,
        "safe_mode",
        current.latest_evidence_sha256 ?? current.state_fingerprint_sha256,
      );
    }

    try {
      const result = inner.apply(thisArg, callArgs);
      if (persistLatentChildSafeModeV1(proto, state, methodName, token)) {
        throw new VoidAlBlockCommitRuntimeHeldErrorV1(
          VOID_AL_DURABLE_SAFE_MODE_CHILD_LATCHED_V1,
          "safe_mode",
          state.durable.latest_evidence_sha256 ?? state.durable.state_fingerprint_sha256,
        );
      }
      return result;
    } catch (error) {
      if (
        error instanceof VoidAlBlockCommitRuntimeHeldErrorV1 &&
        error.disposition === "safe_mode"
      ) {
        if (
          error.code !== VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1 &&
          error.code !== VOID_AL_DURABLE_SAFE_MODE_PERSISTENCE_FAILURE_V1 &&
          error.code !== VOID_AL_DURABLE_SAFE_MODE_CHILD_LATCHED_V1
        ) {
          persistSafeModeWhileHeldV1(state, token, error.code, error.evidence_sha256);
        }
        throw error;
      }

      if (persistLatentChildSafeModeV1(proto, state, methodName, token)) {
        throw new VoidAlBlockCommitRuntimeHeldErrorV1(
          VOID_AL_DURABLE_SAFE_MODE_CHILD_LATCHED_V1,
          "safe_mode",
          state.durable.latest_evidence_sha256 ?? state.durable.state_fingerprint_sha256,
        );
      }
      throw error;
    }
  });
}

export function installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1(args: {
  prototype: any;
  enabled: boolean;
  env?: NodeJS.ProcessEnv;
  durable_safe_mode_root?: string;
  /** Test-only; see VoidAlDurableRuntimeTestHooksV1. Never set by any
   * production call path. */
  test_hooks?: VoidAlDurableRuntimeTestHooksV1;
}): VoidAlBlockCommitDurableRuntimeStatusV1 {
  const proto = args.prototype;
  if (!proto || typeof proto !== "object") {
    throw new Error(`${VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1}: prototype required`);
  }
  const prior = installations.get(proto);
  if (prior) return status(proto, prior, true);
  if (!args.enabled) return status(proto, null, false);

  const env = args.env ?? process.env;
  const rootPath = requiredRoot(args.durable_safe_mode_root, env);

  // Pin the exact root-directory generation ONCE, here, for the lifetime
  // of this installed runtime. Every later operation (every mutation's
  // acquire/check/mutate/latch/release, every canary re-check's evidence
  // hash) derives from this retained fd, never from re-resolving rootPath.
  const admission = admitDurableRootPathnameV1(rootPath);
  const pinned = pinDurableRootGenerationV1(admission);

  let durable: VoidAlDurableSafeModeStateV1;
  try {
    durable = readVoidAlDurableSafeModeLatchGivenPinnedRootV1(pinned);
  } catch (error) {
    closePinnedDurableRootV1(pinned);
    throw error;
  }

  try {
    installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
      prototype: proto,
      enabled: true,
      env,
    });

    const innerMethods = new Map<string, Function>();
    for (const methodName of TOP_LEVEL_MUTATION_METHODS) {
      const inner = proto[methodName];
      if (typeof inner !== "function") {
        throw new Error(
          `${VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1}: child method missing: ${methodName}`,
        );
      }
      innerMethods.set(methodName, inner);
    }

    const state: DurableRuntimeStateV1 = {
      rootPath: admission.rootPath,
      pinned,
      durable,
      testHooks: args.test_hooks,
    };
    installations.set(proto, state);

    for (const methodName of TOP_LEVEL_MUTATION_METHODS) {
      const inner = innerMethods.get(methodName)!;
      proto[methodName] = function durableGuardedMutation(
        this: any,
        ...callArgs: any[]
      ) {
        return invokeDurableGuardV1(
          proto,
          state,
          methodName,
          inner,
          this,
          callArgs,
        );
      };
    }

    return status(proto, state, true);
  } catch (error) {
    closePinnedDurableRootV1(pinned);
    throw error;
  }
}

export function installVoidAlignmentLayerBlockCommitDurableRuntimeFromEnvironmentV1(
  env: NodeJS.ProcessEnv = process.env,
): VoidAlBlockCommitDurableRuntimeStatusV1 {
  return installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
    prototype: SegStore.prototype as any,
    enabled: parseEnabled(env),
    env,
  });
}

export function getVoidAlignmentLayerBlockCommitDurableRuntimeStatusV1(
  prototype: any = SegStore.prototype as any,
): VoidAlBlockCommitDurableRuntimeStatusV1 {
  const state = installations.get(prototype) ?? null;
  return status(prototype, state, state !== null);
}
