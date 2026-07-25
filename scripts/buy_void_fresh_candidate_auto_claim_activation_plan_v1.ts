import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  planBuyVoidFreshCandidateAutoClaimActivationV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_planner_v1.js";

type Args = {
  config: string;
  readiness: string;
  watch: string;
  health: string;
  output: string | null;
};

const MAX_JSON_BYTES = 4 * 1024 * 1024;
const SENSITIVE_KEY = /(private.?key|mnemonic|seed|secret|password|token|credential|rpc_url|address)/i;

function parseArgs(argv: string[]): Args {
  let config = "";
  let readiness = "";
  let watch = "";
  let health = "";
  let output: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--config") {
      if (!next) throw new Error("--config requires a path");
      config = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--readiness") {
      if (!next) throw new Error("--readiness requires a path");
      readiness = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--watch") {
      if (!next) throw new Error("--watch requires a path");
      watch = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--health") {
      if (!next) throw new Error("--health requires a path");
      health = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--output") {
      if (!next) throw new Error("--output requires a path");
      output = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log([
        "Usage:",
        "  npx tsx scripts/buy_void_fresh_candidate_auto_claim_activation_plan_v1.ts [options]",
        "",
        "Options:",
        "  --config PATH      Disabled production config JSON",
        "  --readiness PATH   Current exact-one readiness JSON",
        "  --watch PATH       Candidate-watch result JSON",
        "  --health PATH      Disabled deployment health JSON",
        "  --output PATH      Optional plan output JSON",
        "  --help             Show this help",
      ].join("\n"));
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  if (!config || !readiness || !watch || !health) {
    throw new Error(
      "--config, --readiness, --watch, and --health are required",
    );
  }

  return { config, readiness, watch, health, output };
}

function readJson(file: string): Record<string, unknown> {
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) throw new Error("symlink_input_forbidden");
  if (!stat.isFile()) throw new Error("regular_file_required");
  if (stat.size > MAX_JSON_BYTES) throw new Error("json_input_too_large");

  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("json_object_required");
  }
  return value as Record<string, unknown>;
}

function fingerprint(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function sanitize(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEY.test(key)) {
    return {
      redacted: true,
      sha256: fingerprint(value),
    };
  }
  if (Array.isArray(value)) {
    return value.map((child) => sanitize(child, key));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([childKey, child]) => [
          childKey,
          sanitize(child, childKey),
        ]),
    );
  }
  return value;
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

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const config = readJson(args.config);
  const readiness = readJson(args.readiness);
  const watch = readJson(args.watch);
  const health = readJson(args.health);

  const decision =
    planBuyVoidFreshCandidateAutoClaimActivationV1({
      config,
      readiness,
      watch,
      health,
    });

  const output = {
    schema:
      "void_buy_void_fresh_candidate_auto_claim_activation_plan_result_v1",
    marker:
      "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_V1",
    version: 1,
    generated_at: new Date().toISOString(),
    input_fingerprints: {
      config_sha256: fingerprint(config),
      readiness_sha256: fingerprint(readiness),
      watch_sha256: fingerprint(watch),
      health_sha256: fingerprint(health),
    },
    decision,
    mutation_performed: false,
    config_write: false,
    unit_file_write: false,
    service_change: false,
    apply_requested: false,
    confirmation_supplied: false,
    rpc_call: false,
    runtime_root_write: false,
    claim_write: false,
    request_write: false,
    inventory_decrement: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
    sensitive_values_printed: false,
  };

  if (args.output) {
    writeJsonAtomic(args.output, output);
    console.log(`result=${args.output}`);
  } else {
    process.stdout.write(
      JSON.stringify(sanitize(output), null, 2) + "\n",
    );
  }

  console.log(`status=${decision.status}`);
  console.log(`planned=${decision.planned}`);
  console.log("mutation_performed=false");
  console.log("config_write=false");
  console.log("unit_file_write=false");
  console.log("service_change=false");
  console.log("apply_requested=false");
  console.log("rpc_call=false");
  console.log("claim_write=false");
  console.log("wallet_access=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");
  console.log("sensitive_values_printed=false");

  if (!decision.ok) process.exitCode = 4;
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify({
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_V1",
      ok: false,
      status: "held",
      reason: String((error as Error)?.message || error),
      mutation_performed: false,
      config_write: false,
      unit_file_write: false,
      service_change: false,
      apply_requested: false,
      rpc_call: false,
      claim_write: false,
      wallet_access: false,
      transaction_broadcast: false,
      money_movement: false,
    }),
  );
  process.exitCode = 4;
}
