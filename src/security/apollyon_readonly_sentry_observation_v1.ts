// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  parseChain2050RoleAuthorityGenerationV1,
  type Chain2050RoleAuthorityTransitionV1,
} from "./chain2050_role_authority_record_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_READ_ADAPTER_V1_SCHEMA,
  type Chain2050RoleAuthorityReadViewV1,
} from "./chain2050_role_authority_read_adapter_v1.js";

export const VOID_APOLLYON_READONLY_SENTRY_OBSERVATION_V1_SCHEMA =
  "void.apollyon-readonly-sentry-observation.v1" as const;
export const VOID_APOLLYON_NODE_HEALTH_EVIDENCE_V1_SCHEMA =
  "void.apollyon-node-health-evidence.v1" as const;
export const VOID_APOLLYON_AUTHORITY_CHECK_V1_SCHEMA =
  "void.apollyon-authority-check.v1" as const;

export interface ApollyonNodeHealthEvidenceV1 {
  schema: typeof VOID_APOLLYON_NODE_HEALTH_EVIDENCE_V1_SCHEMA;
  chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  health_ok: boolean;
  ready: boolean;
  gap: number;
  txroot_live: 0 | 1;
  latest_head: string;
  connected_peer_count: number;
  verified_peer_count: number;
  health_sha256: string;
  ready_sha256: string;
  head_sha256: string;
  peers_sha256: string;
}

export interface ApollyonAuthorityCheckV1 {
  schema: typeof VOID_APOLLYON_AUTHORITY_CHECK_V1_SCHEMA;
  identity_id: string;
  ok: boolean;
  reason: string | null;
  view: Chain2050RoleAuthorityReadViewV1 | null;
}

export interface ApollyonReadonlySentryInputV1 {
  schema: typeof VOID_APOLLYON_READONLY_SENTRY_OBSERVATION_V1_SCHEMA;
  node: ApollyonNodeHealthEvidenceV1;
  authority_checks: ApollyonAuthorityCheckV1[];
}

export type ApollyonReadonlySentryFindingCodeV1 =
  | "node_health_unhealthy"
  | "node_not_ready"
  | "chain_gap_nonzero"
  | "txroot_not_live"
  | "latest_head_zero"
  | "no_connected_peers"
  | "no_verified_peers"
  | "authority_read_failed"
  | "authority_revoked";

export type ApollyonReadonlySentryFindingSeverityV1 = "notice" | "hold";

export interface ApollyonReadonlySentryFindingV1 {
  code: ApollyonReadonlySentryFindingCodeV1;
  severity: ApollyonReadonlySentryFindingSeverityV1;
  identity_id: string | null;
  observed: string;
}

export interface ApollyonReadonlySentryObservationV1 {
  schema: typeof VOID_APOLLYON_READONLY_SENTRY_OBSERVATION_V1_SCHEMA;
  chain_id: typeof VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID;
  node: ApollyonNodeHealthEvidenceV1;
  authority_checks: ApollyonAuthorityCheckV1[];
  findings: ApollyonReadonlySentryFindingV1[];
  sentry_status: "green" | "attention" | "hold";
  escalation_required: boolean;
  model_execution_authorized: false;
  mutation_authority_granted: false;
  service_restart_authorized: false;
  transaction_authority_granted: false;
  observation_sha256: string;
}

export type ApollyonReadonlySentryObservationResultV1 =
  | { ok: true; observation: Readonly<ApollyonReadonlySentryObservationV1> }
  | { ok: false; reason: string };

const INPUT_KEYS = Object.freeze(["authority_checks", "node", "schema"] as const);
const NODE_KEYS = Object.freeze([
  "chain_id",
  "connected_peer_count",
  "gap",
  "head_sha256",
  "health_ok",
  "health_sha256",
  "latest_head",
  "peers_sha256",
  "ready",
  "ready_sha256",
  "schema",
  "txroot_live",
  "verified_peer_count",
] as const);
const CHECK_KEYS = Object.freeze(["identity_id", "ok", "reason", "schema", "view"] as const);
const VIEW_KEYS = Object.freeze([
  "authority_policy_sha256",
  "authority_status",
  "chain_id",
  "identity_id",
  "predecessor_role_record_sha256",
  "role",
  "role_authority_generation",
  "role_record_sha256",
  "schema",
  "subject_binding_sha256",
  "transition",
] as const);

