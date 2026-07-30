import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_BEGIN_RECEIPT_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_FINALIZATION_RECEIPT_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_COMMAND_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIG_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIRMATION,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_CLOSE_RECEIPT_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_SESSION_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TERMINAL_RECEIPT_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TRANSPORT_RESPONSE_MARKER,
  executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1,
  type ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCommandV1,
  type ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryConfigV1,
  type ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryDependenciesV1,
  type ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTransportResponseV1,
} from "./external_agent_paid_work_operator_controlled_authenticated_submission_live_canary_v1.js";
import {
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_OPERATOR_DECISION_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_PLAN_MARKER,
} from "./external_agent_paid_work_operator_controlled_authenticated_submission_live_canary_prerequisite_v1.js";
import {
  LIVE_CANARY_CONFIRMATION,
  LIVE_CANARY_RELATIVE_PATH,
} from "./external_agent_paid_work_authenticated_submission_execution_candidate_v1.js";
import {
  PAID_WORK_SUBMISSION_PATH,
  REQUIRED_CONTENT_TYPE,
} from "./external_agent_paid_work_authenticated_submission_activation_prerequisite_v1.js";

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectReject(action: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  let error: unknown = null;
  try {
    await action();
  } catch (caught) {
    error = caught;
  }
  assertCondition(error instanceof Error, "expected action to reject");
  assertCondition(pattern.test(error.message), `unexpected rejection: ${error.message}`);
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function writePrivate(pathname: string, value: string): void {
  writeFileSync(pathname, value, { encoding: "utf8", mode: 0o600, flag: "wx" });
  chmodSync(pathname, 0o600);
}

function writePrivateJson(pathname: string, value: unknown): void {
  writePrivate(pathname, `${JSON.stringify(value, null, 2)}\n`);
}

function mode(pathname: string): number {
  return lstatSync(pathname).mode & 0o777;
}

function decisionAuthority(): Record<string, boolean> {
  return {
    local_private_plan_write: true,
    local_private_decision_write: true,
    credential_source_open: false,
    credential_or_token_read: false,
    authorization_header_materialized: false,
    replay_key_reservation_or_consumption: false,
    one_shot_lease_write: false,
    network_listener_creation: false,
    runtime_mount: false,
    endpoint_preflight_network_access: false,
    external_http_submission: false,
    authenticated_submission_post: false,
    provider_selection: false,
    quote_creation: false,
    payment_authorization: false,
    payment_execution: false,
    work_execution_authorization: false,
    work_dispatch: false,
    live_ticket_issuance: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    signing: false,
    transaction_broadcast: false,
    service_restart: false,
    deployment: false,
    money_movement: false,
  };
}

function receiptAuthority(): Record<string, boolean> {
  return {
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
  };
}

type Fixture = Readonly<{
  root: string;
  requestPath: string;
  credentialPath: string;
  replayDirectory: string;
  leaseDirectory: string;
  replayPath: string;
  leasePath: string;
  planPath: string;
  decisionPath: string;
  outputParent: string;
  plan: Record<string, any>;
  config: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryConfigV1;
  command: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCommandV1;
  requestBytes: Buffer;
  requestSha256: string;
  credentialBefore: Buffer;
}>;

let fixtureCounter = 0;
function makeFixture(label: string): Fixture {
  fixtureCounter += 1;
  const root = mkdtempSync(path.join(tmpdir(), `void-live-canary-v1-${label}-${fixtureCounter}-`));
  chmodSync(root, 0o700);
  const input = path.join(root, "input");
  const replayDirectory = path.join(root, "replay");
  const leaseDirectory = path.join(root, "lease");
  const outputParent = path.join(root, "output");
  for (const directory of [input, replayDirectory, leaseDirectory, outputParent]) {
    mkdirSync(directory, { mode: 0o700 });
    chmodSync(directory, 0o700);
  }

  const requestPath = path.join(input, "request.json");
  const credentialPath = path.join(input, "credential.token");
  const planPath = path.join(input, "prerequisite-plan.json");
  const decisionPath = path.join(input, "prerequisite-decision.json");
  const replayPath = path.join(replayDirectory, "replay-reservation.json");
  const leasePath = path.join(leaseDirectory, "one-shot-lease.json");

  const submissionId = `live-canary-proof-${label}-${fixtureCounter}`;
  const workOrderId = `voidawo1_${"a".repeat(64)}`;
  const request = {
    marker: "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
    version: 1,
    submission_id: submissionId,
    work_order: {
      marker: "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
      version: 1,
      created_at_utc: "2026-07-30T05:00:00Z",
      expires_at_utc: "2026-07-30T06:00:00Z",
      requester: {
        agent_id: "agent.live.canary.proof.v1",
        callback_uri: "https://agent.example.invalid/callback",
      },
      service: {
        capability_id: "datanet.fetch_verify",
        objective: "Verify the staged object.",
        input_refs: ["https://public-node.example.invalid/datanet/object-v1"],
        expected_outputs: ["verification-result.json"],
      },
      commercial: {
        quote_asset: "USD",
        max_total: "5.00",
        payment_required_before_execution: true,
      },
      execution_limits: {
        max_runtime_seconds: 300,
        max_output_bytes: 1048576,
        external_side_effects_allowed: false,
        wallet_access_allowed: false,
        money_movement_allowed: false,
      },
      nonce: `live-canary-proof-nonce-${fixtureCounter}`,
      work_order_id: workOrderId,
    },
  };
  const requestBody = `${JSON.stringify(request)}\n`;
  writePrivate(requestPath, requestBody);
  const requestBytes = readFileSync(requestPath);
  const requestSha256 = sha256(requestBytes);
  writePrivate(credentialPath, "synthetic-proof-credential-never-read-by-runner\n");
  const credentialBefore = readFileSync(credentialPath);
  const credentialMetadata = lstatSync(credentialPath);

  const prerequisiteId = "b".repeat(64);
  const executionCandidateId = "c".repeat(64);
  const replayKey = "d".repeat(64);
  const leaseId = `live-canary-lease-${label}-${fixtureCounter}`;
  const credentialReferenceId = `credential-reference-${label}-${fixtureCounter}`;
  const plan: Record<string, any> = {
    marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_PLAN_MARKER,
    version: 1,
    gate_id: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID,
    operation_id: `prerequisite-operation-${label}-${fixtureCounter}`,
    generated_at_utc: "2026-07-30T05:10:00Z",
    expires_at_utc: "2026-07-30T05:30:00Z",
    status: "live_canary_prerequisites_validated_hold_execution",
    prerequisite_id: prerequisiteId,
    source_artifacts: {
      execution_plan_path: path.join(input, "execution-plan.json"),
      execution_plan_sha256: "1".repeat(64),
      execution_operator_decision_path: path.join(input, "execution-decision.json"),
      execution_operator_decision_sha256: "2".repeat(64),
      request_path: requestPath,
      request_sha256: requestSha256,
    },
    bindings: {
      execution_candidate_operation_id: `execution-candidate-operation-${label}-${fixtureCounter}`,
      execution_candidate_id: executionCandidateId,
      base_origin: "https://agent-gateway.example.invalid",
      endpoint_path: PAID_WORK_SUBMISSION_PATH,
      method: "POST",
      content_type: REQUIRED_CONTENT_TYPE,
      submission_id: submissionId,
      work_order_id: workOrderId,
      payload_sha256: requestSha256,
      request_bytes: requestBytes.byteLength,
      replay_key: replayKey,
      credential_reference_id: credentialReferenceId,
    },
    credential_source_inspection: {
      reference_id: credentialReferenceId,
      source_locator_sha256: sha256(path.resolve(credentialPath)),
      path_sha256: sha256(path.resolve(credentialPath)),
      expected_scope: "agent_paid_work.submit",
      owner_uid: credentialMetadata.uid,
      mode_octal: "0600",
      size_bytes: credentialMetadata.size,
      regular_file: true,
      symlink: false,
      opened: false,
      bytes_read: 0,
    },
    endpoint_preflight: {
      marker: "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_ENDPOINT_PREFLIGHT_RECEIPT_V1",
      version: 1,
      observed_at_utc: "2026-07-30T05:19:30Z",
      base_origin: "https://agent-gateway.example.invalid",
      hostname: "agent-gateway.example.invalid",
      dns_resolved: true,
      tls_required: true,
      tls_verified: true,
      discovery_path: "/.well-known/void-agent-discovery.json",
      discovery_marker: "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
      submission_path: PAID_WORK_SUBMISSION_PATH,
      route_probe_method: "GET",
      route_probe_status: 405,
      authorization_header_present: false,
      request_body_sent: false,
      submission_post_sent: false,
      evidence_nonce: `preflight-proof-${fixtureCounter}`,
      evidence_sha256: "3".repeat(64),
    },
    replay_staging: {
      state_directory: replayDirectory,
      reservation_path: replayPath,
      reservation_path_sha256: sha256(path.resolve(replayPath)),
      replay_key: replayKey,
      strategy: "exclusive_create",
      target_absent: true,
      reservation_written: false,
      reservation_consumed: false,
    },
    one_shot_lease_staging: {
      state_directory: leaseDirectory,
      lease_path: leasePath,
      lease_path_sha256: sha256(path.resolve(leasePath)),
      lease_id: leaseId,
      strategy: "exclusive_create",
      maximum_attempt_count: 1,
      automatic_retry: false,
      target_absent: true,
      lease_written: false,
      attempt_count: 0,
    },
    operator_control: {
      prerequisite_confirmation: "reviewExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1",
      prerequisite_confirmation_verified: true,
      confirmation_expires_at_utc: "2026-07-30T05:27:00Z",
      live_execute_confirmation: LIVE_CANARY_CONFIRMATION,
      allow_live_submit_flag_required: true,
      live_canary_authorized: false,
      separate_operator_live_canary_required: true,
    },
    live_canary_contract: {
      tool_relative_path: LIVE_CANARY_RELATIVE_PATH,
      execute_confirmation: LIVE_CANARY_CONFIRMATION,
      execute_stage_required: true,
      allow_live_submit_flag_required: true,
      same_clean_commit_required: true,
      token_file_owner_private_required: true,
      maximum_attempt_count: 1,
      automatic_retry: false,
      ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry",
    },
    terminal_receipt_contract: {
      accepted_new_status: 202,
      accepted_duplicate_status: 200,
      conflicting_duplicate_status: 409,
      require_authorization_verified: true,
      require_accepted_for_review: true,
      require_submission_id_binding: true,
      require_work_order_id_binding: true,
      require_request_sha256_binding: true,
      sanitized_receipt_only: true,
      ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry",
    },
    gates: {
      execution_plan_integrity: true,
      execution_decision_integrity: true,
      execution_decision_is_hold: true,
      request_integrity: true,
      endpoint_allowlisted: true,
      execution_candidate_window_valid: true,
      prerequisite_window_bounded: true,
      credential_source_metadata_exact: true,
      credential_source_not_opened: true,
      endpoint_preflight_evidence_exact: true,
      endpoint_preflight_fresh: true,
      replay_key_exact_and_unique_in_snapshot: true,
      replay_reservation_target_absent: true,
      lease_id_unique_in_snapshot: true,
      one_shot_lease_target_absent: true,
      one_shot_policy_exact: true,
      live_canary_contract_exact: true,
      operator_expect_new: true,
      operator_live_canary_authorized: false,
      separate_operator_live_canary_required: true,
    },
    execution_boundary: {
      credential_source_opened: false,
      credential_or_token_read: false,
      authorization_header_materialized: false,
      replay_key_reserved_or_consumed: false,
      one_shot_lease_written: false,
      network_listener_creation: false,
      runtime_mount: false,
      endpoint_preflight_performed_by_gate: false,
      request_sent: false,
      authenticated_submission_post: false,
      live_ticket_issuance: false,
      wc_ledger_write: false,
      wallet_or_signer_access: false,
      service_restart: false,
      deployment: false,
      separate_operator_live_canary_required: true,
    },
  };
  writePrivateJson(planPath, plan);
  const planSha256 = sha256(readFileSync(planPath));
  const decision = {
    marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_OPERATOR_DECISION_MARKER,
    version: 1,
    gate_id: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID,
    operation_id: plan.operation_id,
    decision: "hold_live_canary_not_executed",
    confirmation_verified: true,
    prerequisite_plan_sha256: planSha256,
    prerequisite_plan_path: planPath,
    prerequisite_id: prerequisiteId,
    execution_candidate_id: executionCandidateId,
    replay_key: replayKey,
    lease_id: leaseId,
    credential_reference_id: credentialReferenceId,
    authority: decisionAuthority(),
  };
  writePrivateJson(decisionPath, decision);

  const config: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryConfigV1 = {
    marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIG_MARKER,
    version: 1,
    enabled: true,
    live_execution_enabled: true,
    allowed_base_origins: ["https://agent-gateway.example.invalid"],
    allowed_endpoint_paths: [PAID_WORK_SUBMISSION_PATH],
    max_prerequisite_plan_bytes: 2_097_152,
    max_operator_decision_bytes: 262_144,
    max_request_bytes: 65_536,
    max_execution_window_seconds: 600,
    min_remaining_prerequisite_ttl_seconds: 120,
    max_clock_skew_seconds: 60,
    max_credential_file_bytes: 4096,
    max_http_timeout_ms: 30_000,
    max_response_bytes: 1_048_576,
  };
  const command: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCommandV1 = {
    marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_COMMAND_MARKER,
    version: 1,
    execute: false,
    allow_live_submit: false,
    confirmation: "",
    operation_id: `live-canary-operation-${label}-${fixtureCounter}`,
    evaluated_at_utc: "2026-07-30T05:20:00Z",
    execution_expires_at_utc: "2026-07-30T05:25:00Z",
    prerequisite_plan_path: planPath,
    prerequisite_operator_decision_path: decisionPath,
    request_path: requestPath,
    credential_source_path: credentialPath,
    output_directory: path.join(outputParent, `live-canary-${label}-${fixtureCounter}`),
    expected: {
      prerequisite_operation_id: plan.operation_id,
      prerequisite_id: prerequisiteId,
      execution_candidate_id: executionCandidateId,
      base_origin: plan.bindings.base_origin,
      endpoint_path: PAID_WORK_SUBMISSION_PATH,
      submission_id: submissionId,
      work_order_id: workOrderId,
      payload_sha256: requestSha256,
      replay_key: replayKey,
      lease_id: leaseId,
      credential_reference_id: credentialReferenceId,
    },
    operator_intent: {
      expect_new: true,
      expected_live_canary_id: null,
      confirmation_expires_at_utc: "2026-07-30T05:26:00Z",
      maximum_attempt_count: 1,
      automatic_retry: false,
      no_automatic_retry_after_ambiguous_outcome: true,
    },
  };
  return { root, requestPath, credentialPath, replayDirectory, leaseDirectory, replayPath, leasePath, planPath, decisionPath, outputParent, plan, config, command, requestBytes, requestSha256, credentialBefore };
}

function fakePaidWorkClient(fixture: Fixture) {
  return {
    normalizePaidWorkBaseUrlV1(raw: string): URL {
      return new URL(raw);
    },
    readPaidWorkSubmissionRequestV1(rawPath: string) {
      assertCondition(path.resolve(rawPath) === path.resolve(fixture.requestPath), "unexpected request path");
      const value = JSON.parse(readFileSync(rawPath, "utf8")) as Record<string, any>;
      return {
        bytes: readFileSync(rawPath),
        value,
        submissionId: value.submission_id as string,
        workOrderId: value.work_order.work_order_id as string,
        sha256: sha256(readFileSync(rawPath)),
      };
    },
  };
}

function acceptedBody(fixture: Fixture, duplicate: boolean) {
  return {
    ok: true,
    duplicate,
    receipt: {
      marker: "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1",
      version: 1,
      receipt_id: `voidawsi1_${"e".repeat(64)}`,
      submission_id: fixture.plan.bindings.submission_id,
      work_order_id: fixture.plan.bindings.work_order_id,
      request_payload_sha256: fixture.requestSha256,
      canonical_request_sha256: "f".repeat(64),
      admission_id: `voidawsa1_${"1".repeat(64)}`,
      admission: { decision: "accepted_for_review" },
      received_at_utc: "2026-07-30T05:20:01Z",
      authorization_verified: true,
      loopback_source: true,
      duplicate,
      authority: receiptAuthority(),
    },
  };
}

type Behavior = "accepted" | "conflict" | "ambiguous" | "credential-failure";
function dependenciesFor(fixture: Fixture, behavior: Behavior, counters: Record<string, number>): ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryDependenciesV1 {
  return {
    repositoryRoot: () => fixture.root,
    loadPaidWorkClient: async () => fakePaidWorkClient(fixture),
    async beginAttempt(input) {
      counters.begin += 1;
      writePrivateJson(input.replay_reservation_path, { replay_key: input.replay_key, state: "reserved" });
      writePrivateJson(input.lease_path, { lease_id: input.lease_id, attempt_count: 1, state: "active" });
      return {
        marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_BEGIN_RECEIPT_MARKER,
        version: 1,
        attempt_id: `attempt-${fixture.plan.prerequisite_id.slice(0, 16)}`,
        live_canary_id: input.live_canary_id,
        replay_key: input.replay_key,
        replay_reservation_path: input.replay_reservation_path,
        lease_id: input.lease_id,
        lease_path: input.lease_path,
        acquired_at_utc: "2026-07-30T05:20:00Z",
        replay_reserved: true,
        lease_written: true,
        exclusive_create: true,
        attempt_count: 1,
        automatic_retry: false,
      };
    },
    async finalizeAttempt(input) {
      counters.finalize += 1;
      return {
        marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_FINALIZATION_RECEIPT_MARKER,
        version: 1,
        attempt_id: input.begin_receipt.attempt_id,
        live_canary_id: input.begin_receipt.live_canary_id,
        outcome: input.outcome,
        finalized_at_utc: "2026-07-30T05:20:03Z",
        replay_state_terminal: true,
        lease_state_terminal: true,
        automatic_retry: false,
      };
    },
    async openCredentialOnce(input) {
      counters.open += 1;
      if (behavior === "credential-failure") throw Object.assign(new Error("credential provider failure"), { code: "credential_provider_failure" });
      return {
        marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_SESSION_MARKER,
        version: 1,
        handle_id: `credential-handle-${fixture.plan.prerequisite_id.slice(0, 12)}`,
        reference_id: input.reference_id,
        scope: input.expected_scope,
        source_locator_sha256: input.source_locator_sha256,
        opened_at_utc: "2026-07-30T05:20:01Z",
        credential_read: true,
        secret_material_exposed_to_runner: false,
      };
    },
    async closeCredential(session) {
      counters.close += 1;
      return {
        marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_CLOSE_RECEIPT_MARKER,
        version: 1,
        handle_id: session.handle_id,
        closed_at_utc: "2026-07-30T05:20:02Z",
        closed: true,
        zeroized: true,
      };
    },
    async submitOnce(input): Promise<ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTransportResponseV1> {
      counters.submit += 1;
      if (behavior === "ambiguous") throw Object.assign(new Error("transport timeout after send"), { code: "transport_timeout_after_send" });
      const conflict = behavior === "conflict";
      return {
        marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TRANSPORT_RESPONSE_MARKER,
        version: 1,
        attempt_id: input.attempt_id,
        request_sent: true,
        response_received: true,
        ambiguous_outcome: false,
        http_status: conflict ? 409 : 202,
        route_header: "v1",
        response_body: conflict ? { error: "conflicting_duplicate_submission" } : acceptedBody(fixture, false),
        response_bytes: 512,
        credential_read: true,
        authorization_header_materialized: true,
        redirects_followed: false,
        automatic_retry: false,
        attempt_count: 1,
        completed_at_utc: "2026-07-30T05:20:02Z",
      };
    },
  };
}

async function main(): Promise<void> {
  const disabledFixture = makeFixture("disabled");
  const disabledCounters = { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 };
  const disabled = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(
    { ...disabledFixture.config, enabled: false },
    disabledFixture.command,
    dependenciesFor(disabledFixture, "accepted", disabledCounters),
  );
  assertCondition(disabled.status === "disabled", "disabled status mismatch");
  assertCondition(Object.values(disabledCounters).every((value) => value === 0), "disabled gate invoked dependencies");

  const validationFixture = makeFixture("validation");
  const validationCounters = { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 };
  const dryRun = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(
    validationFixture.config,
    validationFixture.command,
    dependenciesFor(validationFixture, "accepted", validationCounters),
  );
  assertCondition(dryRun.status === "validated_in_memory" && dryRun.live_canary_id !== null, "validation-only result mismatch");
  assertCondition(Object.values(validationCounters).every((value) => value === 0), "validation-only gate invoked live dependencies");
  assertCondition(!existsSync(validationFixture.command.output_directory), "validation-only gate wrote artifacts");

  const successFixture = makeFixture("success");
  const successDry = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(
    successFixture.config,
    successFixture.command,
    dependenciesFor(successFixture, "accepted", { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 }),
  );
  assertCondition(successDry.live_canary_id !== null, "success live canary ID missing");
  const successCommand = {
    ...successFixture.command,
    execute: true,
    allow_live_submit: true,
    confirmation: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIRMATION,
    operator_intent: { ...successFixture.command.operator_intent, expected_live_canary_id: successDry.live_canary_id },
  };
  const successCounters = { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 };
  const success = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(
    successFixture.config,
    successCommand,
    dependenciesFor(successFixture, "accepted", successCounters),
  );
  assertCondition(success.status === "accepted_new", "accepted-new status mismatch");
  assertCondition(success.terminal_receipt?.marker === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TERMINAL_RECEIPT_MARKER, "terminal receipt marker mismatch");
  assertCondition(success.terminal_receipt?.accepted_for_review === true && success.terminal_receipt?.submission_attempt_count === 1 && success.terminal_receipt?.automatic_retry === false, "terminal receipt acceptance mismatch");
  assertCondition(successCounters.begin === 1 && successCounters.finalize === 1 && successCounters.open === 1 && successCounters.close === 1 && successCounters.submit === 1, "single-shot dependency counts mismatch");
  assertCondition(success.artifacts.intent_path !== null && mode(success.artifacts.intent_path) === 0o600, "intent mode mismatch");
  assertCondition(success.artifacts.terminal_receipt_path !== null && mode(success.artifacts.terminal_receipt_path) === 0o600, "terminal receipt mode mismatch");
  assertCondition(Buffer.compare(readFileSync(successFixture.credentialPath), successFixture.credentialBefore) === 0, "runner changed credential file");
  assertCondition(!readFileSync(success.artifacts.terminal_receipt_path, "utf8").includes(successFixture.credentialPath), "receipt leaked credential path");

  const conflictFixture = makeFixture("conflict");
  const conflictDry = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(conflictFixture.config, conflictFixture.command, dependenciesFor(conflictFixture, "conflict", { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 }));
  const conflict = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(
    conflictFixture.config,
    { ...conflictFixture.command, execute: true, allow_live_submit: true, confirmation: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIRMATION, operator_intent: { ...conflictFixture.command.operator_intent, expected_live_canary_id: conflictDry.live_canary_id } },
    dependenciesFor(conflictFixture, "conflict", { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 }),
  );
  assertCondition(conflict.status === "held_rejected" && conflict.terminal_receipt?.outcome === "rejected_conflicting_duplicate", "conflict handling mismatch");

  const ambiguousFixture = makeFixture("ambiguous");
  const ambiguousDry = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(ambiguousFixture.config, ambiguousFixture.command, dependenciesFor(ambiguousFixture, "ambiguous", { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 }));
  const ambiguousCounters = { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 };
  const ambiguous = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(
    ambiguousFixture.config,
    { ...ambiguousFixture.command, execute: true, allow_live_submit: true, confirmation: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIRMATION, operator_intent: { ...ambiguousFixture.command.operator_intent, expected_live_canary_id: ambiguousDry.live_canary_id } },
    dependenciesFor(ambiguousFixture, "ambiguous", ambiguousCounters),
  );
  assertCondition(ambiguous.status === "held_ambiguous" && ambiguous.terminal_receipt?.manual_reconciliation_required === true && ambiguous.terminal_receipt?.automatic_retry === false, "ambiguous hold mismatch");
  assertCondition(ambiguousCounters.submit === 1 && ambiguousCounters.finalize === 1, "ambiguous path retried or failed to finalize");

  const credentialFailureFixture = makeFixture("credential-failure");
  const credentialDry = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(credentialFailureFixture.config, credentialFailureFixture.command, dependenciesFor(credentialFailureFixture, "credential-failure", { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 }));
  const credentialCounters = { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 };
  const credentialFailure = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(
    credentialFailureFixture.config,
    { ...credentialFailureFixture.command, execute: true, allow_live_submit: true, confirmation: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIRMATION, operator_intent: { ...credentialFailureFixture.command.operator_intent, expected_live_canary_id: credentialDry.live_canary_id } },
    dependenciesFor(credentialFailureFixture, "credential-failure", credentialCounters),
  );
  assertCondition(credentialFailure.status === "held_rejected" && credentialFailure.terminal_receipt?.submission_attempt_count === 0, "credential failure should hold before submit");
  assertCondition(credentialCounters.begin === 1 && credentialCounters.open === 1 && credentialCounters.submit === 0 && credentialCounters.finalize === 1, "credential failure dependency order mismatch");

  const invalidConfirmationFixture = makeFixture("invalid-confirmation");
  const invalidDry = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(invalidConfirmationFixture.config, invalidConfirmationFixture.command, dependenciesFor(invalidConfirmationFixture, "accepted", { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 }));
  await expectReject(
    () => executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(
      invalidConfirmationFixture.config,
      { ...invalidConfirmationFixture.command, execute: true, allow_live_submit: true, confirmation: "wrong", operator_intent: { ...invalidConfirmationFixture.command.operator_intent, expected_live_canary_id: invalidDry.live_canary_id } },
      dependenciesFor(invalidConfirmationFixture, "accepted", { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 }),
    ),
    /confirmation must be exactly/u,
  );

  const replayFixture = makeFixture("replay-collision");
  writePrivateJson(replayFixture.replayPath, { state: "already-reserved" });
  await expectReject(
    () => executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(replayFixture.config, replayFixture.command, dependenciesFor(replayFixture, "accepted", { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 })),
    /replay reservation target already exists/u,
  );

  const liveDisabledFixture = makeFixture("live-disabled");
  const liveDisabledDry = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(liveDisabledFixture.config, liveDisabledFixture.command, dependenciesFor(liveDisabledFixture, "accepted", { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 }));
  await expectReject(
    () => executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(
      { ...liveDisabledFixture.config, live_execution_enabled: false },
      { ...liveDisabledFixture.command, execute: true, allow_live_submit: true, confirmation: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIRMATION, operator_intent: { ...liveDisabledFixture.command.operator_intent, expected_live_canary_id: liveDisabledDry.live_canary_id } },
      dependenciesFor(liveDisabledFixture, "accepted", { begin: 0, finalize: 0, open: 0, close: 0, submit: 0 }),
    ),
    /live execution is disabled/u,
  );

  for (const fixture of [disabledFixture, validationFixture, successFixture, conflictFixture, ambiguousFixture, credentialFailureFixture, invalidConfirmationFixture, replayFixture, liveDisabledFixture]) {
    rmSync(fixture.root, { recursive: true, force: true });
  }

  process.stdout.write([
    "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_V1_PROOF_GREEN",
    "disabled_by_default=true",
    "validation_only_invoked_live_dependencies=false",
    "fake_single_shot_accepted_new=true",
    "fake_conflicting_duplicate_held=true",
    "fake_ambiguous_outcome_held_no_retry=true",
    "fake_credential_failure_stopped_before_submit=true",
    "credential_source_real_bytes_unchanged=true",
    "credential_path_not_disclosed=true",
    "replay_collision_fail_closed=true",
    "exact_confirmation_required=true",
    "live_execution_double_gate_required=true",
    "repository_proof_network_access=false",
    "repository_proof_real_credential_read=false",
    "VOID_INTERACTIVE_SHELL_STILL_ALIVE",
    "",
  ].join("\n"));
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
});
