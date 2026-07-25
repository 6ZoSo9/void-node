import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
  runBuyVoidAutoClaimWorkerV1,
} from "../src/economic/buy_void_auto_claim_worker_v1.js";
import {
  runBuyVoidFreshCandidateAutoClaimV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_v1.js";

type Args = {
  repoRoot: string;
  alertFile: string;
  configFile: string;
  stateDir: string;
  outputFile: string | null;
  apply: boolean;
  confirmation: string;
};

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;
const MAX_JSON_BYTES = 4 * 1024 * 1024;

function parseArgs(argv: string[]): Args {
  let repoRoot = process.cwd();
  let alertFile = "";
  let configFile = "";
  let stateDir = path.join(
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
        "  npx tsx scripts/buy_void_fresh_candidate_auto_claim_v1.ts [options]",
        "",
        "Options:",
        "  --repo-root PATH     Canonical repository root",
        "  --alert PATH         Exact candidate-watch alert JSON",
        "  --config PATH        Server-controlled policy JSON",
        "  --state-dir PATH     Operator-local receipts and lock",
        "  --output PATH        Optional machine-readable result",
        "  --apply              Permit one claim-journal mutation",
        "  --confirmation TEXT  Exact outer confirmation",
        "  --help                Show this help",
      ].join("\n"));
      process.exit(0);
    }

    throw new Error(`unknown argument: ${value}`);
  }

  if (!alertFile) throw new Error("--alert is required");
  if (!configFile) throw new Error("--config is required");

  return {
    repoRoot,
    alertFile,
    configFile,
    stateDir,
    outputFile,
    apply,
    confirmation,
  };
}

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function readJsonRegular(file: string): Record<string, any> {
  const resolved = path.resolve(file);
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink()) throw new Error("symlink_input_forbidden");
  if (!stat.isFile()) throw new Error("regular_file_required");
  if (stat.size > MAX_JSON_BYTES) throw new Error("json_input_too_large");
  const value = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("json_object_required");
  }
  return value as Record<string, any>;
}

