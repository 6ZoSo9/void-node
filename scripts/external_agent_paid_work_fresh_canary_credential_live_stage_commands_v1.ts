#!/usr/bin/env node
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const COMMAND_PROFILE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_LIVE_STAGE_COMMAND_PROFILE_V1";
export const CREDENTIAL_REGISTRY_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1";
export const BINDING_REGISTRY_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1";
export const NIMO_PRIVATE_REGISTRY_MARKER =
  "VOID_FRESH_CANARY_CREDENTIAL_NIMO_PRIVATE_REGISTRY_V1";
export const STAGE_STATE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_LIVE_STAGE_STATE_V1";

export const FRESH_ACCOUNT =
  "void-external-agent-e2e-fulfillment-canary-v1";

export const PHASES = [
  "request",
  "review",
  "activate",
  "bind",
  "duplicate_probe",
] as const;

export type Phase = (typeof PHASES)[number];
export type HostRole = "precision" | "nimo";
export type CommandMode = "mock" | "live";

export const PHASE_CONFIRMATIONS: Record<Phase, string> = {
  request: "confirmFreshCanaryCredentialLiveRequest",
  review: "confirmFreshCanaryCredentialLiveReview",
  activate: "confirmFreshCanaryCredentialLiveActivation",
  bind: "confirmFreshCanaryCredentialLiveBinding",
  duplicate_probe: "confirmFreshCanaryCredentialLiveDuplicateProbe",
};

export const RESULT_MARKERS: Record<Phase, string> = {
  request:
    "VOID_FRESH_CANARY_CREDENTIAL_REQUEST_TRANSPORT_RESULT_V1",
  review:
    "VOID_FRESH_CANARY_CREDENTIAL_REVIEW_TRANSPORT_RESULT_V1",
  activate:
    "VOID_FRESH_CANARY_CREDENTIAL_ACTIVATE_TRANSPORT_RESULT_V1",
  bind:
    "VOID_FRESH_CANARY_CREDENTIAL_BIND_TRANSPORT_RESULT_V1",
  duplicate_probe:
    "VOID_FRESH_CANARY_CREDENTIAL_DUPLICATE_PROBE_TRANSPORT_RESULT_V1",
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,180}$/;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const RAW_TOKEN_PATTERN =
  /voidapwc1\.[A-Za-z0-9._:-]{3,180}\.[A-Za-z0-9_-]{32,}/;
const CAPABILITY_TOKEN_PATTERN =
  /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/;
const PROHIBITED_KEYS = new Set([
  "token",
  "raw_token",
  "rawtoken",
  "credential_token",
  "credentialtoken",
  "bearer_token",
  "bearertoken",
  "secret",
  "private_key",
  "privatekey",
  "signing_key",
  "signingkey",
]);

export interface StageRequest {
  operation_id: string;
  phase: Phase;
  request_id: string;
  fresh_wc_account: typeof FRESH_ACCOUNT;
  credential_id: string;
  agent_id: string;
  requested_scopes: ["submit"];
  expires_at_utc: string;
  prior_receipt_sha256: string | null;
}

export interface CommandProfile {
  marker: typeof COMMAND_PROFILE_MARKER;
  version: 1;
  mode: CommandMode;
  fresh_wc_account: typeof FRESH_ACCOUNT;
  expected_precision_ip: "100.122.245.125";
  expected_nimo_ip: "100.122.198.38";
  credential_registry_path: string;
  binding_registry_path: string;
  stage_state_root: string;
  nimo_private_token_root: string;
  nimo_private_registry_path: string;
  nimo_ssh_target: string;
  nimo_remote_script_path: string;
  source_contract: {
    receipt_sha256: string;
    checkpoint_commit: string;
  };
}

export interface RemoteRequestTransport {
  (
    request: StageRequest,
    profile: CommandProfile,
  ): Promise<Record<string, unknown>>;
}

export interface HostIdentityResolver {
  (): string;
}

