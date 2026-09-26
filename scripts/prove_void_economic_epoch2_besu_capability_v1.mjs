#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  AbiCoder,
  Interface,
  Wallet,
  encodeRlp,
  keccak256,
  toBeHex,
} from "ethers";

const CHAIN_ID = 2050n;
const TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const OWNER = "0x54ded2daa618a257093556a5f54c43805b9bd516";
const INITIAL_TOKEN_ATOMS = 1_000_000_000_000_000_000n;
const TRANSFER_ATOMS = 1n;
const EXPECTED_RUNTIME_SHA256 =
  "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb";

const abi = new Interface([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function owner() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
]);
const coder = AbiCoder.defaultAbiCoder();

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
  const text = String(value || "").trim().toLowerCase();
  const re = new RegExp(`^0x[0-9a-f]{${bytes * 2}}$`);
  if (!re.test(text)) fail(label, { value: text });
  return text;
}

function runtimeInfo(code) {
  const text = String(code || "").trim().toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(text)) fail("runtime_hex_invalid");
  const bytes = Buffer.from(text.slice(2), "hex");
  return {
    code: text,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

function word(value) {
  return toBeHex(BigInt(value), 32).toLowerCase();
}

function balanceSlot(address) {
  return keccak256(
    coder.encode(["address", "uint256"], [lowerAddress(address), 1n]),
  ).toLowerCase();
}

async function rpc(url, method, params = []) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) fail("rpc_http_error", { method, status: response.status });
  const payload = await response.json();
  if (!payload || payload.jsonrpc !== "2.0" || payload.id !== 1) {
    fail("rpc_envelope_invalid", { method });
  }
  if (payload.error) {
    fail("rpc_error", {
      method,
      code: payload.error.code,
      message: payload.error.message,
    });
  }
  return payload.result;
}

async function call(url, signature, args = []) {
  const fn = abi.getFunction(signature);
  const data = abi.encodeFunctionData(fn, args);
  const raw = await rpc(url, "eth_call", [{ to: TOKEN, data }, "latest"]);
  return [...abi.decodeFunctionResult(fn, raw)];
}

