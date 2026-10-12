import {
  VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1,
  runBuyVoidProductionPreflightOperatorV1,
} from "../src/economic/buy_void_production_preflight_operator_v1.js";

type ParsedArgs = {
  attemptId: string;
  inspect: boolean;
  confirmation: string;
  expectedProductionActivationPlanId: string;
  expectedPreflightPlanId: string;
};

function help(): string {
  return [
    "Usage:",
    "  npx tsx scripts/buy_void_production_preflight_operator_v1.ts --attempt-id SHA256 [options]",
    "",
    "Default mode plans only and performs no journal or RPC I/O.",
    "",
    "Options:",
    "  --attempt-id VALUE                                  Exact lowercase 64-hex execution attempt ID",
    "  --inspect                                           Perform the separately confirmed read-only inspection",
    "  --confirm VALUE                                     Exact preflight confirmation",
    "  --expected-production-activation-plan-id-sha256 VALUE  Exact production activation plan ID",
    "  --expected-preflight-plan-id-sha256 VALUE           Exact deterministic preflight plan ID",
    "  --help                                              Show this help",
    "",
    "No wallet, RPC URL, runtime root, fee policy, signer fingerprint,",
    "credential path, or private-service path can be supplied on the CLI.",
  ].join("\n");
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined) throw new Error(`${flag} requires a value`);
  return value;
}

function parseArgs(argv: string[]): ParsedArgs {
  let attemptId = "";
  let inspect = false;
  let confirmation = "";
  let expectedProductionActivationPlanId = "";
  let expectedPreflightPlanId = "";

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--attempt-id") {
      if (attemptId) throw new Error("--attempt-id may be supplied only once");
      attemptId = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--inspect") {
      if (inspect) throw new Error("--inspect may be supplied only once");
      inspect = true;
      continue;
    }
    if (value === "--confirm") {
      confirmation = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--expected-production-activation-plan-id-sha256") {
      expectedProductionActivationPlanId = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--expected-preflight-plan-id-sha256") {
      expectedPreflightPlanId = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log(help());
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  if (!attemptId) throw new Error("--attempt-id is required");

  return {
    attemptId,
    inspect,
    confirmation,
    expectedProductionActivationPlanId,
    expectedPreflightPlanId,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const decision = await runBuyVoidProductionPreflightOperatorV1({
    attempt_id: args.attemptId,
    inspect: args.inspect,
    confirmation: args.confirmation,
    expected_production_activation_plan_id_sha256:
      args.expectedProductionActivationPlanId,
    expected_preflight_plan_id_sha256:
      args.expectedPreflightPlanId,
  });

  console.log(JSON.stringify(decision, null, 2));
  if (!decision.ok) process.exitCode = 2;
}

main().catch((error) => {
  const errorClass = String((error as any)?.name || "Error");
  console.error(JSON.stringify({
    marker: VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1,
    ok: false,
    status: "held",
    reason: "production_preflight_operator_cli_failed",
    error_class: /^[A-Za-z0-9._:-]{1,80}$/.test(errorClass)
      ? errorClass
      : "Error",
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  }, null, 2));
  process.exitCode = 1;
});
