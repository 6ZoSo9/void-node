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
  latchVoidAlDurableSafeModeV1,
  readVoidAlDurableSafeModeLatchV1,
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

const MUTATION_METHODS = Object.freeze([
  "saveBlock",
  "saveAuthorizedLegacyCommitDirectV2fs",
  "saveBlockCommit",
  "persistHeadAtomic",
  "replayWalAllBestEffort",
] as const);

type DurableRuntimeStateV1 = {
  root: string;
  durable: VoidAlDurableSafeModeStateV1;
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
  restart_restores_safe_mode: true;
  automatic_resume_allowed: false;
  resume_api_implemented: false;
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

function status(
  proto: any,
  durableState: DurableRuntimeStateV1 | null,
  enabled: boolean,
): VoidAlBlockCommitDurableRuntimeStatusV1 {
  const child = getVoidAlignmentLayerBlockCommitRuntimeStatusV1(proto);
  return {
    marker: VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1,
    version: 1,
    enabled,
    installed: durableState !== null,
    effective_safe_mode:
      durableState?.durable.mode === "safe_mode" || child.safe_mode,
    durable_mode: durableState?.durable.mode ?? "running",
    durable_generation: durableState?.durable.generation ?? null,
    durable_state_fingerprint_sha256:
      durableState?.durable.state_fingerprint_sha256 ?? null,
    durable_reason_code: durableState?.durable.latest_reason_code ?? null,
    durable_evidence_sha256:
      durableState?.durable.latest_evidence_sha256 ?? null,
    restart_restores_safe_mode: true,
    automatic_resume_allowed: false,
    resume_api_implemented: false,
    child,
    ordinary_authentication_changed: false,
    sovereign_usb_access: false,
    chain2050_live_mutation: false,
    money_movement: false,
  };
}

function persistSafeMode(
  state: DurableRuntimeStateV1,
  reasonCode: string,
  evidenceSha256: string,
): void {
  try {
    state.durable = latchVoidAlDurableSafeModeV1({
      root_directory: state.root,
      reason_code: reasonCode,
      evidence_sha256: evidenceSha256,
    });
  } catch (error) {
    const detail =
      error instanceof VoidAlDurableSafeModeLatchErrorV1
        ? `${error.code}:${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    throw new VoidAlBlockCommitRuntimeHeldErrorV1(
      VOID_AL_DURABLE_SAFE_MODE_PERSISTENCE_FAILURE_V1,
      "safe_mode",
      evidence(
        "durable_persistence_failure",
        reasonCode,
        evidenceSha256,
        detail,
      ),
    );
  }
}

function assertDurableWritable(state: DurableRuntimeStateV1): void {
  if (state.durable.mode !== "safe_mode") return;
  throw new VoidAlBlockCommitRuntimeHeldErrorV1(
    VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1,
    "safe_mode",
    state.durable.latest_evidence_sha256 ??
      state.durable.state_fingerprint_sha256,
  );
}

function persistLatentChildSafeMode(
  proto: any,
  state: DurableRuntimeStateV1,
  methodName: string,
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
  persistSafeMode(state, reason, childEvidence);
  return true;
}

function invokeDurableGuard(
  proto: any,
  state: DurableRuntimeStateV1,
  methodName: string,
  inner: Function,
  thisArg: any,
  callArgs: any[],
): any {
  assertDurableWritable(state);
  try {
    const result = inner.apply(thisArg, callArgs);
    if (persistLatentChildSafeMode(proto, state, methodName)) {
      throw new VoidAlBlockCommitRuntimeHeldErrorV1(
        VOID_AL_DURABLE_SAFE_MODE_CHILD_LATCHED_V1,
        "safe_mode",
        state.durable.latest_evidence_sha256 ??
          state.durable.state_fingerprint_sha256,
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
        error.code !== VOID_AL_DURABLE_SAFE_MODE_PERSISTENCE_FAILURE_V1
      ) {
        persistSafeMode(state, error.code, error.evidence_sha256);
      }
      throw error;
    }

    if (persistLatentChildSafeMode(proto, state, methodName)) {
      throw new VoidAlBlockCommitRuntimeHeldErrorV1(
        VOID_AL_DURABLE_SAFE_MODE_CHILD_LATCHED_V1,
        "safe_mode",
        state.durable.latest_evidence_sha256 ??
          state.durable.state_fingerprint_sha256,
      );
    }
    throw error;
  }
}

export function installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1(args: {
  prototype: any;
  enabled: boolean;
  env?: NodeJS.ProcessEnv;
  durable_safe_mode_root?: string;
}): VoidAlBlockCommitDurableRuntimeStatusV1 {
  const proto = args.prototype;
  if (!proto || typeof proto !== "object") {
    throw new Error(`${VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1}: prototype required`);
  }
  const prior = installations.get(proto);
  if (prior) return status(proto, prior, true);
  if (!args.enabled) return status(proto, null, false);

  const env = args.env ?? process.env;
  const root = requiredRoot(args.durable_safe_mode_root, env);
  const durable = readVoidAlDurableSafeModeLatchV1(root);

  installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
    prototype: proto,
    enabled: true,
    env,
  });

  const innerMethods = new Map<string, Function>();
  for (const methodName of MUTATION_METHODS) {
    const inner = proto[methodName];
    if (typeof inner !== "function") {
      throw new Error(
        `${VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1}: child method missing: ${methodName}`,
      );
    }
    innerMethods.set(methodName, inner);
  }

  const state: DurableRuntimeStateV1 = { root, durable };
  installations.set(proto, state);

  for (const methodName of MUTATION_METHODS) {
    const inner = innerMethods.get(methodName)!;
    proto[methodName] = function durableGuardedMutation(
      this: any,
      ...callArgs: any[]
    ) {
      return invokeDurableGuard(
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
