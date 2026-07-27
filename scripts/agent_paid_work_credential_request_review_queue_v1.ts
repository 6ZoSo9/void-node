import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

export const REQUEST_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_V1";
export const RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTAKE_RECEIPT_V1";
export const POLICY_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_REVIEW_POLICY_V1";
export const QUEUE_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_REVIEW_QUEUE_V1";
export const DECISION_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_REVIEW_DECISION_V1";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface CredentialRequestV1 {
  marker: typeof REQUEST_MARKER;
  version: 1;
  request_id: string;
  created_at_utc: string;
  expires_at_utc: string;
  agent_id: string;
  callback_uri: string;
  requested_scope: "agent_paid_work_submit";
  requested_credential_lifetime_days: number;
  capability_ids: string[];
  nonce: string;
}

export interface IntakeReceiptV1 {
  marker: typeof RECEIPT_MARKER;
  version: 1;
  receipt_id: string;
  request_id: string;
  received_at_utc: string;
  decision: "accepted_for_review";
  reason_codes: string[];
  normalized: {
    agent_id: string;
    callback_scheme: "https";
    callback_host: string;
    requested_scope: "agent_paid_work_submit";
    requested_credential_lifetime_days: number;
    capability_ids: string[];
  };
  authority: Record<string, boolean>;
}

export interface ReviewPolicyV1 {
  marker: typeof POLICY_MARKER;
  version: 1;
  policy_id: string;
  allowed_scopes: ["agent_paid_work_submit"];
  allowed_capability_ids: string[];
  maximum_credential_lifetime_days: number;
  maximum_request_age_seconds: number;
  require_https_callback: true;
}

export type ReviewDecisionName =
  | "approve_for_issuance_preparation"
  | "reject";

export interface ReviewDecisionV1 {
  marker: typeof DECISION_MARKER;
  version: 1;
  decision_id: string;
  request_id: string;
  decided_at_utc: string;
  reviewer_id: string;
  decision: ReviewDecisionName;
  reason_codes: string[];
  policy_id: string;
  request_sha256: string;
  intake_receipt_sha256: string;
  authority: {
    credential_issuance_authorized: false;
    credential_registry_mutation_authorized: false;
    receiver_restart_authorized: false;
    raw_token_access_authorized: false;
  };
}

export interface QueueItemV1 {
  request_id: string;
  agent_id: string;
  requested_scope: "agent_paid_work_submit";
  requested_credential_lifetime_days: number;
  capability_ids: string[];
  callback_scheme: "https";
  callback_host: string;
  created_at_utc: string;
  expires_at_utc: string;
  received_at_utc: string;
  review_state:
    | "pending"
    | "approved_for_issuance_preparation"
    | "rejected"
    | "expired"
    | "policy_hold";
  policy_reason_codes: string[];
  decision_id: string | null;
}

export interface ReviewQueueV1 {
  marker: typeof QUEUE_MARKER;
  version: 1;
  generated_at_utc: string;
  policy_id: string;
  counts: {
    total: number;
    pending: number;
    approved_for_issuance_preparation: number;
    rejected: number;
    expired: number;
    policy_hold: number;
  };
  items: QueueItemV1[];
  raw_callback_uri_exposed: false;
  credential_created: false;
  credential_registry_mutated: false;
}

const REQUEST_ID_PATTERN = /^voidapwcrq1_[0-9a-f]{64}$/;
const RECEIPT_ID_PATTERN = /^voidapwcrqi1_[0-9a-f]{64}$/;
const DECISION_ID_PATTERN = /^voidapwcrd1_[0-9a-f]{64}$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export function canonicalJson(value: JsonValue): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  const object = value as Record<string, JsonValue>;
  const keys = Object.keys(object).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

export function sha256Bytes(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function requireObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function requireExactKeys(
  value: Record<string, unknown>,
  expected: string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();

  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(
      `${label} key mismatch: expected=${wanted.join(",")}, actual=${actual.join(",")}`,
    );
  }
}

function parseUtc(value: unknown, label: string): Date {
  if (typeof value !== "string" || !UTC_PATTERN.test(value)) {
    throw new Error(`${label} must be UTC seconds`);
  }

  const parsed = new Date(value);

  if (
    !Number.isFinite(parsed.valueOf()) ||
    parsed.toISOString().replace(".000Z", "Z") !== value
  ) {
    throw new Error(`${label} must be canonical UTC seconds`);
  }

  return parsed;
}

