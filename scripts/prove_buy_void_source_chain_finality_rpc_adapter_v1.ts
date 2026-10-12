import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  assertBuyVoidSourceChainFinalityRpcAuthorityBoundaryV1,
  observeBuyVoidSourceChainFinalityV1,
  VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_AUTHORITY_V1,
} from "../src/economic/buy_void_source_chain_finality_rpc_adapter_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1,
  type BuyVoidPaymentRpcCallV1,
  type BuyVoidPaymentRpcTransportV1,
} from "../src/economic/buy_void_payment_rpc_observer_v1.js";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TX = `0x${"1".repeat(64)}`;
const DELIVERY = `0x${"2".repeat(40)}`;
const RECEIVE = `0x${"3".repeat(40)}`;
const USDC = `0x${"4".repeat(40)}`;
const RECEIPT_HASH = `0x${"5".repeat(64)}`;
const FINAL_HASH = `0x${"6".repeat(64)}`;
const OTHER_HASH = `0x${"7".repeat(64)}`;
const RPC_URL = "https://rpc.example.invalid/";

function fingerprint(url = RPC_URL): string {
  return crypto
    .createHash("sha256")
    .update(url, "utf8")
    .digest("hex");
}

function topicAddress(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

function dataUint(value: bigint): string {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function block(number: bigint, hash: string) {
  return {
    number: `0x${number.toString(16)}`,
    hash,
    parentHash:
      number === 0n
        ? `0x${"0".repeat(64)}`
        : `0x${"8".repeat(64)}`,
  };
}

function receipt({
  blockNumber = 100n,
  blockHash = RECEIPT_HASH,
  logIndex = 2n,
  amount = 1_000_000n,
  usdc = USDC,
  from = DELIVERY,
  receive = RECEIVE,
  tx = TX,
} = {}) {
  return {
    status: "0x1",
    transactionHash: tx,
    blockNumber: `0x${blockNumber.toString(16)}`,
    blockHash,
    logs: [
      {
        address: usdc,
        topics: [
          TRANSFER_TOPIC,
          topicAddress(from),
          topicAddress(receive),
        ],
        data: dataUint(amount),
        logIndex: `0x${logIndex.toString(16)}`,
        transactionHash: tx,
        blockNumber: `0x${blockNumber.toString(16)}`,
        removed: false,
      },
    ],
  };
}

type MockOptions = {
  chainId?: string;
  initialReceipt?: unknown;
  recheckReceipt?: unknown;
  latestBlock?: bigint;
  finalizedFirst?: { number: bigint; hash: string };
  finalizedSecond?: { number: bigint; hash: string };
  receiptHashFirst?: string;
  receiptHashSecond?: string;
  exactFinalHashBefore?: string;
  exactFinalHashAfter?: string;
  throwMethod?: BuyVoidPaymentRpcCallV1["method"];
};

class MockTransport implements BuyVoidPaymentRpcTransportV1 {
  readonly calls: BuyVoidPaymentRpcCallV1[] = [];
  private finalizedTagCalls = 0;
  private receiptNumberCalls = 0;
  private exactFinalNumberCalls = 0;
  private receiptCalls = 0;

  constructor(readonly options: MockOptions = {}) {}

  async call(
    input: BuyVoidPaymentRpcCallV1,
  ): Promise<unknown> {
    this.calls.push({
      method: input.method,
      params: [...input.params],
    });

    if (this.options.throwMethod === input.method) {
      throw new Error("mock rpc failure");
    }

    if (input.method === "eth_chainId") {
      return this.options.chainId ?? "0x2105";
    }

    if (input.method === "eth_getTransactionReceipt") {
      const index = this.receiptCalls++;
      if (index === 0) {
        return this.options.initialReceipt ?? receipt();
      }
      return this.options.recheckReceipt ?? receipt();
    }

    if (input.method === "eth_blockNumber") {
      return `0x${(
        this.options.latestBlock ?? 120n
      ).toString(16)}`;
    }

    if (input.method !== "eth_getBlockByNumber") {
      throw new Error(`unexpected method ${input.method}`);
    }

    const tag = String(input.params[0] ?? "");
    if (tag === "finalized") {
      const index = this.finalizedTagCalls++;
      const selected =
        index === 0
          ? this.options.finalizedFirst ?? {
              number: 110n,
              hash: FINAL_HASH,
            }
          : this.options.finalizedSecond ?? {
              number: 110n,
              hash: FINAL_HASH,
            };
      return block(selected.number, selected.hash);
    }

    const number = BigInt(tag);
    if (number === 100n) {
      const index = this.receiptNumberCalls++;
      return block(
        100n,
        index === 0
          ? this.options.receiptHashFirst ?? RECEIPT_HASH
          : this.options.receiptHashSecond ?? RECEIPT_HASH,
      );
    }

    if (number === 110n) {
      const index = this.exactFinalNumberCalls++;
      return block(
        110n,
        index === 0
          ? this.options.exactFinalHashBefore ?? FINAL_HASH
          : this.options.exactFinalHashAfter ?? FINAL_HASH,
      );
    }

    return block(number, `0x${"9".repeat(64)}`);
  }
}

function request(
  overrides: Record<string, unknown> = {},
) {
  return {
    request_id: "req-finality-1",
    source_chain: "base",
    tx_hash: TX,
    delivery_address: DELIVERY,
    receive_address: RECEIVE,
    usdc_amount: "1",
    quoted_void: "2",
    ...overrides,
  } as any;
}

function policy(
  overrides: Record<string, unknown> = {},
) {
  return {
    enabled: true,
    source_chain: "base",
    chain_id: "8453",
    rpc_url: RPC_URL,
    rpc_url_fingerprint_sha256: fingerprint(),
    rpc_identity: "base-rpc-primary-v1",
    finality_adapter_id: "base-finalized-tag-v1",
    min_confirmations: "5",
    usdc_contract: USDC,
    receive_address: RECEIVE,
    ...overrides,
  } as any;
}

let passed = 0;

async function test(
  name: string,
  fn: () => void | Promise<void>,
) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

await test(
  "authority remains read-only and non-economic",
  () => {
    assert.equal(
      assertBuyVoidSourceChainFinalityRpcAuthorityBoundaryV1(),
      true,
    );
    assert.equal(
      VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1.rpc_write,
      false,
    );
    assert.equal(
      VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_AUTHORITY_V1
        .rpc_write,
      false,
    );
    assert.equal(
      VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_AUTHORITY_V1
        .ancestry_verified,
      false,
    );
    assert.equal(
      VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_AUTHORITY_V1
        .provider_quorum_verified,
      false,
    );
  },
);

await test(
  "observer allowlist includes only four read methods",
  () => {
    assert.deepEqual(
      VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1
        .allowed_rpc_methods,
      [
        "eth_chainId",
        "eth_getTransactionReceipt",
        "eth_blockNumber",
        "eth_getBlockByNumber",
      ],
    );
  },
);

await test(
  "Base finalized-tag happy path binds exact hashes",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.source_chain, "base");
    assert.equal(result.evm_chain_id, "8453");
    assert.equal(
      result.block_evidence.receipt_block_hash,
      RECEIPT_HASH,
    );
    assert.equal(
      result.block_evidence.finalized_reference_block_hash,
      FINAL_HASH,
    );
    assert.equal(
      result.block_evidence.provider_consistency_verified,
      true,
    );
    assert.equal(
      result.finality_observation_for_1463
        .confirmations_observed,
      "11",
    );
    assert.equal(result.ancestry_verified, false);
    assert.equal(result.provider_quorum_verified, false);
    assert.equal(
      result.production_source_finality_authority_ready,
      false,
    );
  },
);

