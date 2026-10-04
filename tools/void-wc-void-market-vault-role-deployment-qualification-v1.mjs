#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1 =
  "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1";

export const VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1 =
  Object.freeze({
    source_qualification_only: true,
    canonical_git_source_binding_required: true,
    actual_worktree_blob_binding_required: true,
    launch_controller_control_reverification: true,
    reviewed_control_execution_from_exact_git_objects: true,
    private_reviewed_source_materialization: true,
    reviewed_package_runtime_required: true,
    reviewed_package_bytes_verified: true,
    private_reviewed_package_materialization: true,
    ancestor_package_resolution_preempted: true,
    ambient_node_package_bytes_forbidden: true,
    git_replacement_objects_disabled: true,
    settlement_executor_public_identity_rederivation: true,
    closeout_controller_public_identity_rederivation: true,
    role_separation_verification: true,
    constructor_data_derivation: true,
    reviewed_git_executable_required: true,
    ambient_git_overrides_rejected: true,
    credential_content_access: false,
    private_key_access: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    network_call: false,
    transaction_envelope_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    deployer_selection: false,
    nonce_observation: false,
    fee_observation: false,
    deployment: false,
    inventory_funding: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL_REL =
  "tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";
const REVIEWED_MAIN_ANCHOR =
  "2dcf6544f373f828347434fd0c6d434334af1658";
const GIT = "/usr/bin/git";
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;

const ACCEPTANCE_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json";
const CORRECTION_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json";
const COUPLED_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SOVEREIGN_REL =
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-authorization-v1.json";
const WALLET_REL =
  "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts";
const CONTRACT_REL = "contracts/mainnet/WCVoidMarketVaultV2.sol";
const ATTESTATION_REL =
  "tools/void-wc-void-market-vault-runtime-attestation-v1.mjs";
const CONTROL_REL =
  "tools/void-wc-void-launch-controller-control-requalification-v1.mjs";
const PACKAGE_REL = "package.json";
const PACKAGE_LOCK_REL = "package-lock.json";
const REVIEWED_RUNTIME_TOOL_REL =
  "tools/void-reviewed-node-package-runtime-v1.mjs";
const REVIEWED_RUNTIME_PROFILE_REL =
  "ops/security/reviewed-node-package-runtime-ethers-v1.json";
const REVIEWED_RUNTIME_PROFILE_ID =
  "voidrnpr1_bb76a6a16b4fb779edffb4f541f7a91d0ddb00bfe404031b4387840e74001e77";
const REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256 =
  "5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73";

export const VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1 =
  Object.freeze({
    [ACCEPTANCE_REL]: "c85b6bc59caac6bc765cb8e969cb980386161d12",
    [CORRECTION_REL]: "c5fa40ae6d62ee4c5108526980db9f51ee22cc0b",
    [COUPLED_REL]: "d78bc88dd26c47921a54c081a79ceefc0d5abcee",
    [SOVEREIGN_REL]: "ab51f2095aee1537a417a13014fa5b973c4c0645",
    [WALLET_REL]: "0999f773bdc4befb3e82676304f0d69f5cab42ef",
    [CONTRACT_REL]: "bd11190e2c22f58ac60918ecdf603f53427cadd0",
    [ATTESTATION_REL]: "64a7993a38f764d91a2071240b834fcd97770962",
    [CONTROL_REL]: "a17a6da5f85a740c5c38b0c4fb3377c7df05d270",
    [PACKAGE_REL]: "f28c3e9446c7623ef203da36a9642d046e5f34ee",
    [PACKAGE_LOCK_REL]: "b2671f0149f522b2489247016df0a5ec4bb72b8b",
    [REVIEWED_RUNTIME_TOOL_REL]:
      "6475c3f18ffe566cf5f448ca1de4795391a6efde",
    [REVIEWED_RUNTIME_PROFILE_REL]:
      "87b650e28366acfea3d140ea7778f41f57e5b0c3",
  });

const EXPECTED = Object.freeze({
  chain_id: 2050,
  execution_epoch: 2,
  coupled_launch_id:
    "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
  coupled_launch_id_bytes32:
    "0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
  void_token: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
  compiled_identity_id:
    "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a",
  identity_json_sha256:
    "fb9a92e24afa9d7611364ca30b6eff4fe2df2cc2aa8002b77307bead4b864a4b",
  contract_source_sha256:
    "2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925",
  creation_bytecode_sha256:
    "9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af",
  creation_bytecode_keccak256:
    "0xc6ac291ad2557039055c8baf79d2ba085d4ecaffe8e474d5d932602a2fae4b1c",
  runtime_template_sha256:
    "421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409",
  runtime_template_keccak256:
    "0xf5850c03e88aa44017c1894784c23d1359ddcdd13acbebee64ae9e5b17cb713c",
  immutable_layout_sha256:
    "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b",
  settlement_executor: "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  settlement_credential_id: "buy-void-native-fulfillment-wallet-v1",
  closeout_controller: "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  sovereign_authorization_id:
    "voidcrasgaa1_fb46e3048b5921da3856de4548823b61f32e64f423bf5e7fd4758b9e04e27355",
});

const INPUT_KEYS = Object.freeze([
  "launchControllerEvidenceBytes",
  "launchControllerEvidenceFileSha256",
  "evaluationTimeUnix",
]);

const GIT_OVERRIDE_NAMES = Object.freeze([
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_NAMESPACE",
  "GIT_REPLACE_REF_BASE",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
]);

function fail(reason) {
  throw new Error(reason);
}

function canonicalJson(value) {
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

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
}

function canonicalAddress(value, code) {
  const text = String(value || "").toLowerCase();
  if (!ADDRESS.test(text) || text === "0x0000000000000000000000000000000000000000") {
    fail(code);
  }
  return text;
}

function rejectAmbientGitOverrides() {
  for (const key of GIT_OVERRIDE_NAMES) {
    if (process.env[key]) fail("ambient_git_override_forbidden:" + key);
  }
  for (const key of Object.keys(process.env)) {
    if (
      (/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/u.test(key)) &&
      process.env[key]
    ) {
      fail("ambient_git_override_forbidden:" + key);
    }
  }
  const probe = spawnSync(
    "/usr/bin/bash",
    ["--noprofile", "--norc", "-c", "command -v git"],
    {
      env: { ...process.env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (probe.error || probe.status !== 0) fail("ambient_git_unavailable");
  let resolved;
  try {
    resolved = fs.realpathSync.native(String(probe.stdout || "").trim());
  } catch {
    fail("ambient_git_identity_invalid");
  }
  if (resolved !== fs.realpathSync.native(GIT)) {
    fail("ambient_git_identity_invalid");
  }
}

function sanitizedGitEnv() {
  const env = { ...process.env };
  for (const key of GIT_OVERRIDE_NAMES) delete env[key];
  for (const key of Object.keys(env)) {
    if (/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/u.test(key)) delete env[key];
  }
  return {
    ...env,
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/bin/false",
  };
}

function git(args, { allowFail = false } = {}) {
  const result = spawnSync(GIT, ["--no-replace-objects", "-C", ROOT, ...args], {
    env: sanitizedGitEnv(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFail) fail("git_failed:" + args.join("_"));
  return result;
}

function gitText(args, code, { allowEmpty = false } = {}) {
  const text = String(git(args).stdout || "").trim();
  if (!allowEmpty && !text) fail(code);
  return text;
}

function checkedSpawn(command,args,{env=sanitizedGitEnv(),cwd="/",code}={}) {
  const result=spawnSync(command,args,{
    cwd,
    env,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    maxBuffer:64*1024*1024,
  });
  if(result.error||result.status!==0)fail(code||"reviewed_materialization_command_failed");
  return result;
}

function repositoryGitDir() {
  const raw=gitText(["rev-parse","--git-dir"],"repository_git_dir_unavailable");
  const resolved=path.isAbsolute(raw)?raw:path.resolve(ROOT,raw);
  const stat=fs.lstatSync(resolved);
  if(!stat.isDirectory()||stat.isSymbolicLink())fail("repository_git_dir_invalid");
  return fs.realpathSync.native(resolved);
}

function materializedBlob(treeRoot,relativePath,expectedBlob) {
  const file=path.resolve(treeRoot,relativePath);
  const relative=path.relative(treeRoot,file);
  if(
    relative===""||
    relative===".."||
    relative.startsWith(".."+path.sep)||
    path.isAbsolute(relative)
  )fail("reviewed_materialized_path_escape:"+relativePath);
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink()||!stat.isFile())fail("reviewed_materialized_file_invalid:"+relativePath);
  const bytes=fs.readFileSync(file);
  if(gitBlobSha1(bytes)!==expectedBlob){
    fail("reviewed_materialized_blob_mismatch:"+relativePath);
  }
  return bytes;
}

function writePrivateSource(file, bytes, mode = 0o400) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    mode,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fchmodSync(fd, mode);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function makePrivateTreeRemovable(root) {
  if (!fs.existsSync(root)) return;
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink()) return;
  if (stat.isDirectory()) {
    fs.chmodSync(root, 0o700);
    for (const entry of fs.readdirSync(root)) {
      makePrivateTreeRemovable(path.join(root, entry));
    }
  } else if (stat.isFile()) {
    fs.chmodSync(root, 0o600);
  }
}

async function withReviewedEthersPackageRoot(source, fn) {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-vault-role-reviewed-ethers-"),
  );
  fs.chmodSync(tempRoot, 0o700);
  try {
    const runtimeToolFile = path.join(tempRoot, "reviewed-node-runtime.mjs");
    writePrivateSource(
      runtimeToolFile,
      source.bytes[REVIEWED_RUNTIME_TOOL_REL],
      0o400,
    );
    const runtimeTool = await import(
      pathToFileURL(runtimeToolFile).href +
        "?blob=" +
        source.dependency_git_blobs[REVIEWED_RUNTIME_TOOL_REL]
    );
    for (const name of [
      "verifyReviewedNodePackageRuntimeV1",
      "materializeReviewedNodePackageRuntimeV1",
      "verifyMaterializedReviewedNodePackageRuntimeV1",
    ]) {
      if (typeof runtimeTool[name] !== "function") {
        fail("reviewed_node_runtime_export_missing:" + name);
      }
    }

    const profile = parseJsonBytes(
      source.bytes[REVIEWED_RUNTIME_PROFILE_REL],
      "reviewed_node_runtime_profile",
    );
    if (
      profile.marker !== "VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1" ||
      profile.status !== "REVIEWED_NODE_PACKAGE_RUNTIME_PROFILE" ||
      profile.version !== 1 ||
      profile.profile_id !== REVIEWED_RUNTIME_PROFILE_ID ||
      profile.packages_aggregate_sha256 !==
        REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256 ||
      canonicalJson(profile.root_packages) !== canonicalJson(["ethers"])
    ) {
      fail("reviewed_node_runtime_profile_invalid");
    }

    const verified = runtimeTool.verifyReviewedNodePackageRuntimeV1({
      profile,
      repoRoot: ROOT,
    });
    if (
      verified?.ok !== true ||
      verified.status !== "REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED" ||
      verified.profile_id !== REVIEWED_RUNTIME_PROFILE_ID ||
      verified.packages_aggregate_sha256 !==
        REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256
    ) {
      fail("reviewed_node_runtime_profile_not_verified");
    }

    const runtimeRoot = path.join(tempRoot, "runtime");
    const materialized =
      runtimeTool.materializeReviewedNodePackageRuntimeV1({
        profile,
        repoRoot: ROOT,
        destinationRoot: runtimeRoot,
      });
    if (
      materialized?.ok !== true ||
      materialized.status !==
        "PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED" ||
      materialized.profile_id !== REVIEWED_RUNTIME_PROFILE_ID ||
      materialized.packages_aggregate_sha256 !==
        REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256 ||
      materialized.read_only_materialization !== true
    ) {
      fail("reviewed_node_runtime_materialization_invalid");
    }

    const reverified =
      runtimeTool.verifyMaterializedReviewedNodePackageRuntimeV1({
        profile,
        repoRoot: ROOT,
        destinationRoot: runtimeRoot,
      });
    if (
      reverified?.ok !== true ||
      reverified.status !==
        "PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED"
    ) {
      fail("reviewed_node_runtime_materialization_reverification_failed");
    }

    return await fn(
      Object.freeze({
        runtimeRoot,
        profile,
        runtimeTool,
      }),
    );
  } finally {
    makePrivateTreeRemovable(tempRoot);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function reviewedControlEnv(treeRoot,gitDir) {
  return {
    PATH:"/usr/bin:/bin",
    HOME:"/nonexistent",
    XDG_CONFIG_HOME:"/nonexistent",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_TERMINAL_PROMPT:"0",
    GIT_ASKPASS:"/bin/false",
    GIT_DIR:gitDir,
    GIT_WORK_TREE:treeRoot,
  };
}

function restoreEnvironment(saved,keys) {
  for(const key of keys){
    if(saved[key]===undefined)delete process.env[key];
    else process.env[key]=saved[key];
  }
}

async function withReviewedControlReverifier(source,fn) {
  return await withReviewedEthersPackageRoot(
    source,
    async ({ runtimeRoot }) => {
      const gitDir=repositoryGitDir();
      const treeRoot=path.join(runtimeRoot,"source");
      const archive=path.join(runtimeRoot,"source.tar");
      fs.mkdirSync(treeRoot,{mode:0o700});
      try{
        checkedSpawn(
          GIT,
          [
            "--no-replace-objects",
            "-C",ROOT,
            "archive",
            "--format=tar",
            "--output="+archive,
            source.source_head_sha,
          ],
          {code:"reviewed_control_git_archive_failed"},
        );
        checkedSpawn(
          "/usr/bin/tar",
          ["-xf",archive,"-C",treeRoot],
          {code:"reviewed_control_git_archive_extract_failed"},
        );
        fs.unlinkSync(archive);

        for(const [relativePath,expectedBlob] of Object.entries(
          source.dependency_git_blobs,
        )){
          materializedBlob(treeRoot,relativePath,expectedBlob);
        }
        const controlExpected=
          VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1[
            CONTROL_REL
          ];
        materializedBlob(treeRoot,CONTROL_REL,controlExpected);

        checkedSpawn(
          "/usr/bin/chmod",
          ["-R","a-w",treeRoot],
          {code:"reviewed_control_readonly_lock_failed"},
        );

        const env=reviewedControlEnv(treeRoot,gitDir);
        const keys=Object.keys(env);
        const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
        Object.assign(process.env,env);
        try{
          const status=spawnSync(
            GIT,
            [
              "--no-replace-objects",
              "-c","core.fsmonitor=false",
              "-c","core.hooksPath=/dev/null",
              "-c","core.attributesFile=/dev/null",
              "-c","core.untrackedCache=false",
              "-c","core.preloadIndex=false",
              "-c","submodule.recurse=false",
              "-C",treeRoot,
              "status","--porcelain=v1","--untracked-files=all",
            ],
            {
              env,
              encoding:"utf8",
              stdio:["ignore","pipe","pipe"],
              maxBuffer:4*1024*1024,
            },
          );
          if(
            status.error||
            status.status!==0||
            String(status.stdout||"").trim()!==""
          )fail("reviewed_control_materialized_repository_not_clean");

          const controlModule=await import(
            pathToFileURL(path.join(treeRoot,CONTROL_REL)).href+
              "?reviewed_blob="+controlExpected+
              "&head="+source.source_head_sha
          );
          if(
            typeof controlModule.reverifyVoidWcVoidLaunchControllerControlEvidenceV1!==
              "function"
          )fail("launch_controller_reverification_export_invalid");
          return await fn(
            controlModule.reverifyVoidWcVoidLaunchControllerControlEvidenceV1,
          );
        }finally{
          restoreEnvironment(saved,keys);
        }
      } finally {
        makePrivateTreeRemovable(treeRoot);
      }
    },
  );
}

async function withReviewedEthersBridge(source, fn) {
  return await withReviewedEthersPackageRoot(
    source,
    async ({ runtimeRoot }) => {
      const sourceRoot = path.join(runtimeRoot, "source");
      fs.mkdirSync(sourceRoot, { mode: 0o700 });
      const bridgeFile = path.join(
        sourceRoot,
        "void-vault-role-reviewed-ethers-bridge.mjs",
      );
      const bridgeSource = [
        'import { AbiCoder, concat, keccak256 } from "ethers";',
        'export function deriveDeploymentMaterial(types,values,creationHex){',
        '  const encodedArgs=AbiCoder.defaultAbiCoder().encode(types,values);',
        '  const deploymentDataHex=concat([creationHex,encodedArgs]);',
        '  return {',
        '    encoded_args_hex:encodedArgs,',
        '    deployment_data_hex:deploymentDataHex,',
        '    creation_keccak256:keccak256(creationHex),',
        '    deployment_data_keccak256:keccak256(deploymentDataHex),',
        '  };',
        '}',
        '',
      ].join("\n");
      writePrivateSource(
        bridgeFile,
        Buffer.from(bridgeSource, "utf8"),
        0o400,
      );
      const bridge = await import(
        pathToFileURL(bridgeFile).href +
          "?sha256=" +
          sha256(Buffer.from(bridgeSource, "utf8"))
      );
      if (typeof bridge.deriveDeploymentMaterial !== "function") {
        fail("reviewed_ethers_bridge_export_invalid");
      }
      return await fn(
        bridge.deriveDeploymentMaterial,
        sha256(Buffer.from(bridgeSource, "utf8")),
      );
    },
  );
}

async function testOnlyYieldAfterSourceBinding() {
  if(
    process.env.VOID_TEST_VAULT_ROLE_QUALIFICATION_YIELD_AFTER_SOURCE_BINDING===
      "1"
  ){
    await new Promise(resolve=>setTimeout(resolve,120));
  }
}

function canonicalRemote(value) {
  const accepted = new Set([
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ]);
  const text = String(value || "").trim();
  if (!accepted.has(text)) fail("canonical_origin_required");
  return "https://github.com/6ZoSo9/void-node.git";
}

function readWorktreeBytes(relativePath, expectedBlob) {
  const file = path.resolve(ROOT, relativePath);
  const relative = path.relative(ROOT, file);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    fail("source_path_escape:" + relativePath);
  }
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size < 1 || stat.size > 16 * 1024 * 1024) {
    fail("source_file_invalid:" + relativePath);
  }
  const bytes = fs.readFileSync(file);
  if (gitBlobSha1(bytes) !== expectedBlob) {
    fail("source_worktree_blob_mismatch:" + relativePath);
  }
  return bytes;
}

function sourceBindingV1() {
  rejectAmbientGitOverrides();
  if (fs.realpathSync.native(ROOT) !== ROOT) fail("repository_root_alias_forbidden");
  const status = gitText(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "repository_status_unavailable",
    { allowEmpty: true },
  );
  if (status !== "") fail("repository_not_clean");
  const head = gitText(["rev-parse", "HEAD"], "repository_head_unavailable");
  const tree = gitText(["rev-parse", "HEAD^{tree}"], "repository_tree_unavailable");
  if (!HEX40.test(head) || !HEX40.test(tree)) fail("repository_identity_invalid");
  if (
    git(["merge-base", "--is-ancestor", REVIEWED_MAIN_ANCHOR, head], {
      allowFail: true,
    }).status !== 0
  ) {
    fail("reviewed_main_anchor_not_ancestor");
  }
  const remote = canonicalRemote(
    gitText(["config", "--get", "remote.origin.url"], "origin_url_unavailable"),
  );

  const bytes = {};
  const dependencies = {};
  const fileSha256 = {};
  for (const [relativePath, expectedBlob] of Object.entries(
    VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  )) {
    const headBlob = gitText(
      ["rev-parse", "HEAD:" + relativePath],
      "source_blob_unavailable:" + relativePath,
    );
    if (headBlob !== expectedBlob) fail("source_blob_mismatch:" + relativePath);
    const fileBytes = readWorktreeBytes(relativePath, expectedBlob);
    dependencies[relativePath] = expectedBlob;
    fileSha256[relativePath] = sha256(fileBytes);
    bytes[relativePath] = fileBytes;
  }

  const toolBlob = gitText(
    ["rev-parse", "HEAD:" + TOOL_REL],
    "qualification_tool_blob_unavailable",
  );
  if (!HEX40.test(toolBlob)) fail("qualification_tool_blob_invalid");
  const toolBytes = readWorktreeBytes(TOOL_REL, toolBlob);

  return Object.freeze({
    source_head_sha: head,
    source_tree_sha: tree,
    canonical_remote_url: remote,
    reviewed_main_anchor: REVIEWED_MAIN_ANCHOR,
    qualification_tool_git_blob_sha1: toolBlob,
    qualification_tool_file_sha256: sha256(toolBytes),
    dependency_git_blobs: Object.freeze({ ...dependencies }),
    dependency_file_sha256: Object.freeze({ ...fileSha256 }),
    bytes: Object.freeze(bytes),
  });
}

function parseJsonBytes(bytes, label) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(label + "_json_invalid");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + "_object_required");
  }
  return value;
}

function quotedField(source, field, code) {
  const escaped = field.replace(/[-/\\^$*+?.()|[\]{}]/gu, "\\$&");
  const match = source.match(
    new RegExp(escaped + "\\s*:\\s*\"([^\"]+)\"", "u"),
  );
  if (!match) fail(code);
  return match[1];
}

function deriveCurrentRoleAndVaultSources(source) {
  const acceptance = parseJsonBytes(
    source.bytes[ACCEPTANCE_REL],
    "compiled_identity_acceptance",
  );
  const correction = parseJsonBytes(
    source.bytes[CORRECTION_REL],
    "compiled_identity_correction_v2",
  );
  if (
    correction?.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2" ||
    correction?.version !== 2 ||
    correction?.status !==
      "COMPILED_IDENTITY_V1_BYTECODE_SUPERSEDED_DEPLOYMENT_HOLD" ||
    correction?.accepted_identity?.identity_id !== EXPECTED.compiled_identity_id ||
    correction?.canonical_compiler_artifacts?.creation_bytecode_sha256 !==
      "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540" ||
    correction?.canonical_compiler_artifacts?.runtime_template_sha256 !==
      "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e" ||
    correction?.coupled_launch_effect?.corrected_coupled_launch_id !==
      "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d" ||
    correction?.decision?.v1_acceptance_deployment_artifact_superseded !== true ||
    correction?.decision?.deployment_authorized !== false
  ) {
    fail("compiled_identity_correction_v2_invalid");
  }
  fail("compiled_identity_v1_superseded_by_correction_v2");
  const coupled = parseJsonBytes(source.bytes[COUPLED_REL], "coupled_candidate");
  const sovereign = parseJsonBytes(
    source.bytes[SOVEREIGN_REL],
    "sovereign_authorization",
  );
  const walletSource = source.bytes[WALLET_REL].toString("utf8");
  const contractSource = source.bytes[CONTRACT_REL].toString("utf8");

  if (
    acceptance?.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_PACKET_V1" ||
    acceptance?.status !==
      "COMPILED_IDENTITY_ACCEPTED_HELD_ON_CHAIN2050_DEPLOYMENT_ATTESTATION" ||
    acceptance?.accepted_identity?.identity_id !== EXPECTED.compiled_identity_id ||
    acceptance?.accepted_identity?.identity_json_sha256 !==
      EXPECTED.identity_json_sha256 ||
    acceptance?.source?.contract_name !== "WCVoidMarketVaultV2" ||
    acceptance?.source?.contract_path !== CONTRACT_REL ||
    acceptance?.source?.contract_source_sha256 !== EXPECTED.contract_source_sha256 ||
    acceptance?.artifacts?.creation_bytecode_sha256 !==
      EXPECTED.creation_bytecode_sha256 ||
    acceptance?.artifacts?.creation_bytecode_keccak256 !==
      EXPECTED.creation_bytecode_keccak256 ||
    acceptance?.artifacts?.runtime_template_sha256 !==
      EXPECTED.runtime_template_sha256 ||
    acceptance?.artifacts?.runtime_template_keccak256 !==
      EXPECTED.runtime_template_keccak256 ||
    acceptance?.artifacts?.immutable_layout_sha256 !==
      EXPECTED.immutable_layout_sha256 ||
    acceptance?.deployment_identity_requirements?.constructor_signature !==
      "constructor(address,address,address,address,bytes32)" ||
    canonicalJson(
      acceptance?.deployment_identity_requirements?.constructor_order,
    ) !==
      canonicalJson([
        "void_token",
        "launch_controller",
        "settlement_executor",
        "closeout_controller",
        "coupled_launch_id",
      ]) ||
    acceptance?.deployment_identity_requirements
      ?.live_opening_inventory_atoms_must_equal !==
      "10000000000000000000000000"
  ) {
    fail("compiled_identity_acceptance_drift");
  }
  if (sha256(Buffer.from(contractSource, "utf8")) !== EXPECTED.contract_source_sha256) {
    fail("contract_source_sha256_mismatch");
  }

  if (
    coupled?.marker !== "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1" ||
    coupled?.version !== 1 ||
    coupled?.chain_id !== EXPECTED.chain_id ||
    coupled?.execution_epoch !== EXPECTED.execution_epoch ||
    coupled?.shared_post_discovery_reconciliation?.coupled_launch_id !==
      EXPECTED.coupled_launch_id ||
    canonicalAddress(
      coupled?.shared_post_discovery_reconciliation?.void_token,
      "coupled_void_token_invalid",
    ) !== EXPECTED.void_token
  ) {
    fail("coupled_launch_identity_drift");
  }

  if (
    sovereign?.marker !==
      "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_AUTHORIZATION_V1" ||
    sovereign?.status !==
      "authorized_exact_single_sovereign_genesis_registry_append" ||
    canonicalAddress(
      sovereign?.owner_address,
      "sovereign_owner_invalid",
    ) !== EXPECTED.closeout_controller ||
    sovereign?.authorization_id !== EXPECTED.sovereign_authorization_id ||
    sovereign?.candidate?.identity_id !== "sovereign.zoso"
  ) {
    fail("sovereign_identity_drift");
  }

  const walletExpected = canonicalAddress(
    quotedField(
      walletSource,
      "expected_wallet_address",
      "settlement_expected_wallet_missing",
    ),
    "settlement_expected_wallet_invalid",
  );
  const walletDerived = canonicalAddress(
    quotedField(
      walletSource,
      "derived_wallet_address",
      "settlement_derived_wallet_missing",
    ),
    "settlement_derived_wallet_invalid",
  );
  const credentialId = quotedField(
    walletSource,
    "credential_id",
    "settlement_credential_id_missing",
  );
  if (
    walletExpected !== EXPECTED.settlement_executor ||
    walletDerived !== EXPECTED.settlement_executor ||
    walletExpected !== walletDerived ||
    credentialId !== EXPECTED.settlement_credential_id ||
    !walletSource.includes("exact_wallet_binding: true") ||
    !walletSource.includes("transaction_broadcast_performed: false") ||
    !walletSource.includes("inventory_funding_performed: false")
  ) {
    fail("settlement_executor_identity_drift");
  }

  const creationHex = String(acceptance.artifacts.creation_bytecode_hex || "");
  if (
    !/^0x[0-9a-f]+$/u.test(creationHex) ||
    creationHex.length % 2 !== 0
  ) {
    fail("creation_bytecode_hex_invalid");
  }
  const creationBytes = Buffer.from(creationHex.slice(2), "hex");
  if (
    creationBytes.length !== acceptance.artifacts.creation_bytecode_bytes ||
    sha256(creationBytes) !== EXPECTED.creation_bytecode_sha256
  ) {
    fail("creation_bytecode_identity_mismatch");
  }

  return Object.freeze({
    acceptance,
    creation_hex: creationHex,
    settlement_executor: walletExpected,
    settlement_credential_id: credentialId,
    closeout_controller: EXPECTED.closeout_controller,
  });
}

function parseEvidenceBytes(bytes, expectedSha) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 2 ||
    bytes.length > MAX_EVIDENCE_BYTES
  ) {
    fail("launch_controller_evidence_bytes_invalid");
  }
  if (!HEX64.test(String(expectedSha || ""))) {
    fail("launch_controller_evidence_sha256_invalid");
  }
  if (sha256(bytes) !== expectedSha) {
    fail("launch_controller_evidence_sha256_mismatch");
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const value = parseJsonBytes(bytes, "launch_controller_evidence");
  if (text !== JSON.stringify(value, null, 2) + "\n") {
    fail("launch_controller_evidence_serialization_invalid");
  }
  return value;
}

