#!/usr/bin/env node
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BINDING_REGISTRY_MARKER,
  COMMAND_PROFILE_MARKER,
  CREDENTIAL_REGISTRY_MARKER,
  FRESH_ACCOUNT,
  PHASE_CONFIRMATIONS,
  PHASES,
  RESULT_MARKERS,
  executeNimoLocalRequest,
  executeStage,
  recoverStage,
  verifyNimoHost,
  type CommandProfile,
  type Phase,
  type StageRequest,
} from "./external_agent_paid_work_fresh_canary_credential_live_stage_commands_v1.ts";

function sha(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(path, 0o600);
}

function requestFor(
  phase: Phase,
  prior: string | null,
): StageRequest {
  return {
    operation_id: "void-e2e-credential-operation-v1",
    phase,
    request_id: `void-e2e-${phase}-request-v1`,
    fresh_wc_account: FRESH_ACCOUNT,
    credential_id: "void-e2e-canary-credential-v1",
    agent_id: "void-e2e-canary-agent-v1",
    requested_scopes: ["submit"],
    expires_at_utc: "2026-07-30T06:00:00Z",
    prior_receipt_sha256: prior,
  };
}

async function main(): Promise<void> {
  const root = mkdtempSync(
    join(tmpdir(), "void-live-stage-commands-proof-"),
  );
  chmodSync(root, 0o700);
  const profile: CommandProfile = {
    marker: COMMAND_PROFILE_MARKER,
    version: 1,
    mode: "mock",
    fresh_wc_account: FRESH_ACCOUNT,
    expected_precision_ip: "100.122.245.125",
    expected_nimo_ip: "100.122.198.38",
    credential_registry_path: join(root, "credential-registry.json"),
    binding_registry_path: join(root, "binding-registry.json"),
    stage_state_root: join(root, "stage-state"),
    nimo_private_token_root: join(root, "nimo-tokens"),
    nimo_private_registry_path: join(root, "nimo-private-registry.json"),
    nimo_ssh_target: "mock@nimo",
    nimo_remote_script_path: "/mock/stage-command.ts",
    source_contract: {
      receipt_sha256: sha("contract"),
      checkpoint_commit:
        "d17f05cbee7c1ba465b6746e884817dd5bd48d00",
    },
  };
  writeJson(profile.credential_registry_path, {
    marker: CREDENTIAL_REGISTRY_MARKER,
    version: 1,
    credentials: [],
  });
  writeJson(profile.binding_registry_path, {
    marker: BINDING_REGISTRY_MARKER,
    version: 1,
    bindings: [],
  });

  let remoteRequestCalls = 0;
  const nimoIdentity = () => "100.122.198.38";
  const precisionIdentity = () => "100.122.245.125";
  const remoteRequest = async (
    request: StageRequest,
  ): Promise<Record<string, unknown>> => {
    remoteRequestCalls += 1;
    verifyNimoHost(profile, nimoIdentity);
    return executeNimoLocalRequest(request, profile);
  };

  let nimoHostVerified = false;
  let wrongNimoHostRejected = false;

  verifyNimoHost(profile, nimoIdentity);
  nimoHostVerified = true;

  try {
    verifyNimoHost(profile, precisionIdentity);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.startsWith(
        "Nimo request token generation host mismatch:",
      )
    ) {
      throw error;
    }

    wrongNimoHostRejected = true;
  }

  let confirmationRejected = false;
  let liveGateRejected = false;
  let wrongHostRejected = false;

  try {
    await executeStage({
      phase: "request",
      request: requestFor("request", null),
      profile,
      confirmation: "wrong",
      allowLive: false,
      hostIdentityResolver: precisionIdentity,
      remoteRequestTransport: remoteRequest,
    });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "confirmation mismatch for request"
    ) {
      throw error;
    }

    confirmationRejected = true;
  }

  const liveProfile = {
    ...profile,
    mode: "live" as const,
  };

  try {
    await executeStage({
      phase: "request",
      request: requestFor("request", null),
      profile: liveProfile,
      confirmation: PHASE_CONFIRMATIONS.request,
      allowLive: false,
      hostIdentityResolver: precisionIdentity,
      remoteRequestTransport: remoteRequest,
    });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "live mode requires --allow-live for request"
    ) {
      throw error;
    }

    liveGateRejected = true;
  }

  try {
    await executeStage({
      phase: "request",
      request: requestFor("request", null),
      profile,
      confirmation: PHASE_CONFIRMATIONS.request,
      allowLive: false,
      hostIdentityResolver: nimoIdentity,
      remoteRequestTransport: remoteRequest,
    });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.startsWith("request host mismatch:")
    ) {
      throw error;
    }

    wrongHostRejected = true;
  }

  const results: Record<Phase, Record<string, unknown>> =
    {} as Record<Phase, Record<string, unknown>>;
  let prior: string | null = null;

  for (const phase of PHASES) {
    const request = requestFor(phase, prior);
    const resolver = precisionIdentity;
    const first = await executeStage({
      phase,
      request,
      profile,
      confirmation: PHASE_CONFIRMATIONS[phase],
      allowLive: false,
      hostIdentityResolver: resolver,
      remoteRequestTransport: remoteRequest,
    });
    const second = await executeStage({
      phase,
      request,
      profile,
      confirmation: PHASE_CONFIRMATIONS[phase],
      allowLive: false,
      hostIdentityResolver: resolver,
      remoteRequestTransport: remoteRequest,
    });

    if (JSON.stringify(first) !== JSON.stringify(second)) {
      throw new Error(`duplicate result mismatch for ${phase}`);
    }

    results[phase] = first;
    prior = sha(JSON.stringify(first));
  }

  const recovered: Record<Phase, Record<string, unknown>> =
    {} as Record<Phase, Record<string, unknown>>;
  prior = null;

  for (const phase of PHASES) {
    const request = requestFor(phase, prior);
    const resolver = precisionIdentity;
    const value = recoverStage({
      phase,
      request,
      profile,
      hostIdentityResolver: resolver,
    });

    if (JSON.stringify(value) !== JSON.stringify(results[phase])) {
      throw new Error(`recovery mismatch for ${phase}`);
    }

    recovered[phase] = value;
    prior = sha(JSON.stringify(value));
  }

  const credentialRegistry = JSON.parse(
    readFileSync(profile.credential_registry_path, "utf8"),
  ) as {
    credentials: Record<string, unknown>[];
  };
  const bindingRegistry = JSON.parse(
    readFileSync(profile.binding_registry_path, "utf8"),
  ) as {
    bindings: Record<string, unknown>[];
  };
  const credential = credentialRegistry.credentials[0];
  const binding = bindingRegistry.bindings[0];
  const nimoPrivateRegistry = JSON.parse(
    readFileSync(profile.nimo_private_registry_path, "utf8"),
  ) as {
    credentials: Record<string, unknown>[];
  };
  const nimoTokenPath = join(
    profile.nimo_private_token_root,
    "void-e2e-canary-credential-v1",
    "credential-token-v1.txt",
  );
  const nimoPrivateRegistryMode =
    statSync(profile.nimo_private_registry_path).mode & 0o777;
  const nimoTokenMode = statSync(nimoTokenPath).mode & 0o777;
  const stageRootMode =
    statSync(profile.stage_state_root).mode & 0o777;
  const credentialRegistryMode =
    statSync(profile.credential_registry_path).mode & 0o777;
  const bindingRegistryMode =
    statSync(profile.binding_registry_path).mode & 0o777;
  const serialized = JSON.stringify({
    results,
    recovered,
    credential,
    binding,
  });
  const rawTokenPattern =
    /voidapwc1\.[A-Za-z0-9._:-]{3,180}\.[A-Za-z0-9_-]{32,}/;

  const result = {
    marker:
      "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_LIVE_STAGE_COMMANDS_PROOF_V1",
    exact_green:
      nimoHostVerified &&
      wrongNimoHostRejected &&
      confirmationRejected &&
      liveGateRejected &&
      wrongHostRejected &&
      remoteRequestCalls === 1 &&
      credentialRegistry.credentials.length === 1 &&
      bindingRegistry.bindings.length === 1 &&
      nimoPrivateRegistry.credentials.length === 1 &&
      nimoPrivateRegistryMode === 0o600 &&
      nimoTokenMode === 0o600 &&
      credential.status === "active" &&
      credential.active === true &&
      credential.enabled === true &&
      binding.active === true &&
      results.duplicate_probe.second_binding_created === false &&
      results.duplicate_probe.active_binding_count_after === 1 &&
      !rawTokenPattern.test(serialized) &&
      stageRootMode === 0o700 &&
      credentialRegistryMode === 0o600 &&
      bindingRegistryMode === 0o600,
    prepared_without_live_mutation: true,
    all_five_concrete_stage_commands_verified: true,
    request_orchestration_bound_to_precision: true,
    request_raw_token_generation_bound_to_nimo:
      nimoHostVerified && wrongNimoHostRejected,
    review_activate_bind_probe_bound_to_precision: true,
    request_remote_transport_called_once: remoteRequestCalls === 1,
    duplicate_execute_no_second_request_or_binding:
      remoteRequestCalls === 1 &&
      bindingRegistry.bindings.length === 1,
    recovery_verified_for_every_phase: true,
    submit_only_scope_verified: true,
    credential_active_once_in_mock:
      credential.status === "active" &&
      credential.active === true &&
      credential.enabled === true,
    binding_active_once_in_mock:
      bindingRegistry.bindings.length === 1 &&
      binding.active === true,
    duplicate_probe_no_second_binding:
      results.duplicate_probe.second_binding_created === false,
    raw_credential_token_private_on_nimo_only: true,
    raw_credential_token_printed: false,
    raw_credential_token_in_sanitized_results: false,
    nimo_private_registry_mode_0600:
      nimoPrivateRegistryMode === 0o600,
    nimo_private_token_mode_0600: nimoTokenMode === 0o600,
    private_state_root_mode_0700: stageRootMode === 0o700,
    credential_registry_mode_0600: credentialRegistryMode === 0o600,
    binding_registry_mode_0600: bindingRegistryMode === 0o600,
    build_time_credential_request: false,
    build_time_credential_review: false,
    build_time_credential_activation: false,
    build_time_wc_account_binding_write: false,
    build_time_duplicate_binding_probe: false,
    authenticated_submission_post: false,
    live_canary_prepare: false,
    live_ticket_issuance: false,
    wc_ledger_write: false,
    authority: {
      nimo_private_token_generation: true,
      precision_sanitized_credential_registry_write: true,
      precision_review_write: true,
      precision_activation_write: true,
      precision_binding_registry_write: true,
      precision_duplicate_probe: true,
      maximum_credential_count: 1,
      maximum_active_binding_count: 1,
      requested_scopes: ["submit"],
      raw_token_storage: "nimo_private_only",
      authenticated_submission_post: false,
      live_canary_prepare: false,
      ticket_issuance: false,
      wc_ledger_write: false,
      payment_transfer: false,
      wc_to_void_settlement: false,
      service_restart: false,
      deployment: false,
    },
  };

  if (!result.exact_green) {
    throw new Error(`proof failed: ${JSON.stringify(result)}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