function requireSortedUniqueIds(
  value: unknown,
  label: string,
): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) {
    throw new Error(`${label} must contain 1 to 16 values`);
  }

  const ids = value.map((item) => {
    if (typeof item !== "string" || !ID_PATTERN.test(item)) {
      throw new Error(`${label} contains an invalid ID`);
    }

    return item;
  });
  const normalized = [...new Set(ids)].sort();

  if (JSON.stringify(ids) !== JSON.stringify(normalized)) {
    throw new Error(`${label} must be sorted and unique`);
  }

  return ids;
}

function callbackParts(value: unknown): {
  canonical: string;
  scheme: "https";
  host: string;
} {
  if (typeof value !== "string" || !value.startsWith("https://")) {
    throw new Error("callback_uri must use lowercase https://");
  }

  const parsed = new URL(value);

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    parsed.search ||
    !parsed.hostname
  ) {
    throw new Error("callback_uri contract mismatch");
  }

  if (
    parsed.hostname !== parsed.hostname.toLowerCase() ||
    parsed.hostname.split("").some((character) => character.charCodeAt(0) > 127)
  ) {
    throw new Error("callback_uri hostname must be lowercase ASCII");
  }

  if (parsed.port === "443") {
    throw new Error("callback_uri must omit default port 443");
  }

  const canonical = parsed.toString();

  if (canonical !== value) {
    throw new Error(`callback_uri must already be canonical: ${canonical}`);
  }

  return {
    canonical,
    scheme: "https",
    host: parsed.hostname,
  };
}

export function validateCredentialRequest(
  value: unknown,
): CredentialRequestV1 {
  requireObject(value, "credential request");
  requireExactKeys(
    value,
    [
      "marker",
      "version",
      "request_id",
      "created_at_utc",
      "expires_at_utc",
      "agent_id",
      "callback_uri",
      "requested_scope",
      "requested_credential_lifetime_days",
      "capability_ids",
      "nonce",
    ],
    "credential request",
  );

  if (value.marker !== REQUEST_MARKER || value.version !== 1) {
    throw new Error("credential request marker/version mismatch");
  }

  if (
    typeof value.request_id !== "string" ||
    !REQUEST_ID_PATTERN.test(value.request_id)
  ) {
    throw new Error("request_id format mismatch");
  }

  if (
    typeof value.agent_id !== "string" ||
    !ID_PATTERN.test(value.agent_id)
  ) {
    throw new Error("agent_id format mismatch");
  }

  if (value.requested_scope !== "agent_paid_work_submit") {
    throw new Error("requested_scope mismatch");
  }

  if (
    !Number.isInteger(value.requested_credential_lifetime_days) ||
    Number(value.requested_credential_lifetime_days) < 1 ||
    Number(value.requested_credential_lifetime_days) > 90
  ) {
    throw new Error("requested credential lifetime must be from 1 to 90 days");
  }

  const created = parseUtc(value.created_at_utc, "created_at_utc");
  const expires = parseUtc(value.expires_at_utc, "expires_at_utc");

  if (
    expires.valueOf() <= created.valueOf() ||
    expires.valueOf() - created.valueOf() > 24 * 60 * 60 * 1000
  ) {
    throw new Error("request TTL must be positive and no more than 24 hours");
  }

  const callback = callbackParts(value.callback_uri);
  const capabilityIds = requireSortedUniqueIds(
    value.capability_ids,
    "capability_ids",
  );

  if (
    typeof value.nonce !== "string" ||
    value.nonce.length < 16 ||
    value.nonce.length > 128 ||
    !ID_PATTERN.test(value.nonce)
  ) {
    throw new Error("nonce format mismatch");
  }

  const body: Record<string, JsonValue> = {
    marker: REQUEST_MARKER,
    version: 1,
    created_at_utc: value.created_at_utc as string,
    expires_at_utc: value.expires_at_utc as string,
    agent_id: value.agent_id,
    callback_uri: callback.canonical,
    requested_scope: "agent_paid_work_submit",
    requested_credential_lifetime_days:
      value.requested_credential_lifetime_days as number,
    capability_ids: capabilityIds,
    nonce: value.nonce,
  };
  const expectedRequestId = `voidapwcrq1_${sha256Bytes(
    canonicalJson(body as JsonValue),
  )}`;

  if (value.request_id !== expectedRequestId) {
    throw new Error("request_id content binding mismatch");
  }

  return value as unknown as CredentialRequestV1;
}

