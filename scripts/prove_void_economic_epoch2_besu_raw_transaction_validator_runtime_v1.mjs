#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Wallet } from "ethers";

const CHAIN_ID = 2050n;
const MARKER_ADDRESS = "0x0000000000000000000000000000000000002050";
const MARKER_STORAGE_KEY =
  "0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7";
const PLUGIN_JAR = "void-epoch2-raw-transaction-domain-plugin-v1.jar";
const PLUGIN_ARTIFACT_MANIFEST =
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json";
const EXPECTED_PLUGIN_RPC_MESSAGE = "Plugin has marked the transaction as invalid";

function fail(message, detail = null) {
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function lowerAddress(value) {
  const text = String(value || "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(text)) fail("address_invalid", { value });
  return text;
}

function exactHex(value, bytes, label) {
  const text = String(value || "").toLowerCase();
  const re = new RegExp(`^0x[0-9a-f]{${bytes * 2}}$`);
  if (!re.test(text)) fail(label, { value: text });
  return text;
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(filename) {
  return sha256Bytes(fs.readFileSync(filename));
}

function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

async function rpcEnvelope(url, method, params = []) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) {
    fail("rpc_http_error", { method, status: response.status });
  }
  const payload = await response.json();
  if (!payload || payload.jsonrpc !== "2.0" || payload.id !== 1) {
    fail("rpc_envelope_invalid", { method, payload });
  }
  return payload;
}

async function rpc(url, method, params = []) {
  const payload = await rpcEnvelope(url, method, params);
  if (payload.error) {
    fail("rpc_error", {
      method,
      code: payload.error.code,
      message: payload.error.message,
      data: payload.error.data ?? null,
    });
  }
  return payload.result;
}

async function prepare(workDir, validatorAddress, extraDataFile) {
  const validator = lowerAddress(validatorAddress);
  const extraData = fs.readFileSync(extraDataFile, "utf8").trim().toLowerCase();
  if (!/^0x[0-9a-f]+$/.test(extraData) || extraData.length < 100) {
    fail("qbft_extra_data_invalid");
  }

  const genesis = {
    config: {
      chainId: Number(CHAIN_ID),
      berlinBlock: 0,
      londonBlock: 0,
      shanghaiTime: 0,
      zeroBaseFee: true,
      qbft: {
        epochlength: 30000,
        blockperiodseconds: 1,
        emptyblockperiodseconds: 0,
        requesttimeoutseconds: 2,
        blockreward: "0",
      },
    },
    nonce: "0x0",
    timestamp: "0x0",
    extraData,
    gasLimit: "0x1c9c380",
    difficulty: "0x1",
    mixHash:
      "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
    coinbase: "0x0000000000000000000000000000000000000000",
    baseFeePerGas: "0x0",
    alloc: {},
  };

  fs.mkdirSync(workDir, { recursive: true });
  fs.writeFileSync(
    path.join(workDir, "genesis.json"),
    JSON.stringify(genesis, null, 2) + "\n",
  );

  process.stdout.write(
    [
      "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_PREPARE_V1",
      "chain_id=2050",
      "execution_epoch=2",
      "validator_count=1",
      "zero_base_fee=true",
      "native_prefund_account_count=0",
      "secret_material_logged=false",
    ].join("\n") + "\n",
  );
}

async function expectPluginRejected(url, raw, label) {
  const payload = await rpcEnvelope(url, "eth_sendRawTransaction", [raw]);
  if (!payload.error) {
    fail("expected_plugin_rejection_missing", {
      label,
      result: payload.result ?? null,
    });
  }
  if (
    payload.error.code !== -32000 ||
    payload.error.message !== EXPECTED_PLUGIN_RPC_MESSAGE
  ) {
    fail("unexpected_rejection_class", {
      label,
      code: payload.error.code,
      message: payload.error.message,
      data: payload.error.data ?? null,
    });
  }
  return {
    rejected: true,
    code: payload.error.code,
    message: payload.error.message,
  };
}

async function waitReceipt(url, txHash, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = await rpc(url, "eth_getTransactionReceipt", [txHash]);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail("transaction_receipt_timeout", { txHash });
}

async function verify(url, outputPath) {
  const chainId = BigInt(await rpc(url, "eth_chainId"));
  if (chainId !== CHAIN_ID) {
    fail("chain_id_mismatch", { observed: chainId.toString() });
  }

  const networkId = String(await rpc(url, "net_version"));
  if (networkId !== CHAIN_ID.toString()) {
    fail("network_id_mismatch", { observed: networkId });
  }

  const validators = (await rpc(url, "qbft_getValidatorsByBlockNumber", ["latest"]))
    .map(lowerAddress);
  if (validators.length !== 1) {
    fail("validator_count_mismatch", { validators });
  }

  const wallet = Wallet.createRandom();
  const sender = lowerAddress(wallet.address);
  const recipient = lowerAddress(Wallet.createRandom().address);

  const nativeBefore = BigInt(await rpc(url, "eth_getBalance", [sender, "latest"]));
  const nonceBefore = BigInt(
    await rpc(url, "eth_getTransactionCount", [sender, "latest"]),
  );
  if (nativeBefore !== 0n || nonceBefore !== 0n) {
    fail("ephemeral_sender_initial_state_invalid", {
      nativeBefore: nativeBefore.toString(),
      nonceBefore: nonceBefore.toString(),
    });
  }

  const legacyRaw = await wallet.signTransaction({
    type: 0,
    chainId: CHAIN_ID,
    nonce: 0,
    gasPrice: 0n,
    gasLimit: 30_000n,
    to: recipient,
    value: 0n,
    data: "0x",
  });
  const legacyReject = await expectPluginRejected(
    url,
    legacyRaw,
    "legacy_type0",
  );

  const missingMarkerRaw = await wallet.signTransaction({
    type: 2,
    chainId: CHAIN_ID,
    nonce: 0,
    maxPriorityFeePerGas: 0n,
    maxFeePerGas: 0n,
    gasLimit: 30_000n,
    to: recipient,
    value: 0n,
    data: "0x",
    accessList: [],
  });
  const missingMarkerReject = await expectPluginRejected(
    url,
    missingMarkerRaw,
    "missing_marker",
  );

  const wrongMarkerRaw = await wallet.signTransaction({
    type: 2,
    chainId: CHAIN_ID,
    nonce: 0,
    maxPriorityFeePerGas: 0n,
    maxFeePerGas: 0n,
    gasLimit: 30_000n,
    to: recipient,
    value: 0n,
    data: "0x",
    accessList: [
      {
        address: MARKER_ADDRESS,
        storageKeys: ["0x" + "11".repeat(32)],
      },
    ],
  });
  const wrongMarkerReject = await expectPluginRejected(
    url,
    wrongMarkerRaw,
    "wrong_marker",
  );

  const duplicateMarkerRaw = await wallet.signTransaction({
    type: 2,
    chainId: CHAIN_ID,
    nonce: 0,
    maxPriorityFeePerGas: 0n,
    maxFeePerGas: 0n,
    gasLimit: 40_000n,
    to: recipient,
    value: 0n,
    data: "0x",
    accessList: [
      { address: MARKER_ADDRESS, storageKeys: [MARKER_STORAGE_KEY] },
      { address: MARKER_ADDRESS, storageKeys: [MARKER_STORAGE_KEY] },
    ],
  });
  const duplicateMarkerReject = await expectPluginRejected(
    url,
    duplicateMarkerRaw,
    "duplicate_marker",
  );

  const nonceAfterRejects = BigInt(
    await rpc(url, "eth_getTransactionCount", [sender, "latest"]),
  );
  if (nonceAfterRejects !== 0n) {
    fail("rejected_transactions_changed_nonce", {
      nonceAfterRejects: nonceAfterRejects.toString(),
    });
  }

  const blockBefore = BigInt(await rpc(url, "eth_blockNumber"));
  const validRaw = await wallet.signTransaction({
    type: 2,
    chainId: CHAIN_ID,
    nonce: 0,
    maxPriorityFeePerGas: 0n,
    maxFeePerGas: 0n,
    gasLimit: 30_000n,
    to: recipient,
    value: 0n,
    data: "0x",
    accessList: [
      {
        address: MARKER_ADDRESS,
        storageKeys: [MARKER_STORAGE_KEY],
      },
    ],
  });

  const txHash = exactHex(
    await rpc(url, "eth_sendRawTransaction", [validRaw]),
    32,
    "accepted_transaction_hash_invalid",
  );
  const receipt = await waitReceipt(url, txHash);
  if (BigInt(receipt.status ?? "0x0") !== 1n) {
    fail("accepted_transaction_failed", { receipt });
  }
  if (BigInt(receipt.effectiveGasPrice ?? "0x0") !== 0n) {
    fail("accepted_transaction_effective_gas_price_nonzero", { receipt });
  }

  const transaction = await rpc(url, "eth_getTransactionByHash", [txHash]);
  if (!transaction) fail("accepted_transaction_missing");
  if (
    transaction.type !== "0x2" ||
    BigInt(transaction.chainId ?? "0x0") !== CHAIN_ID
  ) {
    fail("accepted_transaction_domain_readback_invalid", { transaction });
  }

  const accessList = transaction.accessList;
  if (
    !Array.isArray(accessList) ||
    accessList.filter(
      (entry) => lowerAddress(entry.address) === MARKER_ADDRESS,
    ).length !== 1
  ) {
    fail("accepted_transaction_marker_entry_readback_invalid", { accessList });
  }
  const marker = accessList.find(
    (entry) => lowerAddress(entry.address) === MARKER_ADDRESS,
  );
  if (
    !Array.isArray(marker.storageKeys) ||
    marker.storageKeys.length !== 1 ||
    String(marker.storageKeys[0]).toLowerCase() !== MARKER_STORAGE_KEY
  ) {
    fail("accepted_transaction_marker_key_readback_invalid", { marker });
  }

  const nonceAfterAccepted = BigInt(
    await rpc(url, "eth_getTransactionCount", [sender, "latest"]),
  );
  const nativeAfter = BigInt(await rpc(url, "eth_getBalance", [sender, "latest"]));
  const blockAfter = BigInt(await rpc(url, "eth_blockNumber"));
  if (nonceAfterAccepted !== 1n) {
    fail("accepted_transaction_nonce_not_consumed", {
      nonceAfterAccepted: nonceAfterAccepted.toString(),
    });
  }
  if (nativeAfter !== 0n) {
    fail("ephemeral_sender_native_balance_changed", {
      nativeAfter: nativeAfter.toString(),
    });
  }
  if (blockAfter <= blockBefore) {
    fail("qbft_block_not_advanced", {
      blockBefore: blockBefore.toString(),
      blockAfter: blockAfter.toString(),
    });
  }

  const result = {
    marker: "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1",
    version: 1,
    status: "BESU_RAW_TRANSACTION_EPOCH_DOMAIN_RUNTIME_GREEN",
    client: {
      name: "Besu",
      version: "26.8.1",
      chain_id: Number(CHAIN_ID),
      network_id: networkId,
      consensus: "QBFT",
      validator_count: validators.length,
    },
    domain: {
      execution_epoch: 2,
      transaction_type: 2,
      marker_address: MARKER_ADDRESS,
      marker_storage_key: MARKER_STORAGE_KEY,
    },
    negative_cases: {
      legacy_type0: legacyReject,
      missing_marker: missingMarkerReject,
      wrong_marker: wrongMarkerReject,
      duplicate_marker: duplicateMarkerReject,
      rejected_transaction_nonce_unchanged: true,
    },
    positive_case: {
      accepted_and_mined: true,
      transaction_hash: txHash,
      transaction_status: "1",
      transaction_type: "0x2",
      chain_id: Number(CHAIN_ID),
      exact_marker_readback: true,
      gas_used: BigInt(receipt.gasUsed).toString(),
      effective_gas_price_atoms: "0",
      sender_nonce_before: nonceBefore.toString(),
      sender_nonce_after: nonceAfterAccepted.toString(),
      sender_native_balance_before_atoms: nativeBefore.toString(),
      sender_native_balance_after_atoms: nativeAfter.toString(),
      block_before: blockBefore.toString(),
      block_after: blockAfter.toString(),
    },
    gates: {
      plugin_loaded_and_rule_registered: true,
      plugin_runtime_negative_cases_proven: true,
      plugin_runtime_positive_case_proven: true,
      besu_transaction_validation_rule_runtime_proven: true,
      all_production_validators_epoch_domain_enforced: false,
      cross_epoch_replay_protection_proven: false,
      migration_authorized: false,
      public_activation_authorized: false,
    },
    authority: {
      hosted_disposable_runtime_only: true,
      user_ceremony_keys_used: false,
      user_wallet_access: false,
      production_rpc_contact: false,
      authoritative_chain2050_write: false,
      validator_mutation: false,
      token_movement: false,
      funds_movement: false,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
  process.stdout.write(
    [
      "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1_GREEN",
      "legacy_type0_rejected=true",
      "missing_marker_rejected=true",
      "wrong_marker_rejected=true",
      "duplicate_marker_rejected=true",
      "valid_marked_type2_accepted_and_mined=true",
      "besu_transaction_validation_rule_runtime_proven=true",
      "all_production_validators_epoch_domain_enforced=false",
      "cross_epoch_replay_protection_proven=false",
      "authoritative_chain2050_write=false",
      "funds_movement=false",
    ].join("\n") + "\n",
  );
}

async function finalize(workDir, imageDigest) {
  const resultPath = path.join(workDir, "capability-result.json");
  const firstJar = path.join(workDir, "plugin-first-build.jar");
  const finalJar = path.join(workDir, "plugins", PLUGIN_JAR);
  const genesisPath = path.join(workDir, "genesis.json");
  const logPath = path.join(workDir, "besu.log");

  const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
  if (result.status !== "BESU_RAW_TRANSACTION_EPOCH_DOMAIN_RUNTIME_GREEN") {
    fail("capability_result_not_green");
  }
  if (
    !/^hyperledger\/besu@sha256:[0-9a-f]{64}$/.test(String(imageDigest || ""))
  ) {
    fail("besu_image_digest_invalid", { imageDigest });
  }

  const firstSha = sha256File(firstJar);
  const finalSha = sha256File(finalJar);
  if (firstSha !== finalSha) {
    fail("plugin_jar_not_reproducible", { firstSha, finalSha });
  }

  const artifactManifest = JSON.parse(
    fs.readFileSync(PLUGIN_ARTIFACT_MANIFEST, "utf8"),
  );
  if (
    artifactManifest.marker !==
      "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PLUGIN_ARTIFACT_V1" ||
    artifactManifest.jar_sha256 !== "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518"
  ) {
    fail("canonical_plugin_artifact_manifest_invalid", { artifactManifest });
  }
  if (finalSha !== artifactManifest.jar_sha256) {
    fail("plugin_runtime_identity_mismatch", {
      observed: finalSha,
      canonical: artifactManifest.jar_sha256,
    });
  }

  const log = fs.readFileSync(logPath, "utf8");
  if (
    !log.includes(
      "Registered plugin of type org.voidnetwork.besu.epoch2.VoidEpoch2RawTransactionDomainPlugin",
    ) ||
    !log.includes("Registered new transaction validator rule")
  ) {
    fail("plugin_registration_log_evidence_missing");
  }

  const material = {
    ...result,
    build: {
      java_release: 25,
      maven_reproducible_build_proven: true,
      plugin_jar_filename: PLUGIN_JAR,
      plugin_jar_sha256: finalSha,
      plugin_jar_bytes: fs.statSync(finalJar).size,
      plugin_service_loader_verified: true,
      canonical_plugin_artifact_manifest: PLUGIN_ARTIFACT_MANIFEST,
      plugin_artifact_runtime_identity_verified: true,
    },
    runtime: {
      besu_image: "hyperledger/besu:26.8.1",
      besu_image_pinned_reference: process.env.BESU_IMAGE || null,
      besu_image_repo_digest: imageDigest,
      plugin_directory: "/plugins",
      requested_plugin: "VoidEpoch2RawTransactionDomainPlugin",
      plugin_registration_log_verified: true,
      transaction_validator_rule_registration_log_verified: true,
      genesis_sha256: sha256File(genesisPath),
      besu_log_sha256: sha256File(logPath),
    },
    provenance: {
      source_commit:
        process.env.VOID_SOURCE_HEAD_SHA || process.env.GITHUB_SHA || null,
      github_merge_context_sha: process.env.GITHUB_SHA || null,
      github_run_id: process.env.GITHUB_RUN_ID || null,
      github_run_attempt: process.env.GITHUB_RUN_ATTEMPT || null,
    },
    gates: {
      ...result.gates,
      plugin_artifact_content_addressed: true,
      plugin_artifact_runtime_identity_verified: true,
      besu_transaction_validation_rule_runtime_proven: true,
      all_production_validators_epoch_domain_enforced: false,
      cross_epoch_replay_protection_proven: false,
      migration_authorized: false,
      public_activation_authorized: false,
    },
  };

  material.receipt_material_sha256 = sha256Bytes(
    Buffer.from(canonical(material), "utf8"),
  );

  fs.writeFileSync(
    path.join(
      workDir,
      "void-economic-epoch2-besu-raw-transaction-validator-runtime-v1.json",
    ),
    JSON.stringify(material, null, 2) + "\n",
  );

  process.stdout.write(
    [
      "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1_FINALIZED",
      `plugin_jar_sha256=${finalSha}`,
      "maven_reproducible_build_proven=true",
      `besu_image_repo_digest=${imageDigest}`,
      `receipt_material_sha256=${material.receipt_material_sha256}`,
      "plugin_artifact_content_addressed=true",
      "plugin_artifact_runtime_identity_verified=true",
      "besu_transaction_validation_rule_runtime_proven=true",
      "all_production_validators_epoch_domain_enforced=false",
      "cross_epoch_replay_protection_proven=false",
      "authoritative_chain2050_write=false",
      "funds_movement=false",
    ].join("\n") + "\n",
  );
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "prepare") {
    if (args.length !== 3) fail("usage_prepare");
    await prepare(args[0], args[1], args[2]);
    return;
  }
  if (mode === "verify") {
    if (args.length !== 2) fail("usage_verify");
    await verify(args[0], args[1]);
    return;
  }
  if (mode === "finalize") {
    if (args.length !== 2) fail("usage_finalize");
    await finalize(args[0], args[1]);
    return;
  }
  fail("usage");
}

main().catch((error) => {
  const detail = error?.detail ? ` detail=${JSON.stringify(error.detail)}` : "";
  process.stderr.write(
    `VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1_HOLD reason=${String(
      error?.message || error,
    )}${detail}\n`,
  );
  process.exitCode = 2;
});
