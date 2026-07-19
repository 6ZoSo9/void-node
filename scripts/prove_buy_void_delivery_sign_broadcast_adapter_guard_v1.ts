import fs from "node:fs";
import path from "node:path";

const fail = (message: string): never => {
  throw new Error(
    `VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_GUARD_V1_FAIL: ${message}`,
  );
};
const need = (value: unknown, message: string): void => {
  if (!value) fail(message);
};

const root = process.cwd();
const modulePath = path.join(
  root,
  "src",
  "economic",
  "buy_void_delivery_sign_broadcast_adapter_v1.ts",
);
const proofPath = path.join(
  root,
  "scripts",
  "prove_buy_void_delivery_sign_broadcast_adapter_v1.ts",
);
const workflowPath = path.join(
  root,
  ".github",
  "workflows",
  "buy-void-delivery-sign-broadcast-adapter-v1.yml",
);
const indexPath = path.join(root, "src", "index.ts");

const moduleText = fs.readFileSync(modulePath, "utf8");
const proofText = fs.readFileSync(proofPath, "utf8");
const workflowText = fs.readFileSync(workflowPath, "utf8");
const indexText = fs.readFileSync(indexPath, "utf8");

for (const marker of [
  "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  '"buyVoidSignAndBroadcast"',
  "disabled_by_default: true",
  "explicit_confirmation_required: true",
  "prepared_attempt_required: true",
  "exact_signed_hash_required: true",
  "durable_submission_guard_dependency_required: true",
  "durable_submission_release_required_for_definitive_not_broadcast: true",
  "broadcaster_exception_is_unknown: true",
  "private_key_input: false",
  "mnemonic_input: false",
  "environment_secret_read: false",
  "rpc_url_input: false",
  "filesystem_read: false",
  "filesystem_write: false",
  "runtime_route_mount: false",
  "raw_signed_transaction_persistence: false",
  "raw_signed_transaction_output: false",
  "automatic_retry: false",
  "receipt_wait: false",
  "claim_submission_once",
  "release_submission_claim",
  "releaseClaimForDefinitiveNotBroadcast",
  "sign_transaction",
  "broadcast_signed_transaction",
  'status: "not_broadcast"',
  'status: "broadcast_unknown"',
  'status: "broadcast_accepted"',
  "raw_signed_transaction_persisted: false",
  "raw_signed_transaction_returned: false",
  "automatic_retry_allowed: false",
  "safeErrorClass",
  "safeProviderSubmissionId",
]) {
  need(moduleText.includes(marker), `missing adapter marker: ${marker}`);
}

for (const forbidden of [
  'from "node:fs"',
  'from "node:path"',
  "process.env",
  "fetch(",
  "JsonRpcProvider",
  "new Wallet(",
  "sendTransaction(",
  "broadcastTransaction(",
  "writeFile",
  "appendFile",
  "app.post(",
  "app.get(",
  "(error as Error)?.message",
]) {
  need(!moduleText.includes(forbidden), `direct authority present: ${forbidden}`);
}

need(
  !indexText.includes("buy_void_delivery_sign_broadcast_adapter_v1"),
  "adapter is runtime-mounted through src/index.ts",
);
need(
  moduleText.indexOf("claim_submission_once(binding)") <
    moduleText.indexOf("sign_transaction("),
  "submission guard does not precede signing",
);
need(
  moduleText.indexOf("release_submission_claim(") <
    moduleText.indexOf('status: "not_broadcast"'),
  "definitive not-broadcast result is not release-gated",
);
need(
  moduleText.indexOf("sign_transaction(") <
    moduleText.lastIndexOf("broadcast_signed_transaction("),
  "signing does not precede broadcast",
);
need(
  moduleText.includes('key !== "dependencies"'),
  "dependency functions are not excluded from secret-key traversal",
);
need(
  moduleText.includes('"private_key"') &&
    moduleText.includes('"raw_signed_transaction"') &&
    moduleText.includes('"rpc_url"'),
  "forbidden execution-material denylist incomplete",
);
need(
  proofText.includes("Wallet.createRandom()"),
  "proof does not use an ephemeral synthetic signer",
);
need(
  proofText.includes("synthetic-definitive-no-submission-v1") &&
    proofText.includes("synthetic broadcaster exception after call") &&
    proofText.includes("broadcast_accepted_hash_mismatch") &&
    proofText.includes("submission_guard_release_failed"),
  "proof lacks outcome classification and release coverage",
);
need(
  !moduleText.includes(
    "(error as any)?.submission_may_have_occurred === true",
  ),
  "broadcaster exceptions are classified by caller-supplied maybe flag",
);
need(
  moduleText.includes(
    'return held("broadcast_submission_exception_unknown"',
  ),
  "broadcaster exceptions are not fail-closed as unknown",
);
need(
  workflowText.includes("npm ci --ignore-scripts"),
  "workflow lacks locked dependency install",
);
for (const proof of [
  "scripts/prove_buy_void_delivery_sign_broadcast_adapter_v1.ts",
  "scripts/prove_buy_void_delivery_sign_broadcast_adapter_guard_v1.ts",
]) {
  need(workflowText.includes(proof), `workflow missing ${proof}`);
}
need(workflowText.includes("npm run build"), "workflow lacks production build");
need(
  workflowText.includes("--moduleResolution NodeNext"),
  "workflow lacks focused TypeScript gate",
);

console.log(
  "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_GUARD_V1_GREEN",
);
