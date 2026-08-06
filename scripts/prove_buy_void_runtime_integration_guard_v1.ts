import fs from "node:fs";
import path from "node:path";

const fail = (message: string): never => {
  throw new Error(`VOID_BUY_VOID_RUNTIME_INTEGRATION_GUARD_V1_FAIL: ${message}`);
};
const need = (condition: unknown, message: string): void => {
  if (!condition) fail(message);
};

const root = process.cwd();
const indexText = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const moduleText = fs.readFileSync(
  path.join(root, "src", "economic", "buy_void_runtime_integration_v1.ts"),
  "utf8",
);
const workflowText = fs.readFileSync(
  path.join(root, ".github", "workflows", "buy-void-runtime-integration-v1.yml"),
  "utf8",
);

need(
  indexText.includes(
    'import "./economic/buy_void_runtime_integration_v1.js"; // VOID_BUY_VOID_RUNTIME_INTEGRATION_V1',
  ),
  "missing index side-effect import",
);
need(
  indexText.split("VOID_BUY_VOID_RUNTIME_INTEGRATION_V1").length - 1 === 1,
  "runtime integration import must appear exactly once",
);

for (const marker of [
  "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1",
  'status: "/__void/operator/buy-void-runtime-v1/status"',
  'command: "/__void/operator/buy-void-runtime-v1/command"',
  'const ENABLE_ENV = "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED"',
  'const ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR"',
  "operator_loopback_only: true",
  "disabled_by_default: true",
  "server_controlled_root_dir: true",
  "dry_by_default: true",
  "exact_per_action_confirmation_required: true",
  "public_route: false",
  "background_loop: false",
  "rpc_call: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
  'remote === "127.0.0.1"',
  'remote === "::1"',
  'remote === "::ffff:127.0.0.1"',
  'error: "root_dir_is_server_controlled"',
  'const MAX_INPUT_NESTING_DEPTH = 12',
  'const INPUT_NESTING_DEPTH_SENTINEL = "__input_nesting_depth_exceeded__"',
  "return INPUT_NESTING_DEPTH_SENTINEL",
  '"input_nesting_depth_exceeded"',
  '"forbidden_execution_material"',
  "runBuyVoidPipelineCommandV1(command)",
  "setTimeout(mount, 250).unref?.()",
]) {
  need(moduleText.includes(marker), `missing runtime marker: ${marker}`);
}

need(
  moduleText.includes(
    "app.post(\n    VOID_BUY_VOID_RUNTIME_INTEGRATION_ROUTES_V1.command",
  ),
  "command route is not POST",
);
need(
  !moduleText.includes(
    "app.get(\n    VOID_BUY_VOID_RUNTIME_INTEGRATION_ROUTES_V1.command",
  ),
  "command mutation is exposed over GET",
);
need(!moduleText.includes('"/buy-void'), "runtime module mounts a public Buy VOID route");
need(!moduleText.includes("req?.headers?.host"), "runtime trusts Host for loopback authorization");
need(!moduleText.includes("fetch("), "runtime performs RPC or external fetch");
need(!moduleText.includes("sendTransaction("), "runtime sends a transaction");
need(!moduleText.includes("broadcastTransaction("), "runtime broadcasts a transaction");
need(!moduleText.includes("new Wallet("), "runtime constructs a wallet");
need(!moduleText.includes("PRIVATE_KEY"), "runtime references private-key configuration");
need(!moduleText.includes("raw_signed_transaction:"), "runtime exposes raw signed transaction input");

for (const proof of [
  "scripts/prove_buy_void_runtime_integration_v1.ts",
  "scripts/prove_buy_void_runtime_integration_guard_v1.ts",
]) {
  need(workflowText.includes(proof), `workflow missing proof ${proof}`);
}
need(workflowText.includes("npm ci --ignore-scripts"), "workflow lacks locked install");
need(workflowText.includes("npm run build"), "workflow lacks production build");
need(workflowText.includes("--moduleResolution NodeNext"), "workflow lacks focused TypeScript gate");

console.log("VOID_BUY_VOID_RUNTIME_INTEGRATION_GUARD_V1_GREEN");
