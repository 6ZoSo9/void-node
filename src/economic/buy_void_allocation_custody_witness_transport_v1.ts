import crypto from "node:crypto";

import {
  parseBuyVoidAllocationCustodyExternalWitnessJournalV1,
  planBuyVoidAllocationCustodyExternalWitnessAdvanceV1,
} from "./buy_void_allocation_custody_external_witness_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1 =
  "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_policy_validation: true,
    pure_request_construction: true,
    pure_server_classification: true,
    pure_response_validation: true,
    canonical_request_response_bytes: true,
    pinned_remote_identity_policy: true,
    forced_command_only_required: true,
    caller_selected_remote_command: false,
    caller_selected_remote_path: false,
    single_event_append_only: true,
    append_compare_and_swap: true,
    append_idempotence: true,
    canonical_parent_witness_planner_required: true,
    round_trip_read_required_after_append: true,
    network_access: false,
    ssh_execution: false,
    credential_read: false,
    credential_write: false,
    remote_filesystem_read: false,
    remote_filesystem_write: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    live_remote_append_performed: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const REQUEST_ID = /^voidwreq1_[0-9a-f]{64}$/u;
const HOST =
  /^(?:[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?|\[[0-9a-f:]{2,64}\])$/u;
const USER = /^[a-z_][a-z0-9_-]{0,31}$/u;
const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_RESPONSE_BYTES = 24 * 1024 * 1024;
const MAX_APPEND_LINE_BYTES = 256 * 1024;
const CONNECT_TIMEOUT_MS = 8_000;
const OPERATION_TIMEOUT_MS = 30_000;

const POLICY_KEYS = Object.freeze([
  "batch_mode",
  "caller_selected_remote_command",
  "caller_selected_remote_path",
  "clear_all_forwardings",
  "client_key_algorithm",
  "client_public_key_sha256",
  "connect_timeout_ms",
  "endpoint_marker",
  "host_key_algorithm",
  "host_key_sha256",
  "identities_only",
  "known_hosts_sha256",
  "max_request_bytes",
  "max_response_bytes",
  "operation_timeout_ms",
  "permit_local_command",
  "remote_forced_command_only",
  "remote_host",
  "remote_port",
  "remote_shell_allowed",
  "remote_user",
  "request_tty",
  "strict_host_key_checking",
  "transport",
]);

const READ_REQUEST_KEYS = Object.freeze([
  "challenge_sha256",
  "marker",
  "operation",
  "policy_sha256",
  "request_id",
  "schema",
  "version",
]);

const APPEND_REQUEST_KEYS = Object.freeze([
  "challenge_sha256",
  "expected_next_witness_sha256",
  "marker",
  "next_event_count",
  "next_line_base64",
  "next_tip_event_sha256",
  "operation",
  "policy_sha256",
  "prior_event_count",
  "prior_tip_event_sha256",
  "prior_witness_sha256",
  "request_id",
  "schema",
  "version",
]);

const READ_RESPONSE_KEYS = Object.freeze([
  "challenge_sha256",
  "event_count",
  "marker",
  "operation",
  "operation_performed",
  "policy_sha256",
  "request_id",
  "schema",
  "status",
  "tip_event_sha256",
  "version",
  "witness_jsonl_base64",
  "witness_sha256",
]);

const APPEND_RESPONSE_KEYS = Object.freeze([
  "challenge_sha256",
  "event_count",
  "marker",
  "next_tip_event_sha256",
  "operation",
  "operation_performed",
  "policy_sha256",
  "prior_tip_event_sha256",
  "prior_witness_sha256",
  "request_id",
  "resulting_witness_sha256",
  "round_trip_read_required",
  "schema",
  "status",
  "version",
]);

type PolicyV1 = Readonly<{
  transport: "ssh";
  remote_host: string;
  remote_port: number;
  remote_user: string;
  host_key_algorithm: "ssh-ed25519";
  host_key_sha256: string;
  known_hosts_sha256: string;
  client_key_algorithm: "ssh-ed25519";
  client_public_key_sha256: string;
  endpoint_marker:
    typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1;
  batch_mode: true;
  strict_host_key_checking: true;
  identities_only: true;
  request_tty: false;
  clear_all_forwardings: true;
  permit_local_command: false;
  remote_forced_command_only: true;
  remote_shell_allowed: false;
  caller_selected_remote_command: false;
  caller_selected_remote_path: false;
  connect_timeout_ms: typeof CONNECT_TIMEOUT_MS;
  operation_timeout_ms: typeof OPERATION_TIMEOUT_MS;
  max_request_bytes: typeof MAX_REQUEST_BYTES;
  max_response_bytes: typeof MAX_RESPONSE_BYTES;
}>;

type ReadRequestV1 = Readonly<{
  schema: "void_buy_void_allocation_custody_witness_transport_request_v1";
  marker: typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1;
  version: 1;
  operation: "read";
  challenge_sha256: string;
  policy_sha256: string;
  request_id: string;
}>;

type AppendRequestV1 = Readonly<{
  schema: "void_buy_void_allocation_custody_witness_transport_request_v1";
  marker: typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1;
  version: 1;
  operation: "append";
  challenge_sha256: string;
  policy_sha256: string;
  prior_witness_sha256: string;
  prior_event_count: number;
  prior_tip_event_sha256: string;
  next_line_base64: string;
  next_event_count: number;
  next_tip_event_sha256: string;
  expected_next_witness_sha256: string;
  request_id: string;
}>;

type RequestV1 = ReadRequestV1 | AppendRequestV1;

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
  });
}

