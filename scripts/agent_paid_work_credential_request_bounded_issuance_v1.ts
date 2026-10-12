import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import {
  DECISION_MARKER,
  JsonValue,
  ReviewDecisionV1,
  ReviewPolicyV1,
  canonicalJson,
  sha256Bytes,
  validateCredentialRequest,
  validateIntakeReceipt,
  validateReviewPolicy,
} from "./agent_paid_work_credential_request_review_queue_v1.js";

export const PREPARATION_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_ISSUANCE_PREPARATION_V1";

export interface CredentialIssuancePreparationV1 {
  marker: typeof PREPARATION_MARKER;
  version: 1;
  preparation_id: string;
  prepared_at_utc: string;
  request_id: string;
  review_decision_id: string;
  policy_id: string;
  agent_id: string;
  scope: "agent_paid_work_submit";
  credential_lifetime_days: number;
  capability_ids: string[];
  callback_uri_sha256: string;
  lifecycle_cli_contract: {
    existing_cli_reused: true;
    application_not_performed: true;
    next_action: "operator_apply_existing_credential_lifecycle_cli";
  };
  authority: {
    credential_issuance_authorized: false;
    credential_registry_mutation_authorized: false;
    receiver_restart_authorized: false;
    raw_token_access_authorized: false;
  };
  credential_created: false;
  credential_applied: false;
  raw_token_included: false;
}

const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const PREPARATION_ID_PATTERN = /^voidapwcip1_[0-9a-f]{64}$/;

function requireObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function parseUtc(value: unknown, label: string): string {
  if (typeof value !== "string" || !UTC_PATTERN.test(value)) {
    throw new Error(`${label} must use canonical UTC seconds`);
  }

  const parsed = new Date(value);

  if (
    !Number.isFinite(parsed.valueOf()) ||
    parsed.toISOString().replace(".000Z", "Z") !== value
  ) {
    throw new Error(`${label} must use canonical UTC seconds`);
  }

  return value;
}

function readPrivateJson(pathname: string): unknown {
  const metadata = fs.lstatSync(pathname);

  if (
    metadata.isSymbolicLink() ||
    !metadata.isFile() ||
    (metadata.mode & 0o777) !== 0o600
  ) {
    throw new Error(`private JSON must be mode 0600: ${pathname}`);
  }

  return JSON.parse(fs.readFileSync(pathname, "utf8"));
}