function evaluationUnix(value) {
  const text = String(value || "");
  if (!UINT.test(text)) fail("evaluation_time_unix_invalid");
  const number = BigInt(text);
  if (number > (1n << 64n) - 1n) fail("evaluation_time_unix_invalid");
  return text;
}

function assertSourceStable(before) {
  const after = sourceBindingV1();
  const strip = (value) => ({
    source_head_sha: value.source_head_sha,
    source_tree_sha: value.source_tree_sha,
    canonical_remote_url: value.canonical_remote_url,
    reviewed_main_anchor: value.reviewed_main_anchor,
    qualification_tool_git_blob_sha1: value.qualification_tool_git_blob_sha1,
    qualification_tool_file_sha256: value.qualification_tool_file_sha256,
    dependency_git_blobs: value.dependency_git_blobs,
    dependency_file_sha256: value.dependency_file_sha256,
  });
  if (canonicalJson(strip(before)) !== canonicalJson(strip(after))) {
    fail("repository_source_changed_during_qualification");
  }
}

export async function qualifyVoidWcVoidMarketVaultRoleDeploymentV1(input) {
  exactObject(input, INPUT_KEYS, "qualification_input_keys_invalid");
  const evaluation = evaluationUnix(input.evaluationTimeUnix);
  const evidence = parseEvidenceBytes(
    input.launchControllerEvidenceBytes,
    input.launchControllerEvidenceFileSha256,
  );

  const source = sourceBindingV1();
  const current = deriveCurrentRoleAndVaultSources(source);
  await testOnlyYieldAfterSourceBinding();

  const control=await withReviewedControlReverifier(
    source,
    async reverify=>
      await reverify({
        evidence,
        nowUnix:evaluation,
      }),
  );
  if (
    control?.status !== "CANDIDATE_CONTROL_VERIFIED_ROLE_NOT_AUTHORIZED" ||
    control?.evidence_reverified !== true ||
    control?.control_verified !== true ||
    control?.coupled_launch_id !== EXPECTED.coupled_launch_id ||
    control?.coupled_launch_id_bytes32 !== EXPECTED.coupled_launch_id_bytes32 ||
    control?.compiled_identity_id !== EXPECTED.compiled_identity_id ||
    canonicalAddress(
      control?.void_token,
      "control_void_token_invalid",
    ) !== EXPECTED.void_token ||
    control?.role_binding_authorized !== false ||
    control?.deployment_authorized !== false ||
    control?.inventory_funding_authorized !== false ||
    control?.market_activation_authorized !== false ||
    control?.public_presale_activation_authorized !== false ||
    control?.funds_movement_authorized !== false
  ) {
    fail("launch_controller_control_evidence_invalid");
  }

  const launchController = canonicalAddress(
    control.candidate_address,
    "launch_controller_address_invalid",
  );
  const roles = [
    EXPECTED.void_token,
    launchController,
    current.settlement_executor,
    current.closeout_controller,
  ];
  if (new Set(roles).size !== roles.length) {
    fail("vault_role_address_collision");
  }

  const constructorTypes = [
    "address",
    "address",
    "address",
    "address",
    "bytes32",
  ];
  const constructorValues = [
    EXPECTED.void_token,
    launchController,
    current.settlement_executor,
    current.closeout_controller,
    EXPECTED.coupled_launch_id_bytes32,
  ];
  const reviewedEthers = await withReviewedEthersBridge(
    source,
    async (deriveDeploymentMaterial, bridgeSha256) =>
      Object.freeze({
        ...deriveDeploymentMaterial(
          constructorTypes,
          constructorValues,
          current.creation_hex,
        ),
        bridge_sha256: bridgeSha256,
      }),
  );
  const encodedArgs = reviewedEthers.encoded_args_hex;
  const deploymentDataHex = reviewedEthers.deployment_data_hex;
  const deploymentBytes = Buffer.from(deploymentDataHex.slice(2), "hex");
  if (
    reviewedEthers.creation_keccak256 !== EXPECTED.creation_bytecode_keccak256
  ) {
    fail("creation_bytecode_keccak256_mismatch");
  }

  const constructorMaterial = Object.freeze({
    constructor_signature:
      "constructor(address,address,address,address,bytes32)",
    constructor_order: Object.freeze([
      "void_token",
      "launch_controller",
      "settlement_executor",
      "closeout_controller",
      "coupled_launch_id",
    ]),
    values: Object.freeze({
      void_token: EXPECTED.void_token,
      launch_controller: launchController,
      settlement_executor: current.settlement_executor,
      closeout_controller: current.closeout_controller,
      coupled_launch_id: EXPECTED.coupled_launch_id_bytes32,
    }),
    abi_encoded_arguments_hex: encodedArgs,
  });

  const sourceReceipt = Object.freeze({
    source_head_sha: source.source_head_sha,
    source_tree_sha: source.source_tree_sha,
    canonical_remote_url: source.canonical_remote_url,
    reviewed_main_anchor: source.reviewed_main_anchor,
    qualification_tool_git_blob_sha1:
      source.qualification_tool_git_blob_sha1,
    qualification_tool_file_sha256:
      source.qualification_tool_file_sha256,
    dependency_git_blobs: source.dependency_git_blobs,
    dependency_file_sha256: source.dependency_file_sha256,
  });

  const material = Object.freeze({
    marker: VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1,
    version: 1,
    status: "QUALIFIED_DEPLOYMENT_PREPARATION_READY_NOT_AUTHORIZED",
    chain_id: EXPECTED.chain_id,
    execution_epoch: EXPECTED.execution_epoch,
    coupled_launch_id: EXPECTED.coupled_launch_id,
    source_binding: sourceReceipt,
    launch_controller: Object.freeze({
      address: launchController,
      evidence_id: control.evidence_id,
      evidence_file_sha256: input.launchControllerEvidenceFileSha256,
      evidence_source_head_sha: control.source_head_sha,
      evidence_source_binding_sha256: control.source_binding_sha256,
      verified_at_unix: control.verified_at_unix,
      reverified_at_unix: control.reverified_at_unix,
      valid_until_unix: control.valid_until_unix,
      control_verified: true,
      role_binding_authorized: false,
    }),
    settlement_executor: Object.freeze({
      address: current.settlement_executor,
      source_path: WALLET_REL,
      credential_id: current.settlement_credential_id,
      public_identity_requalified: true,
      role_binding_authorized: false,
    }),
    closeout_controller: Object.freeze({
      address: current.closeout_controller,
      source_path: SOVEREIGN_REL,
      source_authorization_id: EXPECTED.sovereign_authorization_id,
      public_identity_requalified: true,
      role_binding_authorized: false,
    }),
    role_separation: Object.freeze({
      all_addresses_nonzero: true,
      all_addresses_distinct: true,
      void_token_distinct_from_all_roles: true,
    }),
    reviewed_package_runtime: Object.freeze({
      runtime_tool_path: REVIEWED_RUNTIME_TOOL_REL,
      runtime_tool_git_blob_sha1:
        source.dependency_git_blobs[REVIEWED_RUNTIME_TOOL_REL],
      runtime_profile_path: REVIEWED_RUNTIME_PROFILE_REL,
      runtime_profile_git_blob_sha1:
        source.dependency_git_blobs[REVIEWED_RUNTIME_PROFILE_REL],
      profile_id: REVIEWED_RUNTIME_PROFILE_ID,
      packages_aggregate_sha256:
        REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256,
      root_packages: Object.freeze(["ethers"]),
      qualification_bridge_sha256: reviewedEthers.bridge_sha256,
      reviewed_package_bytes_verified: true,
      ancestor_package_resolution_preempted: true,
      execution_network_isolation_provided: false,
    }),
    vault_identity: Object.freeze({
      contract_name: "WCVoidMarketVaultV2",
      canonical_void_token: EXPECTED.void_token,
      accepted_compiled_identity_id: EXPECTED.compiled_identity_id,
      accepted_identity_json_sha256: EXPECTED.identity_json_sha256,
      contract_source_sha256: EXPECTED.contract_source_sha256,
      creation_bytecode_sha256: EXPECTED.creation_bytecode_sha256,
      creation_bytecode_keccak256: EXPECTED.creation_bytecode_keccak256,
      runtime_template_sha256: EXPECTED.runtime_template_sha256,
      runtime_template_keccak256: EXPECTED.runtime_template_keccak256,
      immutable_layout_sha256: EXPECTED.immutable_layout_sha256,
      runtime_attestation_source_path: ATTESTATION_REL,
    }),
    deployment_preparation: Object.freeze({
      constructor: constructorMaterial,
      constructor_material_sha256:
        sha256(Buffer.from(canonicalJson(constructorMaterial), "utf8")),
      deployment_data_hex: deploymentDataHex,
      deployment_data_bytes: deploymentBytes.length,
      deployment_data_sha256: sha256(deploymentBytes),
      deployment_data_keccak256: reviewedEthers.deployment_data_keccak256,
      exact_creation_payload_ready: true,
      deployer_selected: false,
      nonce_observed: false,
      fee_observed: false,
      transaction_envelope_ready: false,
      deployment_authorized: false,
      inventory_funding_authorized: false,
    }),
    next_gate:
      "separately_authorized_exact_market_vault_deployment_and_inventory_lock",
    authority:
      VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1,
  });

  const qualification = Object.freeze({
    ...material,
    qualification_id:
      "voidwcvrdq1_" +
      sha256(Buffer.from(canonicalJson(material), "utf8")),
  });
  assertSourceStable(source);
  return qualification;
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readExternalEvidence(file, expectedSha) {
  if (!file || !path.isAbsolute(file) || path.resolve(file) !== file) {
    fail("evidence_path_invalid");
  }
  const relative = path.relative(ROOT, file);
  if (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative))
  ) {
    fail("evidence_must_be_outside_repository");
  }
  if (fs.realpathSync.native(file) !== file) fail("evidence_path_alias_forbidden");
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size < 2 || stat.size > MAX_EVIDENCE_BYTES) {
    fail("evidence_file_invalid");
  }
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== expectedSha) fail("launch_controller_evidence_sha256_mismatch");
  return bytes;
}