function fail(reason: string): never {
  throw new Error(reason);
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value)
  ) {
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
  fail("allocation_custody_witness_transport_noncanonical_value");
}

function canonicalLine(value: unknown): string {
  return canonicalJson(value) + "\n";
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function sha256Hex(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  reason: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return record;
}

function safeInt(
  value: unknown,
  minimum: number,
  maximum: number,
  reason: string,
): number {
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    fail(reason);
  }
  return parsed;
}

function sha256Field(value: unknown, reason: string): string {
  const text = String(value ?? "");
  if (!SHA256_ID.test(text)) fail(reason);
  return text;
}

function canonicalBase64(
  value: unknown,
  maxDecodedBytes: number,
  reason: string,
): Buffer {
  const text = String(value ?? "");
  if (
    text.length < 4 ||
    text.length > Math.ceil(maxDecodedBytes / 3) * 4 + 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      text,
    )
  ) {
    fail(reason);
  }
  const bytes = Buffer.from(text, "base64");
  if (
    bytes.length < 1 ||
    bytes.length > maxDecodedBytes ||
    bytes.toString("base64") !== text
  ) {
    fail(reason);
  }
  return bytes;
}

function parseCanonicalJsonLine(
  input: string | Buffer,
  maxBytes: number,
  reason: string,
): unknown {
  const bytes = Buffer.isBuffer(input)
    ? Buffer.from(input)
    : Buffer.from(String(input ?? ""), "utf8");
  if (
    bytes.length < 3 ||
    bytes.length > maxBytes ||
    bytes.at(-1) !== 0x0a
  ) {
    fail(reason);
  }
  const text = bytes.toString("utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1));
  } catch {
    fail(reason);
  }
  if (canonicalLine(parsed) !== text) {
    fail(reason);
  }
  return parsed;
}

function requestId(
  body: Record<string, unknown>,
): string {
  return "voidwreq1_" + sha256Hex(canonicalJson(body));
}

function normalizeHost(value: unknown): string {
  const host = String(value ?? "").trim().toLowerCase();
  if (
    !HOST.test(host) ||
    host.includes("..") ||
    host.includes("@") ||
    host.includes("/")
  ) {
    fail("allocation_custody_witness_transport_remote_host_invalid");
  }
  return host;
}

