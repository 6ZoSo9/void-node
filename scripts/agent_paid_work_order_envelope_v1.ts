import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const AGENT_PAID_WORK_ORDER_MARKER =
  "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_ORDER_VERSION = 1 as const;
export const AGENT_PAID_WORK_ORDER_ID_PREFIX = "voidawo1_" as const;

export type AgentPaidWorkOrderDraft = {
  marker: typeof AGENT_PAID_WORK_ORDER_MARKER;
  version: typeof AGENT_PAID_WORK_ORDER_VERSION;
  created_at_utc: string;
  expires_at_utc: string;
  requester: {
    agent_id: string;
    callback_uri: string;
  };
  service: {
    capability_id: string;
    objective: string;
    input_refs: string[];
    expected_outputs: string[];
  };
  commercial: {
    quote_asset: string;
    max_total: string;
    payment_required_before_execution: true;
  };
  execution_limits: {
    max_runtime_seconds: number;
    max_output_bytes: number;
    external_side_effects_allowed: false;
    wallet_access_allowed: false;
    money_movement_allowed: false;
  };
  nonce: string;
};

export type AgentPaidWorkOrderEnvelope = AgentPaidWorkOrderDraft & {
  work_order_id: string;
};

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
      actual.every((key, index) => key === wanted[index]),
    `${label} must contain exactly: ${wanted.join(", ")}`,
  );
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  assertCondition(isRecord(value), `${label} must be an object`);
  return value;
}

function requireTrimmedString(
  value: unknown,
  label: string,
  minLength: number,
  maxLength: number,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must not have edge whitespace`);
  assertCondition(
    value.length >= minLength && value.length <= maxLength,
    `${label} length must be between ${minLength} and ${maxLength}`,
  );
  return value;
}

function requireStringArray(
  value: unknown,
  label: string,
  minItems: number,
  maxItems: number,
  maxItemLength: number,
): string[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  assertCondition(
    value.length >= minItems && value.length <= maxItems,
    `${label} item count must be between ${minItems} and ${maxItems}`,
  );
  const result = value.map((item, index) =>
    requireTrimmedString(item, `${label}[${index}]`, 1, maxItemLength),
  );
  assertCondition(
    new Set(result).size === result.length,
    `${label} must not contain duplicates`,
  );
  return result;
}

function requireSafeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    typeof value === "number" && Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  assertCondition(
    value >= minimum && value <= maximum,
    `${label} must be between ${minimum} and ${maximum}`,
  );
  return value;
}

function requireIsoUtc(value: unknown, label: string): string {
  const text = requireTrimmedString(value, label, 20, 20);
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(text),
    `${label} must use YYYY-MM-DDTHH:mm:ssZ`,
  );
  const parsed = Date.parse(text);
  assertCondition(Number.isFinite(parsed), `${label} must be valid UTC`);
  assertCondition(
    new Date(parsed).toISOString().replace(".000Z", "Z") === text,
    `${label} must be a real calendar timestamp`,
  );
  return text;
}

function requireHttpsCallbackUri(value: unknown, label: string): string {
  const text = requireTrimmedString(value, label, 12, 2048);
  assertCondition(
    text.startsWith("https://"),
    `${label} must use lowercase https://`,
  );

  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    return fail(`${label} must be a valid HTTPS URI`);
  }

  assertCondition(
    parsed.protocol === "https:" && parsed.hostname.length > 0,
    `${label} must include an HTTPS hostname`,
  );
  assertCondition(
    parsed.username === "" && parsed.password === "",
    `${label} must not embed credentials`,
  );
  assertCondition(!text.includes("#"), `${label} must not include a fragment`);
  return text;
}

function requireDecimalAmount(value: unknown, label: string): string {
  const text = requireTrimmedString(value, label, 1, 64);
  assertCondition(
    /^(?:0|[1-9]\d{0,31})(?:\.\d{1,18})?$/.test(text),
    `${label} must use at most 32 integer digits and 18 fractional digits`,
  );
  assertCondition(/[1-9]/.test(text), `${label} must be greater than zero`);
  return text;
}

function requireLiteralBoolean(
  value: unknown,
  expected: boolean,
  label: string,
): void {
  assertCondition(value === expected, `${label} must be ${String(expected)}`);
}