export function validateIntakeReceipt(
  value: unknown,
  request: CredentialRequestV1,
): IntakeReceiptV1 {
  requireObject(value, "intake receipt");

  if (
    value.marker !== RECEIPT_MARKER ||
    value.version !== 1 ||
    typeof value.receipt_id !== "string" ||
    !RECEIPT_ID_PATTERN.test(value.receipt_id) ||
    value.request_id !== request.request_id ||
    value.decision !== "accepted_for_review" ||
    !Array.isArray(value.reason_codes) ||
    value.reason_codes.length !== 0
  ) {
    throw new Error("intake receipt identity mismatch");
  }

  parseUtc(value.received_at_utc, "received_at_utc");
  requireObject(value.normalized, "intake receipt normalized");
  requireObject(value.authority, "intake receipt authority");

  if (
    value.normalized.agent_id !== request.agent_id ||
    value.normalized.callback_scheme !== "https" ||
    value.normalized.callback_host !== new URL(request.callback_uri).hostname ||
    value.normalized.requested_scope !== request.requested_scope ||
    value.normalized.requested_credential_lifetime_days !==
      request.requested_credential_lifetime_days ||
    JSON.stringify(value.normalized.capability_ids) !==
      JSON.stringify(request.capability_ids)
  ) {
    throw new Error("intake receipt normalized binding mismatch");
  }

  for (const [key, authority] of Object.entries(value.authority)) {
    if (authority !== false) {
      throw new Error(`intake receipt grants forbidden authority: ${key}`);
    }
  }

  return value as unknown as IntakeReceiptV1;
}

export function validateReviewPolicy(value: unknown): ReviewPolicyV1 {
  requireObject(value, "review policy");
  requireExactKeys(
    value,
    [
      "marker",
      "version",
      "policy_id",
      "allowed_scopes",
      "allowed_capability_ids",
      "maximum_credential_lifetime_days",
      "maximum_request_age_seconds",
      "require_https_callback",
    ],
    "review policy",
  );

  if (
    value.marker !== POLICY_MARKER ||
    value.version !== 1 ||
    typeof value.policy_id !== "string" ||
    !ID_PATTERN.test(value.policy_id) ||
    JSON.stringify(value.allowed_scopes) !==
      JSON.stringify(["agent_paid_work_submit"]) ||
    value.require_https_callback !== true ||
    !Number.isInteger(value.maximum_credential_lifetime_days) ||
    Number(value.maximum_credential_lifetime_days) < 1 ||
    Number(value.maximum_credential_lifetime_days) > 90 ||
    !Number.isInteger(value.maximum_request_age_seconds) ||
    Number(value.maximum_request_age_seconds) < 60 ||
    Number(value.maximum_request_age_seconds) > 30 * 24 * 60 * 60
  ) {
    throw new Error("review policy contract mismatch");
  }

  requireSortedUniqueIds(
    value.allowed_capability_ids,
    "allowed_capability_ids",
  );

  return value as unknown as ReviewPolicyV1;
}

function readJson(pathname: string): unknown {
  return JSON.parse(fs.readFileSync(pathname, "utf8"));
}

function readPrivateJson(pathname: string): unknown {
  const metadata = fs.lstatSync(pathname);

  if (
    metadata.isSymbolicLink() ||
    !metadata.isFile() ||
    (metadata.mode & 0o777) !== 0o600
  ) {
    throw new Error(`private JSON must be a mode-0600 regular file: ${pathname}`);
  }

  return readJson(pathname);
}