export function classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
  input: unknown,
) {
  try {
    const raw = exactObject(
      input,
      POLICY_KEYS,
      "allocation_custody_witness_transport_policy_shape_invalid",
    );
    if (
      raw.transport !== "ssh" ||
      raw.host_key_algorithm !== "ssh-ed25519" ||
      raw.client_key_algorithm !== "ssh-ed25519" ||
      raw.endpoint_marker !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1 ||
      raw.batch_mode !== true ||
      raw.strict_host_key_checking !== true ||
      raw.identities_only !== true ||
      raw.request_tty !== false ||
      raw.clear_all_forwardings !== true ||
      raw.permit_local_command !== false ||
      raw.remote_forced_command_only !== true ||
      raw.remote_shell_allowed !== false ||
      raw.caller_selected_remote_command !== false ||
      raw.caller_selected_remote_path !== false ||
      raw.connect_timeout_ms !== CONNECT_TIMEOUT_MS ||
      raw.operation_timeout_ms !== OPERATION_TIMEOUT_MS ||
      raw.max_request_bytes !== MAX_REQUEST_BYTES ||
      raw.max_response_bytes !== MAX_RESPONSE_BYTES
    ) {
      fail("allocation_custody_witness_transport_policy_invalid");
    }
    const remoteUser = String(raw.remote_user ?? "");
    if (!USER.test(remoteUser)) {
      fail("allocation_custody_witness_transport_remote_user_invalid");
    }
    const policy: PolicyV1 = Object.freeze({
      transport: "ssh",
      remote_host: normalizeHost(raw.remote_host),
      remote_port: safeInt(
        raw.remote_port,
        1,
        65_535,
        "allocation_custody_witness_transport_remote_port_invalid",
      ),
      remote_user: remoteUser,
      host_key_algorithm: "ssh-ed25519",
      host_key_sha256: sha256Field(
        raw.host_key_sha256,
        "allocation_custody_witness_transport_host_key_invalid",
      ),
      known_hosts_sha256: sha256Field(
        raw.known_hosts_sha256,
        "allocation_custody_witness_transport_known_hosts_invalid",
      ),
      client_key_algorithm: "ssh-ed25519",
      client_public_key_sha256: sha256Field(
        raw.client_public_key_sha256,
        "allocation_custody_witness_transport_client_key_invalid",
      ),
      endpoint_marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
      batch_mode: true,
      strict_host_key_checking: true,
      identities_only: true,
      request_tty: false,
      clear_all_forwardings: true,
      permit_local_command: false,
      remote_forced_command_only: true,
      remote_shell_allowed: false,
      caller_selected_remote_command: false,
      caller_selected_remote_path: false,
      connect_timeout_ms: CONNECT_TIMEOUT_MS,
      operation_timeout_ms: OPERATION_TIMEOUT_MS,
      max_request_bytes: MAX_REQUEST_BYTES,
      max_response_bytes: MAX_RESPONSE_BYTES,
    });
    return Object.freeze({
      ok: true as const,
      status: "source_policy_valid" as const,
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
      version: 1 as const,
      policy,
      policy_sha256: sha256Id(canonicalJson(policy)),
      operation_performed: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_custody_witness_transport_policy_invalid",
    );
  }
}

function requirePolicy(input: unknown): {
  policy: PolicyV1;
  policy_sha256: string;
} {
  const classified =
    classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(input);
  if (classified.ok === false) fail(classified.reason);
  return {
    policy: classified.policy,
    policy_sha256: classified.policy_sha256,
  };
}

function readRequestBody(
  challenge: string,
  policySha256: string,
): Omit<ReadRequestV1, "request_id"> {
  return Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_transport_request_v1",
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
    version: 1,
    operation: "read",
    challenge_sha256: challenge,
    policy_sha256: policySha256,
  });
}

