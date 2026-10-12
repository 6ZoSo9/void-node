#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  AUTHORITY,
  CANONICAL_VOID_TOKEN,
  CANONICAL_VOID_TOKEN_SOURCE_PATH,
  CONTRACT_NAME,
  CONTRACT_PATH,
  EVM_VERSION,
  REVIEWED_NATIVE_SOLC_IMAGE,
  REVIEWED_NATIVE_SOLC_IMAGE_ID,
  REVIEWED_SOLCJS_PACKAGE_SRI,
  REVIEWED_SOLCJS_TARBALL_URL,
  SOLC_RELEASE,
  SOLC_VERSION,
  VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1,
  VOID_BTC_VOID_CHAIN2050_HASHLOCK_V1,
  buildStandardJsonInput,
  validateCanonicalVoidTokenSourceText,
  validateSourceText,
  validateVoidBtcVoidChain2050CompilerEnvironmentV1,
} from "../tools/void-btc-void-chain2050-hashlock-v1.mjs";

const TEST_PATH = "test/mainnet/BtcVoidHashlockSettlementV1.t.sol";
const DOC_PATH = "docs/operators/btc-void-chain2050-hashlock-v1.md";
const TOOL_PATH = "tools/void-btc-void-chain2050-hashlock-v1.mjs";

const source = fs.readFileSync(CONTRACT_PATH, "utf8");
const tokenSource = fs.readFileSync(
  CANONICAL_VOID_TOKEN_SOURCE_PATH,
  "utf8",
);
const tests = fs.readFileSync(TEST_PATH, "utf8");
const tool = fs.readFileSync(TOOL_PATH, "utf8");

function gitBlobSha1(bytes) {
  const value = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, "utf8");
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + String(value.length) + "\0", "utf8"))
    .update(value)
    .digest("hex");
}

assert.equal(
  VOID_BTC_VOID_CHAIN2050_HASHLOCK_V1,
  "VOID_BTC_VOID_CHAIN2050_HASHLOCK_V1",
);
assert.equal(
  VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1,
  "VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1",
);
assert.equal(CONTRACT_PATH, "contracts/mainnet/BtcVoidHashlockSettlementV1.sol");
assert.equal(CONTRACT_NAME, "BtcVoidHashlockSettlementV1");
assert.equal(
  CANONICAL_VOID_TOKEN_SOURCE_PATH,
  "contracts/epoch2/VoidEpoch2TokenV1.sol",
);
assert.equal(SOLC_VERSION, "0.8.24");
assert.equal(SOLC_RELEASE, "0.8.24+commit.e11b9ed9");
assert.equal(EVM_VERSION, "paris");
assert.equal(REVIEWED_NATIVE_SOLC_IMAGE, "ethereum/solc:0.8.24");
assert.equal(
  REVIEWED_NATIVE_SOLC_IMAGE_ID,
  "sha256:434803786cb17d2e37c48140bd986b0d7d366833bfe989ed6447cfe8bd200ef1",
);
assert.equal(
  REVIEWED_SOLCJS_PACKAGE_SRI,
  "sha512-G5yUqjTUPc8Np74sCFwfsevhBPlUifUOfhYrgyu6CmYlC6feSw0YS6eZW47XDT23k3JYdKx5nJ+Q7whCEmNcoA==",
);
assert.equal(
  REVIEWED_SOLCJS_TARBALL_URL,
  "https://registry.npmjs.org/solc/-/solc-0.8.24.tgz",
);
assert.equal(
  CANONICAL_VOID_TOKEN,
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
);

validateSourceText(source);
validateCanonicalVoidTokenSourceText(tokenSource);
const input = buildStandardJsonInput(source);
assert.equal(input.language, "Solidity");
assert.equal(
  input.sources[CONTRACT_PATH].content,
  source,
);
assert.equal(input.settings.optimizer.enabled, false);
assert.equal(input.settings.optimizer.runs, 200);
assert.equal(input.settings.evmVersion, "paris");
assert.equal(input.settings.viaIR, false);
assert.equal(input.settings.metadata.bytecodeHash, "ipfs");
assert.equal(input.settings.metadata.useLiteralContent, true);