await test(
  "Ethereum happy path uses chain id 1",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request({
          source_chain: "ethereum",
        }),
        policy: policy({
          source_chain: "ethereum",
          chain_id: "1",
          rpc_identity: "ethereum-rpc-primary-v1",
          finality_adapter_id: "ethereum-finalized-tag-v1",
        }),
        transport: new MockTransport({
          chainId: "0x1",
        }),
      });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.evm_chain_id, "1");
  },
);

await test(
  "configured chain id must match intended rail",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({ chain_id: "1" }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.reason,
      "source_chain_finality_chain_id_policy_mismatch",
    );
  },
);

await test(
  "RPC chain mismatch fails closed",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          chainId: "0x1",
        }),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "RPC URL fingerprint mismatch fails closed",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({
          rpc_url_fingerprint_sha256: "a".repeat(64),
        }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.reason,
      "source_chain_finality_rpc_url_fingerprint_mismatch",
    );
  },
);

await test(
  "receipt above finalized reference is rejected",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          finalizedFirst: {
            number: 99n,
            hash: FINAL_HASH,
          },
          finalizedSecond: {
            number: 99n,
            hash: FINAL_HASH,
          },
        }),
      });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.reason,
      "source_chain_finality_receipt_not_finalized",
    );
  },
);

await test(
  "finalized above latest fails closed",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          latestBlock: 105n,
          finalizedFirst: {
            number: 110n,
            hash: FINAL_HASH,
          },
        }),
      });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.reason,
      "source_chain_finality_finalized_above_latest",
    );
  },
);