export function buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1(
  input: {
    policy: unknown;
    challenge_sha256: unknown;
  },
) {
  try {
    const policy = requirePolicy(input?.policy);
    const challenge = sha256Field(
      input?.challenge_sha256,
      "allocation_custody_witness_transport_challenge_invalid",
    );
    const body = readRequestBody(
      challenge,
      policy.policy_sha256,
    );
    const request: ReadRequestV1 = Object.freeze({
      ...body,
      request_id: requestId(body as unknown as Record<string, unknown>),
    });
    return Object.freeze({
      ok: true as const,
      status: "request_built" as const,
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
      version: 1 as const,
      operation: "read" as const,
      request,
      request_json: canonicalLine(request),
      request_id: request.request_id,
      operation_performed: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_custody_witness_transport_read_request_failed",
    );
  }
}

export function buildBuyVoidAllocationCustodyWitnessTransportAppendRequestV1(
  input: {
    policy: unknown;
    challenge_sha256: unknown;
    witness_jsonl: string | Buffer;
    current_state: unknown;
    current_ledger_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
  },
) {
  try {
    const policy = requirePolicy(input?.policy);
    const challenge = sha256Field(
      input?.challenge_sha256,
      "allocation_custody_witness_transport_challenge_invalid",
    );
    const prior =
      parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
        input?.witness_jsonl,
      );
    const planned =
      planBuyVoidAllocationCustodyExternalWitnessAdvanceV1({
        witness_jsonl: input?.witness_jsonl,
        current_state: input?.current_state,
        current_ledger_jsonl: input?.current_ledger_jsonl,
        current_high_water_json: input?.current_high_water_json,
      });
    if (planned.ok === false) {
      fail(
        "allocation_custody_witness_transport_parent_" +
          planned.reason,
      );
    }
    if (
      planned.status !== "planned" ||
      planned.next_line === null ||
      planned.next_event === null
    ) {
      fail("allocation_custody_witness_transport_append_not_required");
    }
    const nextLine = Buffer.from(planned.next_line, "utf8");
    if (
      nextLine.length < 2 ||
      nextLine.length > MAX_APPEND_LINE_BYTES ||
      nextLine.at(-1) !== 0x0a ||
      nextLine.subarray(0, nextLine.length - 1).includes(0x0a) ||
      nextLine.subarray(0, nextLine.length - 1).includes(0x0d)
    ) {
      fail("allocation_custody_witness_transport_append_line_invalid");
    }
    const next =
      parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
        planned.next_witness_jsonl,
      );
    if (
      next.event_count !== prior.event_count + 1 ||
      next.tip.previous_event_sha256 !==
        prior.tip.event_sha256 ||
      next.tip.event_sha256 !==
        planned.next_event.event_sha256
    ) {
      fail("allocation_custody_witness_transport_append_lineage_invalid");
    }
    const body = Object.freeze({
      schema:
        "void_buy_void_allocation_custody_witness_transport_request_v1",
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
      version: 1 as const,
      operation: "append" as const,
      challenge_sha256: challenge,
      policy_sha256: policy.policy_sha256,
      prior_witness_sha256: prior.witness_sha256,
      prior_event_count: prior.event_count,
      prior_tip_event_sha256: prior.tip.event_sha256,
      next_line_base64: nextLine.toString("base64"),
      next_event_count: next.event_count,
      next_tip_event_sha256: next.tip.event_sha256,
      expected_next_witness_sha256: next.witness_sha256,
    });
    const request: AppendRequestV1 = Object.freeze({
      ...body,
      request_id: requestId(body as unknown as Record<string, unknown>),
    });
    const requestJson = canonicalLine(request);
    if (
      Buffer.byteLength(requestJson, "utf8") >
      policy.policy.max_request_bytes
    ) {
      fail("allocation_custody_witness_transport_request_too_large");
    }
    return Object.freeze({
      ok: true as const,
      status: "request_built" as const,
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
      version: 1 as const,
      operation: "append" as const,
      request,
      request_json: requestJson,
      request_id: request.request_id,
      expected_next_witness_jsonl: Buffer.from(
        planned.next_witness_jsonl,
      ),
      operation_performed: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_custody_witness_transport_append_request_failed",
    );
  }
}