interface CredentialRecord {
  credential_id: string;
  agent_id: string;
  token_hash: string;
  credential_token_hash: string;
  scopes: ["submit"];
  allowed_scopes: ["submit"];
  destination_wc_account: typeof FRESH_ACCOUNT;
  status: "requested" | "approved" | "active";
  active: boolean;
  enabled: boolean;
  expires_at_utc: string;
  request_id: string;
  requested_at_utc: string;
  reviewed_at_utc: string | null;
  activated_at_utc: string | null;
}

interface BindingRecord {
  binding_id: string;
  credential_id: string;
  agent_id: string;
  destination_wc_account: typeof FRESH_ACCOUNT;
  wc_account: typeof FRESH_ACCOUNT;
  status: "active";
  active: true;
  enabled: true;
  created_at_utc: string;
}

interface NimoPrivateRecord {
  credential_id: string;
  agent_id: string;
  request_id: string;
  token_hash: string;
  private_token_path_sha256: string;
  scopes: ["submit"];
  expires_at_utc: string;
  created_at_utc: string;
}

function nowUtc(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stable(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function contentId(prefix: string, value: unknown): string {
  return `${prefix}_${sha256(stable(value))}`;
}

function ensureDir(path: string, mode = 0o700): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true, mode });
  }

  chmodSync(path, mode);
}

function writePrivateText(path: string, value: string): void {
  ensureDir(dirname(path));
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  const descriptor = openSync(temporary, "wx", 0o600);

  try {
    writeFileSync(descriptor, value, "utf8");
  } finally {
    closeSync(descriptor);
  }

  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
  chmodSync(path, 0o600);
}