async function prepare(workDir, validatorAddress, runtimeFile) {
  const validator = lowerAddress(validatorAddress);
  const extra = encodeRlp([
    "0x" + "00".repeat(32),
    [validator],
    "0x",
    "0x",
    [],
  ]).toLowerCase();
  if (!/^0x[0-9a-f]+$/.test(extra)) fail("qbft_extra_data_invalid");

  const runtime = runtimeInfo(fs.readFileSync(runtimeFile, "utf8"));
  if (runtime.sha256 !== EXPECTED_RUNTIME_SHA256) {
    fail("voidtoken_runtime_hash_mismatch", {
      observed: runtime.sha256,
      expected: EXPECTED_RUNTIME_SHA256,
    });
  }

  const sender = Wallet.createRandom();
  const recipient = Wallet.createRandom();
  const senderAddress = lowerAddress(sender.address);
  const recipientAddress = lowerAddress(recipient.address);

  const genesis = {
    config: {
      chainid: Number(CHAIN_ID),
      berlinBlock: 0,
      londonBlock: 0,
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
    extraData: extra,
    gasLimit: "0x1c9c380",
    difficulty: "0x1",
    mixHash:
      "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
    coinbase: "0x0000000000000000000000000000000000000000",
    baseFeePerGas: "0x0",
    alloc: {
      [TOKEN.slice(2)]: {
        code: runtime.code,
        storage: {
          [word(0)]: word(INITIAL_TOKEN_ATOMS),
          [balanceSlot(senderAddress)]: word(INITIAL_TOKEN_ATOMS),
        },
      },
    },
  };

  fs.mkdirSync(workDir, { recursive: true });
  fs.writeFileSync(
    path.join(workDir, "genesis.json"),
    JSON.stringify(genesis, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(workDir, "fixture.json"),
    JSON.stringify(
      {
        sender_private_key: sender.privateKey,
        sender_address: senderAddress,
        recipient_address: recipientAddress,
        validator_address: validator,
        initial_token_atoms: INITIAL_TOKEN_ATOMS.toString(),
        transfer_atoms: TRANSFER_ATOMS.toString(),
        token_runtime_sha256: runtime.sha256,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );

  process.stdout.write(
    JSON.stringify(
      {
        marker: "VOID_ECONOMIC_EPOCH2_BESU_CAPABILITY_PREPARE_V1",
        status: "PREPARED",
        chain_id: Number(CHAIN_ID),
        validator_count: 1,
        sender_native_prefund_atoms: "0",
        token_runtime_sha256: runtime.sha256,
        token_runtime_bytes: runtime.bytes,
        zero_base_fee: true,
        qbft_block_reward: "0",
        secret_material_logged: false,
      },
      null,
      2,
    ) + "\n",
  );
}

async function waitReceipt(url, hash, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = await rpc(url, "eth_getTransactionReceipt", [hash]);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail("transaction_receipt_timeout", { hash });
}

async function verify(url, fixturePath, outputPath) {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const wallet = new Wallet(fixture.sender_private_key);
  const sender = lowerAddress(fixture.sender_address);
  const recipient = lowerAddress(fixture.recipient_address);
  if (lowerAddress(wallet.address) !== sender) fail("sender_key_address_mismatch");

  const chainId = BigInt(await rpc(url, "eth_chainId"));
  if (chainId !== CHAIN_ID) fail("chain_id_mismatch", { chainId: chainId.toString() });

  const networkId = String(await rpc(url, "net_version"));
  if (networkId !== CHAIN_ID.toString()) {
    fail("network_id_mismatch", { networkId });
  }

  const validators = (await rpc(url, "qbft_getValidatorsByBlockNumber", ["latest"]))
    .map(lowerAddress);
  if (
    validators.length !== 1 ||
    validators[0] !== lowerAddress(fixture.validator_address)
  ) {
    fail("qbft_validator_set_mismatch", { validators });
  }

  const codeBefore = runtimeInfo(await rpc(url, "eth_getCode", [TOKEN, "latest"]));
  if (codeBefore.sha256 !== EXPECTED_RUNTIME_SHA256) {
    fail("genesis_runtime_readback_mismatch", {
      observed: codeBefore.sha256,
      expected: EXPECTED_RUNTIME_SHA256,
    });
  }

  const nativeBefore = BigInt(await rpc(url, "eth_getBalance", [sender, "latest"]));
  if (nativeBefore !== 0n) fail("sender_native_balance_not_zero_before");

  const [
    name,
    symbol,
    decimals,
    owner,
    totalSupply,
    senderTokenBefore,
    recipientTokenBefore,
  ] = await Promise.all([
    call(url, "name()"),
    call(url, "symbol()"),
    call(url, "decimals()"),
    call(url, "owner()"),
    call(url, "totalSupply()"),
    call(url, "balanceOf(address)", [sender]),
    call(url, "balanceOf(address)", [recipient]),
  ]);

  if (
    name[0] !== "VoidStones" ||
    symbol[0] !== "VOID" ||
    decimals[0] !== 18n ||
    lowerAddress(owner[0]) !== OWNER ||
    totalSupply[0] !== INITIAL_TOKEN_ATOMS ||
    senderTokenBefore[0] !== INITIAL_TOKEN_ATOMS ||
    recipientTokenBefore[0] !== 0n
  ) {
    fail("genesis_token_state_mismatch");
  }

  const latestBefore = BigInt(await rpc(url, "eth_blockNumber"));
  const nonce = BigInt(await rpc(url, "eth_getTransactionCount", [sender, "latest"]));
  const data = abi.encodeFunctionData("transfer(address,uint256)", [
    recipient,
    TRANSFER_ATOMS,
  ]);

  const raw = await wallet.signTransaction({
    type: 0,
    chainId: CHAIN_ID,
    nonce,
    to: TOKEN,
    gasLimit: 100_000n,
    gasPrice: 0n,
    value: 0n,
    data,
  });

  const txHash = exactHex(
    await rpc(url, "eth_sendRawTransaction", [raw]),
    32,
    "tx_hash_invalid",
  );
  const receipt = await waitReceipt(url, txHash);
  if (BigInt(receipt.status) !== 1n) fail("transaction_failed", { receipt });

  const gasUsed = BigInt(receipt.gasUsed);
  if (gasUsed <= 0n) fail("gas_not_metered");
  const effectiveGasPrice = BigInt(receipt.effectiveGasPrice ?? "0x0");
  if (effectiveGasPrice !== 0n) {
    fail("effective_gas_price_not_zero", {
      effectiveGasPrice: effectiveGasPrice.toString(),
    });
  }

  const latestAfter = BigInt(await rpc(url, "eth_blockNumber"));
  if (latestAfter <= latestBefore) fail("qbft_block_not_advanced");

  const nativeAfter = BigInt(await rpc(url, "eth_getBalance", [sender, "latest"]));
  if (nativeAfter !== 0n) fail("sender_native_balance_changed");

  const senderTokenAfter = (await call(url, "balanceOf(address)", [sender]))[0];
  const recipientTokenAfter = (await call(url, "balanceOf(address)", [recipient]))[0];
  if (
    senderTokenAfter !== INITIAL_TOKEN_ATOMS - TRANSFER_ATOMS ||
    recipientTokenAfter !== TRANSFER_ATOMS
  ) {
    fail("token_transfer_state_mismatch");
  }

  const transaction = await rpc(url, "eth_getTransactionByHash", [txHash]);
  if (!transaction) fail("mined_transaction_missing");
  if (BigInt(transaction.gasPrice ?? "0x0") !== 0n) {
    fail("transaction_gas_price_not_zero");
  }

  const result = {
    marker: "VOID_ECONOMIC_EPOCH2_BESU_CAPABILITY_V1",
    version: 1,
    status: "BESU_QBFT_FREE_GAS_CAPABILITY_GREEN",
    besu_candidate_version: "26.8.1",
    consensus: "QBFT",
    chain_id: Number(CHAIN_ID),
    network_id: networkId,
    validator_count: validators.length,
    token_runtime_sha256: codeBefore.sha256,
    token_runtime_bytes: codeBefore.bytes,
    sender_native_balance_before_atoms: nativeBefore.toString(),
    sender_native_balance_after_atoms: nativeAfter.toString(),
    token_sender_balance_before_atoms: senderTokenBefore[0].toString(),
    token_sender_balance_after_atoms: senderTokenAfter.toString(),
    token_recipient_balance_after_atoms: recipientTokenAfter.toString(),
    transaction_hash: txHash,
    transaction_status: "1",
    transaction_gas_price_atoms: "0",
    transaction_gas_used: gasUsed.toString(),
    receipt_effective_gas_price_atoms: effectiveGasPrice.toString(),
    block_before: latestBefore.toString(),
    block_after: latestAfter.toString(),
    capabilities: {
      private_qbft_chain_2050: true,
      genesis_predeploy_code_storage: true,
      zero_native_balance_sender: true,
      zero_fee_signed_transaction_accepted: true,
      zero_fee_signed_transaction_mined: true,
      gas_metering_positive: true,
      native_balance_required_for_participant: false,
      token_transfer_succeeded: true,
      qbft_block_production: true,
      no_default_dev_prefund_used: true,
    },
    boundaries: {
      user_ceremony_keys_used: false,
      user_wallet_access: false,
      authoritative_chain2050_write: false,
      production_genesis_built: false,
      production_client_selected: false,
      public_activation: false,
      funds_movement: false,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
  process.stdout.write(
    [
      "VOID_ECONOMIC_EPOCH2_BESU_CAPABILITY_V1_GREEN",
      `chain_id=${result.chain_id}`,
      `validator_count=${result.validator_count}`,
      `token_runtime_sha256=${result.token_runtime_sha256}`,
      `sender_native_balance_before_atoms=${result.sender_native_balance_before_atoms}`,
      `sender_native_balance_after_atoms=${result.sender_native_balance_after_atoms}`,
      `transaction_gas_used=${result.transaction_gas_used}`,
      `receipt_effective_gas_price_atoms=${result.receipt_effective_gas_price_atoms}`,
      "zero_fee_signed_transaction_mined=true",
      "gas_metering_positive=true",
      "participant_native_gas_balance_required=false",
      "production_client_selected=false",
      "authoritative_chain2050_write=false",
      "funds_movement=false",
    ].join("\n") + "\n",
  );
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "prepare") {
    if (args.length !== 3) {
      fail("usage_prepare");
    }
    await prepare(args[0], args[1], args[2]);
    return;
  }
  if (mode === "verify") {
    if (args.length !== 3) {
      fail("usage_verify");
    }
    await verify(args[0], args[1], args[2]);
    return;
  }
  fail("usage");
}

main().catch((error) => {
  const detail = error?.detail ? ` detail=${JSON.stringify(error.detail)}` : "";
  process.stderr.write(
    `VOID_ECONOMIC_EPOCH2_BESU_CAPABILITY_V1_HOLD reason=${String(
      error?.message || error,
    )}${detail}\n`,
  );
  process.exitCode = 2;
});
