#!/usr/bin/env node
import {
  chmodSync,
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const MANIFEST_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_BINDING_MANIFEST_V1";
export const OPERATION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_BINDING_OPERATION_STATE_V1";
export const PHASE_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_BINDING_PHASE_RECEIPT_V1";
export const COMPLETION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_BINDING_COMPLETION_V1";
export const PUBLIC_EVIDENCE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_BINDING_PUBLIC_EVIDENCE_CANDIDATE_V1";

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

export const PHASE_CONFIRMATIONS: Record<Phase, string> = {
  request: "confirmFreshCanaryCredentialRequest",
  review: "confirmFreshCanaryCredentialReview",
  activate: "confirmFreshCanaryCredentialActivation",
  bind: "confirmFreshCanaryCredentialBinding",
  duplicate_probe: "confirmFreshCanaryCredentialDuplicateProbe",
};

export const RECOVERY_CONFIRMATIONS: Record<Phase, string> = {
  request: "recoverFreshCanaryCredentialRequest",
  review: "recoverFreshCanaryCredentialReview",
  activate: "recoverFreshCanaryCredentialActivation",
  bind: "recoverFreshCanaryCredentialBinding",
  duplicate_probe: "recoverFreshCanaryCredentialDuplicateProbe",
};

const TOKEN_PATTERN =
  /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}|voidapwc[A-Za-z0-9_.:-]{32,}/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,180}$/;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export type TransportKind = "mock" | "live";
