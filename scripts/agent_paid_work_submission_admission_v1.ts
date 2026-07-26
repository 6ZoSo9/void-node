import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { isIP } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  canonicalJson,
  validateAgentPaidWorkOrderEnvelope,
  type AgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";

export const AGENT_PAID_WORK_SUBMISSION_ADMISSION_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1" as const;
export const AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_V1" as const;
export const AGENT_PAID_WORK_SUBMISSION_ADMISSION_ID_PREFIX =
  "voidawsa1_" as const;

export const AGENT_PAID_WORK_SUBMISSION_ADMISSION_REASON_CODES = [
  "callback_loopback_forbidden",
  "callback_private_ip_literal_forbidden",
  "capability_not_allowed",
  "created_in_future",
  "expired",
  "expected_output_count_exceeds_policy",
  "input_ref_count_exceeds_policy",
  "max_total_exceeds_policy",
  "output_bytes_exceeds_policy",
  "quote_asset_not_allowed",
  "runtime_exceeds_policy",
  "ttl_exceeds_policy",
] as const;

export type AgentPaidWorkSubmissionAdmissionReasonCode =
  (typeof AGENT_PAID_WORK_SUBMISSION_ADMISSION_REASON_CODES)[number];

export type AgentPaidWorkSubmissionAdmissionPolicyV1 = {
  marker: typeof AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_MARKER;
  version: 1;
  policy_id: string;
  allowed_capability_ids: string[];
  max_total_by_asset: Record<string, string>;
  max_runtime_seconds: number;
  max_output_bytes: number;
  max_input_refs: number;
  max_expected_outputs: number;
  max_ttl_seconds: number;
  require_https_callback: true;
  callback_policy: {
    forbid_credentials: true;
    forbid_fragment: true;
    forbid_loopback: true;
    forbid_private_ip_literals: true;
  };
  authority: {
    provider_selection_authorized: false;
    quote_creation_authorized: false;
    payment_authorized: false;
    work_execution_authorized: false;
    work_dispatch_authorized: false;
    wc_award_authorized: false;
    wc_ledger_write_authorized: false;
    wallet_or_signer_access_authorized: false;
    buy_void_fulfillment_authorized: false;
  };
};

export type AgentPaidWorkSubmissionAdmissionV1 = {
  marker: typeof AGENT_PAID_WORK_SUBMISSION_ADMISSION_MARKER;
  version: 1;
  admission_id: string;
  work_order_id: string;
  policy_id: string;
  evaluated_at_utc: string;
  decision: "accepted_for_review" | "rejected";
  reason_codes: AgentPaidWorkSubmissionAdmissionReasonCode[];
  normalized: {
    capability_id: string;
    quote_asset: string;
    max_total: string;
    max_runtime_seconds: number;
    max_output_bytes: number;
    input_ref_count: number;
    expected_output_count: number;
    callback_scheme: string;
    callback_host: string;
    ttl_seconds: number;
  };
  authority: {
    provider_selected: false;
    quote_created: false;
    payment_authorized: false;
    work_execution_authorized: false;
    work_dispatched: false;
    wc_award_authorized: false;
    wc_ledger_write_authorized: false;
    mutation_authority_granted: false;
    wallet_or_signer_access_granted: false;
    buy_void_fulfillment_authority_granted: false;
  };
};

type AdmissionDraft = Omit<
  AgentPaidWorkSubmissionAdmissionV1,
  "admission_id"
