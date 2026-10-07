import crypto from "node:crypto";

import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1,
  type BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_external_anchor_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    canonical_replay_high_water_required: true,
    exact_replay_journal_binding_required: true,
    caller_selected_projection: false,
    canonical_replay_projection_binding_proven: true,
    canonical_anchor_planner_composed: true,
    live_anchor_storage_proven: false,
    external_anchor_transport_authenticated: false,
    external_anchor_append_performed: false,
    external_anchor_read_performed: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    filesystem_read: false,
    filesystem_write: false,
    network_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const SAFE_HOSTNAME = /^[A-Za-z0-9._-]{1,255}$/u;

function fail(reason: string): never {
  throw new Error(reason);
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("witness_replay_external_anchor_projection_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    canonical_replay_projection_binding_proven: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_AUTHORITY_V1,
  });
}

function canonicalProjection(
  input: {
    replay_journal_jsonl: string | Buffer;
    replay_high_water_json: string | Buffer;
    source_hostname: unknown;
  },
): {
  projection: BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1;
  projection_sha256: string;
  high_water_sha256: string;
} {
  if (
    typeof input?.source_hostname !== "string" ||
    !SAFE_HOSTNAME.test(input.source_hostname)
  ) {
    fail("witness_replay_external_anchor_projection_hostname_invalid");
  }

  const binding =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
      journal_jsonl: input.replay_journal_jsonl,
      high_water_json: input.replay_high_water_json,
    });
  if (binding.ok !== true) {
    fail(
      "witness_replay_external_anchor_projection_high_water_" +
        String(binding.reason || "invalid"),
    );
  }

  const highWater = binding.high_water;
  const projection =
    Object.freeze({
      source_hostname: input.source_hostname,
      replay_sequence: highWater.sequence,
      replay_generation: highWater.generation,
      replay_event_count: highWater.event_count,
      replay_tip_event_sha256: highWater.tip_event_sha256,
      replay_high_water_sha256: binding.high_water_sha256,
      replay_journal_sha256: highWater.journal_sha256,
      replay_pending: highWater.pending,
      replay_pending_challenge_sha256:
        highWater.pending_challenge_sha256,
      replay_pending_challenge_id:
        highWater.pending_challenge_id,
      replay_pending_expires_at_ms:
        highWater.pending_expires_at_ms,
      replay_last_terminal_state:
        highWater.last_terminal_state,
      replay_ready_for_issue: highWater.ready_for_issue,
    }) satisfies BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1;

  return Object.freeze({
    projection,
    projection_sha256:
      sha256Id(Buffer.from(canonicalJson(projection), "utf8")),
    high_water_sha256: binding.high_water_sha256,
  });
}

export function deriveBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1(
  input: {
    replay_journal_jsonl: string | Buffer;
    replay_high_water_json: string | Buffer;
    source_hostname: unknown;
  },
) {
  try {
    const derived = canonicalProjection(input);
    return Object.freeze({
      ok: true as const,
      status: "canonical_projection_derived" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_V1,
      version: 1 as const,
      projection: derived.projection,
      projection_sha256: derived.projection_sha256,
      high_water_sha256: derived.high_water_sha256,
      operation_performed: false as const,
      canonical_replay_projection_binding_proven: true as const,
      live_anchor_storage_proven: false as const,
      external_anchor_transport_authenticated: false as const,
      rollback_resistance_proven: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_replay_external_anchor_projection_failed",
    );
  }
}

export function planBuyVoidAllocationCustodyWitnessLiveReadReplayCanonicalExternalAnchorAppendV1(
  input: {
    anchor_journal_jsonl: string | Buffer;
    replay_journal_jsonl: string | Buffer;
    replay_high_water_json: string | Buffer;
    source_hostname: unknown;
  },
) {
  try {
    const derived = canonicalProjection(input);
    const planned =
      planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
        anchor_journal_jsonl: input.anchor_journal_jsonl,
        projection: derived.projection,
      });
    if (planned.ok !== true) {
      fail(
        "witness_replay_external_anchor_projection_plan_" +
          String(planned.reason || "invalid"),
      );
    }

    return Object.freeze({
      ...planned,
      status:
        planned.status === "already_anchored"
          ? ("canonical_projection_already_anchored" as const)
          : ("canonical_anchor_append_planned" as const),
      projection: derived.projection,
      projection_sha256: derived.projection_sha256,
      high_water_sha256: derived.high_water_sha256,
      canonical_replay_projection_binding_proven: true as const,
      live_anchor_storage_proven: false as const,
      external_anchor_transport_authenticated: false as const,
      rollback_resistance_proven: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_replay_external_anchor_projection_plan_failed",
    );
  }
}
