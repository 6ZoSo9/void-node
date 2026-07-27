#!/usr/bin/env node
import {
  createHash,
  randomBytes,
} from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  pathToFileURL,
} from "node:url";

import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";

export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_V1" as const;
export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTAKE_RECEIPT_V1" as const;
export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_RESPONSE_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTAKE_RESPONSE_V1" as const;
export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_ID_PREFIX =
  "voidapwcrq1_" as const;
export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_RECEIPT_ID_PREFIX =
  "voidapwcrqi1_" as const;
export const AGENT_PAID_WORK_SUBMIT_SCOPE =
  "agent_paid_work_submit" as const;

const UTC_SECONDS_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const AGENT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const CAPABILITY_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const NONCE_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
const REQUEST_ID_PATTERN =
  /^voidapwcrq1_[0-9a-f]{64}$/;

export type AgentPaidWorkCredentialRequestDraftV1 = {
  marker:
    typeof AGENT_PAID_WORK_CREDENTIAL_REQUEST_MARKER;
  version: 1;
  created_at_utc: string;
  expires_at_utc: string;
  agent_id: string;
  callback_uri: string;
  requested_scope:
    typeof AGENT_PAID_WORK_SUBMIT_SCOPE;
  requested_credential_lifetime_days: number;
  capability_ids: string[];
  nonce: string;
};

export type AgentPaidWorkCredentialRequestV1 =
  AgentPaidWorkCredentialRequestDraftV1 & {
    request_id: string;
  };

export type AgentPaidWorkCredentialRequestReceiptV1 = {
  marker:
    typeof AGENT_PAID_WORK_CREDENTIAL_REQUEST_RECEIPT_MARKER;
  version: 1;
  receipt_id: string;
  request_id: string;
  received_at_utc: string;
  decision: "accepted_for_review";
  reason_codes: [];
  normalized: {
    agent_id: string;
    callback_scheme: "https";
    callback_host: string;
    requested_scope:
      typeof AGENT_PAID_WORK_SUBMIT_SCOPE;
    requested_credential_lifetime_days: number;
    capability_ids: string[];
  };
  authority: {
    credential_issuance_authorized: false;
    credential_registry_mutation_authorized: false;
    receiver_restart_authorized: false;
    provider_selected: false;
    quote_created: false;
    payment_authorized: false;
    work_execution_authorized: false;
    work_dispatched: false;
    wc_award_authorized: false;
    wc_ledger_write_authorized: false;
    wallet_or_signer_access_granted: false;
    buy_void_fulfillment_authority_granted: false;
  };
};

export type AgentPaidWorkCredentialRequestIntakeResponseV1 = {
  marker:
    typeof AGENT_PAID_WORK_CREDENTIAL_REQUEST_RESPONSE_MARKER;
  version: 1;
  ok: true;
  duplicate: boolean;
  receipt:
    AgentPaidWorkCredentialRequestReceiptV1;
};

type AnyRecord =
  Record<string, unknown>;
type Flags =
  Map<string, string>;

function fail(
  message: string,
): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    fail(message);
  }
}