function validateDraftShape(value: unknown, includeId: boolean): AgentPaidWorkOrderDraft {
  const root = requireRecord(value, "work order");
  const topKeys = [
    "marker",
    "version",
    "created_at_utc",
    "expires_at_utc",
    "requester",
    "service",
    "commercial",
    "execution_limits",
    "nonce",
    ...(includeId ? ["work_order_id"] : []),
  ] as const;
  assertExactKeys(root, topKeys, "work order");

  assertCondition(
    root.marker === AGENT_PAID_WORK_ORDER_MARKER,
    `marker must equal ${AGENT_PAID_WORK_ORDER_MARKER}`,
  );
  assertCondition(
    root.version === AGENT_PAID_WORK_ORDER_VERSION,
    `version must equal ${AGENT_PAID_WORK_ORDER_VERSION}`,
  );

  const createdAt = requireIsoUtc(root.created_at_utc, "created_at_utc");
  const expiresAt = requireIsoUtc(root.expires_at_utc, "expires_at_utc");
  assertCondition(
    Date.parse(expiresAt) > Date.parse(createdAt),
    "expires_at_utc must be later than created_at_utc",
  );

  const requester = requireRecord(root.requester, "requester");
  assertExactKeys(requester, ["agent_id", "callback_uri"], "requester");
  const agentId = requireTrimmedString(requester.agent_id, "requester.agent_id", 3, 128);
  assertCondition(
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(agentId),
    "requester.agent_id contains unsupported characters",
  );
  const callbackUri = requireHttpsCallbackUri(
    requester.callback_uri,
    "requester.callback_uri",
  );

  const service = requireRecord(root.service, "service");
  assertExactKeys(
    service,
    ["capability_id", "objective", "input_refs", "expected_outputs"],
    "service",
  );
  const capabilityId = requireTrimmedString(
    service.capability_id,
    "service.capability_id",
    3,
    128,
  );
  assertCondition(
    /^[a-z0-9][a-z0-9._:-]{2,127}$/.test(capabilityId),
    "service.capability_id must be lowercase and machine-safe",
  );
  const objective = requireTrimmedString(
    service.objective,
    "service.objective",
    1,
    4000,
  );
  const inputRefs = requireStringArray(
    service.input_refs,
    "service.input_refs",
    1,
    64,
    2048,
  );
  const expectedOutputs = requireStringArray(
    service.expected_outputs,
    "service.expected_outputs",
    1,
    64,
    256,
  );
  for (const [index, output] of expectedOutputs.entries()) {
    assertCondition(
      /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(output),
      `service.expected_outputs[${index}] must be a machine-safe logical label`,
    );
  }

  const commercial = requireRecord(root.commercial, "commercial");
  assertExactKeys(
    commercial,
    ["quote_asset", "max_total", "payment_required_before_execution"],
    "commercial",
  );
  const quoteAsset = requireTrimmedString(
    commercial.quote_asset,
    "commercial.quote_asset",
    1,
    32,
  );
  assertCondition(
    /^[A-Z][A-Z0-9._:-]{0,31}$/.test(quoteAsset),
    "commercial.quote_asset must be an uppercase machine-safe asset code",
  );
  const maxTotal = requireDecimalAmount(commercial.max_total, "commercial.max_total");
  requireLiteralBoolean(
    commercial.payment_required_before_execution,
    true,
    "commercial.payment_required_before_execution",
  );

  const limits = requireRecord(root.execution_limits, "execution_limits");
  assertExactKeys(
    limits,
    [
      "max_runtime_seconds",
      "max_output_bytes",
      "external_side_effects_allowed",
      "wallet_access_allowed",
      "money_movement_allowed",
    ],
    "execution_limits",
  );
  const maxRuntimeSeconds = requireSafeInteger(
    limits.max_runtime_seconds,
    "execution_limits.max_runtime_seconds",
    1,
    86400,
  );
  const maxOutputBytes = requireSafeInteger(
    limits.max_output_bytes,
    "execution_limits.max_output_bytes",
    1,
    100_000_000,
  );
  requireLiteralBoolean(
    limits.external_side_effects_allowed,
    false,
    "execution_limits.external_side_effects_allowed",
  );
  requireLiteralBoolean(
    limits.wallet_access_allowed,
    false,
    "execution_limits.wallet_access_allowed",
  );
  requireLiteralBoolean(
    limits.money_movement_allowed,
    false,
    "execution_limits.money_movement_allowed",
  );

  const nonce = requireTrimmedString(root.nonce, "nonce", 8, 128);
  assertCondition(
    /^[A-Za-z0-9._:-]{8,128}$/.test(nonce),
    "nonce contains unsupported characters",
  );

  return {
    marker: AGENT_PAID_WORK_ORDER_MARKER,
    version: AGENT_PAID_WORK_ORDER_VERSION,
    created_at_utc: createdAt,
    expires_at_utc: expiresAt,
    requester: {
      agent_id: agentId,
      callback_uri: callbackUri,
    },
    service: {
      capability_id: capabilityId,
      objective,
      input_refs: inputRefs,
      expected_outputs: expectedOutputs,
    },
    commercial: {
      quote_asset: quoteAsset,
      max_total: maxTotal,
      payment_required_before_execution: true,
    },
    execution_limits: {
      max_runtime_seconds: maxRuntimeSeconds,
      max_output_bytes: maxOutputBytes,
      external_side_effects_allowed: false,
      wallet_access_allowed: false,
      money_movement_allowed: false,
    },
    nonce,
  };
}