function parseRequest(
  policyInput: unknown,
  requestInput: string | Buffer,
): {
  policy: PolicyV1;
  policy_sha256: string;
  request: RequestV1;
} {
  const normalized = requirePolicy(policyInput);
  const parsed = parseCanonicalJsonLine(
    requestInput,
    normalized.policy.max_request_bytes,
    "allocation_custody_witness_transport_request_invalid",
  );
  const common = parsed as Record<string, unknown>;
  if (
    common.schema !==
      "void_buy_void_allocation_custody_witness_transport_request_v1" ||
    common.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1 ||
    common.version !== 1 ||
    common.policy_sha256 !== normalized.policy_sha256
  ) {
    fail("allocation_custody_witness_transport_request_identity_invalid");
  }
  const operation = String(common.operation ?? "");
  const keys =
    operation === "read"
      ? READ_REQUEST_KEYS
      : operation === "append"
        ? APPEND_REQUEST_KEYS
        : null;
  if (!keys) {
    fail("allocation_custody_witness_transport_operation_invalid");
  }
  const raw = exactObject(
    parsed,
    keys,
    "allocation_custody_witness_transport_request_shape_invalid",
  );
  const challenge = sha256Field(
    raw.challenge_sha256,
    "allocation_custody_witness_transport_challenge_invalid",
  );
  const id = String(raw.request_id ?? "");
  if (!REQUEST_ID.test(id)) {
    fail("allocation_custody_witness_transport_request_id_invalid");
  }
  const body = { ...raw };
  delete body.request_id;
  if (requestId(body) !== id) {
    fail("allocation_custody_witness_transport_request_id_mismatch");
  }

  if (operation === "read") {
    return {
      ...normalized,
      request: Object.freeze({
        schema:
          "void_buy_void_allocation_custody_witness_transport_request_v1",
        marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
        version: 1,
        operation: "read",
        challenge_sha256: challenge,
        policy_sha256: normalized.policy_sha256,
        request_id: id,
      }),
    };
  }

  const nextLine = canonicalBase64(
    raw.next_line_base64,
    MAX_APPEND_LINE_BYTES,
    "allocation_custody_witness_transport_append_line_invalid",
  );
  if (
    nextLine.length < 2 ||
    nextLine.at(-1) !== 0x0a ||
    nextLine.subarray(0, nextLine.length - 1).includes(0x0a) ||
    nextLine.subarray(0, nextLine.length - 1).includes(0x0d)
  ) {
    fail("allocation_custody_witness_transport_append_line_invalid");
  }
  return {
    ...normalized,
    request: Object.freeze({
      schema:
        "void_buy_void_allocation_custody_witness_transport_request_v1",
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
      version: 1,
      operation: "append",
      challenge_sha256: challenge,
      policy_sha256: normalized.policy_sha256,
      prior_witness_sha256: sha256Field(
        raw.prior_witness_sha256,
        "allocation_custody_witness_transport_prior_invalid",
      ),
      prior_event_count: safeInt(
        raw.prior_event_count,
        1,
        100_001,
        "allocation_custody_witness_transport_prior_invalid",
      ),
      prior_tip_event_sha256: sha256Field(
        raw.prior_tip_event_sha256,
        "allocation_custody_witness_transport_prior_invalid",
      ),
      next_line_base64: nextLine.toString("base64"),
      next_event_count: safeInt(
        raw.next_event_count,
        2,
        100_001,
        "allocation_custody_witness_transport_next_invalid",
      ),
      next_tip_event_sha256: sha256Field(
        raw.next_tip_event_sha256,
        "allocation_custody_witness_transport_next_invalid",
      ),
      expected_next_witness_sha256: sha256Field(
        raw.expected_next_witness_sha256,
        "allocation_custody_witness_transport_next_invalid",
      ),
      request_id: id,
    }),
  };
}

