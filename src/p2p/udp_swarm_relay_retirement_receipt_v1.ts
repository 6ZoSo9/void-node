// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { createHash } from "node:crypto";

import type {
  VoidUdpSwarmRelayRetirementBindingV1,
  VoidUdpSwarmRelayRetirementExecutorPhaseV1,
} from "./udp_swarm_relay_retirement_executor_v1.js";

export const VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_RECEIPT_VERSION_V1 = 1;
export const VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_RECEIPT_DOMAIN_V1 =
  "VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_RECEIPT_V1" as const;

export const VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_RECEIPT_AUTHORITY_V1 =
  Object.freeze({
    consumes_terminal_executor_snapshot: true,
    content_addressed_receipt: true,
    relay_mutation_performed: false,
    direct_route_mutation_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const SAFE_TOKEN_RE = /^[^\s\u0000-\u001f\u007f]{1,128}$/;

const SNAPSHOT_KEYS = Object.freeze([
  "version",
  "phase",
  "binding",
  "retirement_callback_attempted",
  "relay_retirement_performed",
  "direct_route_mutation_performed",
  "verified_direct_evidence_persisted",
  "production_udp_activation_performed",
]);

const BINDING_KEYS = Object.freeze([
  "session_id",
  "expected_peer_node_id",
  "relay_node_id",
  "relay_stream_id",
]);

export type VoidUdpSwarmRelayRetirementReceiptDispositionV1 =
  | "relay_retired"
  | "retirement_callback_rejected"
  | "retirement_callback_indeterminate";

export type VoidUdpSwarmRelayRetirementReceiptV1 = Readonly<{
  domain: typeof VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_RECEIPT_DOMAIN_V1;
  version: 1;
  binding: VoidUdpSwarmRelayRetirementBindingV1;
  executor_phase: Exclude<VoidUdpSwarmRelayRetirementExecutorPhaseV1, "pending">;
  disposition: VoidUdpSwarmRelayRetirementReceiptDispositionV1;
  retirement_callback_attempted: true;
  relay_retirement_performed: boolean | null;
  relay_mutation_performed: false;
  direct_route_mutation_performed: false;
  verified_direct_evidence_persisted: false;
  production_udp_activation_performed: false;
  receipt_id_sha256: string;
}>;

export type VoidUdpSwarmRelayRetirementReceiptErrorV1 =
  | "invalid_snapshot_shape"
  | "invalid_binding"
  | "snapshot_not_terminal"
  | "snapshot_inconsistent"
  | "authority_boundary_violated";

export type VoidUdpSwarmRelayRetirementReceiptSuccessV1 = Readonly<{
  ok: true;
  receipt: VoidUdpSwarmRelayRetirementReceiptV1;
}>;

export type VoidUdpSwarmRelayRetirementReceiptFailureV1 = Readonly<{
  ok: false;
  error: VoidUdpSwarmRelayRetirementReceiptErrorV1;
  receipt_created: false;
  relay_mutation_performed: false;
  direct_route_mutation_performed: false;
  verified_direct_evidence_persisted: false;
  production_udp_activation_performed: false;
}>;

export type VoidUdpSwarmRelayRetirementReceiptResultV1 =
  | VoidUdpSwarmRelayRetirementReceiptSuccessV1
  | VoidUdpSwarmRelayRetirementReceiptFailureV1;

function hasExactKeys(value: unknown, expected: readonly string[]): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function validBinding(
  value: unknown,
): value is VoidUdpSwarmRelayRetirementBindingV1 {
  if (!hasExactKeys(value, BINDING_KEYS)) return false;
  const binding = value as Record<string, unknown>;
  return (
    typeof binding.session_id === "string" &&
    SAFE_TOKEN_RE.test(binding.session_id) &&
    typeof binding.expected_peer_node_id === "string" &&
    NODE_ID_RE.test(binding.expected_peer_node_id) &&
    typeof binding.relay_node_id === "string" &&
    NODE_ID_RE.test(binding.relay_node_id) &&
    typeof binding.relay_stream_id === "string" &&
    SAFE_TOKEN_RE.test(binding.relay_stream_id)
  );
}

function freezeBinding(
  binding: VoidUdpSwarmRelayRetirementBindingV1,
): VoidUdpSwarmRelayRetirementBindingV1 {
  return Object.freeze({
    session_id: binding.session_id,
    expected_peer_node_id: binding.expected_peer_node_id,
    relay_node_id: binding.relay_node_id,
    relay_stream_id: binding.relay_stream_id,
  });
}

function failure(
  error: VoidUdpSwarmRelayRetirementReceiptErrorV1,
): VoidUdpSwarmRelayRetirementReceiptFailureV1 {
  return Object.freeze({
    ok: false,
    error,
    receipt_created: false,
    relay_mutation_performed: false,
    direct_route_mutation_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
  });
}

function dispositionFor(
  phase: Exclude<VoidUdpSwarmRelayRetirementExecutorPhaseV1, "pending">,
): VoidUdpSwarmRelayRetirementReceiptDispositionV1 {
  switch (phase) {
    case "retired":
      return "relay_retired";
    case "callback_rejected":
      return "retirement_callback_rejected";
    case "callback_indeterminate":
      return "retirement_callback_indeterminate";
  }
}

function expectedPerformedFor(
  phase: Exclude<VoidUdpSwarmRelayRetirementExecutorPhaseV1, "pending">,
): boolean | null {
  switch (phase) {
    case "retired":
      return true;
    case "callback_rejected":
      return false;
    case "callback_indeterminate":
      return null;
  }
}

export function buildVoidUdpSwarmRelayRetirementReceiptV1(
  snapshotInput: unknown,
): VoidUdpSwarmRelayRetirementReceiptResultV1 {
  if (!hasExactKeys(snapshotInput, SNAPSHOT_KEYS)) {
    return failure("invalid_snapshot_shape");
  }
  const snapshot = snapshotInput as Record<string, unknown>;
  if (snapshot.version !== 1) {
    return failure("invalid_snapshot_shape");
  }

  const bindingInput = snapshot.binding;
  if (!validBinding(bindingInput)) {
    return failure("invalid_binding");
  }

  const phase = snapshot.phase;
  if (phase === "pending") {
    return failure("snapshot_not_terminal");
  }
  if (
    phase !== "retired" &&
    phase !== "callback_rejected" &&
    phase !== "callback_indeterminate"
  ) {
    return failure("invalid_snapshot_shape");
  }
  if (
    snapshot.direct_route_mutation_performed !== false ||
    snapshot.verified_direct_evidence_persisted !== false ||
    snapshot.production_udp_activation_performed !== false
  ) {
    return failure("authority_boundary_violated");
  }
  if (snapshot.retirement_callback_attempted !== true) {
    return failure("snapshot_inconsistent");
  }

  const expectedPerformed = expectedPerformedFor(phase);
  if (snapshot.relay_retirement_performed !== expectedPerformed) {
    return failure("snapshot_inconsistent");
  }

  const binding = freezeBinding(bindingInput);
  const disposition = dispositionFor(phase);
  const material = Object.freeze({
    domain: VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_RECEIPT_DOMAIN_V1,
    version: VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_RECEIPT_VERSION_V1,
    binding,
    executor_phase: phase,
    disposition,
    retirement_callback_attempted: true as const,
    relay_retirement_performed: expectedPerformed,
    relay_mutation_performed: false as const,
    direct_route_mutation_performed: false as const,
    verified_direct_evidence_persisted: false as const,
    production_udp_activation_performed: false as const,
  });
  const receiptIdSha256 = createHash("sha256")
    .update(JSON.stringify(material), "utf8")
    .digest("hex");

  const receipt: VoidUdpSwarmRelayRetirementReceiptV1 = Object.freeze({
    ...material,
    receipt_id_sha256: receiptIdSha256,
  });
  return Object.freeze({ ok: true, receipt });
}
