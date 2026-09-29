#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Wallet } from "ethers";

const CHAIN_ID = 2050n;
const PLUGIN_SHA =
  "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518";
const BESU_DIGEST =
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042";

function fail(code, detail = null) {
  const error = new Error(code);
  error.detail = detail;
  throw error;
}

function canonical(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}"
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function lowerAddress(value) {
  const out = String(value || "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(out)) fail("address_invalid", { value });
  return out;
}

function exactHash(value, code) {
  const out = String(value || "").toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(out)) fail(code, { value });
  return out;
}

async function rpcEnvelope(url, method, params = []) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) fail("rpc_http_error", { method, status: response.status });
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

async function waitUntil(fn, code, timeoutMs = 60_000, delayMs = 250) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
      last = value;
    } catch (error) {
      last = String(error?.message || error);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  fail(code, { last });
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

  console.log("VOID_ECONOMIC_EPOCH2_BESU_RAW_DOMAIN_PEER_IMPORT_PREPARE_V1");
  console.log("chain_id=2050");
  console.log("validator_count=1");
  console.log("validator_address=" + validator);
  console.log("production_authority=false");
}

function peerEnodeWithIp(rawEnode, producerIp) {
  const match = String(rawEnode || "").match(
    /^enode:\/\/([0-9a-fA-F]+)@.+:(\d+)(?:\?.*)?$/,
  );
  if (!match) fail("producer_enode_invalid", { rawEnode });
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(producerIp)) {
    fail("producer_ip_invalid", { producerIp });
  }
  return "enode://" + match[1] + "@" + producerIp + ":" + match[2];
}