>;

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    actual.length === wanted.length &&
      actual.every(
        (key, index) => key === wanted[index],
      ),
    `${label} must contain exactly: ${wanted.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  pattern?: RegExp,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    value === value.trim(),
    `${label} must not have edge whitespace`,
  );
  assertCondition(
    value.length >= minimum &&
      value.length <= maximum,
    `${label} length must be ${minimum}..${maximum}`,
  );
  if (pattern) {
    assertCondition(
      pattern.test(value),
      `${label} has invalid format`,
    );
  }
  return value;
}

function requireInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    typeof value === "number" &&
      Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  assertCondition(
    value >= minimum && value <= maximum,
    `${label} must be ${minimum}..${maximum}`,
  );
  return value;
}

function requireIsoUtc(
  value: unknown,
  label: string,
): string {
  const text = requireString(
    value,
    label,
    20,
    20,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
  );
  const parsed = Date.parse(text);
  assertCondition(
    Number.isFinite(parsed),
    `${label} must be valid UTC`,
  );
  assertCondition(
    new Date(parsed)
      .toISOString()
      .replace(".000Z", "Z") === text,
    `${label} must be a real UTC timestamp`,
  );
  return text;
}

function requireMachineId(
  value: unknown,
  label: string,
): string {
  return requireString(
    value,
    label,
    3,
    128,
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
  );
}

function requireDecimal(
  value: unknown,
  label: string,
): string {
  const text = requireString(
    value,
    label,
    1,
    51,
    /^(?:0|[1-9]\d{0,31})(?:\.\d{1,18})?$/,
  );
  assertCondition(
    !/^0(?:\.0{1,18})?$/.test(text),
    `${label} must be greater than zero`,
  );
  return text;
}

function decimalUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * 10n ** 18n +
    BigInt((fraction + "0".repeat(18)).slice(0, 18))
  );
}

function requireUniqueMachineIds(
  value: unknown,
  label: string,
): string[] {
  assertCondition(
    Array.isArray(value),
    `${label} must be an array`,
  );
  assertCondition(
    value.length >= 1 && value.length <= 128,
    `${label} item count must be 1..128`,
  );
  const result = value.map((item, index) =>
    requireString(
      item,
      `${label}[${index}]`,
      3,
      128,
      /^[a-z0-9][a-z0-9._:-]{2,127}$/,
    ),
  );
  assertCondition(
    new Set(result).size === result.length,
    `${label} must be unique`,
  );
  return result;
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "::1") {
    return true;
  }
  if (host.startsWith("127.")) return true;
  return false;
}

function isPrivateIpLiteral(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const kind = isIP(host);

  if (kind === 4) {
    const parts = host
      .split(".")
      .map((value) => Number.parseInt(value, 10));
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (kind === 6) {
    return (
      host === "::" ||
      host === "::1" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe8") ||
      host.startsWith("fe9") ||
      host.startsWith("fea") ||
      host.startsWith("feb")
    );
  }

  return false;
}

export function validateAgentPaidWorkSubmissionAdmissionPolicyV1(
  value: unknown,
): asserts value is AgentPaidWorkSubmissionAdmissionPolicyV1 {
  assertCondition(
    isRecord(value),
    "admission policy must be an object",
  );
  assertExactKeys(
    value,
    [
      "marker",
      "version",
      "policy_id",
      "allowed_capability_ids",
      "max_total_by_asset",
      "max_runtime_seconds",
      "max_output_bytes",
      "max_input_refs",
      "max_expected_outputs",
      "max_ttl_seconds",
      "require_https_callback",
      "callback_policy",
      "authority",
    ],
    "admission policy",
  );

  assertCondition(
    value.marker ===
      AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_MARKER,
    "admission policy marker mismatch",
  );
  assertCondition(
    value.version === 1,
    "admission policy version must be 1",
  );
  requireMachineId(value.policy_id, "policy_id");
  requireUniqueMachineIds(
    value.allowed_capability_ids,
    "allowed_capability_ids",
  );

  assertCondition(
    isRecord(value.max_total_by_asset),
    "max_total_by_asset must be an object",
  );
  const assetEntries = Object.entries(
    value.max_total_by_asset,
  );
  assertCondition(
    assetEntries.length >= 1 &&
      assetEntries.length <= 32,
    "max_total_by_asset entry count must be 1..32",
  );
  for (const [asset, maximum] of assetEntries) {
    requireString(
      asset,
      "max_total_by_asset asset",
      1,
      32,
      /^[A-Z][A-Z0-9._:-]{0,31}$/,
    );
    requireDecimal(
      maximum,
      `max_total_by_asset.${asset}`,
    );
  }

  requireInteger(
    value.max_runtime_seconds,
    "max_runtime_seconds",
    1,
    86400,
  );
  requireInteger(
    value.max_output_bytes,
    "max_output_bytes",
    1,
    100_000_000,
  );
  requireInteger(
    value.max_input_refs,
    "max_input_refs",
    1,
    64,
  );
  requireInteger(
    value.max_expected_outputs,
    "max_expected_outputs",
    1,
    64,
  );
  requireInteger(
    value.max_ttl_seconds,
    "max_ttl_seconds",
    1,
    604800,
  );
  assertCondition(
    value.require_https_callback === true,
    "require_https_callback must be true",
  );

  assertCondition(
    isRecord(value.callback_policy),
    "callback_policy must be an object",
  );
  assertExactKeys(
    value.callback_policy,
    [
      "forbid_credentials",
      "forbid_fragment",
      "forbid_loopback",
      "forbid_private_ip_literals",
    ],
    "callback_policy",
  );
  for (const key of Object.keys(
    value.callback_policy,
  )) {
    assertCondition(
      value.callback_policy[key] === true,
      `callback_policy.${key} must be true`,
    );
  }

  assertCondition(
    isRecord(value.authority),
    "authority must be an object",
  );
  assertExactKeys(
    value.authority,
    [
      "provider_selection_authorized",
      "quote_creation_authorized",
      "payment_authorized",
      "work_execution_authorized",
      "work_dispatch_authorized",
      "wc_award_authorized",
      "wc_ledger_write_authorized",
      "wallet_or_signer_access_authorized",
      "buy_void_fulfillment_authorized",
    ],
    "authority",
  );
  for (const key of Object.keys(value.authority)) {
    assertCondition(
      value.authority[key] === false,
      `authority.${key} must be false`,
    );
  }
}

function admissionId(
  draft: AdmissionDraft,
): string {
  return (
    AGENT_PAID_WORK_SUBMISSION_ADMISSION_ID_PREFIX +
    createHash("sha256")
      .update(canonicalJson(draft))
      .digest("hex")
  );
}

export function materializeAgentPaidWorkSubmissionAdmissionV1(
  workOrderValue: unknown,
  policyValue: unknown,
  evaluatedAtValue: unknown,
): AgentPaidWorkSubmissionAdmissionV1 {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkSubmissionAdmissionPolicyV1(
    policyValue,
  );

  const workOrder = workOrderValue;
  const policy = policyValue;
  const evaluatedAt = requireIsoUtc(
    evaluatedAtValue,
    "evaluated_at_utc",
  );
  const reasons =
    new Set<AgentPaidWorkSubmissionAdmissionReasonCode>();

  const createdMs = Date.parse(workOrder.created_at_utc);
  const expiresMs = Date.parse(workOrder.expires_at_utc);
  const evaluatedMs = Date.parse(evaluatedAt);
  const ttlSeconds = Math.floor(
    (expiresMs - createdMs) / 1000,
  );

  if (evaluatedMs < createdMs) {
    reasons.add("created_in_future");
  }
  if (evaluatedMs >= expiresMs) {
    reasons.add("expired");
  }
  if (ttlSeconds > policy.max_ttl_seconds) {
    reasons.add("ttl_exceeds_policy");
  }
  if (
    !policy.allowed_capability_ids.includes(
      workOrder.service.capability_id,
    )
  ) {
    reasons.add("capability_not_allowed");
  }

  const assetMaximum =
    policy.max_total_by_asset[
      workOrder.commercial.quote_asset
    ];
  if (!assetMaximum) {
    reasons.add("quote_asset_not_allowed");
  } else if (
    decimalUnits(workOrder.commercial.max_total) >
    decimalUnits(assetMaximum)
  ) {
    reasons.add("max_total_exceeds_policy");
  }

  if (
    workOrder.execution_limits.max_runtime_seconds >
    policy.max_runtime_seconds
  ) {
    reasons.add("runtime_exceeds_policy");
  }
  if (
    workOrder.execution_limits.max_output_bytes >
    policy.max_output_bytes
  ) {
    reasons.add("output_bytes_exceeds_policy");
  }
  if (
    workOrder.service.input_refs.length >
    policy.max_input_refs
  ) {
    reasons.add("input_ref_count_exceeds_policy");
  }
  if (
    workOrder.service.expected_outputs.length >
    policy.max_expected_outputs
  ) {
    reasons.add(
      "expected_output_count_exceeds_policy",
    );
  }

  assertCondition(
    workOrder.execution_limits
      .external_side_effects_allowed === false,
    "validated work order side-effect invariant changed",
  );
  assertCondition(
    workOrder.execution_limits.wallet_access_allowed ===
      false,
    "validated work order wallet invariant changed",
  );
  assertCondition(
    workOrder.execution_limits.money_movement_allowed ===
      false,
    "validated work order money-movement invariant changed",
  );

  const callback = new URL(
    workOrder.requester.callback_uri,
  );
  assertCondition(
    callback.protocol === "https:",
    "validated work order HTTPS callback invariant changed",
  );
  assertCondition(
    callback.username === "" &&
      callback.password === "",
    "validated work order callback credential invariant changed",
  );
  assertCondition(
    callback.hash === "",
    "validated work order callback fragment invariant changed",
  );

  if (isLoopbackHost(callback.hostname)) {
    reasons.add("callback_loopback_forbidden");
  }
  if (isPrivateIpLiteral(callback.hostname)) {
    reasons.add(
      "callback_private_ip_literal_forbidden",
    );
  }

  const reasonCodes = [...reasons].sort();
  const draft: AdmissionDraft = {
    marker:
      AGENT_PAID_WORK_SUBMISSION_ADMISSION_MARKER,
    version: 1,
    work_order_id: workOrder.work_order_id,
    policy_id: policy.policy_id,
    evaluated_at_utc: evaluatedAt,
    decision:
      reasonCodes.length === 0
        ? "accepted_for_review"
        : "rejected",
    reason_codes: reasonCodes,
    normalized: {
      capability_id:
        workOrder.service.capability_id,
      quote_asset:
        workOrder.commercial.quote_asset,
      max_total: workOrder.commercial.max_total,
      max_runtime_seconds:
        workOrder.execution_limits
          .max_runtime_seconds,
      max_output_bytes:
        workOrder.execution_limits.max_output_bytes,
      input_ref_count:
        workOrder.service.input_refs.length,
      expected_output_count:
        workOrder.service.expected_outputs.length,
      callback_scheme:
        callback.protocol.replace(/:$/, ""),
      callback_host: callback.hostname,
      ttl_seconds: ttlSeconds,
    },
    authority: {
      provider_selected: false,
      quote_created: false,
      payment_authorized: false,
      work_execution_authorized: false,
      work_dispatched: false,
      wc_award_authorized: false,
      wc_ledger_write_authorized: false,
      mutation_authority_granted: false,
      wallet_or_signer_access_granted: false,
      buy_void_fulfillment_authority_granted: false,
    },
  };

  return {
    ...draft,
    admission_id: admissionId(draft),
  };
}

export function validateAgentPaidWorkSubmissionAdmissionV1(
  value: unknown,
  workOrder: unknown,
  policy: unknown,
  evaluatedAtUtc: unknown,
): asserts value is AgentPaidWorkSubmissionAdmissionV1 {
  assertCondition(
    isRecord(value),
    "admission result must be an object",
  );
  const expected =
    materializeAgentPaidWorkSubmissionAdmissionV1(
      workOrder,
      policy,
      evaluatedAtUtc,
    );
  assertCondition(
    canonicalJson(value) === canonicalJson(expected),
    "admission result does not match deterministic evaluation",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(
    readFileSync(resolve(path), "utf8"),
  ) as unknown;
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/agent_paid_work_submission_admission_v1.ts evaluate <work-order.json> <policy.json> <evaluated-at-utc> <result.json>",
      "  tsx scripts/agent_paid_work_submission_admission_v1.ts verify <work-order.json> <policy.json> <evaluated-at-utc> <result.json>",
      "  tsx scripts/agent_paid_work_submission_admission_v1.ts policy-check <policy.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [mode, ...args] = process.argv.slice(2);

  if (mode === "policy-check") {
    assertCondition(
      args.length === 1,
      "policy-check requires one policy path",
    );
    const policy = readJson(args[0]);
    validateAgentPaidWorkSubmissionAdmissionPolicyV1(
      policy,
    );
    console.log(
      "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_V1_VALID",
    );
    return;
  }

  if (mode === "evaluate") {
    assertCondition(
      args.length === 4,
      "evaluate requires work order, policy, evaluation time, and output",
    );
    const [workOrderPath, policyPath, evaluatedAt, outputPath] =
      args;
    const result =
      materializeAgentPaidWorkSubmissionAdmissionV1(
        readJson(workOrderPath),
        readJson(policyPath),
        evaluatedAt,
      );
    writeFileSync(
      resolve(outputPath),
      `${JSON.stringify(result, null, 2)}\n`,
      {
        encoding: "utf8",
        mode: 0o600,
        flag: "wx",
      },
    );
    console.log(`decision=${result.decision}`);
    console.log(`admission_id=${result.admission_id}`);
    console.log(
      `reason_codes=${result.reason_codes.join(",") || "none"}`,
    );
    console.log(
      "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1_EVALUATED",
    );
    return;
  }

  if (mode === "verify") {
    assertCondition(
      args.length === 4,
      "verify requires work order, policy, evaluation time, and result",
    );
    const [workOrderPath, policyPath, evaluatedAt, resultPath] =
      args;
    validateAgentPaidWorkSubmissionAdmissionV1(
      readJson(resultPath),
      readJson(workOrderPath),
      readJson(policyPath),
      evaluatedAt,
    );
    console.log(
      "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1_VALID",
    );
    return;
  }

  usage();
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";

if (invokedUrl === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(
      `HOLD: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
    process.exitCode = 1;
  }
}
