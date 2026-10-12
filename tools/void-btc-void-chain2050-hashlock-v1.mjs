#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
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

export const REVIEWED_NATIVE_SOLC_IMAGE =
  "ethereum/solc:0.8.24";
export const REVIEWED_NATIVE_SOLC_IMAGE_ID =
  "sha256:434803786cb17d2e37c48140bd986b0d7d366833bfe989ed6447cfe8bd200ef1";
export const REVIEWED_SOLCJS_PACKAGE_SRI =
  "sha512-G5yUqjTUPc8Np74sCFwfsevhBPlUifUOfhYrgyu6CmYlC6feSw0YS6eZW47XDT23k3JYdKx5nJ+Q7whCEmNcoA==";
export const REVIEWED_SOLCJS_METADATA_URL =
  "https://registry.npmjs.org/solc/0.8.24";
export const REVIEWED_SOLCJS_TARBALL_URL =
  "https://registry.npmjs.org/solc/-/solc-0.8.24.tgz";

export const AUTHORITY = Object.freeze({
  source_and_compiler_proof_only: true,
  canonical_git_source_required: true,
  canonical_void_token_source_bound: true,
  compiler_outputs_cross_checked: true,
  compiler_execution_rederived: true,
  caller_supplied_compiler_artifacts_accepted: false,
  reviewed_native_compiler_image_required: true,
  reviewed_solcjs_package_sri_required: true,
  compiler_artifact_network_access: true,
  temporary_compiler_workspace_write: true,
  native_compiler_execution_network_disabled: true,
  solcjs_direct_compiler_core_execution: true,
  solcjs_package_dependencies_executed: false,
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
const DOCKER = "/usr/bin/docker";
const TAR = "/usr/bin/tar";
const MAX_COMPILER_OUTPUT_BYTES = 64 * 1024 * 1024;
const MAX_REGISTRY_METADATA_BYTES = 2 * 1024 * 1024;
const MAX_SOLCJS_TARBALL_BYTES = 32 * 1024 * 1024;
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

export function validateVoidBtcVoidChain2050CompilerEnvironmentV1(
  value,
  kind,
) {
  if (
    !plain(value) ||
    value.marker !== VOID_SOLC_COMPILER_ENVIRONMENT_V1 ||
    value.compiler_release !== SOLC_RELEASE ||
    value.kind !== kind ||
    typeof value.version_output !== "string" ||
    !value.version_output.includes(SOLC_RELEASE)
  ) {
    fail("compiler_environment_invalid:" + String(kind));
  }

  if (kind === "native-container") {
    if (
      value.implementation !== "ethereum-solc-native-linux-amd64" ||
      value.artifact_identity !== REVIEWED_NATIVE_SOLC_IMAGE_ID ||
      value.image_id_verified !== true ||
      value.execution_network_disabled !== true
    ) {
      fail("native_compiler_environment_unreviewed");
    }
  } else if (kind === "solcjs") {
    if (
      value.implementation !== "solc-js-emscripten-direct-soljson" ||
      value.artifact_identity !==
        "npm-integrity:" + REVIEWED_SOLCJS_PACKAGE_SRI ||
      value.package_tarball_sri_verified !== true ||
      value.direct_solidity_compile_c_api !== true ||
      value.package_dependencies_executed !== false ||
      !/^[0-9a-f]{64}$/u.test(String(value.soljson_sha256 || ""))
    ) {
      fail("solcjs_compiler_environment_unreviewed");
    }
  } else {
    fail("compiler_environment_kind_invalid");
  }

  return Object.freeze({ ...value });
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

function requireExecutable(file, label) {
  const resolved = path.resolve(file);
  const stat = fs.lstatSync(resolved);
  if (
    stat.isSymbolicLink() ||
    !stat.isFile() ||
    fs.realpathSync.native(resolved) !== resolved ||
    (stat.mode & 0o111) === 0
  ) {
    fail(label + "_executable_invalid");
  }
  return resolved;
}

function processEnv(home, extra = {}) {
  return {
    PATH: "/usr/bin:/bin",
    HOME: home,
    XDG_CONFIG_HOME: home,
    LANG: "C",
    LC_ALL: "C",
    NODE_PATH: "",
    NODE_OPTIONS: "",
    ...extra,
  };
}

function spawnChecked(
  command,
  args,
  label,
  {
    cwd = ROOT,
    env = processEnv("/nonexistent"),
    input = undefined,
    encoding = null,
    timeout = 120_000,
  } = {},
) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    input,
    encoding,
    timeout,
    maxBuffer: MAX_COMPILER_OUTPUT_BYTES,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) {
    fail(label, {
      status: result.status,
      error: String(result.error?.message || ""),
      stderr: Buffer.isBuffer(result.stderr)
        ? result.stderr.toString("utf8").slice(0, 8192)
        : String(result.stderr || "").slice(0, 8192),
    });
  }
  return result;
}

function sha512Sri(bytes) {
  return "sha512-" +
    crypto.createHash("sha512").update(bytes).digest("base64");
}

function httpsGetExact(urlText, maxBytes, label) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlText);
    } catch {
      reject(new Error(label + "_url_invalid"));
      return;
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "registry.npmjs.org" ||
      parsed.username !== "" ||
      parsed.password !== ""
    ) {
      reject(new Error(label + "_url_not_reviewed"));
      return;
    }

    const request = https.get(
      parsed,
      {
        headers: {
          Accept: "*/*",
          "User-Agent": "void-btc-void-chain2050-hashlock-v1",
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(label + "_http_status_" + response.statusCode));
          return;
        }
        const chunks = [];
        let total = 0;
        response.on("data", (chunk) => {
          total += chunk.length;
          if (total > maxBytes) {
            request.destroy(new Error(label + "_response_too_large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve(Buffer.concat(chunks)));
      },
    );
    request.setTimeout(30_000, () => {
      request.destroy(new Error(label + "_timeout"));
    });
    request.on("error", reject);
  });
}

function nativeCompilerExecution(inputText, root) {
  const docker = requireExecutable(DOCKER, "docker");
  const dockerConfig = path.join(root, "docker-config");
  fs.mkdirSync(dockerConfig, { mode: 0o700 });

  const env = processEnv(root, {
    DOCKER_CONFIG: dockerConfig,
  });

  spawnChecked(
    docker,
    ["pull", REVIEWED_NATIVE_SOLC_IMAGE],
    "native_solc_pull_failed",
    { env, encoding: "utf8", timeout: 180_000 },
  );

  const inspected = String(
    spawnChecked(
      docker,
      [
        "image",
        "inspect",
        "--format={{.Id}}",
        REVIEWED_NATIVE_SOLC_IMAGE,
      ],
      "native_solc_image_inspect_failed",
      { env, encoding: "utf8" },
    ).stdout || "",
  ).trim();
  if (inspected !== REVIEWED_NATIVE_SOLC_IMAGE_ID) {
    fail("native_solc_image_identity_mismatch", {
      expected: REVIEWED_NATIVE_SOLC_IMAGE_ID,
      observed: inspected,
    });
  }

  const version = String(
    spawnChecked(
      docker,
      [
        "run",
        "--rm",
        "--pull=never",
        "--network=none",
        REVIEWED_NATIVE_SOLC_IMAGE_ID,
        "--version",
      ],
      "native_solc_version_failed",
      { env, encoding: "utf8" },
    ).stdout || "",
  ).trim();
  if (!version.includes(SOLC_RELEASE)) {
    fail("native_solc_version_mismatch");
  }

  const output = Buffer.from(
    spawnChecked(
      docker,
      [
        "run",
        "--rm",
        "--pull=never",
        "--network=none",
        "-i",
        REVIEWED_NATIVE_SOLC_IMAGE_ID,
        "--standard-json",
      ],
      "native_solc_compile_failed",
      {
        env,
        input: Buffer.from(inputText, "utf8"),
        timeout: 180_000,
      },
    ).stdout || Buffer.alloc(0),
  );

  return Object.freeze({
    output,
    environment: validateVoidBtcVoidChain2050CompilerEnvironmentV1(
      {
        marker: VOID_SOLC_COMPILER_ENVIRONMENT_V1,
        compiler_release: SOLC_RELEASE,
        kind: "native-container",
        implementation: "ethereum-solc-native-linux-amd64",
        version_output: version,
        artifact_identity: REVIEWED_NATIVE_SOLC_IMAGE_ID,
        image_id_verified: true,
        execution_network_disabled: true,
      },
      "native-container",
    ),
  });
}

async function solcJsCompilerExecution(inputText, root) {
  const tar = requireExecutable(TAR, "tar");
  const metadataBytes = await httpsGetExact(
    REVIEWED_SOLCJS_METADATA_URL,
    MAX_REGISTRY_METADATA_BYTES,
    "solcjs_registry_metadata",
  );
  let metadata;
  try {
    metadata = JSON.parse(metadataBytes.toString("utf8"));
  } catch {
    fail("solcjs_registry_metadata_json_invalid");
  }
  if (
    metadata?.name !== "solc" ||
    metadata?.version !== SOLC_VERSION ||
    metadata?.dist?.integrity !== REVIEWED_SOLCJS_PACKAGE_SRI ||
    metadata?.dist?.tarball !== REVIEWED_SOLCJS_TARBALL_URL
  ) {
    fail("solcjs_registry_metadata_unreviewed");
  }

  const tarball = await httpsGetExact(
    REVIEWED_SOLCJS_TARBALL_URL,
    MAX_SOLCJS_TARBALL_BYTES,
    "solcjs_tarball",
  );
  if (sha512Sri(tarball) !== REVIEWED_SOLCJS_PACKAGE_SRI) {
    fail("solcjs_tarball_sri_mismatch");
  }

  const tarballPath = path.join(root, "solc-0.8.24.tgz");
  fs.writeFileSync(tarballPath, tarball, { flag: "wx", mode: 0o600 });
  fs.chmodSync(tarballPath, 0o600);

  const listing = String(
    spawnChecked(
      tar,
      ["-tzf", tarballPath],
      "solcjs_tar_listing_failed",
      {
        cwd: root,
        env: processEnv(root),
        encoding: "utf8",
      },
    ).stdout || "",
  ).split("\n").filter(Boolean);
  if (
    !listing.includes("package/soljson.js") ||
    !listing.includes("package/package.json") ||
    listing.some((entry) =>
      entry.startsWith("/") ||
      entry.split("/").some((part) => part === "..")
    )
  ) {
    fail("solcjs_tar_layout_invalid");
  }

  const extractRoot = path.join(root, "solcjs-extract");
  fs.mkdirSync(extractRoot, { mode: 0o700 });
  spawnChecked(
    tar,
    [
      "-xzf",
      tarballPath,
      "-C",
      extractRoot,
      "--no-same-owner",
      "--no-same-permissions",
      "package/soljson.js",
      "package/package.json",
    ],
    "solcjs_tar_extract_failed",
    {
      cwd: root,
      env: processEnv(root),
      encoding: "utf8",
    },
  );

  const packageJsonPath = path.join(
    extractRoot,
    "package",
    "package.json",
  );
  const soljsonPath = path.join(extractRoot, "package", "soljson.js");
  for (const [file, label, maxBytes] of [
    [packageJsonPath, "solcjs_package_json", 1024 * 1024],
    [soljsonPath, "solcjs_soljson", 32 * 1024 * 1024],
  ]) {
    const stat = fs.lstatSync(file);
    if (
      stat.isSymbolicLink() ||
      !stat.isFile() ||
      stat.nlink !== 1 ||
      stat.size < 1 ||
      stat.size > maxBytes ||
      !fs.realpathSync.native(file).startsWith(extractRoot + path.sep)
    ) {
      fail(label + "_identity_invalid");
    }
  }

  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch {
    fail("solcjs_package_json_invalid");
  }
  if (
    packageJson?.name !== "solc" ||
    packageJson?.version !== SOLC_VERSION
  ) {
    fail("solcjs_package_identity_mismatch");
  }

  const soljsonBytes = fs.readFileSync(soljsonPath);
  const soljsonSha256 = sha256(soljsonBytes);

  const childSource = [
    '"use strict";',
    'const fs=require("node:fs");',
    'const soljson=require(process.argv[1]);',
    'const input=fs.readFileSync(0,"utf8");',
    'if(typeof soljson?.cwrap!=="function") throw new Error("soljson_cwrap_missing");',
    'const version=soljson.cwrap("solidity_version","string",[])();',
    'const compile=soljson.cwrap("solidity_compile","string",["string","number","number"]);',
    'const output=compile(input,0,0);',
    'if(typeof output!=="string"||output.length<2) throw new Error("soljson_output_invalid");',
    'process.stdout.write(JSON.stringify({version,output}));',
  ].join("\n");

  const child = spawnChecked(
    process.execPath,
    ["-e", childSource, soljsonPath],
    "solcjs_direct_core_execution_failed",
    {
      cwd: root,
      env: processEnv(root),
      input: Buffer.from(inputText, "utf8"),
      encoding: "utf8",
      timeout: 180_000,
    },
  );

  let envelope;
  try {
    envelope = JSON.parse(String(child.stdout || ""));
  } catch {
    fail("solcjs_direct_core_envelope_invalid");
  }
  const version = String(envelope?.version || "");
  const outputText = String(envelope?.output || "");
  if (!version.includes(SOLC_RELEASE) || outputText.length < 2) {
    fail("solcjs_direct_core_version_or_output_invalid");
  }

  return Object.freeze({
    output: Buffer.from(outputText, "utf8"),
    environment: validateVoidBtcVoidChain2050CompilerEnvironmentV1(
      {
        marker: VOID_SOLC_COMPILER_ENVIRONMENT_V1,
        compiler_release: SOLC_RELEASE,
        kind: "solcjs",
        implementation: "solc-js-emscripten-direct-soljson",
        version_output: version,
        artifact_identity:
          "npm-integrity:" + REVIEWED_SOLCJS_PACKAGE_SRI,
        package_tarball_sri_verified: true,
        direct_solidity_compile_c_api: true,
        package_dependencies_executed: false,
        soljson_sha256: soljsonSha256,
      },
      "solcjs",
    ),
  });
}

function buildIdentity({
  repo,
  contractSource,
  tokenSource,
  exactInput,
  nativeExecution,
  solcjsExecution,
}) {
  const a = parseCompilerOutput(nativeExecution.output, "native");
  const b = parseCompilerOutput(solcjsExecution.output, "solcjs");

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
      environment_a: nativeExecution.environment,
      environment_b: solcjsExecution.environment,
      exact_standard_json_input_sha256:
        sha256(Buffer.from(inputTextForIdentity(exactInput), "utf8")),
      output_a_sha256: sha256(nativeExecution.output),
      output_b_sha256: sha256(solcjsExecution.output),
      compiler_outputs_cross_checked: true,
      compiler_execution_rederived: true,
      caller_supplied_compiler_artifacts_accepted: false,
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

function inputTextForIdentity(exactInput) {
  return canonicalJson(exactInput);
}

async function rederive(values) {
  requireCanonicalSourceArgument(values.source);
  const repo = repositoryIdentity();
  const contractSource = headFile(CONTRACT_PATH, "contract_source");
  const tokenSource = headFile(
    CANONICAL_VOID_TOKEN_SOURCE_PATH,
    "canonical_void_token_source",
  );
  validateSourceText(contractSource.text);
  validateCanonicalVoidTokenSourceText(tokenSource.text);

  const exactInput = buildStandardJsonInput(contractSource.text);
  const inputText = inputTextForIdentity(exactInput);
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-btc-void-solc-v1-"),
  );
  fs.chmodSync(tempRoot, 0o700);

  try {
    const nativeExecution = nativeCompilerExecution(inputText, tempRoot);
    const solcjsExecution = await solcJsCompilerExecution(inputText, tempRoot);
    return buildIdentity({
      repo,
      contractSource,
      tokenSource,
      exactInput,
      nativeExecution,
      solcjsExecution,
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function parseCli(argv) {
  const command = argv[0];
  const { values } = parseArgs({
    args: argv.slice(1),
    options: {
      source: { type: "string" },
      out: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
  return { command, values };
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
  if (command === "rederive") {
    if (!values.source || !values.out) fail("rederive_usage_invalid");
    writeNewJson(values.out, await rederive(values));
    return;
  }
  if (command === "review") {
    fail("caller_produced_compiler_artifacts_not_authoritative");
  }
  fail("usage: input|rederive");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
) {
  main().catch((error) => {
    process.stderr.write(String(error?.message || error) + "\n");
    if (error?.detail !== undefined) {
      process.stderr.write(JSON.stringify(error.detail) + "\n");
    }
    process.exitCode = 1;
  });
}