await test(
  "finalized tag must match exact numbered block hash",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          exactFinalHashBefore: OTHER_HASH,
        }),
      });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.reason,
      "source_chain_finality_finalized_tag_number_hash_mismatch",
    );
  },
);

await test(
  "finalized head regression fails closed",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          finalizedSecond: {
            number: 109n,
            hash: OTHER_HASH,
          },
        }),
      });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.reason,
      "source_chain_finality_finalized_head_regressed",
    );
  },
);

await test(
  "same finalized height cannot change hash",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          finalizedSecond: {
            number: 110n,
            hash: OTHER_HASH,
          },
        }),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "receipt block hash must remain stable across bracket",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          receiptHashSecond: OTHER_HASH,
        }),
      });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.reason,
      "source_chain_finality_receipt_block_hash_changed",
    );
  },
);

await test(
  "finalized block hash must remain stable after bracket",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          exactFinalHashAfter: OTHER_HASH,
        }),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "receipt recheck binds transaction receipt blockHash",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          recheckReceipt: receipt({
            blockHash: OTHER_HASH,
          }),
        }),
      });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.reason,
      "source_chain_finality_receipt_recheck_block_hash_mismatch",
    );
  },
);

await test(
  "receipt recheck cannot change exact payment",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          recheckReceipt: receipt({
            amount: 2_000_000n,
          }),
        }),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "minimum finalized confirmation threshold is enforced",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({
          min_confirmations: "12",
        }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.reason,
      "source_chain_finality_threshold_not_met",
    );
  },
);

await test(
  "exact USDC contract remains verified",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({
          usdc_contract: `0x${"a".repeat(40)}`,
        }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "exact receive address remains verified",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({
          receive_address: `0x${"b".repeat(40)}`,
        }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "payer must remain delivery address",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          initialReceipt: receipt({
            from: `0x${"c".repeat(40)}`,
          }),
        }),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "exact amount remains verified",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          initialReceipt: receipt({
            amount: 2_000_000n,
          }),
        }),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "#1463 u32 log-index subset is preserved",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          initialReceipt: receipt({
            logIndex: 0x1_0000_0000n,
          }),
        }),
      });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.reason,
      "source_chain_finality_log_index_exceeds_1463_domain",
    );
  },
);

