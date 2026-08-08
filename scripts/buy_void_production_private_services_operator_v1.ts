import {
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1,
  runBuyVoidProductionPrivateServicesOperatorV1,
  type BuyVoidProductionPrivateServicesOperatorShutdownTriggerV1,
} from "../src/economic/buy_void_production_private_services_operator_v1.js";

type ParsedArgs = {
  apply: boolean;
  confirmation: string;
  expectedPlanId: string;
  rpcReadinessConfirmation: string;
  custodianActivationConfirmation: string;
  broadcasterActivationConfirmation: string;
};

function help(): string {
  return [
    "Usage:",
    "  npx tsx scripts/buy_void_production_private_services_operator_v1.ts [options]",
    "",
    "Default mode is a dry run. It performs no RPC probe and starts no service.",
    "",
    "Options:",
    "  --apply                                      Start the reviewed private services in this foreground process",
    "  --confirm VALUE                              Exact production private-services coordinator confirmation",
    "  --expected-plan-id-sha256 VALUE              Exact production activation plan ID from dry run",
    "  --rpc-readiness-confirm VALUE                Exact independent RPC-readiness confirmation",
    "  --custodian-confirm VALUE                    Exact independent custodian activation confirmation",
    "  --broadcaster-confirm VALUE                  Exact independent broadcaster activation confirmation",
    "  --help                                       Show this help",
    "",
    "No wallet, RPC URL, runtime root, fee policy, signer fingerprint, credential path,",
    "or private-service path can be supplied on the CLI.",
    "",
    "On successful --apply, the process remains in the foreground and owns both",
    "private Unix-socket services until SIGINT or SIGTERM. Shutdown stops the",
    "broadcaster first and then the custodian.",
  ].join("\n");
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined) throw new Error(`${flag} requires a value`);
  return value;
}

function parseArgs(argv: string[]): ParsedArgs {
  let apply = false;
  let confirmation = "";
  let expectedPlanId = "";
  let rpcReadinessConfirmation = "";
  let custodianActivationConfirmation = "";
  let broadcasterActivationConfirmation = "";
  const seen = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") {
      console.log(help());
      process.exit(0);
    }
    if (seen.has(value)) throw new Error(`${value} may be supplied only once`);
    if (value === "--apply") {
      seen.add(value);
      apply = true;
      continue;
    }
    if (value === "--confirm") {
      seen.add(value);
      confirmation = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--expected-plan-id-sha256") {
      seen.add(value);
      expectedPlanId = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--rpc-readiness-confirm") {
      seen.add(value);
      rpcReadinessConfirmation = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--custodian-confirm") {
      seen.add(value);
      custodianActivationConfirmation = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--broadcaster-confirm") {
      seen.add(value);
      broadcasterActivationConfirmation = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${value}`);
  }

  return {
    apply,
    confirmation,
    expectedPlanId,
    rpcReadinessConfirmation,
    custodianActivationConfirmation,
    broadcasterActivationConfirmation,
  };
}

function waitForShutdownSignal(): Promise<BuyVoidProductionPrivateServicesOperatorShutdownTriggerV1> {
  return new Promise((resolve) => {
    const finish = (signal: "SIGINT" | "SIGTERM") => {
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
      resolve(signal);
    };
    const onSigint = () => finish("SIGINT");
    const onSigterm = () => finish("SIGTERM");
    process.once("SIGINT", onSigint);
    process.once("SIGTERM", onSigterm);
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await runBuyVoidProductionPrivateServicesOperatorV1({
    apply: args.apply,
    confirmation: args.confirmation,
    expected_plan_id_sha256: args.expectedPlanId,
    rpc_readiness_confirmation: args.rpcReadinessConfirmation,
    custodian_activation_confirmation: args.custodianActivationConfirmation,
    broadcaster_activation_confirmation: args.broadcasterActivationConfirmation,
  });

  console.log(JSON.stringify(result.decision, null, 2));

  if (!result.decision.ok) {
    process.exitCode = result.decision.residual_service_state ? 3 : 2;
    return;
  }
  if (result.decision.status === "planned") return;
  if (!result.session) {
    throw new Error("production_private_services_operator_started_session_missing");
  }

  const signal = await waitForShutdownSignal();
  const shutdown = await result.session.stop(signal);
  console.log(JSON.stringify(shutdown, null, 2));
  if (shutdown.status !== "stopped") process.exitCode = 3;
}

main().catch((error) => {
  const errorClass = String((error as any)?.name || "Error");
  console.error(JSON.stringify({
    marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1,
    ok: false,
    status: "held",
    stage: "cli",
    reason: "production_private_services_operator_cli_failed",
    error_class: /^[A-Za-z0-9._:-]{1,80}$/.test(errorClass)
      ? errorClass
      : "Error",
    side_effect_state_known: false,
    credential_read_performed: false,
    signing_performed: false,
    submit_once_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  }, null, 2));
  process.exitCode = 1;
});