function writePrivateJson(file, value) {
  if (!file || !path.isAbsolute(file) || path.resolve(file) !== file) {
    fail("output_path_invalid");
  }
  const relative = path.relative(ROOT, file);
  if (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative))
  ) {
    fail("output_must_be_outside_repository");
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) fail("output_parent_alias_forbidden");
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n");
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
  } finally {
    fs.closeSync(fd);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const evidencePath = path.resolve(String(arg("--control-evidence") || ""));
    const expectedSha = String(arg("--expected-evidence-sha256") || "");
    const evaluation = String(arg("--evaluation-time-unix") || "");
    const output = path.resolve(String(arg("--output") || ""));
    if (!HEX64.test(expectedSha)) fail("launch_controller_evidence_sha256_invalid");
    const qualification =
      await qualifyVoidWcVoidMarketVaultRoleDeploymentV1({
        launchControllerEvidenceBytes:
          readExternalEvidence(evidencePath, expectedSha),
        launchControllerEvidenceFileSha256: expectedSha,
        evaluationTimeUnix: evaluation,
      });
    writePrivateJson(output, qualification);
    console.log(VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1);
    console.log("status=" + qualification.status);
    console.log("qualification_id=" + qualification.qualification_id);
    console.log("launch_controller=" + qualification.launch_controller.address);
    console.log("settlement_executor=" + qualification.settlement_executor.address);
    console.log("closeout_controller=" + qualification.closeout_controller.address);
    console.log("exact_creation_payload_ready=true");
    console.log("deployment_authorized=false");
    console.log("inventory_funding_authorized=false");
    console.log("market_activation=false");
    console.log("public_presale_activation=false");
    console.log("funds_movement=false");
    console.log("output=" + output);
  } catch (error) {
    console.error(
      "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1_HOLD",
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
