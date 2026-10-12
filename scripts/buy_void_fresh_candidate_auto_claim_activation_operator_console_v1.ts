import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorConsoleV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_console_v1.js";

type Args = {
  releaseRoot: string;
  planFile: string;
  alertFile: string | null;
  configFile: string;
  admissionOutput: string;
  approvalDir: string;
  approvalResult: string;
  consumerStateDir: string;
  credentialDir: string;
  runnerStateDir: string;
  executorStateDir: string;
  claimantStateDir: string;
  consumerResult: string;
  ceremonyReleaseCommit: string;
  issuerReleaseCommit: string;
  runnerReleaseCommit: string;
  executorReleaseCommit: string;
  outputFile: string | null;
  activate: boolean;
  operatorApprovalConfirmation: string;
  consumerConfirmation: string;
};

const MAX_JSON_BYTES = 4 * 1024 * 1024;

function parseArgs(argv: string[]): Args {
  let releaseRoot = "";
  let planFile = "";
  let alertFile: string | null = null;
  let configFile = "";
  let admissionOutput = "";
  let approvalDir = "";
  let approvalResult = "";
  let consumerStateDir = "";
  let credentialDir = "";
  let runnerStateDir = "";
  let executorStateDir = "";
  let claimantStateDir = "";
  let consumerResult = "";
  let ceremonyReleaseCommit = "";
  let issuerReleaseCommit = "";
  let runnerReleaseCommit = "";
  let executorReleaseCommit = "";
  let outputFile: string | null = null;
  let activate = false;
  let operatorApprovalConfirmation = "";
  let consumerConfirmation = "";

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

    if (value === "--release-root") {
      releaseRoot = takePath();
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
    if (value === "--config") {
      configFile = takePath();
      continue;
    }
    if (value === "--admission-output") {
      admissionOutput = takePath();
      continue;
    }
    if (value === "--approval-dir") {
      approvalDir = takePath();
      continue;
    }
    if (value === "--approval-result") {
      approvalResult = takePath();
      continue;
    }
    if (value === "--consumer-state-dir") {
      consumerStateDir = takePath();
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
    if (value === "--consumer-result") {
      consumerResult = takePath();
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
    if (value === "--activate") {
      activate = true;
      continue;
    }
    if (value === "--operator-approval-confirmation") {
      operatorApprovalConfirmation = takeValue();
      continue;
    }
    if (value === "--consumer-confirmation") {
      consumerConfirmation = takeValue();
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log([
        "Usage:",
        "  npx tsx scripts/buy_void_fresh_candidate_auto_claim_activation_operator_console_v1.ts [options]",
        "",
        "Options:",
        "  --release-root PATH                    Exact immutable release",
        "  --plan PATH                            Exact activation plan",
        "  --alert PATH                           Exact candidate alert",
        "  --config PATH                          Persistent disabled config",
        "  --admission-output PATH                Admission result",
        "  --approval-dir PATH                    Private approval directory",
        "  --approval-result PATH                 Approval result",
        "  --consumer-state-dir PATH              Consumer state",
        "  --credential-dir PATH                  Credential directory",
        "  --runner-state-dir PATH                Runner state",
        "  --executor-state-dir PATH              Executor state",
        "  --claimant-state-dir PATH              Claimant state",
        "  --consumer-result PATH                 Consumer result",
        "  --ceremony-release-commit SHA          Exact ceremony commit",
        "  --issuer-release-commit SHA            Exact issuer commit",
        "  --runner-release-commit SHA            Exact runner commit",
        "  --executor-release-commit SHA          Exact executor commit",
        "  --output PATH                          Console result JSON",
        "  --activate                             Execute bounded activation",
        "  --operator-approval-confirmation TEXT  Exact approval confirmation",
        "  --consumer-confirmation TEXT           Exact consumer confirmation",
        "  --help                                 Show this help",
      ].join("\n"));
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  for (const [label, value] of [
    ["release-root", releaseRoot],
    ["plan", planFile],
    ["config", configFile],
    ["admission-output", admissionOutput],
    ["approval-dir", approvalDir],
    ["approval-result", approvalResult],
    ["consumer-state-dir", consumerStateDir],
    ["credential-dir", credentialDir],
    ["runner-state-dir", runnerStateDir],
    ["executor-state-dir", executorStateDir],
    ["claimant-state-dir", claimantStateDir],
    ["consumer-result", consumerResult],
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
    releaseRoot,
    planFile,
    alertFile,
    configFile,
    admissionOutput,
    approvalDir,
    approvalResult,
    consumerStateDir,
    credentialDir,
    runnerStateDir,
    executorStateDir,
    claimantStateDir,
    consumerResult,
    ceremonyReleaseCommit,
    issuerReleaseCommit,
    runnerReleaseCommit,
    executorReleaseCommit,
    outputFile,
    activate,
    operatorApprovalConfirmation,
    consumerConfirmation,
  };
}

function readJsonRegular(file: string): Record<string, any> {
  const valueStat = fs.lstatSync(file);
  if (valueStat.isSymbolicLink()) {
    throw new Error("symlink_input_forbidden");
  }
  if (!valueStat.isFile()) throw new Error("regular_file_required");
  if (valueStat.size > MAX_JSON_BYTES) {
    throw new Error("json_input_too_large");
  }

  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("json_object_required");
  }
  return parsed as Record<string, any>;
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

function runChild(
  executable: string,
  childArgs: string[],
  cwd: string,
): number {
  const completed = spawnSync(
    executable,
    childArgs,
    {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return typeof completed.status === "number"
    ? completed.status
    : 4;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const plan = readJsonRegular(args.planFile);

  const decision =
    authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorConsoleV1({
      plan,
      alert_present:
        Boolean(args.alertFile && fs.existsSync(args.alertFile)),
      activate: args.activate,
      operator_approval_confirmation:
        args.operatorApprovalConfirmation,
      consumer_confirmation:
        args.consumerConfirmation,
    });

  let admissionPacketInvocationCount = 0;
  let approvalEnvelopeInvocationCount = 0;
  let approvalConsumerInvocationCount = 0;
  let admissionPacketExitCode: number | null = null;
  let approvalEnvelopeExitCode: number | null = null;
  let approvalConsumerExitCode: number | null = null;
  let admissionPacketStatus: string | null = null;
  let approvalEnvelopeStatus: string | null = null;
  let approvalConsumerStatus: string | null = null;
  let approvalCreated = false;
  let approvalConsumed = false;
  let ceremonyInvocationCount = 0;

  if (
    decision.ok
    && decision.status === "authorized"
    && decision.activation_authorized
  ) {
    if (!args.alertFile) {
      throw new Error("authorized activation alert is missing");
    }

    const tsx = path.join(
      args.releaseRoot,
      "node_modules",
      ".bin",
      "tsx",
    );

    admissionPacketInvocationCount = 1;
    admissionPacketExitCode = runChild(
      tsx,
      [
        path.join(
          args.releaseRoot,
          "scripts",
          "buy_void_fresh_candidate_auto_claim_activation_admission_packet_v1.ts",
        ),
        "--plan",
        args.planFile,
        "--alert",
        args.alertFile,
        "--config",
        args.configFile,
        "--ceremony-release-commit",
        args.ceremonyReleaseCommit,
        "--issuer-release-commit",
        args.issuerReleaseCommit,
        "--runner-release-commit",
        args.runnerReleaseCommit,
        "--executor-release-commit",
        args.executorReleaseCommit,
        "--output",
        args.admissionOutput,
      ],
      args.releaseRoot,
    );

    if (admissionPacketExitCode === 0) {
      const admission = readJsonRegular(args.admissionOutput);
      admissionPacketStatus = String(
        admission?.decision?.status || "",
      );

      if (admissionPacketStatus !== "admitted") {
        admissionPacketExitCode = 4;
      }
    }

    if (admissionPacketExitCode === 0) {
      approvalEnvelopeInvocationCount = 1;
      approvalEnvelopeExitCode = runChild(
        tsx,
        [
          path.join(
            args.releaseRoot,
            "scripts",
            "buy_void_fresh_candidate_auto_claim_activation_operator_approval_envelope_v1.ts",
          ),
          "--packet",
          args.admissionOutput,
          "--approval-dir",
          args.approvalDir,
          "--output",
          args.approvalResult,
          "--approve",
          "--confirmation",
          args.operatorApprovalConfirmation,
        ],
        args.releaseRoot,
      );

      if (approvalEnvelopeExitCode === 0) {
        const approval = readJsonRegular(args.approvalResult);
        approvalEnvelopeStatus = String(
          approval?.decision?.status || "",
        );
        approvalCreated =
          approval.approval_created === true;

        if (
          approvalEnvelopeStatus !== "approved"
          || !approvalCreated
        ) {
          approvalEnvelopeExitCode = 4;
        }
      }
    }

    if (
      admissionPacketExitCode === 0
      && approvalEnvelopeExitCode === 0
    ) {
      approvalConsumerInvocationCount = 1;
      approvalConsumerExitCode = runChild(
        tsx,
        [
          path.join(
            args.releaseRoot,
            "scripts",
            "buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_v1.ts",
          ),
          "--approval-dir",
          args.approvalDir,
          "--ceremony-root",
          args.releaseRoot,
          "--plan",
          args.planFile,
          "--alert",
          args.alertFile,
          "--admission-packet",
          args.admissionOutput,
          "--config",
          args.configFile,
          "--state-dir",
          args.consumerStateDir,
          "--credential-dir",
          args.credentialDir,
          "--runner-state-dir",
          args.runnerStateDir,
          "--executor-state-dir",
          args.executorStateDir,
          "--claimant-state-dir",
          args.claimantStateDir,
          "--ceremony-release-commit",
          args.ceremonyReleaseCommit,
          "--issuer-release-commit",
          args.issuerReleaseCommit,
          "--runner-release-commit",
          args.runnerReleaseCommit,
          "--executor-release-commit",
          args.executorReleaseCommit,
          "--output",
          args.consumerResult,
          "--execute",
          "--confirmation",
          args.consumerConfirmation,
        ],
        args.releaseRoot,
      );

      if (
        fs.existsSync(args.consumerResult)
      ) {
        const consumer = readJsonRegular(args.consumerResult);
        approvalConsumerStatus = String(
          consumer?.decision?.status || "",
        );
        approvalConsumed =
          consumer.approval_consumed === true;
        ceremonyInvocationCount = Number(
          consumer.ceremony_invocation_count || 0,
        );
      }
    }
  }

  const activationSucceeded =
    decision.ok
    && decision.status === "authorized"
    && admissionPacketExitCode === 0
    && approvalEnvelopeExitCode === 0
    && approvalConsumerExitCode === 0
    && approvalConsumed
    && ceremonyInvocationCount === 1;

  const output = {
    schema:
      "void_buy_void_fresh_candidate_auto_claim_activation_operator_console_result_v1",
    marker:
      "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_CONSOLE_V1",
    version: 1,
    generated_at: new Date().toISOString(),
    decision,
    activation_succeeded: activationSucceeded,
    admission_packet_invocation_count:
      admissionPacketInvocationCount,
    approval_envelope_invocation_count:
      approvalEnvelopeInvocationCount,
    approval_consumer_invocation_count:
      approvalConsumerInvocationCount,
    admission_packet_exit_code:
      admissionPacketExitCode,
    approval_envelope_exit_code:
      approvalEnvelopeExitCode,
    approval_consumer_exit_code:
      approvalConsumerExitCode,
    admission_packet_status:
      admissionPacketStatus,
    approval_envelope_status:
      approvalEnvelopeStatus,
    approval_consumer_status:
      approvalConsumerStatus,
    approval_created: approvalCreated,
    approval_consumed: approvalConsumed,
    ceremony_invocation_count:
      ceremonyInvocationCount,
    maximum_admission_packet_invocations: 1,
    maximum_approval_envelope_invocations: 1,
    maximum_approval_consumer_invocations: 1,
    approval_content_printed: false,
    credential_content_printed: false,
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
  console.log(`activation_succeeded=${activationSucceeded}`);
  console.log(
    `admission_packet_invocation_count=${admissionPacketInvocationCount}`,
  );
  console.log(
    `approval_envelope_invocation_count=${approvalEnvelopeInvocationCount}`,
  );
  console.log(
    `approval_consumer_invocation_count=${approvalConsumerInvocationCount}`,
  );
  console.log(`approval_created=${approvalCreated}`);
  console.log(`approval_consumed=${approvalConsumed}`);
  console.log(
    `ceremony_invocation_count=${ceremonyInvocationCount}`,
  );
  console.log("maximum_admission_packet_invocations=1");
  console.log("maximum_approval_envelope_invocations=1");
  console.log("maximum_approval_consumer_invocations=1");
  console.log("approval_content_printed=false");
  console.log("credential_content_printed=false");
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

  if (
    !decision.ok
    || (
      decision.status === "authorized"
      && !activationSucceeded
    )
  ) {
    process.exitCode = 4;
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_CONSOLE_V1",
      ok: false,
      status: "held",
      reason: String((error as Error)?.message || error),
      activation_succeeded: false,
      admission_packet_invocation_count: 0,
      approval_envelope_invocation_count: 0,
      approval_consumer_invocation_count: 0,
      approval_created: false,
      approval_consumed: false,
      ceremony_invocation_count: 0,
      approval_content_printed: false,
      credential_content_printed: false,
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