function writePrivateJson(path: string, value: unknown): void {
  writePrivateText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(path: string): Record<string, unknown> {
  const metadata = statSync(path);

  if (!metadata.isFile()) {
    throw new Error(`not a regular file: ${path}`);
  }

  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function assertSanitized(value: unknown, label: string): void {
  const walk = (node: unknown, path = "$"): void => {
    if (typeof node === "string") {
      if (
        RAW_TOKEN_PATTERN.test(node) ||
        CAPABILITY_TOKEN_PATTERN.test(node)
      ) {
        throw new Error(`${label} contains raw token material at ${path}`);
      }

      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }

    if (!node || typeof node !== "object") {
      return;
    }

    for (const [key, child] of Object.entries(
      node as Record<string, unknown>,
    )) {
      if (PROHIBITED_KEYS.has(normalizeKey(key))) {
        throw new Error(`${label} contains prohibited key ${path}.${key}`);
      }

      walk(child, `${path}.${key}`);
    }
  };

  walk(value);
}

function requireId(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new Error(`${label} format mismatch`);
  }

  return value;
}

function requireSha(value: unknown, label: string): string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} SHA-256 mismatch`);
  }

  return value;
}

function requireUtc(value: unknown, label: string): string {
  if (typeof value !== "string" || !UTC_PATTERN.test(value)) {
    throw new Error(`${label} must use second-resolution UTC`);
  }

  return value;
}

function expectedHost(_phase: Phase): HostRole {
  return "precision";
}

export function validateRequest(
  value: Record<string, unknown>,
  phase: Phase,
): StageRequest {
  assertSanitized(value, "stage request");

  if (value.phase !== phase) {
    throw new Error("request phase mismatch");
  }

  if (value.fresh_wc_account !== FRESH_ACCOUNT) {
    throw new Error("fresh WC account mismatch");
  }

  requireId(value.operation_id, "operation_id");
  requireId(value.request_id, "request_id");
  requireId(value.credential_id, "credential_id");
  requireId(value.agent_id, "agent_id");
  requireUtc(value.expires_at_utc, "expires_at_utc");

  if (
    !Array.isArray(value.requested_scopes) ||
    value.requested_scopes.length !== 1 ||
    value.requested_scopes[0] !== "submit"
  ) {
    throw new Error("credential scope must be submit-only");
  }

  if (
    value.prior_receipt_sha256 !== null &&
    (
      typeof value.prior_receipt_sha256 !== "string" ||
      !SHA256_PATTERN.test(value.prior_receipt_sha256)
    )
  ) {
    throw new Error("prior receipt SHA mismatch");
  }

  return value as unknown as StageRequest;
}

export function validateProfile(
  value: Record<string, unknown>,
): CommandProfile {
  assertSanitized(value, "command profile");

  if (
    value.marker !== COMMAND_PROFILE_MARKER ||
    value.version !== 1 ||
    (value.mode !== "mock" && value.mode !== "live") ||
    value.fresh_wc_account !== FRESH_ACCOUNT ||
    value.expected_precision_ip !== "100.122.245.125" ||
    value.expected_nimo_ip !== "100.122.198.38"
  ) {
    throw new Error("command profile identity mismatch");
  }

  for (const key of [
    "credential_registry_path",
    "binding_registry_path",
    "stage_state_root",
    "nimo_private_token_root",
    "nimo_private_registry_path",
    "nimo_ssh_target",
    "nimo_remote_script_path",
  ]) {
    if (
      typeof value[key] !== "string" ||
      (value[key] as string).length === 0
    ) {
      throw new Error(`command profile field mismatch: ${key}`);
    }
  }

  const source = value.source_contract as Record<string, unknown>;

  if (
    !source ||
    typeof source.receipt_sha256 !== "string" ||
    !SHA256_PATTERN.test(source.receipt_sha256) ||
    typeof source.checkpoint_commit !== "string" ||
    !/^[0-9a-f]{40}$/.test(source.checkpoint_commit)
  ) {
    throw new Error("source contract mismatch");
  }

  return value as unknown as CommandProfile;
}

function rootWithArray(
  path: string,
  marker: string,
  preferredKey: string,
): {
  root: Record<string, unknown>;
  key: string;
  records: Record<string, unknown>[];
} {
  if (!existsSync(path)) {
    return {
      root: {
        marker,
        version: 1,
        [preferredKey]: [],
      },
      key: preferredKey,
      records: [],
    };
  }

  const root = readJson(path);

  if (root.marker !== marker || root.version !== 1) {
    throw new Error(`registry identity mismatch: ${path}`);
  }

  for (const key of [
    preferredKey,
    "credentials",
    "bindings",
    "entries",
    "records",
  ]) {
    const candidate = root[key];

    if (Array.isArray(candidate)) {
      if (
        !candidate.every(
          (record) =>
            record &&
            typeof record === "object" &&
            !Array.isArray(record),
        )
      ) {
        throw new Error(`registry array is malformed: ${path}`);
      }

      return {
        root,
        key,
        records: candidate as Record<string, unknown>[],
      };
    }
  }

  throw new Error(`registry record array not found: ${path}`);
}

function saveRegistry(
  path: string,
  root: Record<string, unknown>,
  key: string,
  records: Record<string, unknown>[],
): void {
  root[key] = records;
  root.updated_at_utc = nowUtc();
  writePrivateJson(path, root);
}

function credentialRecord(
  records: Record<string, unknown>[],
  credentialId: string,
): CredentialRecord | undefined {
  return records.find(
    (record) => record.credential_id === credentialId,
  ) as CredentialRecord | undefined;
}

function bindingRecords(
  records: Record<string, unknown>[],
  credentialId: string,
  account: string,
): BindingRecord[] {
  return records.filter(
    (record) =>
      record.credential_id === credentialId &&
      (
        record.destination_wc_account === account ||
        record.wc_account === account
      ) &&
      (
        record.active === true ||
        record.enabled === true ||
        record.status === "active"
      ),
  ) as BindingRecord[];
}

function stageStatePath(
  profile: CommandProfile,
  phase: Phase,
  request: StageRequest,
): string {
  const operationId = contentId("voidapwcredlivestage1", {
    phase,
    operation_id: request.operation_id,
    request_id: request.request_id,
    credential_id: request.credential_id,
    agent_id: request.agent_id,
  });

  return join(
    resolve(profile.stage_state_root),
    operationId,
    "stage-state-v1.json",
  );
}

function prepareStageState(
  profile: CommandProfile,
  phase: Phase,
  request: StageRequest,
): Record<string, unknown> {
  const path = stageStatePath(profile, phase, request);

  if (existsSync(path)) {
    const existing = readJson(path);

    if (
      existing.marker !== STAGE_STATE_MARKER ||
      existing.version !== 1 ||
      existing.phase !== phase ||
      existing.request_id !== request.request_id ||
      existing.credential_id !== request.credential_id
    ) {
      throw new Error("existing stage state identity mismatch");
    }

    return existing;
  }

  const state = {
    marker: STAGE_STATE_MARKER,
    version: 1,
    phase,
    status: "attempting",
    attempt_count: 1,
    operation_id: request.operation_id,
    request_id: request.request_id,
    credential_id: request.credential_id,
    agent_id: request.agent_id,
    created_at_utc: nowUtc(),
    completed_at_utc: null,
    result_sha256: null,
  };
  writePrivateJson(path, state);

  return state;
}

function completeStageState(
  profile: CommandProfile,
  phase: Phase,
  request: StageRequest,
  result: Record<string, unknown>,
): void {
  const path = stageStatePath(profile, phase, request);
  const state = readJson(path);
  state.status = "completed";
  state.completed_at_utc = nowUtc();
  state.result_sha256 = sha256(stable(result));
  writePrivateJson(path, state);
}

function verifyHost(
  phase: Phase,
  profile: CommandProfile,
  resolver?: HostIdentityResolver,
): void {
  const expected =
    expectedHost(phase) === "nimo"
      ? profile.expected_nimo_ip
      : profile.expected_precision_ip;
  const actual = resolver
    ? resolver()
    : (() => {
        const child = spawnSync("tailscale", ["ip", "-4"], {
          encoding: "utf8",
          timeout: 10_000,
        });

        if (child.error) {
          throw child.error;
        }

        if (child.status !== 0) {
          throw new Error(
            `tailscale identity failed: ${child.stderr}`,
          );
        }

        return child.stdout.trim().split(/\s+/)[0];
      })();

  if (actual !== expected) {
    throw new Error(
      `${phase} host mismatch: expected ${expected}, got ${actual}`,
    );
  }
}

export function verifyNimoHost(
  profile: CommandProfile,
  resolver?: HostIdentityResolver,
): void {
  const actual = resolver
    ? resolver()
    : (() => {
        const child = spawnSync("tailscale", ["ip", "-4"], {
          encoding: "utf8",
          timeout: 10_000,
        });

        if (child.error) {
          throw child.error;
        }

        if (child.status !== 0) {
          throw new Error(
            `tailscale identity failed: ${child.stderr}`,
          );
        }

        return child.stdout.trim().split(/\s+/)[0];
      })();

  if (actual !== profile.expected_nimo_ip) {
    throw new Error(
      `Nimo request token generation host mismatch: expected ${profile.expected_nimo_ip}, got ${actual}`,
    );
  }
}

function requestResult(
  request: StageRequest,
  tokenHash: string,
  privatePathHash: string,
): Record<string, unknown> {
  return {
    marker: RESULT_MARKERS.request,
    version: 1,
    ok: true,
    phase: "request",
    operation_id: request.operation_id,
    request_id: request.request_id,
    credential_id: request.credential_id,
    agent_id: request.agent_id,
    token_hash: tokenHash,
    request_status: "created",
    private_token_persisted_on_nimo: true,
    private_token_path_sha256: privatePathHash,
    raw_token_returned: false,
  };
}

export function executeNimoLocalRequest(
  request: StageRequest,
  profile: CommandProfile,
): Record<string, unknown> {
  const privateRoot = resolve(profile.nimo_private_token_root);
  const privateRegistryPath = resolve(
    profile.nimo_private_registry_path,
  );
  ensureDir(privateRoot);

  const registry = rootWithArray(
    privateRegistryPath,
    NIMO_PRIVATE_REGISTRY_MARKER,
    "credentials",
  );
  const existing = registry.records.find(
    (record) =>
      record.credential_id === request.credential_id,
  ) as NimoPrivateRecord | undefined;

  if (existing) {
    if (
      existing.agent_id !== request.agent_id ||
      existing.request_id !== request.request_id ||
      existing.expires_at_utc !== request.expires_at_utc
    ) {
      throw new Error("existing Nimo private credential mismatch");
    }

    return requestResult(
      request,
      requireSha(existing.token_hash, "existing token_hash"),
      requireSha(
        existing.private_token_path_sha256,
        "existing private token path hash",
      ),
    );
  }

  const credentialDir = join(
    privateRoot,
    request.credential_id,
  );
  ensureDir(credentialDir);
  const tokenPath = join(
    credentialDir,
    "credential-token-v1.txt",
  );

  if (existsSync(tokenPath)) {
    throw new Error(
      "private token file exists without matching registry record",
    );
  }

  const rawToken =
    `voidapwc1.${request.credential_id}.` +
    randomBytes(32).toString("base64url");
  const tokenHash = sha256(rawToken);
  writePrivateText(tokenPath, `${rawToken}\n`);
  const pathHash = sha256(resolve(tokenPath));
  const createdAt = nowUtc();
  const record: NimoPrivateRecord = {
    credential_id: request.credential_id,
    agent_id: request.agent_id,
    request_id: request.request_id,
    token_hash: tokenHash,
    private_token_path_sha256: pathHash,
    scopes: ["submit"],
    expires_at_utc: request.expires_at_utc,
    created_at_utc: createdAt,
  };
  registry.records.push(record as unknown as Record<string, unknown>);
  saveRegistry(
    privateRegistryPath,
    registry.root,
    registry.key,
    registry.records,
  );

  return requestResult(
    request,
    tokenHash,
    pathHash,
  );
}

function sshRemoteRequest(
  request: StageRequest,
  profile: CommandProfile,
): Promise<Record<string, unknown>> {
  const command = [
    "node",
    "--experimental-strip-types",
    profile.nimo_remote_script_path,
    "remote-request-local",
    "--profile",
    "-",
  ];
  const payload = JSON.stringify({
    profile,
    request,
  });
  const child = spawnSync(
    "ssh",
    [
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=10",
      profile.nimo_ssh_target,
      ...command,
    ],
    {
      input: `${payload}\n`,
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );

  if (child.error) {
    throw child.error;
  }

  if (child.status !== 0) {
    throw new Error(
      `Nimo credential request failed with exit ${child.status}: ${child.stderr}`,
    );
  }

  return Promise.resolve(
    JSON.parse(child.stdout) as Record<string, unknown>,
  );
}

function validateRequestResult(
  result: Record<string, unknown>,
  request: StageRequest,
): {
  tokenHash: string;
  privatePathHash: string;
} {
  assertSanitized(result, "request result");

  if (
    result.marker !== RESULT_MARKERS.request ||
    result.version !== 1 ||
    result.ok !== true ||
    result.phase !== "request" ||
    result.operation_id !== request.operation_id ||
    result.request_id !== request.request_id ||
    result.credential_id !== request.credential_id ||
    result.agent_id !== request.agent_id ||
    result.request_status !== "created" ||
    result.private_token_persisted_on_nimo !== true ||
    result.raw_token_returned !== false
  ) {
    throw new Error("request result identity mismatch");
  }

  return {
    tokenHash: requireSha(result.token_hash, "token_hash"),
    privatePathHash: requireSha(
      result.private_token_path_sha256,
      "private_token_path_sha256",
    ),
  };
}

function baseResult(
  phase: Phase,
  request: StageRequest,
  tokenHash: string,
): Record<string, unknown> {
  return {
    marker: RESULT_MARKERS[phase],
    version: 1,
    ok: true,
    phase,
    operation_id: request.operation_id,
    request_id: request.request_id,
    credential_id: request.credential_id,
    agent_id: request.agent_id,
    token_hash: tokenHash,
  };
}

export async function executeStage(args: {
  phase: Phase;
  request: StageRequest;
  profile: CommandProfile;
  confirmation: string;
  allowLive: boolean;
  hostIdentityResolver?: HostIdentityResolver;
  remoteRequestTransport?: RemoteRequestTransport;
}): Promise<Record<string, unknown>> {
  const {
    phase,
    request,
    profile,
  } = args;

  if (args.confirmation !== PHASE_CONFIRMATIONS[phase]) {
    throw new Error(`confirmation mismatch for ${phase}`);
  }

  if (profile.mode === "live" && args.allowLive !== true) {
    throw new Error(`live mode requires --allow-live for ${phase}`);
  }

  verifyHost(
    phase,
    profile,
    args.hostIdentityResolver,
  );
  prepareStageState(profile, phase, request);

  const credentialRegistry = rootWithArray(
    resolve(profile.credential_registry_path),
    CREDENTIAL_REGISTRY_MARKER,
    "credentials",
  );
  const existingCredential = credentialRecord(
    credentialRegistry.records,
    request.credential_id,
  );
  let result: Record<string, unknown>;

  if (phase === "request") {
    if (existingCredential) {
      if (
        existingCredential.agent_id !== request.agent_id ||
        existingCredential.destination_wc_account !== FRESH_ACCOUNT ||
        existingCredential.expires_at_utc !== request.expires_at_utc
      ) {
        throw new Error("existing credential identity mismatch");
      }

      result = requestResult(
        request,
        requireSha(
          existingCredential.token_hash,
          "existing credential token_hash",
        ),
        requireSha(
          (
            existingCredential as CredentialRecord & {
              private_token_path_sha256?: string;
            }
          ).private_token_path_sha256,
          "existing private token path hash",
        ),
      );
    } else {
      const transport =
        args.remoteRequestTransport ?? sshRemoteRequest;
      const remote = await transport(request, profile);
      const validated = validateRequestResult(
        remote,
        request,
      );
      const created = nowUtc();
      const record: CredentialRecord & {
        private_token_path_sha256: string;
      } = {
        credential_id: request.credential_id,
        agent_id: request.agent_id,
        token_hash: validated.tokenHash,
        credential_token_hash: validated.tokenHash,
        scopes: ["submit"],
        allowed_scopes: ["submit"],
        destination_wc_account: FRESH_ACCOUNT,
        status: "requested",
        active: false,
        enabled: false,
        expires_at_utc: request.expires_at_utc,
        request_id: request.request_id,
        requested_at_utc: created,
        reviewed_at_utc: null,
        activated_at_utc: null,
        private_token_path_sha256:
          validated.privatePathHash,
      };
      credentialRegistry.records.push(
        record as unknown as Record<string, unknown>,
      );
      saveRegistry(
        resolve(profile.credential_registry_path),
        credentialRegistry.root,
        credentialRegistry.key,
        credentialRegistry.records,
      );
      result = remote;
    }
  } else {
    if (!existingCredential) {
      throw new Error(
        `${phase} requires an existing requested credential`,
      );
    }

    if (
      existingCredential.agent_id !== request.agent_id ||
      existingCredential.destination_wc_account !== FRESH_ACCOUNT ||
      existingCredential.expires_at_utc !== request.expires_at_utc
    ) {
      throw new Error(`${phase} credential identity mismatch`);
    }

    const tokenHash = requireSha(
      existingCredential.token_hash,
      `${phase} token_hash`,
    );

    if (phase === "review") {
      if (existingCredential.status === "requested") {
        existingCredential.status = "approved";
        existingCredential.reviewed_at_utc = nowUtc();
        saveRegistry(
          resolve(profile.credential_registry_path),
          credentialRegistry.root,
          credentialRegistry.key,
          credentialRegistry.records,
        );
      } else if (
        existingCredential.status !== "approved" &&
        existingCredential.status !== "active"
      ) {
        throw new Error("credential is not reviewable");
      }

      result = {
        ...baseResult(phase, request, tokenHash),
        review_decision: "approved",
        scope: "submit",
        destination_wc_account: FRESH_ACCOUNT,
      };
    } else if (phase === "activate") {
      if (
        existingCredential.status !== "approved" &&
        existingCredential.status !== "active"
      ) {
        throw new Error("credential must be approved before activation");
      }

      if (existingCredential.status !== "active") {
        existingCredential.status = "active";
        existingCredential.active = true;
        existingCredential.enabled = true;
        existingCredential.activated_at_utc = nowUtc();
        saveRegistry(
          resolve(profile.credential_registry_path),
          credentialRegistry.root,
          credentialRegistry.key,
          credentialRegistry.records,
        );
      }

      result = {
        ...baseResult(phase, request, tokenHash),
        activation_status: "active",
        scope: "submit",
        expires_at_utc: request.expires_at_utc,
      };
    } else {
      if (
        existingCredential.status !== "active" ||
        existingCredential.active !== true ||
        existingCredential.enabled !== true
      ) {
        throw new Error(`${phase} requires an active credential`);
      }

      const bindingRegistry = rootWithArray(
        resolve(profile.binding_registry_path),
        BINDING_REGISTRY_MARKER,
        "bindings",
      );
      const activeBindings = bindingRecords(
        bindingRegistry.records,
        request.credential_id,
        FRESH_ACCOUNT,
      );

      if (activeBindings.length > 1) {
        throw new Error("multiple active bindings detected");
      }

      if (phase === "bind") {
        let binding: BindingRecord;

        if (activeBindings.length === 1) {
          binding = activeBindings[0];
        } else {
          binding = {
            binding_id: contentId("voidapwcbinding1", {
              credential_id: request.credential_id,
              agent_id: request.agent_id,
              destination_wc_account: FRESH_ACCOUNT,
            }),
            credential_id: request.credential_id,
            agent_id: request.agent_id,
            destination_wc_account: FRESH_ACCOUNT,
            wc_account: FRESH_ACCOUNT,
            status: "active",
            active: true,
            enabled: true,
            created_at_utc: nowUtc(),
          };
          bindingRegistry.records.push(
            binding as unknown as Record<string, unknown>,
          );
          saveRegistry(
            resolve(profile.binding_registry_path),
            bindingRegistry.root,
            bindingRegistry.key,
            bindingRegistry.records,
          );
        }

        result = {
          ...baseResult(phase, request, tokenHash),
          binding_status: "active",
          destination_wc_account: FRESH_ACCOUNT,
          active_binding_count_after: 1,
          binding_id: binding.binding_id,
          registry_sha256_after: sha256(
            readFileSync(
              resolve(profile.binding_registry_path),
            ),
          ),
        };
      } else {
        if (activeBindings.length !== 1) {
          throw new Error(
            "duplicate probe requires exactly one active binding",
          );
        }

        result = {
          ...baseResult(phase, request, tokenHash),
          duplicate_probe_verified: true,
          second_binding_created: false,
          active_binding_count_after: 1,
          binding_id: activeBindings[0].binding_id,
        };
      }
    }
  }

  assertSanitized(result, `${phase} result`);
  completeStageState(
    profile,
    phase,
    request,
    result,
  );

  return result;
}

export function recoverStage(args: {
  phase: Phase;
  request: StageRequest;
  profile: CommandProfile;
  hostIdentityResolver?: HostIdentityResolver;
}): Record<string, unknown> {
  verifyHost(
    args.phase,
    args.profile,
    args.hostIdentityResolver,
  );

  const credentialRegistry = rootWithArray(
    resolve(args.profile.credential_registry_path),
    CREDENTIAL_REGISTRY_MARKER,
    "credentials",
  );
  const credential = credentialRecord(
    credentialRegistry.records,
    args.request.credential_id,
  );

  if (!credential) {
    throw new Error(
      `${args.phase} recovery found no credential record`,
    );
  }

  const tokenHash = requireSha(
    credential.token_hash,
    "recovery token_hash",
  );

  if (args.phase === "request") {
    return requestResult(
      args.request,
      tokenHash,
      requireSha(
        (
          credential as CredentialRecord & {
            private_token_path_sha256?: string;
          }
        ).private_token_path_sha256,
        "recovery private path hash",
      ),
    );
  }

  if (args.phase === "review") {
    if (
      credential.status !== "approved" &&
      credential.status !== "active"
    ) {
      throw new Error("review recovery state mismatch");
    }

    return {
      ...baseResult(args.phase, args.request, tokenHash),
      review_decision: "approved",
      scope: "submit",
      destination_wc_account: FRESH_ACCOUNT,
    };
  }

  if (args.phase === "activate") {
    if (
      credential.status !== "active" ||
      credential.active !== true ||
      credential.enabled !== true
    ) {
      throw new Error("activation recovery state mismatch");
    }

    return {
      ...baseResult(args.phase, args.request, tokenHash),
      activation_status: "active",
      scope: "submit",
      expires_at_utc: args.request.expires_at_utc,
    };
  }

  const bindingRegistry = rootWithArray(
    resolve(args.profile.binding_registry_path),
    BINDING_REGISTRY_MARKER,
    "bindings",
  );
  const activeBindings = bindingRecords(
    bindingRegistry.records,
    args.request.credential_id,
    FRESH_ACCOUNT,
  );

  if (activeBindings.length !== 1) {
    throw new Error(
      `${args.phase} recovery requires exactly one active binding`,
    );
  }

  if (args.phase === "bind") {
    return {
      ...baseResult(args.phase, args.request, tokenHash),
      binding_status: "active",
      destination_wc_account: FRESH_ACCOUNT,
      active_binding_count_after: 1,
      binding_id: activeBindings[0].binding_id,
      registry_sha256_after: sha256(
        readFileSync(resolve(args.profile.binding_registry_path)),
      ),
    };
  }

  return {
    ...baseResult(args.phase, args.request, tokenHash),
    duplicate_probe_verified: true,
    second_binding_created: false,
    active_binding_count_after: 1,
    binding_id: activeBindings[0].binding_id,
  };
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readStdin(): string {
  return readFileSync(0, "utf8");
}

async function cli(): Promise<void> {
  const command = process.argv[2];

  if (command === "remote-request-local") {
    const payload = JSON.parse(readStdin()) as {
      profile: Record<string, unknown>;
      request: Record<string, unknown>;
    };
    const profile = validateProfile(payload.profile);
    const request = validateRequest(payload.request, "request");
    verifyNimoHost(profile);
    const result = executeNimoLocalRequest(request, profile);
    assertSanitized(result, "remote request result");
    console.log(JSON.stringify(result));
    return;
  }

  const phase = argument("--phase") as Phase | undefined;
  const profilePath = argument("--profile");
  const confirmation = argument("--confirm");

  if (
    !phase ||
    !PHASES.includes(phase) ||
    !profilePath
  ) {
    throw new Error(
      "requires --phase and --profile",
    );
  }

  const profile = validateProfile(
    readJson(resolve(profilePath)),
  );
  const request = validateRequest(
    JSON.parse(readStdin()) as Record<string, unknown>,
    phase,
  );

  if (command === "execute") {
    if (!confirmation) {
      throw new Error("execute requires --confirm");
    }

    const result = await executeStage({
      phase,
      request,
      profile,
      confirmation,
      allowLive: argument("--allow-live") === "true",
    });
    console.log(JSON.stringify(result));
    return;
  }

  if (command === "recover") {
    const result = recoverStage({
      phase,
      request,
      profile,
    });
    console.log(JSON.stringify(result));
    return;
  }

  throw new Error(
    "usage: execute | recover | remote-request-local",
  );
}

if (
  process.argv[1] &&
  basename(process.argv[1]) ===
    "external_agent_paid_work_fresh_canary_credential_live_stage_commands_v1.ts"
) {
  cli().catch((error) => {
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  });
}