function writePrivateJsonExclusive(pathname: string, value: JsonValue): void {
  fs.mkdirSync(path.dirname(pathname), {
    recursive: true,
    mode: 0o700,
  });

  const directory = fs.lstatSync(path.dirname(pathname));

  if (
    directory.isSymbolicLink() ||
    !directory.isDirectory() ||
    (directory.mode & 0o777) !== 0o700
  ) {
    throw new Error(
      `private output directory must be mode 0700: ${path.dirname(pathname)}`,
    );
  }

  const descriptor = fs.openSync(
    pathname,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL,
    0o600,
  );

  try {
    fs.writeFileSync(
      descriptor,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }

  fs.chmodSync(pathname, 0o600);
}

function decisionPath(
  decisionDirectory: string,
  requestId: string,
): string {
  return path.join(decisionDirectory, `${requestId}.json`);
}

export function readDecision(
  decisionDirectory: string,
  requestId: string,
): ReviewDecisionV1 | null {
  const pathname = decisionPath(decisionDirectory, requestId);

  if (!fs.existsSync(pathname)) {
    return null;
  }

  const value = readPrivateJson(pathname);
  requireObject(value, "review decision");

  if (
    value.marker !== DECISION_MARKER ||
    value.version !== 1 ||
    value.request_id !== requestId ||
    typeof value.decision_id !== "string" ||
    !DECISION_ID_PATTERN.test(value.decision_id) ||
    (value.decision !== "approve_for_issuance_preparation" &&
      value.decision !== "reject") ||
    typeof value.reviewer_id !== "string" ||
    !ID_PATTERN.test(value.reviewer_id) ||
    typeof value.policy_id !== "string" ||
    !ID_PATTERN.test(value.policy_id) ||
    typeof value.request_sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.request_sha256) ||
    typeof value.intake_receipt_sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.intake_receipt_sha256) ||
    !Array.isArray(value.reason_codes)
  ) {
    throw new Error("review decision contract mismatch");
  }

  parseUtc(value.decided_at_utc, "decided_at_utc");
  requireObject(value.authority, "review decision authority");

  for (const [key, authority] of Object.entries(value.authority)) {
    if (authority !== false) {
      throw new Error(`review decision grants forbidden authority: ${key}`);
    }
  }

  const body = { ...value };
  delete body.decision_id;
  const expectedId = `voidapwcrd1_${sha256Bytes(
    canonicalJson(body as JsonValue),
  )}`;

  if (value.decision_id !== expectedId) {
    throw new Error("review decision ID content binding mismatch");
  }

  return value as unknown as ReviewDecisionV1;
}

function policyReasons(
  request: CredentialRequestV1,
  receipt: IntakeReceiptV1,
  policy: ReviewPolicyV1,
  now: Date,
): string[] {
  const reasons: string[] = [];
  const created = parseUtc(request.created_at_utc, "created_at_utc");
  const expires = parseUtc(request.expires_at_utc, "expires_at_utc");
  const callback = callbackParts(request.callback_uri);

  if (expires.valueOf() <= now.valueOf()) {
    reasons.push("request_expired");
  }

  if (
    now.valueOf() - created.valueOf() >
    policy.maximum_request_age_seconds * 1000
  ) {
    reasons.push("request_too_old");
  }

  if (!policy.allowed_scopes.includes(request.requested_scope)) {
    reasons.push("scope_not_allowed");
  }

  if (
    request.requested_credential_lifetime_days >
    policy.maximum_credential_lifetime_days
  ) {
    reasons.push("requested_lifetime_exceeds_policy");
  }

  for (const capabilityId of request.capability_ids) {
    if (!policy.allowed_capability_ids.includes(capabilityId)) {
      reasons.push(`capability_not_allowed:${capabilityId}`);
    }
  }

  if (policy.require_https_callback && callback.scheme !== "https") {
    reasons.push("https_callback_required");
  }

  if (receipt.normalized.callback_host !== callback.host) {
    reasons.push("receipt_callback_host_mismatch");
  }

  return [...new Set(reasons)].sort();
}