const HEX64 = /^[a-f0-9]{64}$/;
const IDENTITY_ID = /^[a-z0-9][a-z0-9._:-]{2,191}$/;
const ROLE_ID = /^[A-Z][A-Z0-9_]{1,63}$/;
const REASON = /^[a-z0-9][a-z0-9._:-]{0,191}$/;
const MAX_PEERS = 1_000_000;
const MAX_GAP = 1_000_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObjectKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

export function canonicalApollyonReadonlySentryJsonV1(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isBoundedInteger(value: unknown, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max;
}

function isTransition(value: unknown): value is Chain2050RoleAuthorityTransitionV1 {
  return (
    value === "genesis_grant" ||
    value === "revoke" ||
    value === "restore" ||
    value === "subject_binding_change" ||
    value === "policy_change" ||
    value === "role_change"
  );
}

function validateNodeEvidence(value: unknown): value is ApollyonNodeHealthEvidenceV1 {
  if (!isRecord(value) || !exactObjectKeys(value, NODE_KEYS)) return false;
  if (value.schema !== VOID_APOLLYON_NODE_HEALTH_EVIDENCE_V1_SCHEMA) return false;
  if (value.chain_id !== VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID) return false;
  if (typeof value.health_ok !== "boolean" || typeof value.ready !== "boolean") return false;
  if (!isBoundedInteger(value.gap, MAX_GAP)) return false;
  if (value.txroot_live !== 0 && value.txroot_live !== 1) return false;
  if (parseChain2050RoleAuthorityGenerationV1(value.latest_head) === null) return false;
  if (!isBoundedInteger(value.connected_peer_count, MAX_PEERS)) return false;
  if (!isBoundedInteger(value.verified_peer_count, MAX_PEERS)) return false;
  if (Number(value.verified_peer_count) > Number(value.connected_peer_count)) return false;
  for (const key of ["health_sha256", "ready_sha256", "head_sha256", "peers_sha256"] as const) {
    if (typeof value[key] !== "string" || !HEX64.test(value[key] as string)) return false;
  }
  return true;
}

function validateReadView(value: unknown): value is Chain2050RoleAuthorityReadViewV1 {
  if (!isRecord(value) || !exactObjectKeys(value, VIEW_KEYS)) return false;
  if (value.schema !== VOID_CHAIN2050_ROLE_AUTHORITY_READ_ADAPTER_V1_SCHEMA) return false;
  if (value.chain_id !== VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID) return false;
  if (typeof value.identity_id !== "string" || !IDENTITY_ID.test(value.identity_id)) return false;
  if (typeof value.role !== "string" || !ROLE_ID.test(value.role)) return false;
  if (value.authority_status !== "active" && value.authority_status !== "revoked") return false;
  if (parseChain2050RoleAuthorityGenerationV1(value.role_authority_generation) === null) return false;
  for (const key of ["role_record_sha256", "subject_binding_sha256", "authority_policy_sha256"] as const) {
    if (typeof value[key] !== "string" || !HEX64.test(value[key] as string)) return false;
  }
  if (
    value.predecessor_role_record_sha256 !== null &&
    (typeof value.predecessor_role_record_sha256 !== "string" ||
      !HEX64.test(value.predecessor_role_record_sha256))
  ) {
    return false;
  }
  return isTransition(value.transition);
}

function validateAuthorityCheck(value: unknown): value is ApollyonAuthorityCheckV1 {
  if (!isRecord(value) || !exactObjectKeys(value, CHECK_KEYS)) return false;
  if (value.schema !== VOID_APOLLYON_AUTHORITY_CHECK_V1_SCHEMA) return false;
  if (typeof value.identity_id !== "string" || !IDENTITY_ID.test(value.identity_id)) return false;
  if (typeof value.ok !== "boolean") return false;
  if (value.ok) {
    return (
      value.reason === null &&
      validateReadView(value.view) &&
      value.view.identity_id === value.identity_id
    );
  }
  return (
    value.view === null &&
    typeof value.reason === "string" &&
    REASON.test(value.reason)
  );
}

function validateInput(value: unknown): value is ApollyonReadonlySentryInputV1 {
  if (!isRecord(value) || !exactObjectKeys(value, INPUT_KEYS)) return false;
  if (value.schema !== VOID_APOLLYON_READONLY_SENTRY_OBSERVATION_V1_SCHEMA) return false;
  if (!validateNodeEvidence(value.node)) return false;
  if (!Array.isArray(value.authority_checks) || value.authority_checks.length > 1024) return false;
  const seen = new Set<string>();
  let previous = "";
  for (const check of value.authority_checks) {
    if (!validateAuthorityCheck(check)) return false;
    if (seen.has(check.identity_id)) return false;
    if (previous !== "" && check.identity_id <= previous) return false;
    seen.add(check.identity_id);
    previous = check.identity_id;
  }
  return true;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function finding(
  code: ApollyonReadonlySentryFindingCodeV1,
  severity: ApollyonReadonlySentryFindingSeverityV1,
  observed: string,
  identityId: string | null = null,
): ApollyonReadonlySentryFindingV1 {
  return { code, severity, identity_id: identityId, observed };
}

function classifyFindings(input: ApollyonReadonlySentryInputV1): ApollyonReadonlySentryFindingV1[] {
  const findings: ApollyonReadonlySentryFindingV1[] = [];
  const node = input.node;
  if (!node.health_ok) findings.push(finding("node_health_unhealthy", "hold", "false"));
  if (!node.ready) findings.push(finding("node_not_ready", "hold", "false"));
  if (node.gap !== 0) findings.push(finding("chain_gap_nonzero", "hold", String(node.gap)));
  if (node.txroot_live !== 1) findings.push(finding("txroot_not_live", "hold", String(node.txroot_live)));
  if (node.latest_head === "0") findings.push(finding("latest_head_zero", "hold", "0"));
  if (node.connected_peer_count === 0) findings.push(finding("no_connected_peers", "hold", "0"));
  if (node.verified_peer_count === 0) findings.push(finding("no_verified_peers", "notice", "0"));

  for (const check of input.authority_checks) {
    if (!check.ok) {
      findings.push(
        finding("authority_read_failed", "hold", check.reason ?? "unknown", check.identity_id),
      );
      continue;
    }
    if (check.view?.authority_status === "revoked") {
      findings.push(
        finding(
          "authority_revoked",
          "hold",
          check.view.role_authority_generation,
          check.identity_id,
        ),
      );
    }
  }

  findings.sort((a, b) => {
    const left = `${a.code}\0${a.identity_id ?? ""}\0${a.observed}`;
    const right = `${b.code}\0${b.identity_id ?? ""}\0${b.observed}`;
    return left.localeCompare(right);
  });
  return findings;
}

export function buildApollyonReadonlySentryObservationV1(
  inputValue: unknown,
): ApollyonReadonlySentryObservationResultV1 {
  let isolated: unknown;
  try {
    isolated = structuredClone(inputValue);
  } catch {
    return { ok: false, reason: "sentry_input_not_cloneable" };
  }
  if (!validateInput(isolated)) {
    return { ok: false, reason: "sentry_input_invalid" };
  }

  const input = isolated;
  const findings = classifyFindings(input);
  const hasHold = findings.some((item) => item.severity === "hold");
  const sentryStatus: "green" | "attention" | "hold" =
    hasHold ? "hold" : findings.length > 0 ? "attention" : "green";

  const body = {
    schema: VOID_APOLLYON_READONLY_SENTRY_OBSERVATION_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    node: input.node,
    authority_checks: input.authority_checks,
    findings,
    sentry_status: sentryStatus,
    escalation_required: hasHold,
    model_execution_authorized: false as const,
    mutation_authority_granted: false as const,
    service_restart_authorized: false as const,
    transaction_authority_granted: false as const,
  };
  const observation: ApollyonReadonlySentryObservationV1 = {
    ...body,
    observation_sha256: sha256Hex(canonicalApollyonReadonlySentryJsonV1(body)),
  };
  return { ok: true, observation: deepFreeze(observation) };
}
