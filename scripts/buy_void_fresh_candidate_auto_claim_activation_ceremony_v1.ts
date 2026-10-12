import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
  authorizeBuyVoidFreshCandidateAutoClaimActivationCeremonyV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.js";

type Args = {
  issuerRoot: string;
  runnerRoot: string;
  planFile: string;
  alertFile: string | null;
  configFile: string;
  ceremonyStateDir: string;
  credentialDir: string;
  runnerStateDir: string;
  executorStateDir: string;
  claimantStateDir: string;
  issuerReleaseCommit: string;
  runnerReleaseCommit: string;
  executorReleaseCommit: string;
  outputFile: string | null;
  ttlSeconds: number;
  activate: boolean;
  issuerConfirmation: string;
  executionConfirmation: string;
};

const MAX_JSON_BYTES = 4 * 1024 * 1024;

function parseArgs(argv: string[]): Args {
  let issuerRoot = process.cwd();
  let runnerRoot = process.cwd();
  let planFile = "";
  let alertFile: string | null = null;
  let configFile = "";
  let ceremonyStateDir = path.join(
    os.homedir(),
    ".local",
    "state",
    "void-buy-void-fresh-candidate-auto-claim-activation-ceremony-v1",
  );
  let credentialDir = path.join(
    os.homedir(),
    ".local",
    "state",
    "void-buy-void-fresh-candidate-auto-claim-activation-credential-runner-v1",
    "credentials",
  );
  let runnerStateDir = path.join(
    os.homedir(),
    ".local",
    "state",
    "void-buy-void-fresh-candidate-auto-claim-activation-credential-runner-v1",
  );
  let executorStateDir = path.join(
    os.homedir(),
    ".local",
    "state",
    "void-buy-void-fresh-candidate-auto-claim-one-shot-executor-v1",
  );
  let claimantStateDir = path.join(
    os.homedir(),
    ".local",
    "state",
    "void-buy-void-fresh-candidate-auto-claim-v1",
  );
  let issuerReleaseCommit = "";
  let runnerReleaseCommit = "";
  let executorReleaseCommit = "";
  let outputFile: string | null = null;
  let ttlSeconds = 900;
  let activate = false;
  let issuerConfirmation = "";
  let executionConfirmation = "";

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--issuer-root") {
      if (!next) throw new Error("--issuer-root requires a path");
      issuerRoot = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--runner-root") {
      if (!next) throw new Error("--runner-root requires a path");
      runnerRoot = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--plan") {
      if (!next) throw new Error("--plan requires a path");
      planFile = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--alert") {
      if (!next) throw new Error("--alert requires a path");
      alertFile = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--config") {
      if (!next) throw new Error("--config requires a path");
      configFile = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--ceremony-state-dir") {
      if (!next) {
        throw new Error("--ceremony-state-dir requires a path");
      }
      ceremonyStateDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--credential-dir") {
      if (!next) {
        throw new Error("--credential-dir requires a path");
      }
      credentialDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--runner-state-dir") {
      if (!next) {
        throw new Error("--runner-state-dir requires a path");
      }
      runnerStateDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--executor-state-dir") {
      if (!next) {
        throw new Error("--executor-state-dir requires a path");
      }
      executorStateDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--claimant-state-dir") {
      if (!next) {
        throw new Error("--claimant-state-dir requires a path");
      }
      claimantStateDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--issuer-release-commit") {
      if (!next) {
        throw new Error(
          "--issuer-release-commit requires a value",
        );
      }
      issuerReleaseCommit = next.trim().toLowerCase();
      index += 1;
      continue;
    }
    if (value === "--runner-release-commit") {
      if (!next) {
        throw new Error(
          "--runner-release-commit requires a value",
        );
      }
      runnerReleaseCommit = next.trim().toLowerCase();
      index += 1;
      continue;
    }
    if (value === "--executor-release-commit") {
      if (!next) {
        throw new Error(
          "--executor-release-commit requires a value",
        );
      }
      executorReleaseCommit = next.trim().toLowerCase();
      index += 1;
      continue;
    }
    if (value === "--output") {
      if (!next) throw new Error("--output requires a path");
      outputFile = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--ttl-seconds") {
      if (!next) {
        throw new Error("--ttl-seconds requires a value");
      }
      ttlSeconds = Number(next);
      index += 1;
      continue;
    }
    if (value === "--activate") {
      activate = true;
      continue;
    }
    if (value === "--issuer-confirmation") {
      if (!next) {
        throw new Error(
          "--issuer-confirmation requires a value",
        );
      }
      issuerConfirmation = next;
      index += 1;
      continue;
    }
    if (value === "--execution-confirmation") {
      if (!next) {
        throw new Error(
          "--execution-confirmation requires a value",
        );
      }
      executionConfirmation = next;
      index += 1;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log([
        "Usage:",
        "  npx tsx scripts/buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.ts [options]",
        "",
        "Options:",
        "  --issuer-root PATH                 Immutable issuer release root",
        "  --runner-root PATH                 Immutable runner/executor release root",
        "  --plan PATH                        Current activation-plan result",
        "  --alert PATH                       Exact candidate alert",
        "  --config PATH                      Persistent disabled config",
        "  --ceremony-state-dir PATH          Ceremony state and outputs",
        "  --credential-dir PATH              Private credential directory",
        "  --runner-state-dir PATH            Credential consumption state",
        "  --executor-state-dir PATH          One-shot executor state",
        "  --claimant-state-dir PATH          Claimant state",
        "  --issuer-release-commit SHA        Exact issuer release commit",
        "  --runner-release-commit SHA        Exact runner release commit",
        "  --executor-release-commit SHA      Exact executor release commit",
        "  --output PATH                      Optional result JSON",
        "  --ttl-seconds N                    1-900 seconds, default 900",
        "  --activate                         Issue then execute once",
        "  --issuer-confirmation TEXT         Exact issuance confirmation",
        "  --execution-confirmation TEXT      Exact execution confirmation",
        "  --help                             Show this help",
      ].join("\n"));
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  if (!planFile) throw new Error("--plan is required");
  if (!configFile) throw new Error("--config is required");

  for (const [label, commit] of [
    ["issuer", issuerReleaseCommit],
    ["runner", runnerReleaseCommit],
    ["executor", executorReleaseCommit],
  ] as const) {
    if (!/^[0-9a-f]{40}$/.test(commit)) {
      throw new Error(`--${label}-release-commit is required`);
    }
  }

  if (
    !Number.isSafeInteger(ttlSeconds)
    || ttlSeconds <= 0
    || ttlSeconds > 900
  ) {
    throw new Error("--ttl-seconds must be an integer from 1 to 900");
  }

  return {
    issuerRoot,
    runnerRoot,
    planFile,
    alertFile,
    configFile,
    ceremonyStateDir,
    credentialDir,
    runnerStateDir,
    executorStateDir,
    claimantStateDir,
    issuerReleaseCommit,
    runnerReleaseCommit,
    executorReleaseCommit,
    outputFile,
    ttlSeconds,
    activate,
    issuerConfirmation,
    executionConfirmation,
  };
}