function appendState(
  request: AppendRequestV1,
  currentWitnessInput: string | Buffer,
):
  | {
      kind: "append_ready";
      current: ReturnType<
        typeof parseBuyVoidAllocationCustodyExternalWitnessJournalV1
      >;
      next_bytes: Buffer;
    }
  | {
      kind: "idempotent";
      current: ReturnType<
        typeof parseBuyVoidAllocationCustodyExternalWitnessJournalV1
      >;
      next_bytes: Buffer;
    } {
  const currentBytes = Buffer.isBuffer(currentWitnessInput)
    ? Buffer.from(currentWitnessInput)
    : Buffer.from(String(currentWitnessInput ?? ""), "utf8");
  const current =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
      currentBytes,
    );
  const nextLine = canonicalBase64(
    request.next_line_base64,
    MAX_APPEND_LINE_BYTES,
    "allocation_custody_witness_transport_append_line_invalid",
  );

  if (current.witness_sha256 === request.prior_witness_sha256) {
    if (
      current.event_count !== request.prior_event_count ||
      current.tip.event_sha256 !==
        request.prior_tip_event_sha256
    ) {
      fail("allocation_custody_witness_transport_prior_conflict");
    }
    const nextBytes = Buffer.concat([currentBytes, nextLine]);
    const next =
      parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
        nextBytes,
      );
    if (
      next.event_count !== request.next_event_count ||
      next.event_count !== current.event_count + 1 ||
      next.tip.previous_event_sha256 !==
        current.tip.event_sha256 ||
      next.tip.event_sha256 !==
        request.next_tip_event_sha256 ||
      next.witness_sha256 !==
        request.expected_next_witness_sha256
    ) {
      fail("allocation_custody_witness_transport_next_conflict");
    }
    return {
      kind: "append_ready",
      current,
      next_bytes: nextBytes,
    };
  }

  if (
    current.witness_sha256 ===
      request.expected_next_witness_sha256 &&
    current.event_count === request.next_event_count &&
    current.tip.event_sha256 === request.next_tip_event_sha256
  ) {
    if (
      currentBytes.length <= nextLine.length ||
      !currentBytes
        .subarray(currentBytes.length - nextLine.length)
        .equals(nextLine)
    ) {
      fail("allocation_custody_witness_transport_idempotence_invalid");
    }
    const priorBytes = currentBytes.subarray(
      0,
      currentBytes.length - nextLine.length,
    );
    const prior =
      parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
        priorBytes,
      );
    if (
      prior.witness_sha256 !== request.prior_witness_sha256 ||
      prior.event_count !== request.prior_event_count ||
      prior.tip.event_sha256 !==
        request.prior_tip_event_sha256
    ) {
      fail("allocation_custody_witness_transport_idempotence_invalid");
    }
    return {
      kind: "idempotent",
      current,
      next_bytes: currentBytes,
    };
  }

  fail("allocation_custody_witness_transport_compare_and_swap_conflict");
}

function readResponse(
  request: ReadRequestV1,
  policySha256: string,
  witnessInput: string | Buffer,
): string {
  const bytes = Buffer.isBuffer(witnessInput)
    ? Buffer.from(witnessInput)
    : Buffer.from(String(witnessInput ?? ""), "utf8");
  const witness =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(bytes);
  const response = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_transport_response_v1",
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
    version: 1,
    operation: "read" as const,
    status: "ok" as const,
    challenge_sha256: request.challenge_sha256,
    policy_sha256: policySha256,
    request_id: request.request_id,
    witness_jsonl_base64: bytes.toString("base64"),
    witness_sha256: witness.witness_sha256,
    event_count: witness.event_count,
    tip_event_sha256: witness.tip.event_sha256,
    operation_performed: false as const,
  });
  const line = canonicalLine(response);
  if (
    Buffer.byteLength(line, "utf8") > MAX_RESPONSE_BYTES
  ) {
    fail("allocation_custody_witness_transport_response_too_large");
  }
  return line;
}