function isRecord(
  value: unknown,
): value is AnyRecord {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function requireObject(
  value: unknown,
  label: string,
): AnyRecord {
  assertCondition(
    isRecord(value),
    `${label} must be an object`,
  );
  return value;
}

function assertExactKeys(
  value: AnyRecord,
  expected: readonly string[],
  label: string,
): void {
  const actual =
    Object.keys(value).sort();
  const wanted =
    [...expected].sort();

  assertCondition(
    actual.length === wanted.length &&
      actual.every(
        (key, index) =>
          key === wanted[index],
      ),
    `${label} keys mismatch`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minLength: number,
  maxLength: number,
  pattern?: RegExp,
): string {
  assertCondition(
    typeof value === "string" &&
      value.length >= minLength &&
      value.length <= maxLength,
    `${label} length invalid`,
  );

  if (pattern) {
    assertCondition(
      pattern.test(value),
      `${label} format invalid`,
    );
  }

  return value;
}

function requireUtcSeconds(
  value: unknown,
  label: string,
): string {
  const text = requireString(
    value,
    label,
    20,
    20,
    UTC_SECONDS_PATTERN,
  );
  const parsed =
    Date.parse(text);

  assertCondition(
    Number.isFinite(parsed) &&
      new Date(parsed)
        .toISOString()
        .replace(".000Z", "Z") === text,
    `${label} must be real UTC seconds`,
  );

  return text;
}

function requireHttpsCallback(
  value: unknown,
): {
  uri: string;
  host: string;
} {
  const text = requireString(
    value,
    "credential_request.callback_uri",
    12,
    2048,
  );
  const parsed =
    new URL(text);

  assertCondition(
    parsed.protocol === "https:",
    "credential_request.callback_uri must use HTTPS",
  );
  assertCondition(
    parsed.username === "" &&
      parsed.password === "" &&
      parsed.hash === "",
    "credential_request.callback_uri must not include credentials or fragment",
  );
  assertCondition(
    parsed.hostname.length > 0,
    "credential_request.callback_uri host missing",
  );

  return {
    uri: parsed.toString(),
    host: parsed.hostname,
  };
}

function sha256(
  value: string | Buffer,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function requestDraftForId(
  value: AgentPaidWorkCredentialRequestDraftV1,
): AgentPaidWorkCredentialRequestDraftV1 {
  return {
    marker: value.marker,
    version: value.version,
    created_at_utc:
      value.created_at_utc,
    expires_at_utc:
      value.expires_at_utc,
    agent_id:
      value.agent_id,
    callback_uri:
      value.callback_uri,
    requested_scope:
      value.requested_scope,
    requested_credential_lifetime_days:
      value.requested_credential_lifetime_days,
    capability_ids:
      value.capability_ids,
    nonce:
      value.nonce,
  };
}

export function
agentPaidWorkCredentialRequestIdV1(
  value: AgentPaidWorkCredentialRequestDraftV1,
): string {
  return (
    AGENT_PAID_WORK_CREDENTIAL_REQUEST_ID_PREFIX +
    sha256(
      canonicalJson(
        requestDraftForId(value),
      ),
    )
  );
}

function parseDraft(
  input: unknown,
): AgentPaidWorkCredentialRequestDraftV1 {
  const value = requireObject(
    input,
    "credential request draft",
  );

  assertExactKeys(
    value,
    [
      "marker",
      "version",
      "created_at_utc",
      "expires_at_utc",
      "agent_id",
      "callback_uri",
      "requested_scope",
      "requested_credential_lifetime_days",
      "capability_ids",
      "nonce",
    ],
    "credential request draft",
  );

  assertCondition(
    value.marker ===
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_MARKER,
    "credential request marker mismatch",
  );
  assertCondition(
    value.version === 1,
    "credential request version mismatch",
  );

  const createdAt =
    requireUtcSeconds(
      value.created_at_utc,
      "credential_request.created_at_utc",
    );
  const expiresAt =
    requireUtcSeconds(
      value.expires_at_utc,
      "credential_request.expires_at_utc",
    );
  const createdMs =
    Date.parse(createdAt);
  const expiresMs =
    Date.parse(expiresAt);

  assertCondition(
    expiresMs > createdMs,
    "credential request expiry must follow creation",
  );
  assertCondition(
    expiresMs - createdMs <=
      24 * 60 * 60 * 1000,
    "credential request TTL exceeds 24 hours",
  );

  const agentId =
    requireString(
      value.agent_id,
      "credential_request.agent_id",
      3,
      128,
      AGENT_ID_PATTERN,
    );
  const callback =
    requireHttpsCallback(
      value.callback_uri,
    );

  assertCondition(
    value.requested_scope ===
      AGENT_PAID_WORK_SUBMIT_SCOPE,
    "credential request scope mismatch",
  );
  assertCondition(
    Number.isInteger(
      value.requested_credential_lifetime_days,
    ) &&
      Number(
        value.requested_credential_lifetime_days,
      ) >= 1 &&
      Number(
        value.requested_credential_lifetime_days,
      ) <= 90,
    "requested credential lifetime must be 1-90 days",
  );
  assertCondition(
    Array.isArray(
      value.capability_ids,
    ) &&
      value.capability_ids.length >= 1 &&
      value.capability_ids.length <= 16,
    "credential request capability count invalid",
  );

  const capabilityIds =
    value.capability_ids.map(
      (capability, index) =>
        requireString(
          capability,
          `credential_request.capability_ids[${index}]`,
          3,
          128,
          CAPABILITY_ID_PATTERN,
        ),
    );
  const normalizedCapabilities =
    [...new Set(capabilityIds)].sort();

  assertCondition(
    normalizedCapabilities.length ===
      capabilityIds.length,
    "credential request capabilities must be unique",
  );
  assertCondition(
    normalizedCapabilities.every(
      (capability, index) =>
        capability === capabilityIds[index],
    ),
    "credential request capabilities must be sorted",
  );

  const nonce =
    requireString(
      value.nonce,
      "credential_request.nonce",
      16,
      128,
      NONCE_PATTERN,
    );

  return {
    marker:
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_MARKER,
    version: 1,
    created_at_utc:
      createdAt,
    expires_at_utc:
      expiresAt,
    agent_id:
      agentId,
    callback_uri:
      callback.uri,
    requested_scope:
      AGENT_PAID_WORK_SUBMIT_SCOPE,
    requested_credential_lifetime_days:
      Number(
        value.requested_credential_lifetime_days,
      ),
    capability_ids:
      normalizedCapabilities,
    nonce,
  };
}

export function
materializeAgentPaidWorkCredentialRequestV1(
  input: unknown,
): AgentPaidWorkCredentialRequestV1 {
  const draft =
    parseDraft(input);

  return {
    ...draft,
    request_id:
      agentPaidWorkCredentialRequestIdV1(
        draft,
      ),
  };
}

export function
parseAgentPaidWorkCredentialRequestV1(
  input: unknown,
): AgentPaidWorkCredentialRequestV1 {
  const value = requireObject(
    input,
    "credential request",
  );

  assertExactKeys(
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

  const requestId =
    requireString(
      value.request_id,
      "credential_request.request_id",
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_ID_PREFIX.length +
        64,
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_ID_PREFIX.length +
        64,
      REQUEST_ID_PATTERN,
    );
  const materialized =
    materializeAgentPaidWorkCredentialRequestV1({
      marker:
        value.marker,
      version:
        value.version,
      created_at_utc:
        value.created_at_utc,
      expires_at_utc:
        value.expires_at_utc,
      agent_id:
        value.agent_id,
      callback_uri:
        value.callback_uri,
      requested_scope:
        value.requested_scope,
      requested_credential_lifetime_days:
        value.requested_credential_lifetime_days,
      capability_ids:
        value.capability_ids,
      nonce:
        value.nonce,
    });

  assertCondition(
    requestId ===
      materialized.request_id,
    "credential request_id mismatch",
  );

  return materialized;
}

function receiptDraft(
  request:
    AgentPaidWorkCredentialRequestV1,
  receivedAtUtc: string,
): Omit<
  AgentPaidWorkCredentialRequestReceiptV1,
  "receipt_id"
> {
  const callback =
    new URL(
      request.callback_uri,
    );

  return {
    marker:
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_RECEIPT_MARKER,
    version: 1,
    request_id:
      request.request_id,
    received_at_utc:
      receivedAtUtc,
    decision:
      "accepted_for_review",
    reason_codes: [],
    normalized: {
      agent_id:
        request.agent_id,
      callback_scheme:
        "https",
      callback_host:
        callback.hostname,
      requested_scope:
        AGENT_PAID_WORK_SUBMIT_SCOPE,
      requested_credential_lifetime_days:
        request.requested_credential_lifetime_days,
      capability_ids:
        request.capability_ids,
    },
    authority: {
      credential_issuance_authorized:
        false,
      credential_registry_mutation_authorized:
        false,
      receiver_restart_authorized:
        false,
      provider_selected:
        false,
      quote_created:
        false,
      payment_authorized:
        false,
      work_execution_authorized:
        false,
      work_dispatched:
        false,
      wc_award_authorized:
        false,
      wc_ledger_write_authorized:
        false,
      wallet_or_signer_access_granted:
        false,
      buy_void_fulfillment_authority_granted:
        false,
    },
  };
}

function materializeReceipt(
  request:
    AgentPaidWorkCredentialRequestV1,
  receivedAtUtc: string,
): AgentPaidWorkCredentialRequestReceiptV1 {
  const draft =
    receiptDraft(
      request,
      receivedAtUtc,
    );

  return {
    ...draft,
    receipt_id:
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_RECEIPT_ID_PREFIX +
      sha256(
        canonicalJson(draft),
      ),
  };
}

function requirePrivateDirectory(
  pathname: string,
  label: string,
): void {
  const metadata =
    lstatSync(pathname);

  assertCondition(
    metadata.isDirectory() &&
      !metadata.isSymbolicLink(),
    `${label} must be a directory`,
  );
  assertCondition(
    (metadata.mode & 0o077) === 0,
    `${label} must not be group/world accessible`,
  );
}

function requirePrivateFile(
  pathname: string,
  label: string,
): void {
  const metadata =
    lstatSync(pathname);

  assertCondition(
    metadata.isFile() &&
      !metadata.isSymbolicLink(),
    `${label} must be a regular file`,
  );
  assertCondition(
    (metadata.mode & 0o077) === 0,
    `${label} must not be group/world accessible`,
  );
}

function fsyncDirectory(
  pathname: string,
): void {
  const descriptor =
    openSync(
      pathname,
      "r",
    );

  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function writePrivateAtomic(
  pathname: string,
  data: Buffer,
): void {
  const directory =
    path.dirname(pathname);
  const temporary =
    path.join(
      directory,
      `.${path.basename(pathname)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`,
    );
  const descriptor =
    openSync(
      temporary,
      "wx",
      0o600,
    );

  try {
    writeFileSync(
      descriptor,
      data,
    );
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }

  chmodSync(
    temporary,
    0o600,
  );
  renameSync(
    temporary,
    pathname,
  );
  fsyncDirectory(
    directory,
  );
}

function ensureStateDirectory(
  stateDirectory: string,
): {
  requestsDirectory: string;
  receiptsDirectory: string;
} {
  if (!existsSync(stateDirectory)) {
    mkdirSync(
      stateDirectory,
      {
        recursive: true,
        mode: 0o700,
      },
    );
  }

  chmodSync(
    stateDirectory,
    0o700,
  );
  requirePrivateDirectory(
    stateDirectory,
    "credential request state directory",
  );

  const requestsDirectory =
    path.join(
      stateDirectory,
      "requests",
    );
  const receiptsDirectory =
    path.join(
      stateDirectory,
      "receipts",
    );

  for (const directory of [
    requestsDirectory,
    receiptsDirectory,
  ]) {
    if (!existsSync(directory)) {
      mkdirSync(
        directory,
        {
          mode: 0o700,
        },
      );
    }

    chmodSync(
      directory,
      0o700,
    );
    requirePrivateDirectory(
      directory,
      "credential request state child directory",
    );
  }

  return {
    requestsDirectory,
    receiptsDirectory,
  };
}

function parseStoredReceipt(
  input: unknown,
): AgentPaidWorkCredentialRequestReceiptV1 {
  const value =
    requireObject(
      input,
      "credential request receipt",
    );

  assertCondition(
    value.marker ===
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_RECEIPT_MARKER &&
      value.version === 1 &&
      typeof value.receipt_id === "string" &&
      /^voidapwcrqi1_[0-9a-f]{64}$/.test(
        value.receipt_id,
      ) &&
      typeof value.request_id === "string" &&
      REQUEST_ID_PATTERN.test(
        value.request_id,
      ) &&
      value.decision ===
        "accepted_for_review" &&
      Array.isArray(
        value.reason_codes,
      ) &&
      value.reason_codes.length === 0 &&
      isRecord(
        value.normalized,
      ) &&
      isRecord(
        value.authority,
      ),
    "stored credential request receipt invalid",
  );

  const authority =
    value.authority;

  assertCondition(
    Object.values(
      authority,
    ).every(
      (entry) =>
        entry === false,
    ),
    "stored credential request receipt grants authority",
  );

  return value as
    AgentPaidWorkCredentialRequestReceiptV1;
}

export function
receiveAgentPaidWorkCredentialRequestV1(
  input: {
    state_directory: string;
    request: unknown;
    received_at_utc: string;
  },
): AgentPaidWorkCredentialRequestIntakeResponseV1 {
  const stateDirectory =
    path.resolve(
      input.state_directory,
    );
  const receivedAt =
    requireUtcSeconds(
      input.received_at_utc,
      "credential_request.received_at_utc",
    );
  const request =
    parseAgentPaidWorkCredentialRequestV1(
      input.request,
    );

  assertCondition(
    Date.parse(receivedAt) >=
      Date.parse(
        request.created_at_utc,
      ),
    "credential request received before creation",
  );
  assertCondition(
    Date.parse(receivedAt) <
      Date.parse(
        request.expires_at_utc,
      ),
    "credential request expired",
  );

  const {
    requestsDirectory,
    receiptsDirectory,
  } =
    ensureStateDirectory(
      stateDirectory,
    );
  const requestPath =
    path.join(
      requestsDirectory,
      `${request.request_id}.json`,
    );
  const receiptPath =
    path.join(
      receiptsDirectory,
      `${request.request_id}.json`,
    );

  if (
    existsSync(requestPath) ||
    existsSync(receiptPath)
  ) {
    assertCondition(
      existsSync(requestPath) &&
        existsSync(receiptPath),
      "credential request state is incomplete",
    );
    requirePrivateFile(
      requestPath,
      "stored credential request",
    );
    requirePrivateFile(
      receiptPath,
      "stored credential request receipt",
    );

    const storedRequest =
      parseAgentPaidWorkCredentialRequestV1(
        JSON.parse(
          readFileSync(
            requestPath,
            "utf8",
          ),
        ),
      );
    const storedReceipt =
      parseStoredReceipt(
        JSON.parse(
          readFileSync(
            receiptPath,
            "utf8",
          ),
        ),
      );

    assertCondition(
      canonicalJson(storedRequest) ===
        canonicalJson(request),
      "credential request_id collision",
    );
    assertCondition(
      storedReceipt.request_id ===
        request.request_id,
      "stored credential request receipt binding mismatch",
    );

    return {
      marker:
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_RESPONSE_MARKER,
      version: 1,
      ok: true,
      duplicate: true,
      receipt:
        storedReceipt,
    };
  }

  const receipt =
    materializeReceipt(
      request,
      receivedAt,
    );
  const requestBytes =
    Buffer.from(
      `${JSON.stringify(
        request,
        null,
        2,
      )}\n`,
      "utf8",
    );
  const receiptBytes =
    Buffer.from(
      `${JSON.stringify(
        receipt,
        null,
        2,
      )}\n`,
      "utf8",
    );

  try {
    writePrivateAtomic(
      requestPath,
      requestBytes,
    );
    writePrivateAtomic(
      receiptPath,
      receiptBytes,
    );
  } catch (error) {
    if (
      existsSync(requestPath) &&
      !existsSync(receiptPath)
    ) {
      rmSync(
        requestPath,
        {
          force: true,
        },
      );
    }

    throw error;
  }

  return {
    marker:
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_RESPONSE_MARKER,
    version: 1,
    ok: true,
    duplicate: false,
    receipt,
  };
}

function parseFlags(
  args: string[],
): Flags {
  const flags =
    new Map<string, string>();

  for (
    let index = 0;
    index < args.length;
    index += 2
  ) {
    const name =
      args[index];
    const value =
      args[index + 1];

    assertCondition(
      name?.startsWith("--"),
      `expected --flag at argument ${index + 1}`,
    );
    assertCondition(
      value !== undefined,
      `${name} requires a value`,
    );
    assertCondition(
      !flags.has(name),
      `duplicate flag ${name}`,
    );

    flags.set(
      name,
      value,
    );
  }

  return flags;
}

function requiredFlag(
  flags: Flags,
  name: string,
): string {
  const value =
    flags.get(name);

  assertCondition(
    value !== undefined &&
      value.length > 0,
    `${name} is required`,
  );

  return value;
}

function exactFlagSet(
  flags: Flags,
  allowed: readonly string[],
): void {
  const allowedSet =
    new Set(allowed);

  for (const name of flags.keys()) {
    assertCondition(
      allowedSet.has(name),
      `unexpected flag ${name}`,
    );
  }
}

function utcNowSeconds(): string {
  return new Date(
    Math.floor(
      Date.now() / 1000,
    ) * 1000,
  )
    .toISOString()
    .replace(".000Z", "Z");
}

function materializeCommand(
  flags: Flags,
): void {
  exactFlagSet(
    flags,
    [
      "--input",
      "--output",
    ],
  );

  const inputPath =
    path.resolve(
      requiredFlag(
        flags,
        "--input",
      ),
    );
  const outputPath =
    path.resolve(
      requiredFlag(
        flags,
        "--output",
      ),
    );

  assertCondition(
    !existsSync(outputPath),
    "credential request output already exists",
  );

  const request =
    materializeAgentPaidWorkCredentialRequestV1(
      JSON.parse(
        readFileSync(
          inputPath,
          "utf8",
        ),
      ),
    );

  writePrivateAtomic(
    outputPath,
    Buffer.from(
      `${JSON.stringify(
        request,
        null,
        2,
      )}\n`,
      "utf8",
    ),
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        materialized: true,
        request_id:
          request.request_id,
        output:
          outputPath,
        raw_token_read:
          false,
        credential_created:
          false,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    "AGENT_PAID_WORK_CREDENTIAL_REQUEST_V1_MATERIALIZED",
  );
}

function receiveCommand(
  flags: Flags,
): void {
  exactFlagSet(
    flags,
    [
      "--state-dir",
      "--request-file",
      "--received-at-utc",
    ],
  );

  const stateDirectory =
    path.resolve(
      requiredFlag(
        flags,
        "--state-dir",
      ),
    );
  const requestFile =
    path.resolve(
      requiredFlag(
        flags,
        "--request-file",
      ),
    );
  const receivedAt =
    flags.get(
      "--received-at-utc",
    ) || utcNowSeconds();

  const response =
    receiveAgentPaidWorkCredentialRequestV1({
      state_directory:
        stateDirectory,
      request:
        JSON.parse(
          readFileSync(
            requestFile,
            "utf8",
          ),
        ),
      received_at_utc:
        receivedAt,
    });

  process.stdout.write(
    `${JSON.stringify(
      response,
      null,
      2,
    )}\n`,
  );
  console.log(
    "AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTAKE_V1_ACCEPTED_FOR_REVIEW",
  );
}

function inspectCommand(
  flags: Flags,
): void {
  exactFlagSet(
    flags,
    [
      "--state-dir",
      "--request-id",
    ],
  );

  const stateDirectory =
    path.resolve(
      requiredFlag(
        flags,
        "--state-dir",
      ),
    );
  const requestId =
    requiredFlag(
      flags,
      "--request-id",
    );

  assertCondition(
    REQUEST_ID_PATTERN.test(
      requestId,
    ),
    "request ID format invalid",
  );

  const requestPath =
    path.join(
      stateDirectory,
      "requests",
      `${requestId}.json`,
    );
  const receiptPath =
    path.join(
      stateDirectory,
      "receipts",
      `${requestId}.json`,
    );

  requirePrivateFile(
    requestPath,
    "stored credential request",
  );
  requirePrivateFile(
    receiptPath,
    "stored credential request receipt",
  );

  const request =
    parseAgentPaidWorkCredentialRequestV1(
      JSON.parse(
        readFileSync(
          requestPath,
          "utf8",
        ),
      ),
    );
  const receipt =
    parseStoredReceipt(
      JSON.parse(
        readFileSync(
          receiptPath,
          "utf8",
        ),
      ),
    );

  assertCondition(
    receipt.request_id ===
      request.request_id,
    "stored request/receipt binding mismatch",
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        request,
        receipt,
        credential_created:
          false,
        credential_registry_mutated:
          false,
        receiver_restart:
          false,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    "AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTAKE_V1_INSPECTED",
  );
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/agent_paid_work_credential_request_intake_v1.ts materialize --input DRAFT.json --output REQUEST.json",
      "  tsx scripts/agent_paid_work_credential_request_intake_v1.ts receive --state-dir DIR --request-file REQUEST.json [--received-at-utc UTC]",
      "  tsx scripts/agent_paid_work_credential_request_intake_v1.ts inspect --state-dir DIR --request-id ID",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const [
    command,
    ...args
  ] =
    process.argv.slice(2);

  if (!command) {
    usage();
  }

  const flags =
    parseFlags(args);

  if (
    command === "materialize"
  ) {
    materializeCommand(flags);
    return;
  }

  if (
    command === "receive"
  ) {
    receiveCommand(flags);
    return;
  }

  if (
    command === "inspect"
  ) {
    inspectCommand(flags);
    return;
  }

  usage();
}

const entry =
  process.argv[1]
    ? pathToFileURL(
        path.resolve(
          process.argv[1],
        ),
      ).href
    : "";

if (
  import.meta.url === entry
) {
  main().catch(
    (error) => {
      process.stderr.write(
        `${String(
          error instanceof Error
            ? error.stack
            : error,
        )}\n`,
      );
      process.exitCode = 1;
    },
  );
}