function readJsonRegular(
  file: string,
): {
  raw: Buffer;
  value: Record<string, any>;
  mode: number;
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
    mode: valueStat.mode & 0o777,
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

function childDecision(
  file: string,
): Record<string, any> {
  const envelope = readJsonRegular(file).value;
  const decision = envelope.decision;
  if (!decision || typeof decision !== "object") {
    throw new Error("child_decision_required");
  }
  return decision as Record<string, any>;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  fs.mkdirSync(args.ceremonyStateDir, {
    recursive: true,
    mode: 0o700,
  });

  const lockPath = path.join(
    args.ceremonyStateDir,
    "activation-ceremony.lock",
  );
  const lockFd = fs.openSync(lockPath, "wx", 0o600);

  let issuerInvocationCount = 0;
  let runnerInvocationCount = 0;
  let credentialCreated = false;
  let credentialConsumed = false;
  let credentialPath: string | null = null;
  let issuerStatus: string | null = null;
  let runnerStatus: string | null = null;

  try {
    const planEnvelope = readJsonRegular(args.planFile).value;
    const activationPlan =
      (planEnvelope.decision || planEnvelope) as Record<string, any>;

    const waiting =
      String(activationPlan.status || "") === "waiting"
      && activationPlan.planned === false;

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

    let alert: Record<string, any> | null = null;
    if (!waiting) {
      if (!args.alertFile) {
        throw new Error("--alert is required for planned activation");
      }
      alert = readJsonRegular(args.alertFile).value;
    }

    const authorization =
      authorizeBuyVoidFreshCandidateAutoClaimActivationCeremonyV1({
        activation_plan: activationPlan,
        alert,
        persistent_config_sha256:
          sha256Bytes(configRead.raw),
        issuer_release_commit:
          args.issuerReleaseCommit,
        runner_release_commit:
          args.runnerReleaseCommit,
        executor_release_commit:
          args.executorReleaseCommit,
        credential_ttl_seconds:
          args.ttlSeconds,
        activate: args.activate,
        issuer_confirmation:
          args.issuerConfirmation,
        execution_confirmation:
          args.executionConfirmation,
      });

    if (!authorization.ok || authorization.status !== "approved") {
      const output = {
        schema:
          "void_buy_void_fresh_candidate_auto_claim_activation_ceremony_result_v1",
        marker:
          "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_V1",
        version: 1,
        generated_at: new Date().toISOString(),
        decision: authorization,
        issuer_invocation_count: 0,
        runner_invocation_count: 0,
        credential_created: false,
        credential_consumed: false,
        credential_path: null,
        issuer_status: null,
        runner_status: null,
        credential_content_printed: false,
        sensitive_values_printed: false,
        automatic_retry: false,
        systemd_change: false,
        service_restart: false,
        persistent_config_write: false,
        request_journal_write: false,
        inventory_reservation: false,
        inventory_decrement: false,
        wallet_access: false,
        signing: false,
        transaction_broadcast: false,
        money_movement: false,
      };

      if (args.outputFile) {
        writeJsonAtomic(args.outputFile, output);
        console.log(`result=${args.outputFile}`);
      } else {
        process.stdout.write(
          JSON.stringify(output, null, 2) + "\n",
        );
      }

      console.log(`status=${authorization.status}`);
      console.log("issuer_invocation_count=0");
      console.log("runner_invocation_count=0");
      console.log("credential_created=false");
      console.log("credential_consumed=false");
      console.log("credential_content_printed=false");
      console.log("sensitive_values_printed=false");
      console.log("automatic_retry=false");
      console.log("systemd_change=false");
      console.log("service_restart=false");
      console.log("persistent_config_write=false");
      console.log("request_journal_write=false");
      console.log("inventory_reservation=false");
      console.log("inventory_decrement=false");
      console.log("wallet_access=false");
      console.log("signing=false");
      console.log("transaction_broadcast=false");
      console.log("money_movement=false");

      if (!authorization.ok) process.exitCode = 4;
      return;
    }

    if (!args.alertFile) {
      throw new Error("alert_path_required_for_approved_activation");
    }

    const issuerOutput = path.join(
      args.ceremonyStateDir,
      `issuer-result-${process.pid}.json`,
    );
    const runnerOutput = path.join(
      args.ceremonyStateDir,
      `runner-result-${process.pid}.json`,
    );

    issuerInvocationCount += 1;
    if (issuerInvocationCount > 1) {
      throw new Error("maximum_issuer_invocations_exceeded");
    }

    const issuerCompleted = spawnSync(
      path.join(
        args.issuerRoot,
        "node_modules",
        ".bin",
        "tsx",
      ),
      [
        path.join(
          args.issuerRoot,
          "scripts",
          "buy_void_fresh_candidate_auto_claim_activation_credential_issue_v1.ts",
        ),
        "--plan",
        args.planFile,
        "--alert",
        args.alertFile,
        "--config",
        args.configFile,
        "--executor-release-commit",
        args.executorReleaseCommit,
        "--credential-dir",
        args.credentialDir,
        "--output",
        issuerOutput,
        "--ttl-seconds",
        String(args.ttlSeconds),
        "--issue",
        "--confirmation",
        args.issuerConfirmation,
      ],
      {
        cwd: args.issuerRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    if (!fs.existsSync(issuerOutput)) {
      throw new Error(
        `issuer_output_missing:status=${String(issuerCompleted.status)}`,
      );
    }

    const issuerEnvelope = readJsonRegular(issuerOutput).value;
    const issuerDecision = childDecision(issuerOutput);
    issuerStatus = String(issuerDecision.status || "");

    if (
      issuerCompleted.status !== 0
      || issuerDecision.ok !== true
      || issuerStatus !== "issued"
      || issuerDecision.credential_created !== true
      || issuerDecision.credential_file_write !== true
    ) {
      throw new Error(
        `credential_issuer_not_issued:status=${issuerStatus}`,
      );
    }

    credentialPath = String(
      issuerEnvelope.credential_path || "",
    ).trim();
    if (!credentialPath) {
      throw new Error("credential_path_required");
    }

    const credentialResolved = path.resolve(credentialPath);
    const credentialDirResolved = path.resolve(
      args.credentialDir,
    );
    const relativeCredential = path.relative(
      credentialDirResolved,
      credentialResolved,
    );

    if (
      !relativeCredential
      || relativeCredential.startsWith("..")
      || path.isAbsolute(relativeCredential)
    ) {
      throw new Error(
        "credential_path_must_be_inside_credential_directory",
      );
    }

    const credentialRead = readJsonRegular(
      credentialResolved,
    );
    if (credentialRead.mode !== 0o600) {
      throw new Error("credential_file_mode_0600_required");
    }
    if (
      (fs.statSync(credentialDirResolved).mode & 0o777)
      !== 0o700
    ) {
      throw new Error(
        "credential_directory_mode_0700_required",
      );
    }

    credentialCreated = true;

    runnerInvocationCount += 1;
    if (runnerInvocationCount > 1) {
      throw new Error("maximum_runner_invocations_exceeded");
    }

    const runnerCompleted = spawnSync(
      path.join(
        args.runnerRoot,
        "node_modules",
        ".bin",
        "tsx",
      ),
      [
        path.join(
          args.runnerRoot,
          "scripts",
          "buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.ts",
        ),
        "--repo-root",
        args.runnerRoot,
        "--plan",
        args.planFile,
        "--alert",
        args.alertFile,
        "--credential",
        credentialResolved,
        "--config",
        args.configFile,
        "--state-dir",
        args.runnerStateDir,
        "--executor-state-dir",
        args.executorStateDir,
        "--claimant-state-dir",
        args.claimantStateDir,
        "--executor-release-commit",
        args.executorReleaseCommit,
        "--output",
        runnerOutput,
        "--execute",
      ],
      {
        cwd: args.runnerRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    if (!fs.existsSync(runnerOutput)) {
      throw new Error(
        `runner_output_missing:status=${String(runnerCompleted.status)}`,
      );
    }

    const runnerDecision = childDecision(runnerOutput);
    runnerStatus = String(runnerDecision.status || "");
    credentialConsumed =
      runnerDecision.credential_consumed === true;

    if (
      runnerCompleted.status !== 0
      || runnerDecision.ok !== true
      || !["claimed", "duplicate"].includes(runnerStatus)
      || runnerDecision.executor_invocation_count !== 1
      || credentialConsumed !== true
      || runnerDecision.consumption_intent_written !== true
      || runnerDecision.consumption_finalized !== true
    ) {
      throw new Error(
        `credential_runner_not_terminal:status=${runnerStatus}`,
      );
    }

    const output = {
      schema:
        "void_buy_void_fresh_candidate_auto_claim_activation_ceremony_result_v1",
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_V1",
      version: 1,
      generated_at: new Date().toISOString(),
      decision: {
        ok: true,
        status: runnerStatus,
        activated: true,
        mutation_performed:
          runnerDecision.mutation_performed === true,
        request_id:
          String(runnerDecision.request_id || ""),
        issuer_status: issuerStatus,
        runner_status: runnerStatus,
        issuer_invocation_count:
          issuerInvocationCount,
        runner_invocation_count:
          runnerInvocationCount,
        credential_created: credentialCreated,
        credential_consumed: credentialConsumed,
        automatic_retry: false,
      },
      issuer_release_commit:
        args.issuerReleaseCommit,
      runner_release_commit:
        args.runnerReleaseCommit,
      executor_release_commit:
        args.executorReleaseCommit,
      credential_path: credentialResolved,
      credential_file_sha256:
        sha256Bytes(fs.readFileSync(credentialResolved)),
      credential_content_printed: false,
      sensitive_values_printed: false,
      automatic_retry: false,
      systemd_change: false,
      service_restart: false,
      persistent_config_write: false,
      request_journal_write: false,
      inventory_reservation: false,
      inventory_decrement: false,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      money_movement: false,
    };

    if (args.outputFile) {
      writeJsonAtomic(args.outputFile, output);
      console.log(`result=${args.outputFile}`);
    } else {
      process.stdout.write(
        JSON.stringify(output, null, 2) + "\n",
      );
    }

    console.log(`status=${runnerStatus}`);
    console.log(
      `issuer_invocation_count=${issuerInvocationCount}`,
    );
    console.log(
      `runner_invocation_count=${runnerInvocationCount}`,
    );
    console.log(
      `credential_created=${credentialCreated}`,
    );
    console.log(
      `credential_consumed=${credentialConsumed}`,
    );
    console.log("credential_content_printed=false");
    console.log("sensitive_values_printed=false");
    console.log("automatic_retry=false");
    console.log("systemd_change=false");
    console.log("service_restart=false");
    console.log("persistent_config_write=false");
    console.log("request_journal_write=false");
    console.log("inventory_reservation=false");
    console.log("inventory_decrement=false");
    console.log("wallet_access=false");
    console.log("signing=false");
    console.log("transaction_broadcast=false");
    console.log("money_movement=false");
  } finally {
    fs.closeSync(lockFd);
    fs.unlinkSync(lockPath);
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_V1",
      ok: false,
      status: "held",
      reason: String((error as Error)?.message || error),
      credential_content_printed: false,
      sensitive_values_printed: false,
      automatic_retry: false,
      systemd_change: false,
      service_restart: false,
      persistent_config_write: false,
      request_journal_write: false,
      inventory_reservation: false,
      inventory_decrement: false,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      money_movement: false,
    }),
  );
  process.exitCode = 4;
});
