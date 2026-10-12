import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  buildBuyVoidFreshCandidateAutoClaimActivationAdmissionPacketV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_admission_packet_v1.js";

type Args = {
  planFile: string;
  alertFile: string | null;
  configFile: string;
  ceremonyReleaseCommit: string;
  issuerReleaseCommit: string;
  runnerReleaseCommit: string;
  executorReleaseCommit: string;
  outputFile: string | null;
};

const MAX_JSON_BYTES = 4 * 1024 * 1024;

function parseArgs(argv: string[]): Args {
  let planFile = "";
  let alertFile: string | null = null;
  let configFile = "";
  let ceremonyReleaseCommit = "";
  let issuerReleaseCommit = "";
  let runnerReleaseCommit = "";
  let executorReleaseCommit = "";
  let outputFile: string | null = null;

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
    if (value === "--ceremony-release-commit") {
      if (!next) {
        throw new Error(
          "--ceremony-release-commit requires a value",
        );
      }
      ceremonyReleaseCommit = next.trim().toLowerCase();
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
    if (value === "--help" || value === "-h") {
      console.log([
        "Usage:",
        "  npx tsx scripts/buy_void_fresh_candidate_auto_claim_activation_admission_packet_v1.ts [options]",
        "",
        "Options:",
        "  --plan PATH                        Current activation-plan result",
        "  --alert PATH                       Exact candidate alert when planned",
        "  --config PATH                      Persistent disabled config",
        "  --ceremony-release-commit SHA      Exact ceremony release commit",
        "  --issuer-release-commit SHA        Exact issuer release commit",
        "  --runner-release-commit SHA        Exact runner release commit",
        "  --executor-release-commit SHA      Exact executor release commit",
        "  --output PATH                      Optional result JSON",
        "  --help                             Show this help",
      ].join("\n"));
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  if (!planFile) throw new Error("--plan is required");
  if (!configFile) throw new Error("--config is required");

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
    planFile,
    alertFile,
    configFile,
    ceremonyReleaseCommit,
    issuerReleaseCommit,
    runnerReleaseCommit,
    executorReleaseCommit,
    outputFile,
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

  const configDisabled =
    configRead.value.enabled === false
    && worker.enabled === false
    && fulfillment.automatic_fulfillment_enabled === false;

  let alert: Record<string, any> | null = null;
  if (!waiting) {
    if (!args.alertFile) {
      throw new Error("--alert is required for planned activation");
    }
    alert = readJsonRegular(args.alertFile).value;
  }

  const decision =
    buildBuyVoidFreshCandidateAutoClaimActivationAdmissionPacketV1({
      activation_plan: activationPlan,
      alert,
      persistent_config_sha256:
        sha256Bytes(configRead.raw),
      persistent_config_disabled:
        configDisabled,
      ceremony_release_commit:
        args.ceremonyReleaseCommit,
      issuer_release_commit:
        args.issuerReleaseCommit,
      runner_release_commit:
        args.runnerReleaseCommit,
      executor_release_commit:
        args.executorReleaseCommit,
    });

  const output = {
    schema:
      "void_buy_void_fresh_candidate_auto_claim_activation_admission_packet_result_v1",
    marker:
      "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_ADMISSION_PACKET_V1",
    version: 1,
    generated_at: new Date().toISOString(),
    decision,
    operator_approval_required:
      decision.ok && decision.status === "admitted",
    automatic_execution: false,
    process_spawn: false,
    issuer_invocation_count: 0,
    runner_invocation_count: 0,
    credential_created: false,
    credential_consumed: false,
    credential_content_printed: false,
    sensitive_values_printed: false,
    automatic_retry: false,
    systemd_change: false,
    service_restart: false,
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
    `operator_approval_required=${output.operator_approval_required}`,
  );
  console.log("automatic_execution=false");
  console.log("process_spawn=false");
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
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_ADMISSION_PACKET_V1",
      ok: false,
      status: "held",
      reason: String((error as Error)?.message || error),
      operator_approval_required: false,
      automatic_execution: false,
      process_spawn: false,
      issuer_invocation_count: 0,
      runner_invocation_count: 0,
      credential_created: false,
      credential_consumed: false,
      credential_content_printed: false,
      sensitive_values_printed: false,
      automatic_retry: false,
      systemd_change: false,
      service_restart: false,
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