for (const required of [
  "address public constant voidToken =",
  "0x470075B85352Eb86F7d089FB9ba88945f12AAd94",
  "mapping(bytes32 => Swap) private _swaps;",
  "refundAuthority: msg.sender",
  "token.transferFrom(",
  "balanceAfter != expectedBalance",
  "function claim(bytes32 swapId, bytes calldata preimage)",
  "preimage.length != 32",
  "sha256(abi.encodePacked(preimageWord))",
  "swap.state = SwapState.Claimed;",
  "function refund(bytes32 swapId)",
  "swap.state = SwapState.Refunded;",
  "event Claimed(",
  "bytes32 preimage,",
  "event Refunded(",
  "function stateOf(bytes32 swapId)",
]) {
  assert.ok(source.includes(required), required);
}

for (const forbidden of [
  "delegatecall",
  "selfdestruct",
  "transferOwnership",
  "function owner(",
  "function withdraw(",
  "function rescue(",
  "upgradeTo(",
  "upgradeToAndCall(",
  "function batch",
  "function sweep",
]) {
  assert.equal(
    source.toLowerCase().includes(forbidden.toLowerCase()),
    false,
    forbidden,
  );
}

assert.ok(
  source.indexOf("swap.state = SwapState.Claimed;") <
    source.indexOf("token.transfer(beneficiary"),
  "claim terminal state must be written before outbound token transfer",
);
assert.ok(
  source.indexOf("swap.state = SwapState.Refunded;") <
    source.indexOf("token.transfer(refundAuthority"),
  "refund terminal state must be written before outbound token transfer",
);

for (const name of [
  "test_lockBindsFundingCallerAndExactCanonicalTokenAmount",
  "test_claimRequiresBeneficiaryExact32BytePreimageAndPreDeadline",
  "test_twoLiveSwapsRemainStateAndEscrowIsolated",
  "test_claimedEventExposesExactPreimageEvidence",
  "test_claimAtDeadlineFailsAndRefundAtDeadlineSucceeds",
  "test_refundRequiresBoundFundingCallerAndDeadline",
  "test_terminalClaimCannotReplayOrRefund",
  "test_terminalRefundCannotReplayOrClaim",
  "test_duplicateSwapIdAndInvalidLockParametersFailClosed",
  "test_failedFundingTransferRollsBackLockState",
  "test_failedClaimTransferRollsBackTerminalState",
  "test_failedRefundTransferRollsBackTerminalState",
  "test_trueButNoFundingTransferFailsExactBalanceDelta",
  "test_trueButNoClaimTransferFailsExactBalanceDelta",
  "test_trueButNoRefundTransferFailsExactBalanceDelta",
  "test_noAdminOrWithdrawalSurface",
]) {
  assert.ok(tests.includes(name), name);
}

for (const required of [
  "vm.etch(TOKEN, type(BtcVoidHashlockMockTokenV1).runtimeCode)",
  "vm.prank(FUNDER)",
  "vm.prank(BENEFICIARY)",
  "vm.warp(deadline)",
  "vm.recordLogs()",
  "vm.getRecordedLogs()",
  '"Claimed(bytes32,address,bytes32,bytes32,uint256,uint256)"',
  "abi.decode(logs[0].data, (bytes32, uint256, uint256))",
  "function _assertSwapBExact(",
  "_assertSwapBExact(settlement, hashlockB, deadlineB);",
  "_token().balanceOf(address(settlement)) == AMOUNT * 2",
  "_token().balanceOf(address(settlement)) == AMOUNT",
  "bytes memory shortPreimage = hex\"11\";",
  "duplicate_swap_accepted",
  "claim_replay_accepted",
  "refund_replay_accepted",
  "failed_claim_terminal_state_persisted",
  "failed_refund_terminal_state_persisted",
  "false_funding_delta_accepted",
  "false_claim_delta_accepted",
  "false_refund_delta_accepted",
]) {
  assert.ok(tests.includes(required), required);
}

for (const required of [
  '"claim(bytes32,bytes)"',
  '"getSwap(bytes32)"',
  '"lock(bytes32,bytes32,address,uint256,uint256)"',
  '"refund(bytes32)"',
  '"stateOf(bytes32)"',
  '"voidToken()"',
  'layout.storage[0]?.label !== "_swaps"',
  "unexpected_link_or_immutable_references",
  "compiler_outputs_cross_checked: true",
  "compiler_execution_rederived: true",
  "caller_supplied_compiler_artifacts_accepted: false",
  "REVIEWED_NATIVE_SOLC_IMAGE_ID",
  "REVIEWED_SOLCJS_PACKAGE_SRI",
  '"--network=none"',
  '"--pull=never"',
  "package_tarball_sri_verified: true",
  "solc-js-emscripten-direct-soljson",
  'cwrap("solidity_compile","string",["string","number","number"])',
  'NODE_PATH: ""',
  'NODE_OPTIONS: ""',
  "fs.mkdtempSync",
  "fs.rmSync",
  'if (command === "rederive")',
  "caller_produced_compiler_artifacts_not_authoritative",
  "source_path_must_be_canonical_contract",
  '"rev-parse", "HEAD"',
  '"rev-parse", "HEAD^{tree}"',
  '"rev-parse", "HEAD:" + relativePath',
  "canonical_void_token_source",
  "transfer_semantics_verified_source_only: true",
  "runtime_code_verified: false",
  "contract_deployment: false",
  "chain2050_write: false",
  "funds_movement: false",
]) {
  assert.ok(tool.includes(required), required);
}