function writeJsonAtomic(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(
    temporary,
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.renameSync(temporary, file);
}

function writeJsonExclusive(file: string, value: unknown): boolean {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(value, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

function forbiddenConfigPath(
  value: unknown,
  prefix = "",
): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = forbiddenConfigPath(value[index], `${prefix}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const pathName = prefix ? `${prefix}.${key}` : key;
    const lowered = key.toLowerCase();
    if (
      lowered.includes("private_key")
      || lowered.includes("mnemonic")
      || lowered === "seed"
      || lowered.includes("wallet_credential")
      || lowered.includes("signed_transaction")
    ) {
      return pathName;
    }
    const nested = forbiddenConfigPath(child, pathName);
    if (nested) return nested;
  }
  return null;
}

function currentReadiness(
  repoRoot: string,
  stateDir: string,
): Record<string, any> {
  const runDir = fs.mkdtempSync(
    path.join(stateDir, "readiness-run-"),
  );
  const output = path.join(runDir, "current-readiness.json");
  const tsx = path.join(repoRoot, "node_modules", ".bin", "tsx");
  const script = path.join(
    repoRoot,
    "scripts",
    "buy_void_observe_and_claim_candidate_readiness_v1.ts",
  );

  try {
    const completed = spawnSync(
      tsx,
      [
        script,
        "--repo-root",
        repoRoot,
        "--output",
        output,
        "--require-exact-one",
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    if (completed.status !== 0) {
      throw new Error(
        completed.status === 3
          ? "no_current_eligible_candidate"
          : completed.status === 4
            ? "multiple_current_eligible_candidates"
            : "current_readiness_cli_failed",
      );
    }

    return readJsonRegular(output);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
}

function configAuthority(value: Record<string, any>): void {
  if (
    normalized(value.schema)
      !== "void_buy_void_fresh_candidate_auto_claim_config_v1"
    || normalized(value.marker)
      !== "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIG_V1"
    || Number(value.version) !== 1
  ) {
    throw new Error("valid_auto_claim_config_required");
  }
  if (value.enabled !== true) {
    throw new Error("fresh_candidate_auto_claim_disabled");
  }
  const forbidden = forbiddenConfigPath(value);
  if (forbidden) {
    throw new Error(`forbidden_execution_material:${forbidden}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.stateDir, { recursive: true, mode: 0o700 });

  const lockPath = path.join(args.stateDir, "run.lock");
  let lockFd: number | null = null;

  try {
    lockFd = fs.openSync(lockPath, "wx", 0o600);

    const alertEnvelope = readJsonRegular(args.alertFile);
    const alert = alertEnvelope.alert || alertEnvelope;
    const alertFingerprint = normalized(
      alert.alert_fingerprint_sha256,
    ).toLowerCase();

    if (!SAFE_SHA256.test(alertFingerprint)) {
      throw new Error("valid_alert_fingerprint_required");
    }
    if (
      path.basename(args.alertFile)
        !== `${alertFingerprint}.json`
    ) {
      throw new Error("alert_filename_fingerprint_binding_required");
    }

    const receiptPath = path.join(
      args.stateDir,
      "receipts",
      `${alertFingerprint}.json`,
    );
    if (fs.existsSync(receiptPath)) {
      const prior = readJsonRegular(receiptPath);
      const output = {
        ...prior,
        duplicate_receipt: true,
        mutation_performed: false,
      };
      if (args.outputFile) writeJsonAtomic(args.outputFile, output);
      process.stdout.write(JSON.stringify(output, null, 2) + "\n");
      return;
    }

    const config = readJsonRegular(args.configFile);
    configAuthority(config);

    const rawRootDir = normalized(config.root_dir);
    const rawRequestDir = normalized(config.request_dir);
    if (!rawRootDir || !rawRequestDir) {
      throw new Error("server_controlled_directories_required");
    }
    const rootDir = path.resolve(rawRootDir);
    const requestDir = path.resolve(rawRequestDir);

    const readiness = currentReadiness(args.repoRoot, args.stateDir);
    const requestId = normalized(alert.request_id);

    if (!SAFE_REQUEST_ID.test(requestId)) {
      throw new Error("valid_alert_request_id_required");
    }

    const requestFile = path.join(requestDir, `${requestId}.json`);
    const request = readJsonRegular(requestFile);
    if (normalized(request.request_id) !== requestId) {
      throw new Error("request_file_identity_mismatch");
    }

    const decision = await runBuyVoidFreshCandidateAutoClaimV1({
      alert,
      current_readiness: readiness,
      apply: args.apply,
      confirmation: args.confirmation,
      run_worker: async ({ worker_confirmation }) => {
        if (
          worker_confirmation
            !== VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1
        ) {
          throw new Error("internal_worker_confirmation_mismatch");
        }

        return await runBuyVoidAutoClaimWorkerV1({
          request,
          root_dir: rootDir,
          worker_policy: config.worker_policy,
          observer_policy: config.observer_policy,
          verification_policy: config.verification_policy,
          fulfillment_policy: config.fulfillment_policy,
          apply: true,
          confirmation: worker_confirmation,
        });
      },
    });

    const output = {
      schema: "void_buy_void_fresh_candidate_auto_claim_result_v1",
      marker: "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_V1",
      version: 1,
      generated_at: new Date().toISOString(),
      alert_fingerprint_sha256: alertFingerprint,
      request_id: requestId,
      decision,
      request_journal_write: false,
      inventory_reservation: false,
      inventory_decrement: false,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      money_movement: false,
    };

    if (!decision.ok) {
      if (args.outputFile) writeJsonAtomic(args.outputFile, output);
      process.stdout.write(JSON.stringify(output, null, 2) + "\n");
      process.exitCode = 4;
      return;
    }

    if (decision.status === "dry_run") {
      if (args.outputFile) writeJsonAtomic(args.outputFile, output);
      process.stdout.write(JSON.stringify(output, null, 2) + "\n");
      return;
    }

    const receipt = {
      ...output,
      receipt_id_sha256: decision.receipt_id_sha256,
    };
    const created = writeJsonExclusive(receiptPath, receipt);
    if (!created) {
      throw new Error("receipt_race_detected");
    }

    if (args.outputFile) writeJsonAtomic(args.outputFile, receipt);
    process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
  } finally {
    if (lockFd !== null) fs.closeSync(lockFd);
    fs.rmSync(lockPath, { force: true });
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      marker: "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_V1",
      ok: false,
      status: "held",
      reason: normalized((error as Error)?.message || error),
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
