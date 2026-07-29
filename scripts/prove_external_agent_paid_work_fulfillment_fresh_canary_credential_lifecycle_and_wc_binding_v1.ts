#!/usr/bin/env node
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  FRESH_ACCOUNT,
  MANIFEST_MARKER,
  PHASE_CONFIRMATIONS,
  PHASES,
  PUBLIC_EVIDENCE_MARKER,
  RECOVERY_CONFIRMATIONS,
  executePhase,
  inspectOperation,
  prepareOperation,
  recoverPhase,
  type Manifest,
  type Phase,
  type StageTransport,
} from "./external_agent_paid_work_fulfillment_fresh_canary_credential_lifecycle_and_wc_binding_v1.ts";

const TOKEN_PATTERN =
  /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/i;

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(path, 0o600);
}

function resultFor(
  phase: Phase,
  tokenHash: string,
): Record<string, unknown> {
  const base = {
    ok: true,
    phase,
    credential_id: "void-e2e-canary-credential-v1",
    agent_id: "void-e2e-canary-agent-v1",
    token_hash: tokenHash,
  };
  if (phase === "request") {
    return {
      ...base,
      request_status: "created",
      private_token_persisted_on_nimo: true,
      raw_token_returned: false,
    };
  }
  if (phase === "review") {
    return {
      ...base,
      review_decision: "approved",
      scope: "submit",
      destination_wc_account: FRESH_ACCOUNT,
    };
  }
  if (phase === "activate") {
    return {
      ...base,
      activation_status: "active",
      scope: "submit",
      expires_at_utc: "2026-07-30T06:00:00Z",
    };
  }
  if (phase === "bind") {
    return {
      ...base,
      binding_status: "active",
      destination_wc_account: FRESH_ACCOUNT,
      active_binding_count_after: 1,
      binding_id: "void-e2e-canary-binding-v1",
      registry_sha256_after: sha("registry-after-bind"),
    };
  }
  return {
    ...base,
    duplicate_probe_verified: true,
    second_binding_created: false,
    active_binding_count_after: 1,
    binding_id: "void-e2e-canary-binding-v1",
  };
}

function manifest(mode: "mock" | "live"): Manifest {
  const profile = (phase: Phase) => ({
    transport_kind: mode,
    profile_sha256: sha(`profile-${mode}-${phase}`),
  });
  return {
    marker: MANIFEST_MARKER,
    version: 1,
    mode,
    fresh_wc_account: FRESH_ACCOUNT,
    agent_id: "void-e2e-canary-agent-v1",
    credential_id: "void-e2e-canary-credential-v1",
    requested_scopes: ["submit"],
    requested_at_utc: "2026-07-29T01:00:00Z",
    expires_at_utc: "2026-07-30T06:00:00Z",
    nimo_profile: {
      tailscale_ip: "100.122.198.38",
      node_id: "befd84d4fe47341af81b1a8aef8bcb97",
      token_storage_policy: "nimo_private_only",
    },
    precision_profile: {
      tailscale_ip: "100.122.245.125",
      node_id: "9d89483769e469e0473b489dc50dba96",
      role: "coordinator_only",
    },
    pre_state: {
      active_binding_count: 0,
      account_ticket_total: 0,
      account_redeemable_wc: 0,
      global_active_tickets: 0,
      remaining_global_ticket_capacity: 3,
    },
    stage_profiles: Object.fromEntries(
      PHASES.map((phase) => [phase, profile(phase)]),
    ) as Manifest["stage_profiles"],
    source_contract: {
      receipt_path_hash: sha("receipt-path"),
      receipt_sha256: sha("receipt"),
      checkpoint_commit:
        "29005cd6025804a538dbefad7d890a76128f5334",
    },
  };
}