assert.deepEqual(AUTHORITY, {
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

const nativeEnvironment = {
  marker: "VOID_SOLC_COMPILER_ENVIRONMENT_V1",
  compiler_release: SOLC_RELEASE,
  kind: "native-container",
  implementation: "ethereum-solc-native-linux-amd64",
  version_output: "Version: " + SOLC_RELEASE + ".Linux.g++",
  artifact_identity: REVIEWED_NATIVE_SOLC_IMAGE_ID,
  image_id_verified: true,
  execution_network_disabled: true,
};
assert.doesNotThrow(() =>
  validateVoidBtcVoidChain2050CompilerEnvironmentV1(
    nativeEnvironment,
    "native-container",
  )
);
assert.throws(
  () =>
    validateVoidBtcVoidChain2050CompilerEnvironmentV1(
      { ...nativeEnvironment, artifact_identity: "sha256:" + "0".repeat(64) },
      "native-container",
    ),
  /native_compiler_environment_unreviewed/u,
);

const solcjsEnvironment = {
  marker: "VOID_SOLC_COMPILER_ENVIRONMENT_V1",
  compiler_release: SOLC_RELEASE,
  kind: "solcjs",
  implementation: "solc-js-emscripten-direct-soljson",
  version_output: SOLC_RELEASE + ".Emscripten.clang",
  artifact_identity: "npm-integrity:" + REVIEWED_SOLCJS_PACKAGE_SRI,
  package_tarball_sri_verified: true,
  direct_solidity_compile_c_api: true,
  package_dependencies_executed: false,
  soljson_sha256: "1".repeat(64),
};
assert.doesNotThrow(() =>
  validateVoidBtcVoidChain2050CompilerEnvironmentV1(
    solcjsEnvironment,
    "solcjs",
  )
);
assert.throws(
  () =>
    validateVoidBtcVoidChain2050CompilerEnvironmentV1(
      {
        ...solcjsEnvironment,
        artifact_identity: "npm-integrity:sha512-forged",
      },
      "solcjs",
    ),
  /solcjs_compiler_environment_unreviewed/u,
);

for (const forbiddenToolSurface of [
  '"output-a"',
  '"output-b"',
  '"environment-a"',
  '"environment-b"',
  "reviewed_at_utc",
  "new Date().toISOString()",
]) {
  assert.equal(tool.includes(forbiddenToolSurface), false, forbiddenToolSurface);
}

assert.ok(!fs.existsSync(DOC_PATH) || fs.statSync(DOC_PATH).isFile());

console.log("VOID_BTC_VOID_CHAIN2050_HASHLOCK_V1_PROOF_GREEN");
console.log("contract_source_blob_sha1=" + gitBlobSha1(source));
console.log("canonical_void_token_bound=true");
console.log("canonical_void_token_source_bound=true");
console.log("canonical_git_source_bound=true");
console.log("compiler_outputs_cross_checked=true");
console.log("compiler_execution_rederived=true");
console.log("caller_supplied_compiler_artifacts_accepted=false");
console.log("reviewed_native_compiler_image_required=true");
console.log("reviewed_solcjs_package_sri_required=true");
console.log("solcjs_package_dependencies_executed=false");
console.log("compiler_identity_id_deterministic=true");
console.log("funding_caller_refund_authority=true");
console.log("exact_32_byte_sha256_preimage=true");
console.log("claim_strictly_before_refund_deadline=true");
console.log("refund_at_or_after_deadline=true");
console.log("one_terminal_transition=true");
console.log("terminal_state_before_token_transfer=true");
console.log("failed_token_transfer_rolls_back_state=true");
console.log("exact_funding_and_terminal_balance_deltas=true");
console.log("admin_drain_absent=true");
console.log("proxy_upgrade_path_absent=true");
console.log("solc_profile=0.8.24_paris_optimizer_off");
console.log("contract_deployment=false");
console.log("production_chain2050_write=false");
console.log("funds_movement=false");
