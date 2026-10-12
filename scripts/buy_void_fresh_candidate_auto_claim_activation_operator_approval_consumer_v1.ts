import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalConsumerV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_v1.js";

type Args = {
  approvalDir: string;
  ceremonyRoot: string;
  planFile: string;
  alertFile: string | null;
  admissionPacketFile: string;
  configFile: string;
  stateDir: string;
  credentialDir: string;
  runnerStateDir: string;
  executorStateDir: string;
  claimantStateDir: string;
  ceremonyReleaseCommit: string;
  issuerReleaseCommit: string;
  runnerReleaseCommit: string;
  executorReleaseCommit: string;
  outputFile: string | null;
  execute: boolean;
  confirmation: string;
};

const MAX_JSON_BYTES = 4 * 1024 * 1024;

function parseArgs(argv: string[]): Args {
  let approvalDir = "";
  let ceremonyRoot = "";
  let planFile = "";
  let alertFile: string | null = null;
  let admissionPacketFile = "";
  let configFile = "";
  let stateDir = "";
  let credentialDir = "";
  let runnerStateDir = "";
  let executorStateDir = "";
  let claimantStateDir = "";
  let ceremonyReleaseCommit = "";
  let issuerReleaseCommit = "";
  let runnerReleaseCommit = "";
  let executorReleaseCommit = "";
  let outputFile: string | null = null;
  let execute = false;
  let confirmation = "";

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    const takePath = (): string => {
      if (!next) throw new Error(`${value} requires a path`);
      index += 1;
      return path.resolve(next);
    };
    const takeValue = (): string => {
      if (!next) throw new Error(`${value} requires a value`);
      index += 1;
      return next.trim();
    };

    if (value === "--approval-dir") {
      approvalDir = takePath();
      continue;
    }
    if (value === "--ceremony-root") {
      ceremonyRoot = takePath();
      continue;
    }
    if (value === "--plan") {
      planFile = takePath();
      continue;
    }
    if (value === "--alert") {
      alertFile = takePath();
      continue;
    }
    if (value === "--admission-packet") {
      admissionPacketFile = takePath();
      continue;
    }
    if (value === "--config") {
      configFile = takePath();
      continue;
    }
    if (value === "--state-dir") {
      stateDir = takePath();
      continue;
    }
    if (value === "--credential-dir") {
      credentialDir = takePath();
      continue;
    }
    if (value === "--runner-state-dir") {
      runnerStateDir = takePath();
      continue;
    }
    if (value === "--executor-state-dir") {
      executorStateDir = takePath();
      continue;
    }
    if (value === "--claimant-state-dir") {
      claimantStateDir = takePath();
      continue;
    }
    if (value === "--ceremony-release-commit") {
      ceremonyReleaseCommit = takeValue().toLowerCase();
      continue;
    }
    if (value === "--issuer-release-commit") {
      issuerReleaseCommit = takeValue().toLowerCase();
      continue;
    }
    if (value === "--runner-release-commit") {
      runnerReleaseCommit = takeValue().toLowerCase();
      continue;
    }
    if (value === "--executor-release-commit") {
      executorReleaseCommit = takeValue().toLowerCase();
      continue;
    }
    if (value === "--output") {
      outputFile = takePath();
      continue;
    }
    if (value === "--execute") {
      execute = true;
      continue;
    }
    if (value === "--confirmation") {
      confirmation = takeValue();
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log([
        "Usage:",
        "  npx tsx scripts/buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_v1.ts [options]",
        "",
        "Options:",
        "  --approval-dir PATH                Private approval directory",
        "  --ceremony-root PATH               Sealed ceremony release root",
        "  --plan PATH                        Exact activation plan",
        "  --alert PATH                       Exact candidate alert",
        "  --admission-packet PATH            Exact admitted packet",
        "  --config PATH                      Persistent disabled config",
        "  --state-dir PATH                   One-shot consumer state",
        "  --credential-dir PATH              Credential directory",
        "  --runner-state-dir PATH            Credential-runner state",
        "  --executor-state-dir PATH          Executor state",
        "  --claimant-state-dir PATH          Claimant state",
        "  --ceremony-release-commit SHA      Exact ceremony commit",
        "  --issuer-release-commit SHA        Exact issuer commit",
        "  --runner-release-commit SHA        Exact runner commit",
        "  --executor-release-commit SHA      Exact executor commit",
        "  --output PATH                      Optional result JSON",
        "  --execute                          Consume and invoke once",
        "  --confirmation TEXT                Exact consumer confirmation",
        "  --help                             Show this help",
      ].join("\n"));
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  for (const [label, value] of [
    ["approval-dir", approvalDir],
    ["ceremony-root", ceremonyRoot],
    ["plan", planFile],
    ["admission-packet", admissionPacketFile],
    ["config", configFile],
    ["state-dir", stateDir],
    ["credential-dir", credentialDir],
    ["runner-state-dir", runnerStateDir],
    ["executor-state-dir", executorStateDir],
    ["claimant-state-dir", claimantStateDir],
  ] as const) {
    if (!value) throw new Error(`--${label} is required`);
  }

  for (const [label, commit] of [
    ["ceremony", ceremonyReleaseCommit],
    ["issuer", issuerReleaseCommit],
    ["runner", runnerReleaseCommit],
    ["executor", executorReleaseCommit],
  ] as const) {
    if (!/^[0-9a-f]{40}$/.test(commit)) {
      throw new Error(`--${label}-release-commit is required`);
    }
  }

  return {
    approvalDir,
    ceremonyRoot,
    planFile,
    alertFile,
    admissionPacketFile,
    configFile,
    stateDir,
    credentialDir,
    runnerStateDir,
    executorStateDir,
    claimantStateDir,
    ceremonyReleaseCommit,
    issuerReleaseCommit,
    runnerReleaseCommit,
    executorReleaseCommit,
    outputFile,
    execute,
    confirmation,
  };
}

function readJsonRegular(
  file: string,
): {
  raw: Buffer;
  value: Record<string, any>;
} {
  const valueStat = fs.lstatSync(file);
  if (valueStat.isSymbolicLink()) {
    throw new Error("symlink_input_forbidden");
  }
  if (!valueStat.isFile()) throw new Error("regular_file_required");
  if (valueStat.size > MAX_JSON_BYTES) {
    throw new Error("json_input_too_large");
  }

  const raw = fs.readFileSync(file);
  const parsed = JSON.parse(raw.toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("json_object_required");
  }

  return {
    raw,
    value: parsed as Record<string, any>,
  };
}

function sha256Bytes(value: Buffer | string): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function writeJsonAtomic(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(
    temporary,
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.renameSync(temporary, file);
}

function writeJsonExclusive(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  fs.chmodSync(path.dirname(file), 0o700);

  const descriptor = fs.openSync(file, "wx", 0o600);
  try {
    fs.writeFileSync(
      descriptor,
      JSON.stringify(value, null, 2) + "\n",
      { encoding: "utf8" },
    );
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(file, 0o600);
}

function oneApproval(
  directory: string,
): string | null {
  if (!fs.existsSync(directory)) return null;

  const directoryStat = fs.lstatSync(directory);
  if (directoryStat.isSymbolicLink()) {
    throw new Error("approval_directory_symlink_forbidden");
  }
  if (!directoryStat.isDirectory()) {
    throw new Error("approval_directory_required");
  }

  const approvals = fs
    .readdirSync(directory)
    .filter((name) => /^approval-[0-9a-f]{64}[.]json$/.test(name))
    .sort();

  if (approvals.length === 0) return null;
  if (approvals.length !== 1) {
    throw new Error("exact_one_operator_approval_required");
  }
  return path.join(directory, approvals[0]);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const approvalPath = oneApproval(args.approvalDir);

  let approval: Record<string, any> | null = null;
  if (approvalPath) {
    approval = readJsonRegular(approvalPath).value;
  }

  const planEnvelope = readJsonRegular(args.planFile).value;
  const plan =
    (planEnvelope.decision || planEnvelope) as Record<string, any>;
  const admissionRead =
    readJsonRegular(args.admissionPacketFile);
  const configRead = readJsonRegular(args.configFile);
  const worker = configRead.value.worker_policy || {};
  const fulfillment =
    configRead.value.fulfillment_policy || {};

  if (
    configRead.value.enabled !== false
    || worker.enabled !== false
    || fulfillment.automatic_fulfillment_enabled !== false
  ) {
    throw new Error("persistent_config_must_remain_disabled");
  }

  let alertFingerprint = "";
  if (approval) {
    if (!args.alertFile) {
      throw new Error("--alert is required when approval exists");
    }
    const alert = readJsonRegular(args.alertFile).value;
    alertFingerprint = String(
      alert.alert_fingerprint_sha256 || "",
    ).trim().toLowerCase();
  }

  const decision =
    authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalConsumerV1({
      approval,
      now_ms: Date.now(),
      current_admission_packet_sha256:
        sha256Bytes(admissionRead.raw),
      current_plan_fingerprint_sha256:
        plan.plan_fingerprint_sha256,
      current_activation_plan_fingerprint_sha256:
        plan.activation_plan_fingerprint_sha256,
      current_alert_fingerprint_sha256:
        alertFingerprint,
      current_persistent_config_sha256:
        sha256Bytes(configRead.raw),
      ceremony_release_commit:
        args.ceremonyReleaseCommit,
      issuer_release_commit:
        args.issuerReleaseCommit,
      runner_release_commit:
        args.runnerReleaseCommit,
      executor_release_commit:
        args.executorReleaseCommit,
      execute: args.execute,
      confirmation: args.confirmation,
    });

  let consumptionIntentPath: string | null = null;
  let consumptionResultPath: string | null = null;
  let consumptionIntentWritten = false;
  let consumptionResultWritten = false;
  let ceremonyInvocationCount = 0;
  let ceremonyExitCode: number | null = null;
  let approvalConsumed = false;

  if (
    decision.ok
    && decision.status === "authorized"
    && decision.execute_authorized
  ) {
    if (!approvalPath || !args.alertFile) {
      throw new Error("authorized execution inputs are incomplete");
    }

    fs.mkdirSync(args.stateDir, {
      recursive: true,
      mode: 0o700,
    });
    fs.chmodSync(args.stateDir, 0o700);

    consumptionIntentPath = path.join(
      args.stateDir,
      `consume-intent-${decision.approval_fingerprint_sha256}.json`,
    );
    consumptionResultPath = path.join(
      args.stateDir,
      `consume-result-${decision.approval_fingerprint_sha256}.json`,
    );

    writeJsonExclusive(
      consumptionIntentPath,
      {
        schema:
          "void_buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumption_intent_v1",
        marker:
          "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMPTION_INTENT_V1",
        version: 1,
        created_at: new Date().toISOString(),
        request_id: decision.request_id,
        approval_path: approvalPath,
        approval_fingerprint_sha256:
          decision.approval_fingerprint_sha256,
        maximum_ceremony_invocations: 1,
        automatic_retry: false,
      },
    );
    consumptionIntentWritten = true;

    const ceremonyOutput = path.join(
      args.stateDir,
      `ceremony-result-${decision.approval_fingerprint_sha256}.json`,
    );

    const command = [
      path.join(args.ceremonyRoot, "node_modules", ".bin", "tsx"),
      path.join(
        args.ceremonyRoot,
        "scripts",
        "buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.ts",
      ),
      "--issuer-root",
      args.ceremonyRoot,
      "--runner-root",
      args.ceremonyRoot,
      "--plan",
      args.planFile,
      "--alert",
      args.alertFile,
      "--config",
      args.configFile,
      "--ceremony-state-dir",
      args.stateDir,
      "--credential-dir",
      args.credentialDir,
      "--runner-state-dir",
      args.runnerStateDir,
      "--executor-state-dir",
      args.executorStateDir,
      "--claimant-state-dir",
      args.claimantStateDir,
      "--issuer-release-commit",
      args.issuerReleaseCommit,
      "--runner-release-commit",
      args.runnerReleaseCommit,
      "--executor-release-commit",
      args.executorReleaseCommit,
      "--output",
      ceremonyOutput,
      "--activate",
      "--issuer-confirmation",
      decision.required_issuer_confirmation,
      "--execution-confirmation",
      decision.required_execution_confirmation,
    ];

    ceremonyInvocationCount = 1;
    const completed = spawnSync(
      command[0],
      command.slice(1),
      {
        cwd: args.ceremonyRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    ceremonyExitCode =
      typeof completed.status === "number"
        ? completed.status
        : 4;

    writeJsonExclusive(
      consumptionResultPath,
      {
        schema:
          "void_buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumption_result_v1",
        marker:
          "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMPTION_RESULT_V1",
        version: 1,
        completed_at: new Date().toISOString(),
        request_id: decision.request_id,
        approval_fingerprint_sha256:
          decision.approval_fingerprint_sha256,
        ceremony_invocation_count: 1,
        ceremony_exit_code: ceremonyExitCode,
        ceremony_result_sha256:
          fs.existsSync(ceremonyOutput)
            ? sha256Bytes(fs.readFileSync(ceremonyOutput))
            : null,
        automatic_retry: false,
      },
    );
    consumptionResultWritten = true;
    approvalConsumed = ceremonyExitCode === 0;
  }

  const output = {
    schema:
      "void_buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_result_v1",
    marker:
      "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_V1",
    version: 1,
    generated_at: new Date().toISOString(),
    decision,
    approval_path: approvalPath,
    consumption_intent_path: consumptionIntentPath,
    consumption_result_path: consumptionResultPath,
    consumption_intent_written: consumptionIntentWritten,
    consumption_result_written: consumptionResultWritten,
    approval_consumed: approvalConsumed,
    ceremony_invocation_count: ceremonyInvocationCount,
    ceremony_exit_code: ceremonyExitCode,
    maximum_ceremony_invocations: 1,
    issuer_invocation_count: 0,
    runner_invocation_count: 0,
    credential_created_by_consumer: false,
    credential_consumed_by_consumer: false,
    approval_content_printed: false,
    sensitive_values_printed: false,
    automatic_retry: false,
    systemd_change: false,
    service_restart: false,
    persistent_config_write: false,
    direct_rpc_call: false,
    direct_claim_write: false,
    request_journal_write: false,
    inventory_reservation: false,
    inventory_decrement: false,
    direct_wallet_access: false,
    direct_signing: false,
    direct_transaction_broadcast: false,
    direct_money_movement: false,
  };

  if (args.outputFile) {
    writeJsonAtomic(args.outputFile, output);
    console.log(`result=${args.outputFile}`);
  } else {
    process.stdout.write(
      JSON.stringify(output, null, 2) + "\n",
    );
  }

  console.log(`status=${decision.status}`);
  console.log(
    `consumption_intent_written=${consumptionIntentWritten}`,
  );
  console.log(
    `consumption_result_written=${consumptionResultWritten}`,
  );
  console.log(`approval_consumed=${approvalConsumed}`);
  console.log(
    `ceremony_invocation_count=${ceremonyInvocationCount}`,
  );
  console.log("maximum_ceremony_invocations=1");
  console.log("issuer_invocation_count=0");
  console.log("runner_invocation_count=0");
  console.log("credential_created_by_consumer=false");
  console.log("credential_consumed_by_consumer=false");
  console.log("approval_content_printed=false");
  console.log("sensitive_values_printed=false");
  console.log("automatic_retry=false");
  console.log("systemd_change=false");
  console.log("service_restart=false");
  console.log("persistent_config_write=false");
  console.log("direct_rpc_call=false");
  console.log("direct_claim_write=false");
  console.log("request_journal_write=false");
  console.log("inventory_reservation=false");
  console.log("inventory_decrement=false");
  console.log("direct_wallet_access=false");
  console.log("direct_signing=false");
  console.log("direct_transaction_broadcast=false");
  console.log("direct_money_movement=false");

  if (!decision.ok || (
    decision.status === "authorized"
    && ceremonyExitCode !== 0
  )) {
    process.exitCode = 4;
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_V1",
      ok: false,
      status: "held",
      reason: String((error as Error)?.message || error),
      consumption_intent_written: false,
      consumption_result_written: false,
      approval_consumed: false,
      ceremony_invocation_count: 0,
      issuer_invocation_count: 0,
      runner_invocation_count: 0,
      credential_created_by_consumer: false,
      credential_consumed_by_consumer: false,
      approval_content_printed: false,
      sensitive_values_printed: false,
      automatic_retry: false,
      systemd_change: false,
      service_restart: false,
      persistent_config_write: false,
      direct_rpc_call: false,
      direct_claim_write: false,
      request_journal_write: false,
      inventory_reservation: false,
      inventory_decrement: false,
      direct_wallet_access: false,
      direct_signing: false,
      direct_transaction_broadcast: false,
      direct_money_movement: false,
    }),
  );
  process.exitCode = 4;
});