await test(
  "RPC errors fail closed",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport({
          throwMethod: "eth_getBlockByNumber",
        }),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "credentials in RPC URL remain rejected",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({
          rpc_url: "https://user:pass@example.invalid",
        }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "non-loopback HTTP RPC remains rejected",
  async () => {
    const url = "http://example.invalid/";
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({
          rpc_url: url,
          rpc_url_fingerprint_sha256: fingerprint(url),
        }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "loopback HTTP remains allowed by inherited observer policy",
  async () => {
    const url = "http://127.0.0.1:8545/";
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({
          rpc_url: url,
          rpc_url_fingerprint_sha256: fingerprint(url),
        }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, true);
  },
);

await test(
  "invalid RPC identity fails closed",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({ rpc_identity: "!" }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "invalid finality adapter id fails closed",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({ finality_adapter_id: "!" }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "zero minimum confirmations fails closed",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({ min_confirmations: "0" }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "excessive minimum confirmations fails closed",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy({
          min_confirmations: "1000001",
        }),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, false);
  },
);

await test(
  "output explicitly refuses ancestry/quorum authority",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.ancestry_verified, false);
    assert.equal(result.provider_quorum_verified, false);
    assert.equal(
      result.production_source_finality_authority_ready,
      false,
    );
  },
);

await test(
  "block evidence exactly matches #1470 V2 input shape",
  async () => {
    const result =
      await observeBuyVoidSourceChainFinalityV1({
        request: request(),
        policy: policy(),
        transport: new MockTransport(),
      });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      Object.keys(result.block_evidence).sort(),
      [
        "evm_chain_id",
        "finalized_reference_block",
        "finalized_reference_block_hash",
        "finalized_tag",
        "marker",
        "provider_consistency_verified",
        "receipt_block_hash",
        "receipt_block_number",
        "schema",
        "source_chain",
      ].sort(),
    );
    assert.equal(
      result.block_evidence.schema,
      "void_buy_void_source_chain_finality_block_evidence_v1",
    );
    assert.equal(
      result.block_evidence.marker,
      "VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1",
    );
  },
);

await test(
  "source contains no signing, transaction or runtime mount primitive",
  () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts",
      ),
      "utf8",
    );

    for (const forbidden of [
      /eth_sendRawTransaction/,
      /eth_sendTransaction/,
      /signTransaction/,
      /sendRawTransaction/,
      /private[_ -]?key/i,
      /mnemonic/i,
      /seed[_ -]?phrase/i,
      /process\.env/,
      /setInterval\s*\(/,
      /app\.(?:post|put|patch|delete)\s*\(/,
      /router\.(?:post|put|patch|delete)\s*\(/,
      /child_process/,
    ]) {
      assert.equal(
        forbidden.test(source),
        false,
        String(forbidden),
      );
    }
  },
);

await test(
  "documentation records same-provider-only boundary",
  () => {
    const doc = fs.readFileSync(
      path.join(
        process.cwd(),
        "docs/architecture/buy-void-source-chain-finality-rpc-adapter-v1.md",
      ),
      "utf8",
    );
    for (const required of [
      '"finalized"',
      "receipt block number + hash",
      "finalized reference number + hash",
      "same-provider consistency",
      "does not prove ancestry",
      "does not prove provider quorum",
      "production_source_finality_authority_ready=false",
    ]) {
      assert.equal(
        doc.toLowerCase().includes(required.toLowerCase()),
        true,
        required,
      );
    }
  },
);

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1_GREEN",
      cases_passed: passed,
      cases_total: passed,
      finalized_tag: "finalized",
      exact_rpc_url_fingerprint_bound: true,
      receipt_block_hash_bound: true,
      finalized_reference_block_hash_bound: true,
      same_provider_consistency_verified: true,
      ancestry_verified: false,
      provider_quorum_verified: false,
      production_source_finality_authority_ready: false,
      live_rpc_executed_by_proof: false,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      money_movement: false,
    },
    null,
    2,
  ),
);
console.log(
  "VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1_GREEN",
);
