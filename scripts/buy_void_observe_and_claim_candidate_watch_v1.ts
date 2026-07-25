import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  defaultBuyVoidObserveAndClaimCandidateWatchStateV1,
  evaluateBuyVoidObserveAndClaimCandidateWatchV1,
  type BuyVoidObserveAndClaimCandidateWatchStateV1,
  type BuyVoidObserveAndClaimReadinessReportV1,
} from "../src/economic/buy_void_observe_and_claim_candidate_watch_v1.js";

type Args = {
  repoRoot: string;
  stateDir: string;
  output: string | null;
};

function parseArgs(argv: string[]): Args {
  let repoRoot = process.cwd();
  let stateDir = path.join(
    os.homedir(),
    ".local",
    "state",
    "void-buy-void-observe-and-claim-candidate-watch-v1",
  );
  let output: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--repo-root") {
      const next = argv[index + 1];
      if (!next) throw new Error("--repo-root requires a path");
      repoRoot = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--state-dir") {
      const next = argv[index + 1];
      if (!next) throw new Error("--state-dir requires a path");
      stateDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--output") {
      const next = argv[index + 1];
      if (!next) throw new Error("--output requires a path");
      output = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log(
        [
          "Usage:",
          "  npx tsx scripts/buy_void_observe_and_claim_candidate_watch_v1.ts [options]",
          "",
          "Options:",
          "  --repo-root PATH   Canonical repository containing runtime request state",
          "  --state-dir PATH   Operator-local watch state and alert directory",
          "  --output PATH      Write the one-shot watch result JSON",
          "  --help             Show this help",
        ].join("\n"),
      );
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  return { repoRoot, stateDir, output };
}

function sha256Bytes(value: Buffer): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function readJson<T>(file: string): T {
  return JSON.parse(
    fs.readFileSync(file, "utf8"),
  ) as T;
}

function writeJsonAtomic(
  file: string,
  value: unknown,
): void {
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

function writeJsonExclusive(
  file: string,
  value: unknown,
): boolean {
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
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return false;
    throw error;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sourceRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const tsxBin = path.join(
    args.repoRoot,
    "node_modules",
    ".bin",
    "tsx",
  );
  const readinessScript = path.join(
    args.repoRoot,
    "scripts",
    "buy_void_observe_and_claim_candidate_readiness_v1.ts",
  );

  if (!fs.existsSync(tsxBin)) {
    throw new Error(`tsx binary missing: ${tsxBin}`);
  }
  if (!fs.existsSync(readinessScript)) {
    throw new Error(
      `candidate readiness CLI missing: ${readinessScript}`,
    );
  }

  fs.mkdirSync(args.stateDir, {
    recursive: true,
    mode: 0o700,
  });

  const runDir = fs.mkdtempSync(
    path.join(args.stateDir, ".run-"),
  );
  const readinessPath = path.join(
    runDir,
    "candidate-readiness.json",
  );
  const statePath = path.join(
    args.stateDir,
    "current-state.json",
  );

  try {
    const readiness = spawnSync(
      tsxBin,
      [
        readinessScript,
        "--repo-root",
        args.repoRoot,
        "--output",
        readinessPath,
      ],
      {
        cwd: args.repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    if (readiness.status !== 0) {
      throw new Error(
        [
          "candidate readiness CLI failed",
          `status=${String(readiness.status)}`,
          readiness.stdout.trim(),
          readiness.stderr.trim(),
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    const readinessBytes = fs.readFileSync(readinessPath);
    const readinessReport =
      JSON.parse(
        readinessBytes.toString("utf8"),
      ) as BuyVoidObserveAndClaimReadinessReportV1;
    const readinessSha = sha256Bytes(readinessBytes);

    let previousState:
      BuyVoidObserveAndClaimCandidateWatchStateV1 =
        defaultBuyVoidObserveAndClaimCandidateWatchStateV1();

    if (fs.existsSync(statePath)) {
      previousState = readJson<
        BuyVoidObserveAndClaimCandidateWatchStateV1
      >(statePath);
    }

    const observedAt = new Date().toISOString();
    const decision =
      evaluateBuyVoidObserveAndClaimCandidateWatchV1({
        readiness_report: readinessReport,
        readiness_report_sha256: readinessSha,
        previous_state: previousState,
        observed_at: observedAt,
      });

    let alertPath: string | null = null;
    let alertCreated = false;

    if (decision.status === "alert" && decision.alert) {
      alertPath = path.join(
        args.stateDir,
        "alerts",
        `${decision.alert.alert_fingerprint_sha256}.json`,
      );
      alertCreated = writeJsonExclusive(
        alertPath,
        {
          ...decision.alert,
          observed_at: observedAt,
          readiness_report: readinessReport,
        },
      );
    } else if (
      decision.status === "duplicate"
      && decision.alert
    ) {
      alertPath = path.join(
        args.stateDir,
        "alerts",
        `${decision.alert.alert_fingerprint_sha256}.json`,
      );
    }

    if (decision.status !== "held") {
      writeJsonAtomic(
        statePath,
        decision.next_state,
      );
    }

    const output = {
      schema:
        "void_buy_void_observe_and_claim_candidate_watch_result_v1",
      marker:
        "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_V1",
      version: 1,
      source_root: sourceRoot,
      repository_root: args.repoRoot,
      state_directory: args.stateDir,
      readiness_report_sha256: readinessSha,
      readiness_status:
        readinessReport.readiness_status,
      eligible_candidate_count:
        readinessReport.eligible_candidate_count,
      recommended_request_id:
        readinessReport.recommended_request_id,
      watch_status: decision.status,
      watch_reason: decision.reason,
      alert_required: decision.alert_required,
      alert_created: alertCreated,
      alert_path: alertPath,
      alert: decision.alert,
      state_path: statePath,
      activation_performed: false,
      network_state_write: false,
      operator_local_state_write:
        decision.status !== "held",
      runtime_import_mounted: false,
      apply_requested: false,
      inventory_reservation: false,
      execution_attempt_reservation: false,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      rpc_mutation: false,
      money_movement: false,
      background_loop: false,
      startup_execution: false,
    };

    if (args.output) {
      writeJsonAtomic(args.output, output);
      console.log(`result=${args.output}`);
    } else {
      process.stdout.write(
        JSON.stringify(output, null, 2) + "\n",
      );
    }

    console.log(`watch_status=${decision.status}`);
    console.log(`alert_required=${decision.alert_required}`);
    console.log(`alert_created=${alertCreated}`);
    console.log(
      "recommended_request_id="
        + (readinessReport.recommended_request_id || "none"),
    );
    console.log("activation_performed=false");
    console.log("network_state_write=false");
    console.log("money_movement=false");

    if (decision.status === "held") {
      process.exitCode = 4;
    }
  } finally {
    fs.rmSync(runDir, {
      recursive: true,
      force: true,
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
