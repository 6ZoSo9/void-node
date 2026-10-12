import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  issueBuyVoidFreshCandidateAutoClaimActivationCredentialV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.js";

type Args = {
  planFile: string;
  alertFile: string | null;
  configFile: string;
  executorReleaseCommit: string;
  credentialDir: string;
  outputFile: string | null;
  ttlSeconds: number;
  issue: boolean;
  confirmation: string;
};

const MAX_JSON_BYTES = 4 * 1024 * 1024;

function parseArgs(argv: string[]): Args {
  let planFile = "";
  let alertFile: string | null = null;
  let configFile = "";
  let executorReleaseCommit = "";
  let credentialDir = path.join(
    os.homedir(),
    ".local",
    "state",
    "void-buy-void-fresh-candidate-auto-claim-activation-credential-runner-v1",
    "credentials",
  );
  let outputFile: string | null = null;
  let ttlSeconds = 900;
  let issue = false;
  let confirmation = "";

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

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
    if (value === "--credential-dir") {
      if (!next) {
        throw new Error("--credential-dir requires a path");
      }
      credentialDir = path.resolve(next);
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
    if (value === "--issue") {
      issue = true;
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
        "  npx tsx scripts/buy_void_fresh_candidate_auto_claim_activation_credential_issue_v1.ts [options]",
        "",
        "Options:",
        "  --plan PATH                   Current activation-plan result",
        "  --alert PATH                  Exact candidate alert",
        "  --config PATH                 Persistent disabled config",
        "  --executor-release-commit SHA Exact executor release",
        "  --credential-dir PATH         Private credential directory",
        "  --output PATH                 Optional result JSON",
        "  --ttl-seconds N               1-900 seconds, default 900",
        "  --issue                       Create one private credential",
        "  --confirmation TEXT           Exact issuance confirmation",
        "  --help                        Show this help",
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
  if (
    !Number.isSafeInteger(ttlSeconds)
    || ttlSeconds <= 0
    || ttlSeconds > 900
  ) {
    throw new Error("--ttl-seconds must be an integer from 1 to 900");
  }

  return {
    planFile,
    alertFile,
    configFile,
    executorReleaseCommit,
    credentialDir,
    outputFile,
    ttlSeconds,
    issue,
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

function writeCredentialExclusive(
  directory: string,
  activationPlanFingerprint: string,
  credential: Record<string, unknown>,
): string {
  fs.mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });

  const directoryMode =
    fs.statSync(directory).mode & 0o777;
  if (directoryMode !== 0o700) {
    throw new Error("credential_directory_mode_0700_required");
  }

  const file = path.join(
    directory,
    `credential-${activationPlanFingerprint}.json`,
  );

  fs.writeFileSync(
    file,
    JSON.stringify(credential, null, 2) + "\n",
    {
      mode: 0o600,
      flag: "wx",
    },
  );

  const fileMode = fs.statSync(file).mode & 0o777;
  if (fileMode !== 0o600) {
    throw new Error("credential_file_mode_0600_required");
  }

  return file;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

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

  const nonceSha = args.issue
    ? sha256Bytes(crypto.randomBytes(32))
    : null;

  const decision =
    issueBuyVoidFreshCandidateAutoClaimActivationCredentialV1({
      activation_plan: activationPlan,
      alert,
      persistent_config_sha256:
        sha256Bytes(configRead.raw),
      executor_release_commit:
        args.executorReleaseCommit,
      ttl_ms: args.ttlSeconds * 1000,
      issue: args.issue,
      confirmation: args.confirmation,
      credential_nonce_sha256: nonceSha,
    });

  let credentialPath: string | null = null;
  let credentialFileSha256: string | null = null;

  if (decision.ok && decision.status === "issued") {
    credentialPath = writeCredentialExclusive(
      args.credentialDir,
      decision.activation_plan_fingerprint_sha256,
      decision.credential as Record<string, unknown>,
    );
    credentialFileSha256 =
      sha256Bytes(fs.readFileSync(credentialPath));
  }

  const output = {
    schema:
      "void_buy_void_fresh_candidate_auto_claim_activation_credential_issuer_result_v1",
    marker:
      "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_V1",
    version: 1,
    generated_at: new Date().toISOString(),
    decision: decision.ok && decision.status === "issued"
      ? {
          ...decision,
          credential: undefined,
        }
      : decision,
    credential_path: credentialPath,
    credential_file_sha256: credentialFileSha256,
    credential_content_printed: false,
    sensitive_values_printed: false,
    automatic_retry: false,
    systemd_change: false,
    service_restart: false,
    rpc_call: false,
    persistent_config_write: false,
    claim_write: false,
    request_write: false,
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
    `credential_created=${decision.credential_created}`,
  );
  console.log(
    `credential_file_write=${decision.credential_file_write}`,
  );
  console.log("credential_content_printed=false");
  console.log("sensitive_values_printed=false");
  console.log("automatic_retry=false");
  console.log("systemd_change=false");
  console.log("service_restart=false");
  console.log("rpc_call=false");
  console.log("persistent_config_write=false");
  console.log("claim_write=false");
  console.log("request_write=false");
  console.log("inventory_reservation=false");
  console.log("inventory_decrement=false");
  console.log("wallet_access=false");
  console.log("signing=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");

  if (!decision.ok) process.exitCode = 4;
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_V1",
      ok: false,
      status: "held",
      reason: String((error as Error)?.message || error),
      credential_created: false,
      credential_file_write: false,
      credential_content_printed: false,
      sensitive_values_printed: false,
      automatic_retry: false,
      systemd_change: false,
      service_restart: false,
      rpc_call: false,
      persistent_config_write: false,
      claim_write: false,
      request_write: false,
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