export function buildReviewQueue(options: {
  stateDirectory: string;
  decisionDirectory: string;
  policy: ReviewPolicyV1;
  nowUtc: string;
}): ReviewQueueV1 {
  const now = parseUtc(options.nowUtc, "nowUtc");
  const requestsDirectory = path.join(options.stateDirectory, "requests");
  const receiptsDirectory = path.join(options.stateDirectory, "receipts");

  const requestNames = fs
    .readdirSync(requestsDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const receiptNames = fs
    .readdirSync(receiptsDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();

  if (JSON.stringify(requestNames) !== JSON.stringify(receiptNames)) {
    throw new Error("request/receipt file sets are inconsistent");
  }

  const items: QueueItemV1[] = requestNames.map((name) => {
    const requestPath = path.join(requestsDirectory, name);
    const receiptPath = path.join(receiptsDirectory, name);
    const requestBytes = fs.readFileSync(requestPath);
    const receiptBytes = fs.readFileSync(receiptPath);
    const request = validateCredentialRequest(
      JSON.parse(requestBytes.toString("utf8")),
    );
    const receipt = validateIntakeReceipt(
      JSON.parse(receiptBytes.toString("utf8")),
      request,
    );
    const decision = readDecision(
      options.decisionDirectory,
      request.request_id,
    );
    const reasons = policyReasons(
      request,
      receipt,
      options.policy,
      now,
    );
    const expired = reasons.includes("request_expired");

    let reviewState: QueueItemV1["review_state"];

    if (decision?.decision === "approve_for_issuance_preparation") {
      reviewState = "approved_for_issuance_preparation";
    } else if (decision?.decision === "reject") {
      reviewState = "rejected";
    } else if (expired) {
      reviewState = "expired";
    } else if (reasons.length > 0) {
      reviewState = "policy_hold";
    } else {
      reviewState = "pending";
    }

    const callback = callbackParts(request.callback_uri);

    return {
      request_id: request.request_id,
      agent_id: request.agent_id,
      requested_scope: request.requested_scope,
      requested_credential_lifetime_days:
        request.requested_credential_lifetime_days,
      capability_ids: request.capability_ids,
      callback_scheme: callback.scheme,
      callback_host: callback.host,
      created_at_utc: request.created_at_utc,
      expires_at_utc: request.expires_at_utc,
      received_at_utc: receipt.received_at_utc,
      review_state: reviewState,
      policy_reason_codes: reasons,
      decision_id: decision?.decision_id ?? null,
    };
  });

  const counts = {
    total: items.length,
    pending: items.filter((item) => item.review_state === "pending").length,
    approved_for_issuance_preparation: items.filter(
      (item) => item.review_state === "approved_for_issuance_preparation",
    ).length,
    rejected: items.filter((item) => item.review_state === "rejected").length,
    expired: items.filter((item) => item.review_state === "expired").length,
    policy_hold: items.filter((item) => item.review_state === "policy_hold")
      .length,
  };

  return {
    marker: QUEUE_MARKER,
    version: 1,
    generated_at_utc: options.nowUtc,
    policy_id: options.policy.policy_id,
    counts,
    items,
    raw_callback_uri_exposed: false,
    credential_created: false,
    credential_registry_mutated: false,
  };
}

export function decideRequest(options: {
  stateDirectory: string;
  decisionDirectory: string;
  policy: ReviewPolicyV1;
  requestId: string;
  reviewerId: string;
  decision: ReviewDecisionName;
  reasonCodes: string[];
  decidedAtUtc: string;
  confirmation: string;
}): {
  created: boolean;
  decision: ReviewDecisionV1;
} {
  if (options.confirmation !== "credentialRequestReview") {
    throw new Error(
      "explicit confirmation required: credentialRequestReview",
    );
  }

  if (!REQUEST_ID_PATTERN.test(options.requestId)) {
    throw new Error("request ID format mismatch");
  }

  if (!ID_PATTERN.test(options.reviewerId)) {
    throw new Error("reviewer ID format mismatch");
  }

  const reasonCodes = [...new Set(options.reasonCodes)].sort();

  for (const reasonCode of reasonCodes) {
    if (!ID_PATTERN.test(reasonCode)) {
      throw new Error(`invalid reason code: ${reasonCode}`);
    }
  }

  if (options.decision === "reject" && reasonCodes.length < 1) {
    throw new Error("reject decisions require at least one reason code");
  }

  const requestPath = path.join(
    options.stateDirectory,
    "requests",
    `${options.requestId}.json`,
  );
  const receiptPath = path.join(
    options.stateDirectory,
    "receipts",
    `${options.requestId}.json`,
  );
  const requestBytes = fs.readFileSync(requestPath);
  const receiptBytes = fs.readFileSync(receiptPath);
  const request = validateCredentialRequest(
    JSON.parse(requestBytes.toString("utf8")),
  );
  const receipt = validateIntakeReceipt(
    JSON.parse(receiptBytes.toString("utf8")),
    request,
  );
  const reasons = policyReasons(
    request,
    receipt,
    options.policy,
    parseUtc(options.decidedAtUtc, "decidedAtUtc"),
  );

  if (
    options.decision === "approve_for_issuance_preparation" &&
    reasons.length > 0
  ) {
    throw new Error(
      `request cannot be approved while policy reasons remain: ${reasons.join(",")}`,
    );
  }

  const body: Omit<ReviewDecisionV1, "decision_id"> = {
    marker: DECISION_MARKER,
    version: 1,
    request_id: request.request_id,
    decided_at_utc: options.decidedAtUtc,
    reviewer_id: options.reviewerId,
    decision: options.decision,
    reason_codes: reasonCodes,
    policy_id: options.policy.policy_id,
    request_sha256: sha256Bytes(requestBytes),
    intake_receipt_sha256: sha256Bytes(receiptBytes),
    authority: {
      credential_issuance_authorized: false,
      credential_registry_mutation_authorized: false,
      receiver_restart_authorized: false,
      raw_token_access_authorized: false,
    },
  };
  const decision: ReviewDecisionV1 = {
    ...body,
    decision_id: `voidapwcrd1_${sha256Bytes(
      canonicalJson(body as unknown as JsonValue),
    )}`,
  };
  const pathname = decisionPath(
    options.decisionDirectory,
    request.request_id,
  );

  if (fs.existsSync(pathname)) {
    const existing = readDecision(
      options.decisionDirectory,
      request.request_id,
    );

    if (JSON.stringify(existing) !== JSON.stringify(decision)) {
      throw new Error("conflicting review decision already exists");
    }

    return {
      created: false,
      decision,
    };
  }

  writePrivateJsonExclusive(
    pathname,
    decision as unknown as JsonValue,
  );

  return {
    created: true,
    decision,
  };
}

interface ParsedArguments {
  command: string;
  values: Map<string, string[]>;
}

function parseArguments(argv: string[]): ParsedArguments {
  const command = argv[0] ?? "";
  const values = new Map<string, string[]>();

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      throw new Error(`unexpected argument: ${token}`);
    }

    const value = argv[index + 1];

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`missing value for ${token}`);
    }

    const key = token.slice(2);
    values.set(key, [...(values.get(key) ?? []), value]);
    index += 1;
  }

  return {
    command,
    values,
  };
}