export function classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1(
  input: {
    policy: unknown;
    request_json: string | Buffer;
    current_witness_jsonl: string | Buffer;
  },
) {
  try {
    const parsed = parseRequest(
      input?.policy,
      input?.request_json,
    );
    if (parsed.request.operation === "read") {
      return Object.freeze({
        ok: true as const,
        status: "read_ready" as const,
        marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
        version: 1 as const,
        operation: "read" as const,
        request_id: parsed.request.request_id,
        response_json: readResponse(
          parsed.request,
          parsed.policy_sha256,
          input?.current_witness_jsonl,
        ),
        operation_performed: false as const,
        remote_filesystem_write_authorized: false as const,
        authority:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
      });
    }

    const state = appendState(
      parsed.request,
      input?.current_witness_jsonl,
    );
    return Object.freeze({
      ok: true as const,
      status: state.kind,
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
      version: 1 as const,
      operation: "append" as const,
      request_id: parsed.request.request_id,
      next_witness_jsonl: Buffer.from(state.next_bytes),
      expected_next_witness_sha256:
        parsed.request.expected_next_witness_sha256,
      next_tip_event_sha256:
        parsed.request.next_tip_event_sha256,
      operation_performed: false as const,
      remote_filesystem_write_authorized: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_custody_witness_transport_server_request_failed",
    );
  }
}

export function buildBuyVoidAllocationCustodyWitnessTransportAppendResponseV1(
  input: {
    policy: unknown;
    request_json: string | Buffer;
    observed_witness_jsonl: string | Buffer;
    operation_performed: unknown;
  },
) {
  try {
    const parsed = parseRequest(
      input?.policy,
      input?.request_json,
    );
    if (parsed.request.operation !== "append") {
      fail("allocation_custody_witness_transport_append_request_required");
    }
    if (
      input?.operation_performed !== true &&
      input?.operation_performed !== false
    ) {
      fail("allocation_custody_witness_transport_operation_flag_invalid");
    }
    const observedBytes = Buffer.isBuffer(
      input?.observed_witness_jsonl,
    )
      ? Buffer.from(input.observed_witness_jsonl)
      : Buffer.from(
          String(input?.observed_witness_jsonl ?? ""),
          "utf8",
        );
    const state = appendState(
      parsed.request,
      observedBytes,
    );
    if (
      state.kind !== "idempotent" ||
      (
        input.operation_performed === true &&
        observedBytes.length < 1
      )
    ) {
      if (state.kind !== "idempotent") {
        fail(
          "allocation_custody_witness_transport_append_postcheck_incomplete",
        );
      }
    }
    const response = Object.freeze({
      schema:
        "void_buy_void_allocation_custody_witness_transport_response_v1",
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
      version: 1,
      operation: "append" as const,
      status: input.operation_performed
        ? ("appended" as const)
        : ("idempotent" as const),
      challenge_sha256: parsed.request.challenge_sha256,
      policy_sha256: parsed.policy_sha256,
      request_id: parsed.request.request_id,
      prior_witness_sha256:
        parsed.request.prior_witness_sha256,
      prior_tip_event_sha256:
        parsed.request.prior_tip_event_sha256,
      resulting_witness_sha256:
        parsed.request.expected_next_witness_sha256,
      event_count: parsed.request.next_event_count,
      next_tip_event_sha256:
        parsed.request.next_tip_event_sha256,
      round_trip_read_required: true as const,
      operation_performed: input.operation_performed,
    });
    return Object.freeze({
      ok: true as const,
      status: "response_built" as const,
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
      version: 1 as const,
      response,
      response_json: canonicalLine(response),
      operation_performed: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_custody_witness_transport_append_response_failed",
    );
  }
}

export function validateBuyVoidAllocationCustodyWitnessTransportResponseV1(
  input: {
    policy: unknown;
    request_json: string | Buffer;
    response_json: string | Buffer;
  },
) {
  try {
    const parsedRequest = parseRequest(
      input?.policy,
      input?.request_json,
    );
    const response = parseCanonicalJsonLine(
      input?.response_json,
      parsedRequest.policy.max_response_bytes,
      "allocation_custody_witness_transport_response_invalid",
    );
    const raw = exactObject(
      response,
      parsedRequest.request.operation === "read"
        ? READ_RESPONSE_KEYS
        : APPEND_RESPONSE_KEYS,
      "allocation_custody_witness_transport_response_shape_invalid",
    );
    if (
      raw.schema !==
        "void_buy_void_allocation_custody_witness_transport_response_v1" ||
      raw.marker !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1 ||
      raw.version !== 1 ||
      raw.operation !== parsedRequest.request.operation ||
      raw.request_id !== parsedRequest.request.request_id ||
      raw.challenge_sha256 !==
        parsedRequest.request.challenge_sha256 ||
      raw.policy_sha256 !== parsedRequest.policy_sha256
    ) {
      fail("allocation_custody_witness_transport_response_binding_invalid");
    }

    if (parsedRequest.request.operation === "read") {
      if (
        raw.status !== "ok" ||
        raw.operation_performed !== false
      ) {
        fail("allocation_custody_witness_transport_read_response_invalid");
      }
      const witnessBytes = canonicalBase64(
        raw.witness_jsonl_base64,
        16 * 1024 * 1024,
        "allocation_custody_witness_transport_read_response_invalid",
      );
      const witness =
        parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
          witnessBytes,
        );
      if (
        raw.witness_sha256 !== witness.witness_sha256 ||
        raw.event_count !== witness.event_count ||
        raw.tip_event_sha256 !== witness.tip.event_sha256
      ) {
        fail("allocation_custody_witness_transport_read_response_invalid");
      }
      return Object.freeze({
        ok: true as const,
        status: "read_response_verified" as const,
        marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
        version: 1 as const,
        request_id: parsedRequest.request.request_id,
        witness_jsonl: witnessBytes,
        witness_sha256: witness.witness_sha256,
        event_count: witness.event_count,
        tip_event_sha256: witness.tip.event_sha256,
        operation_performed: false as const,
        external_transport_authenticated: false as const,
        external_witness_storage_proven: false as const,
        authority:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
      });
    }

    if (
      (raw.status !== "appended" &&
        raw.status !== "idempotent") ||
      raw.prior_witness_sha256 !==
        parsedRequest.request.prior_witness_sha256 ||
      raw.prior_tip_event_sha256 !==
        parsedRequest.request.prior_tip_event_sha256 ||
      raw.resulting_witness_sha256 !==
        parsedRequest.request.expected_next_witness_sha256 ||
      raw.event_count !==
        parsedRequest.request.next_event_count ||
      raw.next_tip_event_sha256 !==
        parsedRequest.request.next_tip_event_sha256 ||
      raw.round_trip_read_required !== true ||
      raw.operation_performed !== (raw.status === "appended")
    ) {
      fail("allocation_custody_witness_transport_append_response_invalid");
    }
    return Object.freeze({
      ok: true as const,
      status: "append_ack_verified" as const,
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
      version: 1 as const,
      request_id: parsedRequest.request.request_id,
      resulting_witness_sha256:
        parsedRequest.request.expected_next_witness_sha256,
      next_tip_event_sha256:
        parsedRequest.request.next_tip_event_sha256,
      round_trip_read_required: true as const,
      operation_performed: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_custody_witness_transport_response_validation_failed",
    );
  }
}
