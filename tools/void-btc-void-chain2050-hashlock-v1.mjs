#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

export const VOID_BTC_VOID_CHAIN2050_HASHLOCK_V1 =
  "VOID_BTC_VOID_CHAIN2050_HASHLOCK_V1";
export const VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1 =
  "VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1";
export const VOID_SOLC_COMPILER_ENVIRONMENT_V1 =
  "VOID_SOLC_COMPILER_ENVIRONMENT_V1";

export const CONTRACT_PATH =
  "contracts/mainnet/BtcVoidHashlockSettlementV1.sol";
export const CONTRACT_NAME = "BtcVoidHashlockSettlementV1";
export const CANONICAL_VOID_TOKEN_SOURCE_PATH =
  "contracts/epoch2/VoidEpoch2TokenV1.sol";
export const SOLC_VERSION = "0.8.24";
export const SOLC_RELEASE = "0.8.24+commit.e11b9ed9";
export const EVM_VERSION = "paris";
export const CANONICAL_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";

export const AUTHORITY = Object.freeze({
  source_and_compiler_proof_only: true,
  canonical_git_source_required: true,
  canonical_void_token_source_bound: true,
  compiler_outputs_cross_checked: true,
  compiler_execution_rederived: false,
  rpc_call: false,
  credential_access: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  contract_deployment: false,
  chain2050_write: false,
  inventory_reservation: false,
  inventory_funding: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const GIT = "/usr/bin/git";
const CANONICAL_REMOTE =
  "https://github.com/6ZoSo9/void-node.git";
const ACCEPTED_ORIGINS = new Set([
  "https://github.com/6ZoSo9/void-node",
  "https://github.com/6ZoSo9/void-node.git",
  "git@github.com:6ZoSo9/void-node.git",
  "ssh://git@github.com/6ZoSo9/void-node.git",
]);
const REVIEWED_GIT_CONFIG_ARGS = Object.freeze([
  "-c", "core.hooksPath=/dev/null",
  "-c", "core.attributesFile=/dev/null",
  "-c", "core.fsmonitor=false",
  "-c", "core.untrackedCache=false",
  "-c", "core.preloadIndex=false",
  "-c", "submodule.recurse=false",
]);

const OUTPUT_SELECTION = [
  "abi",
  "metadata",
  "storageLayout",
  "evm.methodIdentifiers",
  "evm.bytecode.object",
  "evm.bytecode.linkReferences",
  "evm.deployedBytecode.object",
  "evm.deployedBytecode.linkReferences",
  "evm.deployedBytecode.immutableReferences",
];

const EXPECTED_FUNCTION_SIGNATURES = Object.freeze([
  "claim(bytes32,bytes)",
  "getSwap(bytes32)",
  "lock(bytes32,bytes32,address,uint256,uint256)",
  "refund(bytes32)",
  "stateOf(bytes32)",
  "voidToken()",
]);

const EXPECTED_ERROR_NAMES = Object.freeze([
  "BeneficiaryEqualsRefundAuthority",
  "ClaimDeadlineReached",
  "HashlockMismatch",
  "InvalidAmount",
  "InvalidPreimageLength",
  "NotBeneficiary",
  "NotRefundAuthority",
  "RefundDeadlineNotFuture",
  "RefundDeadlineNotReached",
  "SwapAlreadyExists",
  "SwapNotFound",
  "SwapTerminal",
  "TokenBalanceDeltaMismatch",
  "TokenTransferFailed",
  "ZeroAddress",
  "ZeroHashlock",
  "ZeroSwapId",
]);

const EXPECTED_EVENT_NAMES = Object.freeze([
  "Claimed",
  "Locked",
  "Refunded",
]);

function fail(code, detail = undefined) {
  const error = new Error(code);
  error.code = code;
  if (detail !== undefined) error.detail = detail;
  throw error;
}

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function gitBlobSha1(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  const header = Buffer.from("blob " + String(bytes.length) + "\0", "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}

function gitEnv() {
  return {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/bin/false",
  };
}

function gitRun(args, label, { encoding = "utf8" } = {}) {
  const result = spawnSync(
    GIT,
    ["--no-replace-objects", ...REVIEWED_GIT_CONFIG_ARGS, "-C", ROOT, ...args],
    {
      encoding,
      env: gitEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0) fail(label);
  return result;
}

function gitText(args, label) {
  return String(gitRun(args, label).stdout || "").trim();
}

function repositoryIdentity() {
  const head = gitText(["rev-parse", "HEAD"], "repository_head_unavailable");
  const tree = gitText(["rev-parse", "HEAD^{tree}"], "repository_tree_unavailable");
  const status = gitText(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "repository_status_unavailable",
  );
  const origin = gitText(
    ["config", "--local", "--no-includes", "--get", "remote.origin.url"],
    "repository_origin_unavailable",
  );
  if (
    !/^[0-9a-f]{40}$/u.test(head) ||
    !/^[0-9a-f]{40}$/u.test(tree) ||
    status !== "" ||
    !ACCEPTED_ORIGINS.has(origin)
  ) {
    fail("repository_identity_invalid");
  }
  return Object.freeze({
    head,
    tree,
    canonical_remote_url: CANONICAL_REMOTE,
  });
}

function headFile(relativePath, label) {
  const file = path.join(ROOT, relativePath);
  const resolved = path.resolve(file);
  if (resolved !== file || fs.realpathSync.native(file) !== file) {
    fail(label + "_path_invalid");
  }
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size < 1) {
    fail(label + "_worktree_file_invalid");
  }
  const bytes = fs.readFileSync(file);
  const gitBytes = Buffer.from(
    gitRun(["show", "HEAD:" + relativePath], label + "_head_bytes_unavailable", {
      encoding: null,
    }).stdout || Buffer.alloc(0),
  );
  const blob = gitText(
    ["rev-parse", "HEAD:" + relativePath],
    label + "_head_blob_unavailable",
  );
  if (
    !/^[0-9a-f]{40}$/u.test(blob) ||
    !bytes.equals(gitBytes) ||
    gitBlobSha1(bytes) !== blob
  ) {
    fail(label + "_worktree_head_mismatch");
  }
  return Object.freeze({
    path: relativePath,
    bytes,
    text: bytes.toString("utf8"),
    sha256: sha256(bytes),
    git_blob_sha1: blob,
  });
}

function requireCanonicalSourceArgument(raw) {
  const file = path.resolve(String(raw || ""));
  const expected = path.join(ROOT, CONTRACT_PATH);
  if (file !== expected || fs.realpathSync.native(file) !== expected) {
    fail("source_path_must_be_canonical_contract");
  }
  return file;
}

export function validateCanonicalVoidTokenSourceText(sourceText) {
  if (
    typeof sourceText !== "string" ||
    sourceText.length < 1 ||
    sourceText.length > 1024 * 1024
  ) {
    fail("canonical_void_token_source_invalid");
  }
  for (const required of [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "_transfer(msg.sender, to, amount);",
    "function transferFrom(",
    "allowance[from][msg.sender] = currentAllowance - amount;",
    "_transfer(from, to, amount);",
    "function _transfer(address from, address to, uint256 amount) private",
    "balanceOf[from] = fromBalance - amount;",
    "balanceOf[to] += amount;",
    "emit Transfer(from, to, amount);",
  ]) {
    if (!sourceText.includes(required)) {
      fail("canonical_void_token_transfer_semantics_mismatch", required);
    }
  }
  return sourceText;
}

export function validateSourceText(sourceText) {
  if (
    typeof sourceText !== "string" ||
    sourceText.length < 1 ||
    sourceText.length > 1024 * 1024
  ) {
    fail("btc_void_chain2050_hashlock_source_invalid");
  }
  for (const required of [
    "contract BtcVoidHashlockSettlementV1",
    "0x470075B85352Eb86F7d089FB9ba88945f12AAd94",
    "mapping(bytes32 => Swap) private _swaps;",
    "function lock(",
    "refundAuthority: msg.sender",
    "token.transferFrom(",
    "function claim(bytes32 swapId, bytes calldata preimage)",
    "preimage.length != 32",
    "sha256(abi.encodePacked(preimageWord))",
    "swap.state = SwapState.Claimed;",
    "function refund(bytes32 swapId)",
    "swap.state = SwapState.Refunded;",
    "uint256 expectedBalance = balanceBefore - amountAtoms;",
    "function getSwap(bytes32 swapId)",
  ]) {
    if (!sourceText.includes(required)) {
      fail("btc_void_chain2050_hashlock_source_contract_mismatch", required);
    }
  }
  for (const forbidden of [
    "delegatecall",
    "selfdestruct",
    "transferOwnership",
    "upgradeTo(",
    "function withdraw(",
    "function rescue(",
    "function batch",
  ]) {
    if (sourceText.toLowerCase().includes(forbidden.toLowerCase())) {
      fail("btc_void_chain2050_hashlock_forbidden_surface", forbidden);
    }
  }
  return sourceText;
}

export function buildStandardJsonInput(sourceText) {
  validateSourceText(sourceText);
  return {
    language: "Solidity",
    sources: {
      [CONTRACT_PATH]: { content: sourceText },
    },
    settings: {
      remappings: [],
      optimizer: { enabled: false, runs: 200 },
      evmVersion: EVM_VERSION,
      viaIR: false,
      debug: { revertStrings: "default" },
      metadata: {
        appendCBOR: true,
        useLiteralContent: true,
        bytecodeHash: "ipfs",
      },
      libraries: {},
      outputSelection: {
        "*": { "": ["ast"] },
        [CONTRACT_PATH]: {
          [CONTRACT_NAME]: [...OUTPUT_SELECTION],
        },
      },
    },
  };
}

function diagnostics(output, label) {
  if (!Array.isArray(output?.errors)) return;
  const errors = output.errors.filter((entry) => entry?.severity === "error");
  if (errors.length > 0) {
    fail(label + "_compiler_errors", errors.slice(0, 8));
  }
}

function normalizeHex(value, code) {
  const text = String(value ?? "").trim().toLowerCase().replace(/^0x/u, "");
  if (!text || text.length % 2 !== 0 || !/^[0-9a-f]+$/u.test(text)) fail(code);
  return text;
}

function hasReferences(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.length > 0;
  return Object.values(value).some((child) => hasReferences(child));
}

function functionSignature(entry) {
  const inputs = Array.isArray(entry?.inputs) ? entry.inputs : [];
  return String(entry?.name || "") +
    "(" + inputs.map((item) => String(item?.type || "")).join(",") + ")";
}

function validateAbi(abi, label) {
  if (!Array.isArray(abi) || abi.length !== 26) {
    fail(label + "_abi_cardinality_invalid");
  }
  const functions = abi
    .filter((entry) => entry?.type === "function")
    .map(functionSignature)
    .sort();
  const errors = abi
    .filter((entry) => entry?.type === "error")
    .map((entry) => String(entry?.name || ""))
    .sort();
  const events = abi
    .filter((entry) => entry?.type === "event")
    .map((entry) => String(entry?.name || ""))
    .sort();
  if (
    canonicalJson(functions) !==
      canonicalJson([...EXPECTED_FUNCTION_SIGNATURES].sort()) ||
    canonicalJson(errors) !==
      canonicalJson([...EXPECTED_ERROR_NAMES].sort()) ||
    canonicalJson(events) !==
      canonicalJson([...EXPECTED_EVENT_NAMES].sort())
  ) {
    fail(label + "_abi_surface_invalid", { functions, errors, events });
  }
}

function validateStorageLayout(layout, label) {
  if (!plain(layout) || !Array.isArray(layout.storage)) {
    fail(label + "_storage_layout_invalid");
  }
  if (
    layout.storage.length !== 1 ||
    layout.storage[0]?.label !== "_swaps" ||
    String(layout.storage[0]?.slot) !== "0" ||
    Number(layout.storage[0]?.offset) !== 0
  ) {
    fail(label + "_storage_layout_unexpected", layout.storage);
  }
}

function validateMethodIdentifiers(methods, label) {
  if (!plain(methods)) fail(label + "_method_identifiers_invalid");
  const keys = Object.keys(methods).sort();
  if (
    canonicalJson(keys) !==
    canonicalJson([...EXPECTED_FUNCTION_SIGNATURES].sort())
  ) {
    fail(label + "_method_identifier_surface_invalid", keys);
  }
  for (const selector of Object.values(methods)) {
    if (!/^[0-9a-f]{8}$/u.test(String(selector))) {
      fail(label + "_method_selector_invalid");
    }
  }
}

function parseMetadata(raw, label) {
  let value;
  try {
    value = JSON.parse(String(raw ?? ""));
  } catch {
    fail(label + "_metadata_json_invalid");
  }
  if (
    value?.compiler?.version !== SOLC_RELEASE ||
    value?.language !== "Solidity" ||
    value?.settings?.evmVersion !== EVM_VERSION ||
    value?.settings?.optimizer?.enabled !== false ||
    Number(value?.settings?.optimizer?.runs) !== 200 ||
    value?.settings?.metadata?.bytecodeHash !== "ipfs"
  ) {
    fail(label + "_metadata_profile_mismatch");
  }
  if (value?.settings?.viaIR !== undefined && value.settings.viaIR !== false) {
    fail(label + "_metadata_via_ir_mismatch");
  }
  return value;
}

export function parseCompilerOutput(raw, label = "compiler") {
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), "utf8");
  let text = bytes.toString("utf8").trim();
  if (!text.startsWith("{")) {
    const index = text.indexOf("{");
    if (index < 0) fail(label + "_output_json_invalid");
    text = text.slice(index);
  }
  let output;
  try {
    output = JSON.parse(text);
  } catch {
    fail(label + "_output_json_invalid");
  }
  diagnostics(output, label);

  const contract = output?.contracts?.[CONTRACT_PATH]?.[CONTRACT_NAME];
  if (!plain(contract)) fail(label + "_contract_missing");

  const creation = normalizeHex(
    contract?.evm?.bytecode?.object,
    label + "_creation_bytecode_invalid",
  );
  const runtime = normalizeHex(
    contract?.evm?.deployedBytecode?.object,
    label + "_runtime_bytecode_invalid",
  );

  if (
    hasReferences(contract?.evm?.bytecode?.linkReferences) ||
    hasReferences(contract?.evm?.deployedBytecode?.linkReferences) ||
    hasReferences(contract?.evm?.deployedBytecode?.immutableReferences)
  ) {
    fail(label + "_unexpected_link_or_immutable_references");
  }

  validateAbi(contract.abi, label);
  validateStorageLayout(contract.storageLayout, label);
  validateMethodIdentifiers(contract?.evm?.methodIdentifiers, label);
  const metadata = parseMetadata(contract.metadata, label);

  return Object.freeze({
    creation_hex: creation,
    creation_bytes: creation.length / 2,
    creation_sha256: sha256(Buffer.from(creation, "hex")),
    runtime_hex: runtime,
    runtime_bytes: runtime.length / 2,
    runtime_sha256: sha256(Buffer.from(runtime, "hex")),
    abi: contract.abi,
    abi_sha256: sha256(Buffer.from(canonicalJson(contract.abi), "utf8")),
    method_identifiers: contract.evm.methodIdentifiers,
    method_identifiers_sha256:
      sha256(Buffer.from(canonicalJson(contract.evm.methodIdentifiers), "utf8")),
    storage_layout: contract.storageLayout,
    storage_layout_sha256:
      sha256(Buffer.from(canonicalJson(contract.storageLayout), "utf8")),
    metadata,
    metadata_sha256:
      sha256(Buffer.from(canonicalJson(metadata), "utf8")),
  });
}

function validateEnvironment(value, kind, label) {
  if (
    !plain(value) ||
    value.marker !== VOID_SOLC_COMPILER_ENVIRONMENT_V1 ||
    value.compiler_release !== SOLC_RELEASE ||
    value.kind !== kind ||
    typeof value.version_output !== "string" ||
    !value.version_output.includes(SOLC_RELEASE) ||
    typeof value.artifact_identity !== "string" ||
    value.artifact_identity.length < 16 ||
    value.artifact_identity.length > 512
  ) {
    fail(label + "_compiler_environment_invalid");
  }
  return Object.freeze({ ...value });
}

function readJson(file, label) {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    fail(label + "_json_invalid");
  }
  return value;
}

function writeNewJson(file, value) {
  const output = path.resolve(file);
  if (fs.existsSync(output)) fail("output_exists");
  fs.writeFileSync(output, JSON.stringify(value, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  fs.chmodSync(output, 0o600);
}

function parseCli(argv) {
  const command = argv[0];
  const { values } = parseArgs({
    args: argv.slice(1),
    options: {
      source: { type: "string" },
      out: { type: "string" },
      input: { type: "string" },
      "output-a": { type: "string" },
      "output-b": { type: "string" },
      "environment-a": { type: "string" },
      "environment-b": { type: "string" },

    },
    strict: true,
    allowPositionals: false,
  });
  return { command, values };
}

function review(values) {
  requireCanonicalSourceArgument(values.source);
  const repo = repositoryIdentity();
  const contractSource = headFile(CONTRACT_PATH, "contract_source");
  const tokenSource = headFile(
    CANONICAL_VOID_TOKEN_SOURCE_PATH,
    "canonical_void_token_source",
  );
  const sourceText = contractSource.text;
  validateSourceText(sourceText);
  validateCanonicalVoidTokenSourceText(tokenSource.text);

  const exactInput = buildStandardJsonInput(sourceText);
  const suppliedInput = readJson(values.input, "standard_input");
  if (canonicalJson(exactInput) !== canonicalJson(suppliedInput)) {
    fail("standard_input_not_exact");
  }

  const outputABytes = fs.readFileSync(values["output-a"]);
  const outputBBytes = fs.readFileSync(values["output-b"]);
  const a = parseCompilerOutput(outputABytes, "native");
  const b = parseCompilerOutput(outputBBytes, "solcjs");

  for (const key of [
    "creation_hex",
    "runtime_hex",
    "abi_sha256",
    "method_identifiers_sha256",
    "storage_layout_sha256",
    "metadata_sha256",
  ]) {
    if (a[key] !== b[key]) fail("compiler_output_mismatch:" + key);
  }

  const envA = validateEnvironment(
    readJson(values["environment-a"], "environment_a"),
    "native-container",
    "native",
  );
  const envB = validateEnvironment(
    readJson(values["environment-b"], "environment_b"),
    "solcjs",
    "solcjs",
  );

  const reviewedAt = new Date().toISOString();

  const material = Object.freeze({
    marker: VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1,
    version: 1,
    status: "CHAIN2050_HASHLOCK_SOURCE_COMPILER_IDENTITY_GREEN_NOT_DEPLOYED",
    chain_id: 2050,
    execution_epoch: 2,
    contract: Object.freeze({
      path: CONTRACT_PATH,
      name: CONTRACT_NAME,
      canonical_void_token: CANONICAL_VOID_TOKEN,
      source_sha256: contractSource.sha256,
      source_git_blob_sha1: contractSource.git_blob_sha1,
      source_bytes: contractSource.bytes.length,
      canonical_void_token_source: Object.freeze({
        path: CANONICAL_VOID_TOKEN_SOURCE_PATH,
        source_sha256: tokenSource.sha256,
        source_git_blob_sha1: tokenSource.git_blob_sha1,
        source_bytes: tokenSource.bytes.length,
        transfer_semantics_verified_source_only: true,
        runtime_code_verified: false,
      }),
    }),
    compiler: Object.freeze({
      version: SOLC_VERSION,
      release: SOLC_RELEASE,
      evm_version: EVM_VERSION,
      optimizer_enabled: false,
      optimizer_runs: 200,
      via_ir: false,
      environment_a: envA,
      environment_b: envB,
      exact_standard_json_input_sha256:
        sha256(Buffer.from(canonicalJson(exactInput), "utf8")),
      output_a_sha256: sha256(outputABytes),
      output_b_sha256: sha256(outputBBytes),
      compiler_outputs_cross_checked: true,
      compiler_execution_rederived: false,
    }),
    artifacts: Object.freeze({
      creation_bytecode_bytes: a.creation_bytes,
      creation_bytecode_sha256: a.creation_sha256,
      runtime_bytecode_bytes: a.runtime_bytes,
      runtime_bytecode_sha256: a.runtime_sha256,
      abi_sha256: a.abi_sha256,
      method_identifiers: Object.freeze({ ...a.method_identifiers }),
      method_identifiers_sha256: a.method_identifiers_sha256,
      storage_layout_sha256: a.storage_layout_sha256,
      metadata_sha256: a.metadata_sha256,
      storage_slot_zero_label: "_swaps",
      link_references_absent: true,
      immutable_references_absent: true,
    }),
    source: Object.freeze({
      repository: "6ZoSo9/void-node",
      repository_head_sha: repo.head,
      repository_tree_sha: repo.tree,
      canonical_remote_url: repo.canonical_remote_url,
      reviewed_at_utc: reviewedAt,
    }),
    design: Object.freeze({
      fixed_single_contract_runtime: true,
      per_swap_deployment_required: false,
      funding_caller_is_refund_authority: true,
      exact_funding_balance_delta_required: true,
      exact_terminal_balance_delta_required: true,
      exact_32_byte_sha256_preimage_required: true,
      claim_strictly_before_refund_deadline: true,
      refund_at_or_after_deadline: true,
      one_terminal_transition_only: true,
      terminal_state_before_token_transfer: true,
      owner_or_admin_surface: false,
      arbitrary_withdrawal_surface: false,
      proxy_or_upgrade_surface: false,
    }),
    authority: AUTHORITY,
  });

  return Object.freeze({
    ...material,
    identity_id:
      "voidbtvc2050h1_" +
      sha256(Buffer.from(canonicalJson(material), "utf8")),
  });
}

async function main() {
  const { command, values } = parseCli(process.argv.slice(2));
  if (command === "input") {
    if (!values.source || !values.out) fail("input_usage_invalid");
    requireCanonicalSourceArgument(values.source);
    const sourceText = headFile(CONTRACT_PATH, "contract_source").text;
    writeNewJson(values.out, buildStandardJsonInput(sourceText));
    return;
  }
  if (command === "review") {
    for (const key of [
      "source",
      "input",
      "output-a",
      "output-b",
      "environment-a",
      "environment-b",
      "out",
    ]) {
      if (!values[key]) fail("review_usage_missing:" + key);
    }
    writeNewJson(values.out, review(values));
    return;
  }
  fail("usage: input|review");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    process.stderr.write(String(error?.message || error) + "\n");
    if (error?.detail !== undefined) {
      process.stderr.write(JSON.stringify(error.detail) + "\n");
    }
    process.exitCode = 1;
  });
}