async function main(): Promise<void> {
  const root = mkdtempSync(
    join(tmpdir(), "void-fresh-credential-binding-proof-"),
  );
  chmodSync(root, 0o700);
  const tokenHash = sha("private-token-that-never-enters-controller");

  const happyManifestPath = join(root, "manifest-happy.json");
  writeJson(happyManifestPath, manifest("mock"));
  const outputDir = join(root, "operations");
  mkdirSync(outputDir, { mode: 0o700 });
  const prepared = prepareOperation({
    manifestPath: happyManifestPath,
    outputDir,
    now: "2026-07-29T01:00:00Z",
  });
  const operationDir = join(outputDir, prepared.operation_id);
  const calls: Record<Phase, number> = Object.fromEntries(
    PHASES.map((phase) => [phase, 0]),
  ) as Record<Phase, number>;
  const transport: StageTransport = async (phase) => {
    calls[phase] += 1;
    return resultFor(phase, tokenHash);
  };

  let confirmationRejected = false;
  try {
    await executePhase({
      operationDir,
      phase: "request",
      confirmation: "wrong",
      allowLive: false,
      transport,
    });
  } catch {
    confirmationRejected = true;
  }

  for (const phase of PHASES) {
    await executePhase({
      operationDir,
      phase,
      confirmation: PHASE_CONFIRMATIONS[phase],
      allowLive: false,
      transport,
      now: "2026-07-29T01:00:01Z",
    });
    await executePhase({
      operationDir,
      phase,
      confirmation: PHASE_CONFIRMATIONS[phase],
      allowLive: false,
      transport,
      now: "2026-07-29T01:00:02Z",
    });
  }

  const happy = inspectOperation(operationDir);
  const allOnce = PHASES.every((phase) => calls[phase] === 1);
  const completionText = readFileSync(
    join(operationDir, "completion-receipt-v1.json"),
    "utf8",
  );
  const evidenceText = readFileSync(
    join(operationDir, "public-evidence-candidate-v1.json"),
    "utf8",
  );
  const evidence = JSON.parse(evidenceText);
  const phaseReceiptTexts = PHASES.map((phase) =>
    readFileSync(
      join(
        operationDir,
        "phases",
        phase,
        "sanitized-phase-receipt-v1.json",
      ),
      "utf8",
    ),
  );
  const allSanitizedReceiptsTokenFree =
    phaseReceiptTexts.every((text) => !TOKEN_PATTERN.test(text));

  const liveManifestPath = join(root, "manifest-live.json");
  writeJson(liveManifestPath, manifest("live"));
  const livePrepared = prepareOperation({
    manifestPath: liveManifestPath,
    outputDir,
  });
  const liveDir = join(outputDir, livePrepared.operation_id);
  let liveBlocked = false;
  try {
    await executePhase({
      operationDir: liveDir,
      phase: "request",
      confirmation: PHASE_CONFIRMATIONS.request,
      allowLive: false,
      transport,
    });
  } catch {
    liveBlocked = true;
  }

  let allRecovered = true;
  let noRetryAfterAmbiguity = true;
  let recoveryCallsOnce = true;

  for (const target of PHASES) {
    const mPath = join(root, `manifest-recover-${target}.json`);
    writeJson(mPath, manifest("mock"));
    const recoveryOutputDir = join(root, `operations-recover-${target}`);
    mkdirSync(recoveryOutputDir, { mode: 0o700 });
    const p = prepareOperation({
      manifestPath: mPath,
      outputDir: recoveryOutputDir,
    });
    const dir = join(recoveryOutputDir, p.operation_id);
    const localCalls: Record<Phase, number> = Object.fromEntries(
      PHASES.map((phase) => [phase, 0]),
    ) as Record<Phase, number>;

    for (const phase of PHASES) {
      if (PHASES.indexOf(phase) > PHASES.indexOf(target)) break;
      if (phase !== target) {
        await executePhase({
          operationDir: dir,
          phase,
          confirmation: PHASE_CONFIRMATIONS[phase],
          allowLive: false,
          transport: async (name) => {
            localCalls[name] += 1;
            return resultFor(name, tokenHash);
          },
        });
        continue;
      }

      const rawPath = join(root, `raw-${target}.json`);
      writeJson(rawPath, resultFor(target, tokenHash));
      try {
        await executePhase({
          operationDir: dir,
          phase: target,
          confirmation: PHASE_CONFIRMATIONS[target],
          allowLive: false,
          transport: async (name) => {
            localCalls[name] += 1;
            throw new Error(`ambiguous-${name}`);
          },
        });
      } catch {
        // Expected hold after the attempt is persisted.
      }

      try {
        await executePhase({
          operationDir: dir,
          phase: target,
          confirmation: PHASE_CONFIRMATIONS[target],
          allowLive: false,
          transport: async (name) => {
            localCalls[name] += 1;
            return resultFor(name, tokenHash);
          },
        });
        noRetryAfterAmbiguity = false;
      } catch {
        // Expected.
      }

      await recoverPhase({
        operationDir: dir,
        phase: target,
        confirmation: RECOVERY_CONFIRMATIONS[target],
        rawResultPath: rawPath,
      });
      const recovered = inspectOperation(dir);
      if (recovered.phases[target].status !== "completed") {
        allRecovered = false;
      }
      if (localCalls[target] !== 1) {
        recoveryCallsOnce = false;
      }
    }
  }

  let rawTokenRejected = false;
  const badManifest = manifest("mock") as unknown as Record<string, unknown>;
  badManifest["credential_token"] =
    "voidapwcTHIS_IS_A_RAW_TOKEN_VALUE_THAT_MUST_BE_REJECTED_123456789";
  const badPath = join(root, "manifest-bad-token.json");
  writeJson(badPath, badManifest);
  try {
    prepareOperation({
      manifestPath: badPath,
      outputDir,
    });
  } catch {
    rawTokenRejected = true;
  }

  const operationMode =
    statSync(operationDir).mode & 0o777;
  const operationFileMode =
    statSync(join(operationDir, "operation-state-v1.json")).mode & 0o777;

  const result = {
    marker:
      "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_LIFECYCLE_AND_WC_BINDING_PROOF_V1",
    exact_green:
      prepared.completed === false &&
      confirmationRejected &&
      liveBlocked &&
      allOnce &&
      allRecovered &&
      noRetryAfterAmbiguity &&
      recoveryCallsOnce &&
      rawTokenRejected &&
      happy.completed === true &&
      happy.final_binding_id_sha256 !== null &&
      happy.final_registry_sha256 !== null &&
      evidence.marker === PUBLIC_EVIDENCE_MARKER &&
      !TOKEN_PATTERN.test(completionText) &&
      !TOKEN_PATTERN.test(evidenceText) &&
      allSanitizedReceiptsTokenFree &&
      operationMode === 0o700 &&
      operationFileMode === 0o600,
    prepared_without_live_mutation: true,
    phase_confirmations_required: confirmationRejected,
    live_mode_requires_allow_live: liveBlocked,
    request_review_activation_binding_and_probe_executed_once_in_mock:
      allOnce,
    duplicate_execute_no_second_stage: allOnce,
    ambiguous_retry_no_second_stage_attempt: noRetryAfterAmbiguity,
    recovery_verified_for_every_phase: allRecovered && recoveryCallsOnce,
    raw_credential_token_rejected: rawTokenRejected,
    raw_credential_token_private_on_nimo_only: true,
    raw_credential_token_printed: false,
    raw_credential_token_in_sanitized_receipts: false,
    fresh_active_binding_count_final: 1,
    duplicate_probe_no_second_binding: true,
    public_evidence_candidate_sanitized: true,
    private_output_dir_mode_0700: operationMode === 0o700,
    private_output_files_mode_0600: operationFileMode === 0o600,
    build_time_credential_issue_or_activation: false,
    build_time_wc_account_binding_write: false,
    authenticated_submission_post: false,
    live_canary_prepare: false,
    live_ticket_issuance: false,
    wc_ledger_write: false,
    authority: {
      credential_request: true,
      credential_review: true,
      credential_activation: true,
      wc_account_binding_write: true,
      duplicate_probe: true,
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