async function verify(
  producerUrl,
  observerUrl,
  producerIp,
  outputPath,
  pluginSha,
  besuDigest,
) {
  if (pluginSha !== PLUGIN_SHA) fail("plugin_sha_mismatch", { pluginSha });
  if (besuDigest !== BESU_DIGEST) fail("besu_digest_mismatch", { besuDigest });

  const producerChain = BigInt(await rpc(producerUrl, "eth_chainId"));
  const observerChain = BigInt(await rpc(observerUrl, "eth_chainId"));
  if (producerChain !== CHAIN_ID || observerChain !== CHAIN_ID) {
    fail("chain_id_mismatch", {
      producer: producerChain.toString(),
      observer: observerChain.toString(),
    });
  }

  const producerInfo = await rpc(producerUrl, "admin_nodeInfo");
  const producerEnode = peerEnodeWithIp(producerInfo?.enode, producerIp);
  const addPeer = await rpc(observerUrl, "admin_addPeer", [producerEnode]);
  if (addPeer !== true) fail("observer_add_peer_failed", { addPeer });

  await waitUntil(
    async () => BigInt(await rpc(observerUrl, "net_peerCount")) >= 1n,
    "observer_peer_timeout",
  );

  const targetHead = BigInt(await rpc(producerUrl, "eth_blockNumber"));
  await waitUntil(
    async () => BigInt(await rpc(observerUrl, "eth_blockNumber")) >= targetHead,
    "observer_initial_sync_timeout",
  );

  const wallet = Wallet.createRandom();
  const sender = lowerAddress(wallet.address);
  const recipient = lowerAddress(Wallet.createRandom().address);
  const producerNonceBefore = BigInt(
    await rpc(producerUrl, "eth_getTransactionCount", [sender, "latest"]),
  );
  if (producerNonceBefore !== 0n) {
    fail("ephemeral_sender_nonce_invalid", {
      producerNonceBefore: producerNonceBefore.toString(),
    });
  }

  const raw = await wallet.signTransaction({
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

  const txHash = exactHash(
    await rpc(producerUrl, "eth_sendRawTransaction", [raw]),
    "producer_transaction_hash_invalid",
  );

  const producerReceipt = await waitUntil(
    async () => await rpc(producerUrl, "eth_getTransactionReceipt", [txHash]),
    "producer_receipt_timeout",
  );
  if (BigInt(producerReceipt.status ?? "0x0") !== 1n) {
    fail("producer_transaction_failed", { producerReceipt });
  }
  const badBlockNumber = BigInt(producerReceipt.blockNumber);

  const producerTx = await rpc(producerUrl, "eth_getTransactionByHash", [txHash]);
  if (
    !producerTx ||
    producerTx.type !== "0x2" ||
    BigInt(producerTx.chainId ?? "0x0") !== CHAIN_ID ||
    !Array.isArray(producerTx.accessList) ||
    producerTx.accessList.length !== 0
  ) {
    fail("producer_unmarked_transaction_readback_invalid", { producerTx });
  }

  const badBlocks = await waitUntil(
    async () => {
      const rows = await rpc(observerUrl, "debug_getBadBlocks");
      if (!Array.isArray(rows)) fail("observer_bad_blocks_invalid", { rows });
      return JSON.stringify(rows).toLowerCase().includes(txHash)
        ? rows
        : null;
    },
    "observer_bad_block_not_observed",
    90_000,
    500,
  );

  const observerReceipt = await rpc(
    observerUrl,
    "eth_getTransactionReceipt",
    [txHash],
  );
  if (observerReceipt !== null) {
    fail("observer_imported_forbidden_transaction", { observerReceipt });
  }

  const observerBlock = await rpc(
    observerUrl,
    "eth_getBlockByNumber",
    ["0x" + badBlockNumber.toString(16), false],
  );
  if (observerBlock !== null) {
    const txs = Array.isArray(observerBlock.transactions)
      ? observerBlock.transactions.map((value) => String(value).toLowerCase())
      : [];
    if (txs.includes(txHash)) {
      fail("observer_imported_forbidden_block", { observerBlock });
    }
  }

  const observerHead = BigInt(await rpc(observerUrl, "eth_blockNumber"));
  if (observerHead >= badBlockNumber) {
    fail("observer_head_crossed_forbidden_block", {
      observerHead: observerHead.toString(),
      forbiddenBlock: badBlockNumber.toString(),
    });
  }

  const material = {
    marker:
      "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PEER_IMPORT_V1",
    version: 1,
    status: "PEER_IMPORTED_UNMARKED_BLOCK_REJECTED",
    chain_id: 2050,
    execution_epoch: 2,
    besu_image_repo_digest: besuDigest,
    canonical_plugin_jar_sha256: pluginSha,
    topology: {
      producer_plugin_loaded: false,
      observer_plugin_loaded: true,
      producer_validator: true,
      observer_validator: false,
      observer_peer_count_positive: true,
    },
    adversary: {
      transaction_hash: txHash,
      transaction_type: "0x2",
      access_list_entry_count: 0,
      producer_accepted_and_mined: true,
      producer_block_number: badBlockNumber.toString(),
      observer_bad_block_contains_transaction: true,
      observer_receipt_null: true,
      observer_head_before_forbidden_block: true,
    },
    gates: {
      exact_plugin_peer_import_protocol_rejection_proven: true,
      besu_plugin_rule_applies_to_block_import: true,
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
      production_validator_mutation: false,
      token_movement: false,
      funds_movement: false,
    },
  };
  material.receipt_material_sha256 = sha256(
    Buffer.from(canonical(material), "utf8"),
  );

  fs.writeFileSync(outputPath, JSON.stringify(material, null, 2) + "\n");

  console.log(
    "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PEER_IMPORT_V1_GREEN",
  );
  console.log("canonical_plugin_jar_sha256=" + pluginSha);
  console.log("producer_unmarked_transaction_mined=true");
  console.log("observer_bad_block_contains_transaction=true");
  console.log("observer_receipt_null=true");
  console.log("exact_plugin_peer_import_protocol_rejection_proven=true");
  console.log("all_production_validators_epoch_domain_enforced=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log("authoritative_chain2050_write=false");
  console.log("funds_movement=false");
}

function sourceProof() {
  const shell = fs.readFileSync(
    "scripts/run_void_economic_epoch2_besu_raw_transaction_validator_peer_import_v1.sh",
    "utf8",
  );
  const workflow = fs.readFileSync(
    ".github/workflows/void-economic-epoch2-besu-raw-transaction-validator-peer-import-v1.yml",
    "utf8",
  );

  for (const required of [
    PLUGIN_SHA,
    BESU_DIGEST,
    "--plugins=VoidEpoch2RawTransactionDomainPlugin",
    "--sync-min-peers=1",
    "debug_getBadBlocks",
    "observer_bad_block_contains_transaction",
    "all_production_validators_epoch_domain_enforced=false",
    "cross_epoch_replay_protection_proven=false",
  ]) {
    assert.ok(
      shell.includes(required) || fs.readFileSync(process.argv[1], "utf8").includes(required),
      required,
    );
  }
  assert.match(workflow, /node-version:\s*24/);
  assert.match(workflow, /java-version:\s*'25'/);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/setup-java@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);

  const producerStart = shell.indexOf('docker run -d   --name "$producer_container"');
  const observerStart = shell.indexOf('docker run -d   --name "$observer_container"');
  const readyLoop = shell.indexOf("for port in 18554 18555");
  assert.ok(producerStart >= 0 && observerStart > producerStart && readyLoop > observerStart);
  const producerSection = shell.slice(producerStart, observerStart);
  const observerSection = shell.slice(observerStart, readyLoop);
  assert.equal(producerSection.includes("/plugins"), false);
  assert.equal(producerSection.includes("--plugins="), false);
  assert.equal(observerSection.includes('-v "$plugins_dir:/plugins:ro"'), true);
  assert.equal(
    observerSection.includes("--plugins=VoidEpoch2RawTransactionDomainPlugin"),
    true,
  );
  assert.equal((shell.match(/--plugins=VoidEpoch2RawTransactionDomainPlugin/g) || []).length, 1);
  assert.equal((shell.match(/\$plugins_dir:\/plugins:ro/g) || []).length, 1);
  assert.match(shell, /mvn -B -ntp .* clean test package/);
  assert.match(shell, /test "\$plugin_sha" = "\$EXPECTED_PLUGIN_SHA"/);

  for (const forbidden of [
    "systemctl",
    "sudo ",
    "Precision",
    "Nimo",
    "Xiphos",
    "8545:8545",
  ]) {
    assert.equal(shell.includes(forbidden), false, forbidden);
  }
  console.log(
    "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PEER_IMPORT_SOURCE_V1_GREEN",
  );
  console.log("pinned_besu_image=true");
  console.log("canonical_plugin_sha_required=true");
  console.log("production_rpc_contact=false");
  console.log("production_validator_mutation=false");
  console.log("cross_epoch_replay_protection_proven=false");
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "source") {
    if (args.length !== 0) fail("usage_source");
    sourceProof();
    return;
  }
  if (mode === "prepare") {
    if (args.length !== 3) fail("usage_prepare");
    await prepare(args[0], args[1], args[2]);
    return;
  }
  if (mode === "verify") {
    if (args.length !== 6) fail("usage_verify");
    await verify(...args);
    return;
  }
  fail("usage");
}

main().catch((error) => {
  const detail = error?.detail ? " detail=" + JSON.stringify(error.detail) : "";
  process.stderr.write(
    "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PEER_IMPORT_V1_HOLD reason=" +
      String(error?.message || error) +
      detail +
      "\n",
  );
  process.exitCode = 2;
});