export type StageTransport = (
  phase: Phase,
  request: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export interface Manifest {
  marker: typeof MANIFEST_MARKER;
  version: 1;
  mode: "mock" | "live";
  fresh_wc_account: typeof FRESH_ACCOUNT;
  agent_id: string;
  credential_id: string;
  requested_scopes: ["submit"];
  requested_at_utc: string;
  expires_at_utc: string;
  nimo_profile: {
    tailscale_ip: "100.122.198.38";
    node_id: "befd84d4fe47341af81b1a8aef8bcb97";
    token_storage_policy: "nimo_private_only";
  };
  precision_profile: {
    tailscale_ip: "100.122.245.125";
    node_id: "9d89483769e469e0473b489dc50dba96";
    role: "coordinator_only";
  };
  pre_state: {
    active_binding_count: 0;
    account_ticket_total: 0;
    account_redeemable_wc: 0;
    global_active_tickets: 0;
    remaining_global_ticket_capacity: number;
  };
  stage_profiles: Record<
    Phase,
    {
      transport_kind: TransportKind;
      command?: string[];
      profile_sha256: string;
    }
  >;
  source_contract: {
    receipt_path_hash: string;
    receipt_sha256: string;
    checkpoint_commit: string;
  };
}

export interface PhaseState {
  status: "pending" | "attempting" | "held" | "completed";
  attempt_count: number;
  attempted_at_utc: string | null;
  completed_at_utc: string | null;
  request_sha256: string | null;
  raw_result_path: string | null;
  raw_result_sha256: string | null;
  receipt_path: string | null;
  receipt_sha256: string | null;
  hold_reason: string | null;
}

export interface OperationState {
  marker: typeof OPERATION_MARKER;
  version: 1;
  operation_id: string;
  revision: number;
  created_at_utc: string;
  updated_at_utc: string;
  mode: "mock" | "live";
  manifest_path: string;
  manifest_sha256: string;
  fresh_wc_account: typeof FRESH_ACCOUNT;
  agent_id: string;
  credential_id: string;
  requested_scopes: ["submit"];
  expires_at_utc: string;
  completed: boolean;
  phases: Record<Phase, PhaseState>;
  final_binding_id_sha256: string | null;
  final_registry_sha256: string | null;
}

export interface PrepareArgs {
  manifestPath: string;
  outputDir: string;
  now?: string;
}

export interface ExecuteArgs {
  operationDir: string;
  phase: Phase;
  confirmation: string;
  allowLive: boolean;
  transport?: StageTransport;
  now?: string;
}

export interface RecoverArgs {
  operationDir: string;
  phase: Phase;
  confirmation: string;
  rawResultPath: string;
  now?: string;
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

function writePrivateJson(path: string, value: unknown): void {
  ensureDir(dirname(path));
  const temp = `${path}.tmp-${process.pid}-${Date.now()}`;
  const fd = openSync(temp, "wx", 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } finally {
    closeSync(fd);
  }
  chmodSync(temp, 0o600);
  renameSync(temp, path);
  chmodSync(path, 0o600);
}

function readJson(path: string): Record<string, unknown> {
  const stat = statSync(path);
  if (!stat.isFile()) {
    throw new Error(`not a regular file: ${path}`);
  }
  const text = readFileSync(path, "utf8");
  return JSON.parse(text) as Record<string, unknown>;
}

function assertNoRawToken(value: unknown, label: string): void {
  const capabilityPattern =
    /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/i;
  const walk = (node: unknown, path = "$"): void => {
    if (typeof node === "string") {
      if (capabilityPattern.test(node)) {
        throw new Error(`${label} contains a raw capability token`);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(
      node as Record<string, unknown>,
    )) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (
        [
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
        ].includes(normalized)
      ) {
        throw new Error(`${label} contains prohibited key ${path}.${key}`);
      }
      walk(child, `${path}.${key}`);
    }
  };
  walk(value);
}

function stringField(
  value: unknown,
  label: string,
  pattern = ID_PATTERN,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${label} format mismatch`);
  }
  return value;
}

function utcField(value: unknown, label: string): string {
  if (typeof value !== "string" || !UTC_PATTERN.test(value)) {
    throw new Error(`${label} must be second-resolution UTC`);
  }
  return value;
}

function phaseRecord(): PhaseState {
  return {
    status: "pending",
    attempt_count: 0,
    attempted_at_utc: null,
    completed_at_utc: null,
    request_sha256: null,
    raw_result_path: null,
    raw_result_sha256: null,
    receipt_path: null,
    receipt_sha256: null,
    hold_reason: null,
  };
}

export function validateManifest(value: Record<string, unknown>): Manifest {
  assertNoRawToken(value, "manifest");
  if (value.marker !== MANIFEST_MARKER || value.version !== 1) {
    throw new Error("manifest identity mismatch");
  }
  if (value.mode !== "mock" && value.mode !== "live") {
    throw new Error("manifest mode mismatch");
  }
  if (value.fresh_wc_account !== FRESH_ACCOUNT) {
    throw new Error("fresh WC account mismatch");
  }
  const agentId = stringField(value.agent_id, "agent_id");
  const credentialId = stringField(value.credential_id, "credential_id");
  if (
    !Array.isArray(value.requested_scopes) ||
    value.requested_scopes.length !== 1 ||
    value.requested_scopes[0] !== "submit"
  ) {
    throw new Error("requested scopes must be submit-only");
  }
  const requestedAt = utcField(value.requested_at_utc, "requested_at_utc");
  const expiresAt = utcField(value.expires_at_utc, "expires_at_utc");
  if (Date.parse(expiresAt) <= Date.parse(requestedAt)) {
    throw new Error("credential expiry must follow request time");
  }
  const pre = value.pre_state as Record<string, unknown>;
  if (
    !pre ||
    pre.active_binding_count !== 0 ||
    pre.account_ticket_total !== 0 ||
    pre.account_redeemable_wc !== 0 ||
    pre.global_active_tickets !== 0 ||
    typeof pre.remaining_global_ticket_capacity !== "number" ||
    pre.remaining_global_ticket_capacity < 1
  ) {
    throw new Error("fresh canary pre-state mismatch");
  }
  const nimo = value.nimo_profile as Record<string, unknown>;
  if (
    !nimo ||
    nimo.tailscale_ip !== "100.122.198.38" ||
    nimo.node_id !== "befd84d4fe47341af81b1a8aef8bcb97" ||
    nimo.token_storage_policy !== "nimo_private_only"
  ) {
    throw new Error("Nimo profile mismatch");
  }
  const precision = value.precision_profile as Record<string, unknown>;
  if (
    !precision ||
    precision.tailscale_ip !== "100.122.245.125" ||
    precision.node_id !== "9d89483769e469e0473b489dc50dba96" ||
    precision.role !== "coordinator_only"
  ) {
    throw new Error("Precision profile mismatch");
  }
  const stageProfiles = value.stage_profiles as Record<string, unknown>;
  for (const phase of PHASES) {
    const profile = stageProfiles?.[phase] as Record<string, unknown>;
    if (
      !profile ||
      (profile.transport_kind !== "mock" &&
        profile.transport_kind !== "live") ||
      typeof profile.profile_sha256 !== "string" ||
      !SHA256_PATTERN.test(profile.profile_sha256)
    ) {
      throw new Error(`stage profile mismatch for ${phase}`);
    }
    if (profile.command !== undefined) {
      if (
        !Array.isArray(profile.command) ||
        profile.command.length === 0 ||
        !profile.command.every(
          (part) => typeof part === "string" && part.length > 0,
        )
      ) {
        throw new Error(`stage command mismatch for ${phase}`);
      }
    }
  }
  const source = value.source_contract as Record<string, unknown>;
  if (
    !source ||
    typeof source.receipt_path_hash !== "string" ||
    !SHA256_PATTERN.test(source.receipt_path_hash) ||
    typeof source.receipt_sha256 !== "string" ||
    !SHA256_PATTERN.test(source.receipt_sha256) ||
    typeof source.checkpoint_commit !== "string" ||
    !/^[0-9a-f]{40}$/.test(source.checkpoint_commit)
  ) {
    throw new Error("source contract mismatch");
  }
  return {
    ...(value as unknown as Manifest),
    agent_id: agentId,
    credential_id: credentialId,
    requested_at_utc: requestedAt,
    expires_at_utc: expiresAt,
  };
}

function operationPath(operationDir: string): string {
  return join(operationDir, "operation-state-v1.json");
}

function loadOperation(operationDir: string): OperationState {
  const value = readJson(operationPath(operationDir));
  if (value.marker !== OPERATION_MARKER || value.version !== 1) {
    throw new Error("operation identity mismatch");
  }
  return value as unknown as OperationState;
}

function saveOperation(operationDir: string, state: OperationState): void {
  state.updated_at_utc = nowUtc();
  writePrivateJson(operationPath(operationDir), state);
}

function validatePhaseOrder(state: OperationState, phase: Phase): void {
  const index = PHASES.indexOf(phase);
  for (let i = 0; i < index; i += 1) {
    if (state.phases[PHASES[i]].status !== "completed") {
      throw new Error(`prior phase not completed: ${PHASES[i]}`);
    }
  }
  for (let i = index + 1; i < PHASES.length; i += 1) {
    if (state.phases[PHASES[i]].status !== "pending") {
      throw new Error(`future phase already changed: ${PHASES[i]}`);
    }
  }
}

function requestFor(
  manifest: Manifest,
  state: OperationState,
  phase: Phase,
): Record<string, unknown> {
  const base = {
    operation_id: state.operation_id,
    revision: state.revision,
    phase,
    fresh_wc_account: manifest.fresh_wc_account,
    agent_id: manifest.agent_id,
    credential_id: manifest.credential_id,
    requested_scopes: manifest.requested_scopes,
    expires_at_utc: manifest.expires_at_utc,
    prior_receipt_sha256:
      phase === "request"
        ? null
        : state.phases[PHASES[PHASES.indexOf(phase) - 1]].receipt_sha256,
  };
  return {
    ...base,
    request_id: contentId("voidapwcredreq1", base),
  };
}

function validateResult(
  phase: Phase,
  result: Record<string, unknown>,
  manifest: Manifest,
): Record<string, unknown> {
  assertNoRawToken(result, `${phase} result`);
  if (result.phase !== phase || result.ok !== true) {
    throw new Error(`${phase} result identity mismatch`);
  }
  if (
    result.credential_id !== manifest.credential_id ||
    result.agent_id !== manifest.agent_id
  ) {
    throw new Error(`${phase} credential/agent mismatch`);
  }
  if (
    typeof result.token_hash !== "string" ||
    !SHA256_PATTERN.test(result.token_hash)
  ) {
    throw new Error(`${phase} token hash mismatch`);
  }
  if (phase === "request") {
    if (
      result.request_status !== "created" ||
      result.private_token_persisted_on_nimo !== true ||
      result.raw_token_returned !== false
    ) {
      throw new Error("request result mismatch");
    }
  } else if (phase === "review") {
    if (
      result.review_decision !== "approved" ||
      result.scope !== "submit" ||
      result.destination_wc_account !== FRESH_ACCOUNT
    ) {
      throw new Error("review result mismatch");
    }
  } else if (phase === "activate") {
    if (
      result.activation_status !== "active" ||
      result.scope !== "submit" ||
      result.expires_at_utc !== manifest.expires_at_utc
    ) {
      throw new Error("activation result mismatch");
    }
  } else if (phase === "bind") {
    if (
      result.binding_status !== "active" ||
      result.destination_wc_account !== FRESH_ACCOUNT ||
      result.active_binding_count_after !== 1 ||
      typeof result.binding_id !== "string" ||
      !ID_PATTERN.test(result.binding_id) ||
      typeof result.registry_sha256_after !== "string" ||
      !SHA256_PATTERN.test(result.registry_sha256_after)
    ) {
      throw new Error("binding result mismatch");
    }
  } else if (phase === "duplicate_probe") {
    if (
      result.duplicate_probe_verified !== true ||
      result.second_binding_created !== false ||
      result.active_binding_count_after !== 1 ||
      typeof result.binding_id !== "string" ||
      !ID_PATTERN.test(result.binding_id)
    ) {
      throw new Error("duplicate probe result mismatch");
    }
  }
  return result;
}

async function commandTransport(
  profile: Manifest["stage_profiles"][Phase],
  phase: Phase,
  request: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!profile.command) {
    throw new Error(`no command configured for ${phase}`);
  }
  const child = spawnSync(profile.command[0], profile.command.slice(1), {
    input: `${JSON.stringify(request)}\n`,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    env: {
      ...process.env,
      VOID_CREDENTIAL_BINDING_PHASE: phase,
    },
  });
  if (child.error) throw child.error;
  if (child.status !== 0) {
    throw new Error(
      `${phase} transport failed with exit ${child.status}: ${child.stderr}`,
    );
  }
  return JSON.parse(child.stdout) as Record<string, unknown>;
}

export function prepareOperation(args: PrepareArgs): OperationState {
  const manifestPath = resolve(args.manifestPath);
  const outputDir = resolve(args.outputDir);
  const manifestRaw = readJson(manifestPath);
  const manifest = validateManifest(manifestRaw);
  const manifestText = readFileSync(manifestPath);
  const manifestSha = sha256(manifestText);
  const operationId = contentId("voidapwcredop1", {
    manifest_sha256: manifestSha,
    fresh_wc_account: manifest.fresh_wc_account,
    credential_id: manifest.credential_id,
    agent_id: manifest.agent_id,
  });
  const operationDir = join(outputDir, operationId);
  ensureDir(operationDir);
  const created = args.now ?? nowUtc();
  const phases = Object.fromEntries(
    PHASES.map((phase) => [phase, phaseRecord()]),
  ) as Record<Phase, PhaseState>;
  const existingPath = operationPath(operationDir);
  if (existsSync(existingPath)) {
    const existing = loadOperation(operationDir);
    if (
      existing.manifest_sha256 !== manifestSha ||
      existing.fresh_wc_account !== manifest.fresh_wc_account ||
      existing.credential_id !== manifest.credential_id ||
      existing.agent_id !== manifest.agent_id
    ) {
      throw new Error("existing operation identity mismatch");
    }
    return existing;
  }
  const state: OperationState = {
    marker: OPERATION_MARKER,
    version: 1,
    operation_id: operationId,
    revision: 0,
    created_at_utc: created,
    updated_at_utc: created,
    mode: manifest.mode,
    manifest_path: manifestPath,
    manifest_sha256: manifestSha,
    fresh_wc_account: manifest.fresh_wc_account,
    agent_id: manifest.agent_id,
    credential_id: manifest.credential_id,
    requested_scopes: manifest.requested_scopes,
    expires_at_utc: manifest.expires_at_utc,
    completed: false,
    phases,
    final_binding_id_sha256: null,
    final_registry_sha256: null,
  };
  writePrivateJson(existingPath, state);
  writePrivateJson(join(operationDir, "prepared-receipt-v1.json"), {
    marker:
      "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_BINDING_PREPARED_RECEIPT_V1",
    version: 1,
    operation_id: operationId,
    manifest_sha256: manifestSha,
    fresh_wc_account: FRESH_ACCOUNT,
    active_binding_count_before: 0,
    raw_token_present: false,
    live_mutation: false,
  });
  return state;
}

async function finishPhase(
  operationDir: string,
  state: OperationState,
  manifest: Manifest,
  phase: Phase,
  request: Record<string, unknown>,
  result: Record<string, unknown>,
  completedAt: string,
): Promise<OperationState> {
  const phaseDir = join(operationDir, "phases", phase);
  ensureDir(phaseDir);
  const rawPath = join(phaseDir, "raw-result-private-v1.json");
  writePrivateJson(rawPath, result);
  const rawSha = sha256(readFileSync(rawPath));
  const receipt = {
    marker: PHASE_RECEIPT_MARKER,
    version: 1,
    operation_id: state.operation_id,
    phase,
    completed_at_utc: completedAt,
    request_sha256: sha256(stable(request)),
    raw_result_sha256: rawSha,
    credential_id: manifest.credential_id,
    agent_id: manifest.agent_id,
    token_hash: result.token_hash,
    fresh_wc_account: FRESH_ACCOUNT,
    raw_token_present: false,
    live_mutation:
      phase === "duplicate_probe"
        ? false
        : manifest.mode === "live",
  };
  assertNoRawToken(receipt, `${phase} receipt`);
  const receiptPath = join(phaseDir, "sanitized-phase-receipt-v1.json");
  writePrivateJson(receiptPath, receipt);
  const receiptSha = sha256(readFileSync(receiptPath));
  state.phases[phase] = {
    status: "completed",
    attempt_count: state.phases[phase].attempt_count,
    attempted_at_utc: state.phases[phase].attempted_at_utc,
    completed_at_utc: completedAt,
    request_sha256: sha256(stable(request)),
    raw_result_path: rawPath,
    raw_result_sha256: rawSha,
    receipt_path: receiptPath,
    receipt_sha256: receiptSha,
    hold_reason: null,
  };
  state.revision += 1;
  if (phase === "bind") {
    state.final_binding_id_sha256 = sha256(String(result.binding_id));
    state.final_registry_sha256 = String(result.registry_sha256_after);
  }
  if (phase === "duplicate_probe") {
    state.completed = true;
    const completion = {
      marker: COMPLETION_MARKER,
      version: 1,
      operation_id: state.operation_id,
      completed_at_utc: completedAt,
      fresh_wc_account: FRESH_ACCOUNT,
      credential_id: manifest.credential_id,
      agent_id: manifest.agent_id,
      token_hash: result.token_hash,
      active_binding_count: 1,
      second_binding_created: false,
      final_binding_id_sha256: state.final_binding_id_sha256,
      final_registry_sha256: state.final_registry_sha256,
      raw_token_present: false,
      authenticated_submission_posted: false,
      live_canary_prepared: false,
      live_ticket_issued: false,
      wc_ledger_write: false,
    };
    assertNoRawToken(completion, "completion receipt");
    writePrivateJson(join(operationDir, "completion-receipt-v1.json"), completion);
    const publicEvidence = {
      marker: PUBLIC_EVIDENCE_MARKER,
      version: 1,
      operation_id: state.operation_id,
      fresh_wc_account: FRESH_ACCOUNT,
      requested_scopes: ["submit"],
      credential_active: true,
      binding_active: true,
      active_binding_count: 1,
      duplicate_binding_created: false,
      raw_token_present: false,
      authenticated_submission_posted: false,
      live_canary_prepared: false,
      live_ticket_issued: false,
      wc_ledger_write: false,
    };
    assertNoRawToken(publicEvidence, "public evidence");
    writePrivateJson(
      join(operationDir, "public-evidence-candidate-v1.json"),
      publicEvidence,
    );
  }
  saveOperation(operationDir, state);
  return state;
}

export async function executePhase(args: ExecuteArgs): Promise<OperationState> {
  const operationDir = resolve(args.operationDir);
  const state = loadOperation(operationDir);
  const manifest = validateManifest(readJson(state.manifest_path));
  const phase = args.phase;
  if (!PHASES.includes(phase)) throw new Error("unknown phase");
  if (args.confirmation !== PHASE_CONFIRMATIONS[phase]) {
    throw new Error(`confirmation mismatch for ${phase}`);
  }
  const profile = manifest.stage_profiles[phase];
  if (profile.transport_kind === "live" && args.allowLive !== true) {
    throw new Error(`live mode requires --allow-live for ${phase}`);
  }
  validatePhaseOrder(state, phase);
  const current = state.phases[phase];
  if (current.status === "completed") return state;
  if (current.status === "held" || current.status === "attempting") {
    throw new Error(
      `${phase} is ambiguous/held; use recover-phase, never automatic retry`,
    );
  }
  if (current.attempt_count !== 0) {
    throw new Error(`${phase} attempt count already nonzero`);
  }
  const request = requestFor(manifest, state, phase);
  assertNoRawToken(request, `${phase} request`);
  const attemptedAt = args.now ?? nowUtc();
  state.phases[phase] = {
    ...current,
    status: "attempting",
    attempt_count: 1,
    attempted_at_utc: attemptedAt,
    request_sha256: sha256(stable(request)),
  };
  saveOperation(operationDir, state);
  const transport =
    args.transport ??
    ((phaseName, requestValue) =>
      commandTransport(profile, phaseName, requestValue));
  try {
    const raw = await transport(phase, request);
    const result = validateResult(phase, raw, manifest);
    return await finishPhase(
      operationDir,
      state,
      manifest,
      phase,
      request,
      result,
      args.now ?? nowUtc(),
    );
  } catch (error) {
    const held = loadOperation(operationDir);
    held.phases[phase].status = "held";
    held.phases[phase].hold_reason =
      error instanceof Error ? error.message : String(error);
    saveOperation(operationDir, held);
    throw error;
  }
}

export async function recoverPhase(args: RecoverArgs): Promise<OperationState> {
  const operationDir = resolve(args.operationDir);
  const state = loadOperation(operationDir);
  const manifest = validateManifest(readJson(state.manifest_path));
  const phase = args.phase;
  if (args.confirmation !== RECOVERY_CONFIRMATIONS[phase]) {
    throw new Error(`recovery confirmation mismatch for ${phase}`);
  }
  validatePhaseOrder(state, phase);
  const current = state.phases[phase];
  if (current.status === "completed") return state;
  if (
    current.status !== "held" &&
    current.status !== "attempting"
  ) {
    throw new Error(`${phase} is not recoverable`);
  }
  if (current.attempt_count !== 1 || !current.request_sha256) {
    throw new Error(`${phase} recovery attempt state mismatch`);
  }
  const request = requestFor(manifest, state, phase);
  if (sha256(stable(request)) !== current.request_sha256) {
    throw new Error(`${phase} recovery request hash mismatch`);
  }
  const rawPath = resolve(args.rawResultPath);
  const raw = readJson(rawPath);
  const result = validateResult(phase, raw, manifest);
  return await finishPhase(
    operationDir,
    state,
    manifest,
    phase,
    request,
    result,
    args.now ?? nowUtc(),
  );
}

export function inspectOperation(operationDir: string): OperationState {
  return loadOperation(resolve(operationDir));
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function cli(): Promise<void> {
  const command = process.argv[2];
  if (command === "prepare") {
    const manifestPath = arg("--manifest");
    const outputDir = arg("--output-dir");
    if (!manifestPath || !outputDir) {
      throw new Error("prepare requires --manifest and --output-dir");
    }
    console.log(
      JSON.stringify(
        prepareOperation({ manifestPath, outputDir }),
        null,
        2,
      ),
    );
    return;
  }
  if (command === "inspect") {
    const operationDir = arg("--operation-dir");
    if (!operationDir) throw new Error("inspect requires --operation-dir");
    const state = inspectOperation(operationDir);
    console.log(
      JSON.stringify(
        {
          marker: OPERATION_MARKER,
          operation_id: state.operation_id,
          revision: state.revision,
          completed: state.completed,
          phases: Object.fromEntries(
            PHASES.map((phase) => [
              phase,
              {
                status: state.phases[phase].status,
                attempt_count: state.phases[phase].attempt_count,
                receipt_sha256: state.phases[phase].receipt_sha256,
              },
            ]),
          ),
          raw_token_present: false,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (command === "run-phase") {
    const operationDir = arg("--operation-dir");
    const phase = arg("--phase") as Phase | undefined;
    const confirmation = arg("--confirm");
    const allowLive = arg("--allow-live") === "true";
    if (!operationDir || !phase || !confirmation) {
      throw new Error(
        "run-phase requires --operation-dir, --phase, and --confirm",
      );
    }
    const state = await executePhase({
      operationDir,
      phase,
      confirmation,
      allowLive,
    });
    console.log(JSON.stringify(state, null, 2));
    return;
  }
  if (command === "recover-phase") {
    const operationDir = arg("--operation-dir");
    const phase = arg("--phase") as Phase | undefined;
    const confirmation = arg("--confirm");
    const rawResultPath = arg("--raw-result");
    if (!operationDir || !phase || !confirmation || !rawResultPath) {
      throw new Error(
        "recover-phase requires --operation-dir, --phase, --confirm, and --raw-result",
      );
    }
    const state = await recoverPhase({
      operationDir,
      phase,
      confirmation,
      rawResultPath,
    });
    console.log(JSON.stringify(state, null, 2));
    return;
  }
  throw new Error(
    "usage: prepare | inspect | run-phase | recover-phase",
  );
}

if (
  process.argv[1] &&
  basename(process.argv[1]) ===
    "external_agent_paid_work_fulfillment_fresh_canary_credential_lifecycle_and_wc_binding_v1.ts"
) {
  cli().catch((error) => {
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  });
}
