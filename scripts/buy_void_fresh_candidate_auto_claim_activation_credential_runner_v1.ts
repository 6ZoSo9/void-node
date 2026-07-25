import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  runBuyVoidFreshCandidateAutoClaimActivationCredentialRunnerV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.js";

type Args = {
  repoRoot: string;
  planFile: string;
  alertFile: string | null;
  credentialFile: string | null;
  configFile: string;
  stateDir: string;
  executorStateDir: string;
  claimantStateDir: string;
  executorReleaseCommit: string;
  outputFile: string | null;
  execute: boolean;
};

const MAX_JSON_BYTES = 4 * 1024 * 1024;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;

function parseArgs(argv: string[]): Args {
  let repoRoot = process.cwd();
  let planFile = "";
  let alertFile: string | null = null;
  let credentialFile: string | null = null;
  let configFile = "";
  let stateDir = path.join(
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
  let executorReleaseCommit = "";
  let outputFile: string | null = null;
  let execute = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--repo-root") {
      if (!next) throw new Error("--repo-root requires a path");
      repoRoot = path.resolve(next);
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
    if (value === "--credential") {
      if (!next) throw new Error("--credential requires a path");
      credentialFile = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--config") {
      if (!next) throw new Error("--config requires a path");
      configFile = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--state-dir") {
      if (!next) throw new Error("--state-dir requires a path");
      stateDir = path.resolve(next);
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
    if (value === "--execute") {
      execute = true;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log([
        "Usage:",
        "  npx tsx scripts/buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.ts [options]",
        "",
        "Options:",
        "  --repo-root PATH                 Immutable executor release root",
        "  --plan PATH                      Current activation-plan result",
        "  --alert PATH                     Exact candidate alert",
        "  --credential PATH                Expiring one-use credential",
        "  --config PATH                    Persistent disabled config",
        "  --state-dir PATH                 Credential consumption state",
        "  --executor-state-dir PATH        One-shot executor state",
        "  --claimant-state-dir PATH        Claimant state",
        "  --executor-release-commit SHA    Exact executor release commit",
        "  --output PATH                    Optional result JSON",
        "  --execute                        Consume credential and invoke once",
        "  --help                           Show this help",
      ].join("\n"));
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  if (!planFile) throw new Error("--plan is required");
  if (!configFile) throw new Error("--config is required");
  if (!/^[0-9a-f]{40}$/.test(executorReleaseCommit)) {
    throw new Error("--executor-release-commit is required");
  }

  return {
    repoRoot,
    planFile,
    alertFile,
    credentialFile,
    configFile,
    stateDir,
    executorStateDir,
    claimantStateDir,
    executorReleaseCommit,
    outputFile,
    execute,
  };
}

function readJsonRegular(
  file: string,
): {
  raw: Buffer;
  value: Record<string, any>;
  mode: number;
} {
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) throw new Error("symlink_input_forbidden");
  if (!stat.isFile()) throw new Error("regular_file_required");
  if (stat.size > MAX_JSON_BYTES) throw new Error("json_input_too_large");

  const raw = fs.readFileSync(file);
  const parsed = JSON.parse(raw.toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("json_object_required");
  }

  return {
    raw,
    value: parsed as Record<string, any>,
    mode: stat.mode & 0o777,
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

function writeJsonExclusive(file: string, value: unknown): boolean {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(value, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  fs.mkdirSync(args.stateDir, {
    recursive: true,
    mode: 0o700,
  });

  const lockPath = path.join(args.stateDir, "credential-runner.lock");
  const lockFd = fs.openSync(lockPath, "wx", 0o600);

  try {
    const planEnvelope = readJsonRegular(args.planFile).value;
    const activationPlan =
      (planEnvelope.decision || planEnvelope) as Record<string, any>;

    const waiting =
      String(activationPlan.status || "") === "waiting"
      && activationPlan.planned === false;

    const configRead = readJsonRegular(args.configFile);
    const persistentConfigSha = sha256Bytes(configRead.raw);

    let alert: Record<string, any> | null = null;
    let credential: Record<string, any> | null = null;

    if (!waiting) {
      if (!args.alertFile) {
        throw new Error("--alert is required for planned activation");
      }
      if (!args.credentialFile) {
        throw new Error(
          "--credential is required for planned activation",
        );
      }
      alert = readJsonRegular(args.alertFile).value;
      credential = readJsonRegular(args.credentialFile).value;
    }

    let executorInvocationCount = 0;
    const executorOutput = path.join(
      args.stateDir,
      `executor-result-${process.pid}.json`,
    );

    const decision =
      await runBuyVoidFreshCandidateAutoClaimActivationCredentialRunnerV1({
        activation_plan: activationPlan,
        alert,
        credential,
        persistent_config_sha256: persistentConfigSha,
        executor_release_commit: args.executorReleaseCommit,
        execute: args.execute,
        write_consumption_intent: ({
          credential_fingerprint_sha256,
          request_id,
          activation_plan_fingerprint_sha256,
        }) => {
          if (!SAFE_SHA256.test(credential_fingerprint_sha256)) {
            throw new Error("valid_credential_fingerprint_required");
          }

          const file = path.join(
            args.stateDir,
            "consumptions",
            `${credential_fingerprint_sha256}.json`,
          );

          return writeJsonExclusive(file, {
            schema:
              "void_buy_void_fresh_candidate_auto_claim_activation_credential_consumption_v1",
            marker:
              "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_RUNNER_V1",
            version: 1,
            status: "inflight",
            credential_fingerprint_sha256,
            request_id,
            activation_plan_fingerprint_sha256,
            executor_release_commit:
              args.executorReleaseCommit,
            created_at: new Date().toISOString(),
            automatic_retry: false,
            wallet_access: false,
            signing: false,
            transaction_broadcast: false,
            money_movement: false,
          });
        },
        run_executor: ({
          executor_confirmation,
        }) => {
          executorInvocationCount += 1;
          if (executorInvocationCount > 1) {
            throw new Error("maximum_executor_invocations_exceeded");
          }
          if (!args.alertFile) {
            throw new Error("alert_path_required");
          }

          const completed = spawnSync(
            path.join(
              args.repoRoot,
              "node_modules",
              ".bin",
              "tsx",
            ),
            [
              path.join(
                args.repoRoot,
                "scripts",
                "buy_void_fresh_candidate_auto_claim_one_shot_executor_v1.ts",
              ),
              "--repo-root",
              args.repoRoot,
              "--plan",
              args.planFile,
              "--alert",
              args.alertFile,
              "--config",
              args.configFile,
              "--state-dir",
              args.executorStateDir,
              "--claimant-state-dir",
              args.claimantStateDir,
              "--output",
              executorOutput,
              "--apply",
              "--confirmation",
              executor_confirmation,
            ],
            {
              cwd: args.repoRoot,
              encoding: "utf8",
              stdio: ["ignore", "pipe", "pipe"],
            },
          );

          if (fs.existsSync(executorOutput)) {
            const envelope =
              readJsonRegular(executorOutput).value;
            return (envelope.decision || envelope) as
              Record<string, unknown>;
          }

          throw new Error(
            `executor_output_missing:status=${String(completed.status)}`,
          );
        },
        finalize_consumption: ({
          credential_fingerprint_sha256,
          request_id,
          outcome,
          executor_result,
        }) => {
          const file = path.join(
            args.stateDir,
            "consumptions",
            `${credential_fingerprint_sha256}.json`,
          );

          if (!fs.existsSync(file)) return false;

          const existing = readJsonRegular(file).value;
          if (
            existing.status !== "inflight"
            || existing.request_id !== request_id
          ) {
            return false;
          }

          writeJsonAtomic(file, {
            ...existing,
            status: "final",
            finalized_at: new Date().toISOString(),
            outcome,
            executor_status:
              String(executor_result.status || ""),
            executor_ok: executor_result.ok === true,
            executor_mutation_performed:
              executor_result.mutation_performed === true,
          });

          return true;
        },
      });

    const output = {
      schema:
        "void_buy_void_fresh_candidate_auto_claim_activation_credential_runner_result_v1",
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_RUNNER_V1",
      version: 1,
      generated_at: new Date().toISOString(),
      decision,
      executor_release_commit: args.executorReleaseCommit,
      persistent_config_sha256: persistentConfigSha,
      persistent_config_write: false,
      executor_invocation_count:
        decision.executor_invocation_count,
      automatic_retry: false,
      systemd_change: false,
      service_restart: false,
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

    console.log(`status=${decision.status}`);
    console.log(
      `executor_invocation_count=${decision.executor_invocation_count}`,
    );
    console.log(
      `credential_consumed=${decision.credential_consumed}`,
    );
    console.log(
      `consumption_intent_written=${decision.consumption_intent_written}`,
    );
    console.log("persistent_config_write=false");
    console.log("automatic_retry=false");
    console.log("systemd_change=false");
    console.log("service_restart=false");
    console.log("request_journal_write=false");
    console.log("inventory_reservation=false");
    console.log("inventory_decrement=false");
    console.log("wallet_access=false");
    console.log("signing=false");
    console.log("transaction_broadcast=false");
    console.log("money_movement=false");

    if (!decision.ok) process.exitCode = 4;
  } finally {
    fs.rmSync(
      path.join(
        args.stateDir,
        `executor-result-${process.pid}.json`,
      ),
      { force: true },
    );
    fs.closeSync(lockFd);
    fs.rmSync(lockPath, { force: true });
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_RUNNER_V1",
      ok: false,
      status: "held",
      reason: String((error as Error)?.message || error),
      executor_invocation_count: 0,
      credential_consumed: false,
      consumption_intent_written: false,
      persistent_config_write: false,
      automatic_retry: false,
      systemd_change: false,
      service_restart: false,
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