function validateDecision(
  value: unknown,
  requestBytes: Buffer,
  receiptBytes: Buffer,
): ReviewDecisionV1 {
  requireObject(value, "review decision");

  if (
    value.marker !== DECISION_MARKER ||
    value.version !== 1 ||
    typeof value.decision_id !== "string" ||
    !/^voidapwcrd1_[0-9a-f]{64}$/.test(value.decision_id) ||
    value.decision !== "approve_for_issuance_preparation" ||
    typeof value.request_id !== "string" ||
    typeof value.policy_id !== "string" ||
    value.request_sha256 !== sha256Bytes(requestBytes) ||
    value.intake_receipt_sha256 !== sha256Bytes(receiptBytes)
  ) {
    throw new Error("approved review decision binding mismatch");
  }

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

function writePrivateJsonExclusive(
  pathname: string,
  value: JsonValue,
): void {
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
    throw new Error("preparation output directory must be mode 0700");
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

export function prepareCredentialIssuance(options: {
  requestPath: string;
  receiptPath: string;
  decisionPath: string;
  policyPath: string;
  outputPath: string;
  preparedAtUtc: string;
  confirmation: string;
}): CredentialIssuancePreparationV1 {
  if (options.confirmation !== "prepareCredentialIssuance") {
    throw new Error(
      "explicit confirmation required: prepareCredentialIssuance",
    );
  }

  const requestBytes = fs.readFileSync(options.requestPath);
  const receiptBytes = fs.readFileSync(options.receiptPath);
  const request = validateCredentialRequest(
    JSON.parse(requestBytes.toString("utf8")),
  );
  validateIntakeReceipt(
    JSON.parse(receiptBytes.toString("utf8")),
    request,
  );
  const decision = validateDecision(
    readPrivateJson(options.decisionPath),
    requestBytes,
    receiptBytes,
  );
  const policy = validateReviewPolicy(
    JSON.parse(fs.readFileSync(options.policyPath, "utf8")),
  );

  if (
    decision.request_id !== request.request_id ||
    decision.policy_id !== policy.policy_id
  ) {
    throw new Error("decision/request/policy identity mismatch");
  }

  parseUtc(options.preparedAtUtc, "preparedAtUtc");

  const allowedCapabilities = request.capability_ids.filter((capabilityId) =>
    policy.allowed_capability_ids.includes(capabilityId),
  );

  if (
    JSON.stringify(allowedCapabilities) !==
    JSON.stringify(request.capability_ids)
  ) {
    throw new Error("request capabilities exceed review policy");
  }

  const body: Omit<CredentialIssuancePreparationV1, "preparation_id"> = {
    marker: PREPARATION_MARKER,
    version: 1,
    prepared_at_utc: options.preparedAtUtc,
    request_id: request.request_id,
    review_decision_id: decision.decision_id,
    policy_id: policy.policy_id,
    agent_id: request.agent_id,
    scope: request.requested_scope,
    credential_lifetime_days: Math.min(
      request.requested_credential_lifetime_days,
      policy.maximum_credential_lifetime_days,
    ),
    capability_ids: request.capability_ids,
    callback_uri_sha256: crypto
      .createHash("sha256")
      .update(request.callback_uri)
      .digest("hex"),
    lifecycle_cli_contract: {
      existing_cli_reused: true,
      application_not_performed: true,
      next_action: "operator_apply_existing_credential_lifecycle_cli",
    },
    authority: {
      credential_issuance_authorized: false,
      credential_registry_mutation_authorized: false,
      receiver_restart_authorized: false,
      raw_token_access_authorized: false,
    },
    credential_created: false,
    credential_applied: false,
    raw_token_included: false,
  };
  const preparation: CredentialIssuancePreparationV1 = {
    ...body,
    preparation_id: `voidapwcip1_${sha256Bytes(
      canonicalJson(body as unknown as JsonValue),
    )}`,
  };

  writePrivateJsonExclusive(
    options.outputPath,
    preparation as unknown as JsonValue,
  );

  return preparation;
}

interface Arguments {
  values: Map<string, string>;
}

function parseArguments(argv: string[]): Arguments {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("arguments must be --key value pairs");
    }

    if (values.has(key.slice(2))) {
      throw new Error(`duplicate argument: ${key}`);
    }

    values.set(key.slice(2), value);
  }

  return { values };
}

function required(argumentsValue: Arguments, key: string): string {
  const value = argumentsValue.values.get(key);

  if (!value) {
    throw new Error(`--${key} is required`);
  }

  return value;
}

function main(argv: string[]): number {
  const argumentsValue = parseArguments(argv);
  const preparation = prepareCredentialIssuance({
    requestPath: required(argumentsValue, "request"),
    receiptPath: required(argumentsValue, "receipt"),
    decisionPath: required(argumentsValue, "decision"),
    policyPath: required(argumentsValue, "policy"),
    outputPath: required(argumentsValue, "output"),
    preparedAtUtc: required(argumentsValue, "prepared-at-utc"),
    confirmation: required(argumentsValue, "confirm"),
  });

  if (!PREPARATION_ID_PATTERN.test(preparation.preparation_id)) {
    throw new Error("preparation ID format mismatch");
  }

  process.stdout.write(`${JSON.stringify(preparation, null, 2)}\n`);
  process.stdout.write(
    "VOID_AGENT_PAID_WORK_CREDENTIAL_ISSUANCE_PREPARATION_V1_WRITTEN\n",
  );
  return 0;
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
      `HOLD: bounded credential issuance preparation V1 failed: ${message}\n`,
    );
    process.exitCode = 2;
  }
}