function toJsonValue(value: unknown, label = "value"): JsonValue {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number") {
    assertCondition(Number.isFinite(value), `${label} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => toJsonValue(item, `${label}[${index}]`));
  }
  if (isRecord(value)) {
    const result = Object.create(null) as Record<string, JsonValue>;
    for (const key of Object.keys(value).sort()) {
      result[key] = toJsonValue(value[key], `${label}.${key}`);
    }
    return result;
  }
  return fail(`${label} is not JSON-compatible`);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(toJsonValue(value));
}

export function computeAgentPaidWorkOrderId(
  draft: AgentPaidWorkOrderDraft,
): string {
  const digest = createHash("sha256").update(canonicalJson(draft)).digest("hex");
  return `${AGENT_PAID_WORK_ORDER_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkOrderDraft(
  value: unknown,
): asserts value is AgentPaidWorkOrderDraft {
  validateDraftShape(value, false);
}

export function materializeAgentPaidWorkOrder(
  value: unknown,
): AgentPaidWorkOrderEnvelope {
  const draft = validateDraftShape(value, false);
  return {
    ...draft,
    work_order_id: computeAgentPaidWorkOrderId(draft),
  };
}

export function validateAgentPaidWorkOrderEnvelope(
  value: unknown,
): asserts value is AgentPaidWorkOrderEnvelope {
  const root = requireRecord(value, "work order");
  const draft = validateDraftShape(value, true);
  const workOrderId = requireTrimmedString(
    root.work_order_id,
    "work_order_id",
    AGENT_PAID_WORK_ORDER_ID_PREFIX.length + 64,
    AGENT_PAID_WORK_ORDER_ID_PREFIX.length + 64,
  );
  assertCondition(
    new RegExp(`^${AGENT_PAID_WORK_ORDER_ID_PREFIX}[0-9a-f]{64}$`).test(workOrderId),
    "work_order_id must use the voidawo1_ prefix and a lowercase SHA-256 digest",
  );
  assertCondition(
    workOrderId === computeAgentPaidWorkOrderId(draft),
    "work_order_id does not match the canonical envelope payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/agent_paid_work_order_envelope_v1.ts materialize <draft.json> <envelope.json>",
      "  tsx scripts/agent_paid_work_order_envelope_v1.ts verify <envelope.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [mode, inputPath, outputPath, ...extra] = process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected extra arguments");

  if (mode === "materialize") {
    assertCondition(Boolean(inputPath && outputPath), "materialize requires input and output paths");
    const envelope = materializeAgentPaidWorkOrder(readJson(resolve(inputPath)));
    writeFileSync(resolve(outputPath), `${JSON.stringify(envelope, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    console.log(`marker=${envelope.marker}`);
    console.log(`work_order_id=${envelope.work_order_id}`);
    console.log(`output=${resolve(outputPath)}`);
    console.log("VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1_MATERIALIZED");
    return;
  }

  if (mode === "verify") {
    assertCondition(Boolean(inputPath) && outputPath === undefined, "verify requires one input path");
    const envelope = readJson(resolve(inputPath));
    validateAgentPaidWorkOrderEnvelope(envelope);
    console.log(`marker=${envelope.marker}`);
    console.log(`work_order_id=${envelope.work_order_id}`);
    console.log(`capability_id=${envelope.service.capability_id}`);
    console.log(`quote_asset=${envelope.commercial.quote_asset}`);
    console.log(`max_total=${envelope.commercial.max_total}`);
    console.log("VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1_VALID");
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
    const message = error instanceof Error ? error.message : String(error);
    console.error(`HOLD: ${message}`);
    process.exitCode = 1;
  }
}
