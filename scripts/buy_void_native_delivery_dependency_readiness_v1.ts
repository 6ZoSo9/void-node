import {
  probeBuyVoidNativeDeliveryDependencyReadinessV1,
  VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_CONFIRMATION_V1,
} from "../src/economic/buy_void_native_delivery_dependency_readiness_v1.js";

type ParsedArgs = {
  probe: boolean;
  confirmation: string;
  credentialsDirectory: string;
  expectedWalletAddress: string;
  rpcUrl: string;
  requestTimeoutMs: string | undefined;
};

function help(): string {
  return [
    "Usage:",
    "  npx tsx scripts/buy_void_native_delivery_dependency_readiness_v1.ts [options]",
    "",
    "Default mode is disabled and performs no credential or RPC read.",
    "",
    "Options:",
    "  --probe                         Perform the bounded read-only probe",
    "  --confirm VALUE                 Exact readiness confirmation",
    "  --credentials-directory PATH    systemd credential directory",
    "  --expected-wallet-address VALUE Dedicated fulfillment wallet address",
    "  --rpc-url URL                   Loopback Chain-2050 JSON-RPC URL",
    "  --timeout-ms VALUE              Optional RPC timeout (1..30000)",
    "  --help                          Show this help",
    "",
    `Required confirmation: ${VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_CONFIRMATION_V1}`,
  ].join("\n");
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function parseArgs(argv: string[]): ParsedArgs {
  let probe = false;
  let confirmation = "";
  let credentialsDirectory = String(
    process.env.CREDENTIALS_DIRECTORY || "",
  ).trim();
  let expectedWalletAddress = String(
    process.env.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS || "",
  ).trim();
  let rpcUrl = String(
    process.env.VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL || "",
  ).trim();
  let requestTimeoutMs: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--probe") {
      probe = true;
      continue;
    }
    if (value === "--confirm") {
      confirmation = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--credentials-directory") {
      credentialsDirectory = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--expected-wallet-address") {
      expectedWalletAddress = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--rpc-url") {
      rpcUrl = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--timeout-ms") {
      requestTimeoutMs = requireValue(argv, index, value);
      index += 1;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log(help());
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  return {
    probe,
    confirmation,
    credentialsDirectory,
    expectedWalletAddress,
    rpcUrl,
    requestTimeoutMs,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const decision =
    await probeBuyVoidNativeDeliveryDependencyReadinessV1({
      probe: args.probe,
      confirmation: args.confirmation,
      credentials_directory: args.credentialsDirectory,
      expected_wallet_address: args.expectedWalletAddress,
      rpc_url: args.rpcUrl,
      request_timeout_ms: args.requestTimeoutMs,
    });

  console.log(JSON.stringify(decision, null, 2));
  if (args.probe && !decision.ok) process.exitCode = 2;
}

main().catch((error) => {
  const errorClass = String((error as any)?.name || "Error");
  console.error(JSON.stringify({
    marker: "VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1",
    status: "held",
    reason: "readiness_cli_failed",
    error_class: /^[A-Za-z0-9._:-]{1,80}$/.test(errorClass)
      ? errorClass
      : "Error",
    signing_performed: false,
    transaction_broadcast_performed: false,
    dependency_assignment_performed: false,
    runtime_enablement_performed: false,
    money_movement: false,
  }, null, 2));
  process.exitCode = 1;
});
