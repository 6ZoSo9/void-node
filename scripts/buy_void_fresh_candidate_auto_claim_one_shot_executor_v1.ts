import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  runBuyVoidFreshCandidateAutoClaimOneShotExecutorV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_one_shot_executor_v1.js";

type Args = {
  repoRoot: string;
  planFile: string;
  alertFile: string | null;
  configFile: string;
  stateDir: string;
  claimantStateDir: string;
  outputFile: string | null;
  apply: boolean;
  confirmation: string;
};

const MAX_JSON_BYTES = 4 * 1024 * 1024;

function parseArgs(argv: string[]): Args {
  let repoRoot = process.cwd();
  let planFile = "";
  let alertFile: string | null = null;
  let configFile = "";
  let stateDir = path.join(
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
  let outputFile: string | null = null;
  let apply = false;
  let confirmation = "";

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
    if (value === "--claimant-state-dir") {
      if (!next) {
        throw new Error("--claimant-state-dir requires a path");
      }
      claimantStateDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--output") {
      if (!next) throw new Error("--output requires a path");
      outputFile = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--apply") {
      apply = true;
      continue;
    }
    if (value === "--confirmation") {
      if (!next) throw new Error("--confirmation requires a value");
      confirmation = next;
      index += 1;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log([
        "Usage:",
        "  npx tsx scripts/buy_void_fresh_candidate_auto_claim_one_shot_executor_v1.ts [options]",
        "",
        "Options:",
        "  --repo-root PATH          Canonical repository root",
        "  --plan PATH               Activation planner result JSON",
        "  --alert PATH              Exact candidate-watch alert JSON",
        "  --config PATH             Persistent disabled config JSON",
        "  --state-dir PATH          Executor lock and ephemeral state",
        "  --claimant-state-dir PATH Claimant receipts and lock",
        "  --output PATH             Optional machine result JSON",
        "  --apply                   Permit one claimant invocation",
        "  --confirmation TEXT       Exact one-shot confirmation",
        "  --help                    Show this help",
      ].join("\n"));
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  if (!planFile) throw new Error("--plan is required");
  if (!configFile) throw new Error("--config is required");

  return {
    repoRoot,
    planFile,
    alertFile,
    configFile,
    stateDir,
    claimantStateDir,
    outputFile,
    apply,
    confirmation,
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

function writeJsonExclusive(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  fs.writeFileSync(
    file,
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600, flag: "wx" },
  );
}

function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  fs.mkdirSync(args.stateDir, {
    recursive: true,
    mode: 0o700,
  });

  const lockPath = path.join(args.stateDir, "one-shot.lock");
  const lockFd = fs.openSync(lockPath, "wx", 0o600);

  const planEnvelope = readJsonRegular(args.planFile).value;
  const activationPlan =
    (planEnvelope.decision || planEnvelope) as Record<string, any>;

  const configRead = readJsonRegular(args.configFile);
  const originalConfigSha = sha256Bytes(configRead.raw);
  const originalConfigMode = configRead.mode;

  const waiting = String(activationPlan.status || "") === "waiting";
  let alert: Record<string, any> | null = null;

  if (!waiting) {
    if (!args.alertFile) {
      throw new Error("--alert is required for a planned activation");
    }
    alert = readJsonRegular(args.alertFile).value;
  }

  const ephemeralDirectory = path.join(
    args.stateDir,
    "ephemeral-configs",
  );
  const claimantOutput = path.join(
    args.stateDir,
    `claimant-result-${process.pid}.json`,
  );

  let claimantInvocationCount = 0;

  return runBuyVoidFreshCandidateAutoClaimOneShotExecutorV1({
    activation_plan: activationPlan,
    disabled_config: configRead.value,
    alert,
    apply: args.apply,
    confirmation: args.confirmation,
    create_ephemeral_enabled_config: ({
      request_id,
      activation_plan_fingerprint_sha256,
      disabled_config,
    }) => {
      const enabled = JSON.parse(
        JSON.stringify(disabled_config),
      ) as Record<string, any>;

      enabled.enabled = true;
      enabled.worker_policy = {
        ...(enabled.worker_policy || {}),
        enabled: true,
      };
      enabled.fulfillment_policy = {
        ...(enabled.fulfillment_policy || {}),
        automatic_fulfillment_enabled: true,
      };
      enabled.ephemeral_one_shot_authority = {
        request_id,
        activation_plan_fingerprint_sha256,
        maximum_claimant_invocations: 1,
        original_config_write: false,
        automatic_retry: false,
        wallet_access: false,
        signing: false,
        transaction_broadcast: false,
        money_movement: false,
      };

      const ephemeralPath = path.join(
        ephemeralDirectory,
        `${activation_plan_fingerprint_sha256}.json`,
      );

      writeJsonExclusive(ephemeralPath, enabled);

      return {
        path: ephemeralPath,
        sha256: sha256Bytes(fs.readFileSync(ephemeralPath)),
      };
    },
    run_claimant: ({
      claimant_confirmation,
      ephemeral_config,
    }) => {
      claimantInvocationCount += 1;
      if (claimantInvocationCount > 1) {
        throw new Error("maximum_claimant_invocations_exceeded");
      }

      const ephemeralPath = String(ephemeral_config.path || "");
      if (!ephemeralPath) {
        throw new Error("ephemeral_config_path_required");
      }
      if (!args.alertFile) {
        throw new Error("alert_path_required");
      }

      const completed = spawnSync(
        path.join(args.repoRoot, "node_modules", ".bin", "tsx"),
        [
          path.join(
            args.repoRoot,
            "scripts",
            "buy_void_fresh_candidate_auto_claim_v1.ts",
          ),
          "--repo-root",
          args.repoRoot,
          "--alert",
          args.alertFile,
          "--config",
          ephemeralPath,
          "--state-dir",
          args.claimantStateDir,
          "--output",
          claimantOutput,
          "--apply",
          "--confirmation",
          claimant_confirmation,
        ],
        {
          cwd: args.repoRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      if (fs.existsSync(claimantOutput)) {
        return readJsonRegular(claimantOutput).value;
      }

      let parsed: Record<string, unknown> | null = null;
      for (const raw of [
        completed.stdout.trim(),
        completed.stderr.trim(),
      ]) {
        if (!raw) continue;
        try {
          const value = JSON.parse(raw);
          if (
            value
            && typeof value === "object"
            && !Array.isArray(value)
          ) {
            parsed = value as Record<string, unknown>;
            break;
          }
        } catch {
          // The claimant's machine output file is preferred.
        }
      }

      if (parsed) return parsed;

      throw new Error(
        `claimant_output_missing:status=${String(completed.status)}`,
      );
    },
    delete_ephemeral_config: (ephemeral) => {
      const ephemeralPath = String(ephemeral.path || "");
      if (!ephemeralPath) return false;

      fs.unlinkSync(ephemeralPath);

      try {
        fs.rmdirSync(ephemeralDirectory);
      } catch {
        // Directory may contain a separately locked run.
      }

      return !fs.existsSync(ephemeralPath);
    },
    verify_original_config_unchanged: () => {
      const current = readJsonRegular(args.configFile);
      return (
        sha256Bytes(current.raw) === originalConfigSha
        && current.mode === originalConfigMode
      );
    },
  })
    .then((decision) => {
      const output = {
        schema:
          "void_buy_void_fresh_candidate_auto_claim_one_shot_executor_result_v1",
        marker:
          "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_V1",
        version: 1,
        generated_at: new Date().toISOString(),
        decision,
        original_config_sha256_before: originalConfigSha,
        original_config_sha256_after:
          sha256Bytes(fs.readFileSync(args.configFile)),
        original_config_write: false,
        ephemeral_config_write:
          decision.ephemeral_config_write,
        ephemeral_config_deleted:
          decision.ephemeral_config_deleted,
        claimant_invocation_count:
          decision.claimant_invocation_count,
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
        `claimant_invocation_count=${decision.claimant_invocation_count}`,
      );
      console.log("original_config_write=false");
      console.log(
        `ephemeral_config_write=${decision.ephemeral_config_write}`,
      );
      console.log(
        `ephemeral_config_deleted=${decision.ephemeral_config_deleted}`,
      );
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
    })
    .finally(() => {
      fs.rmSync(claimantOutput, { force: true });
      fs.closeSync(lockFd);
      fs.rmSync(lockPath, { force: true });
    });
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_V1",
      ok: false,
      status: "held",
      reason: String((error as Error)?.message || error),
      original_config_write: false,
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