function requiredValue(
  argumentsValue: ParsedArguments,
  key: string,
): string {
  const values = argumentsValue.values.get(key);

  if (!values || values.length !== 1) {
    throw new Error(`exactly one --${key} is required`);
  }

  return values[0];
}

function optionalValues(
  argumentsValue: ParsedArguments,
  key: string,
): string[] {
  return argumentsValue.values.get(key) ?? [];
}

function loadPolicy(pathname: string): ReviewPolicyV1 {
  return validateReviewPolicy(readJson(pathname));
}

function main(argv: string[]): number {
  const argumentsValue = parseArguments(argv);

  if (argumentsValue.command === "queue") {
    const queue = buildReviewQueue({
      stateDirectory: requiredValue(argumentsValue, "state-directory"),
      decisionDirectory: requiredValue(argumentsValue, "decision-directory"),
      policy: loadPolicy(requiredValue(argumentsValue, "policy")),
      nowUtc: requiredValue(argumentsValue, "now-utc"),
    });
    process.stdout.write(`${JSON.stringify(queue, null, 2)}\n`);
    process.stdout.write(
      "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_REVIEW_QUEUE_V1_BUILT\n",
    );
    return 0;
  }

  if (argumentsValue.command === "decide") {
    const decisionName = requiredValue(argumentsValue, "decision");

    if (
      decisionName !== "approve_for_issuance_preparation" &&
      decisionName !== "reject"
    ) {
      throw new Error("decision value mismatch");
    }

    const result = decideRequest({
      stateDirectory: requiredValue(argumentsValue, "state-directory"),
      decisionDirectory: requiredValue(argumentsValue, "decision-directory"),
      policy: loadPolicy(requiredValue(argumentsValue, "policy")),
      requestId: requiredValue(argumentsValue, "request-id"),
      reviewerId: requiredValue(argumentsValue, "reviewer-id"),
      decision: decisionName,
      reasonCodes: optionalValues(argumentsValue, "reason-code"),
      decidedAtUtc: requiredValue(argumentsValue, "decided-at-utc"),
      confirmation: requiredValue(argumentsValue, "confirm"),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(
      "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_REVIEW_DECISION_V1_WRITTEN\n",
    );
    return 0;
  }

  throw new Error("command must be queue or decide");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === invokedPath) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `HOLD: credential request review queue V1 failed: ${message}\n`,
    );
    process.exitCode = 2;
  }
}
