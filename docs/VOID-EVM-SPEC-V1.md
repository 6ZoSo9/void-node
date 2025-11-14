# VOID Network – EVM Chain Spec (v1, draft-but-serious)

This file defines the **EVM-level parameters** for VOID (chainId 2050).

It sits alongside:

- `docs/VOID-MAINNET-GENESIS-PLAN.md`
- `docs/VOID-TOKENOMICS-SPEC-V1.md`
- `docs/VOID-VALIDATOR-SET-SPEC-V1.md`
- `docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md`

This spec answers: “What does a VOID full node / RPC need to know about the
EVM rules on chainId 2050?”

---

## 0. Identity

- **chainId:** `2050`
- **network name:** `VOID`
- **currency symbol:** `VOID`
- **decimals:** `18`
- **native token:** VOID (same asset as `VoidToken`, but the ERC20 is the
  accounting wrapper on top of the base asset).

We stay EVM-like so tools (Metamask, Foundry, Hardhat, etc.) can talk to
VOID without custom hacks.

---

## 1. Block timing and gas

- **Target block time:** `2s`
- **Hard block gas limit (initial):** `30,000,000` gas
- **Target gas per block (EIP-1559):** `15,000,000` gas

The node must:

- Treat `gasLimit` as a hard ceiling.
- Use EIP-1559 style basefee mechanics (London-style),
  so we get predictable fee markets.

We reserve room to tweak gas limit per-era via governance, but
**initial mainnet launch** should use the above numbers.

---

## 2. EIP / hard fork level

VOID L1 should look like a “post-Merge, post-Shanghai” chain out of the box.

Baseline:

- Frontier → Homestead → Byzantium → Constantinople → Istanbul.
- Berlin, London (EIP-1559), Shanghai / Capella all **enabled**.
- No PoW; VOID consensus is VoidBFT (our custom validator-based
  protocol), but the EVM rules follow “post-Merge” Ethereum.

Practical impact:

- `chainId`-based replay protection (EIP-155).
- EIP-1559 gas model.
- Access lists, Berlin gas changes, etc.
- Shanghai-style warm/cold access semantics.

The node implementation (`void-node`) must enforce the same opcode set and
gas schedule as post-Shanghai Ethereum. If we diverge, it needs to be
explicitly documented in this file.

---

## 3. Precompiles

VOID uses the **standard Ethereum precompiles**, same addresses:

- `0x0000000000000000000000000000000000000001` – ecrecover
- `0x0000000000000000000000000000000000000002` – SHA256
- `0x0000000000000000000000000000000000000003` – RIPEMD-160
- `0x0000000000000000000000000000000000000004` – identity
- `0x0000000000000000000000000000000000000005` – modexp
- `0x0000000000000000000000000000000000000006` – ecadd (bn256)
- `0x0000000000000000000000000000000000000007` – ecmul (bn256)
- `0x0000000000000000000000000000000000000008` – ecpairing (bn256)
- `0x0000000000000000000000000000000000000009` – Blake2f

We also reserve a **future AI precompile range**:

- `0x00000000000000000000000000000000000000A0` – `AI_PRECOMPILE_RESERVED_0`
- `0x00000000000000000000000000000000000000A1` – `AI_PRECOMPILE_RESERVED_1`
- ...
- `0x00000000000000000000000000000000000000AF` – `AI_PRECOMPILE_RESERVED_15`

Nothing in this range is active in v1. They are reserved for:

- On-chain verifiers of AI proofs / receipts.
- Specialized hash / commitment functions for models / datasets.

---

## 4. Genesis hooks (tie-in to other specs)

Genesis MUST respect:

- `MAX_SUPPLY = 666,666,666 VOID`
- `PREMINE   = 230,000,000 VOID`
- `REMAINING_EMISSIONS = 436,666,666 VOID`

Policy:

- The EVM genesis allocates balances according to
  `docs/VOID-MAINNET-GENESIS-PLAN.md`.
- The **staking / validator** contracts deployed at or near genesis must match
  `docs/VOID-VALIDATOR-SET-SPEC-V1.md`.
- The node-side reward engine / monetary state helpers (`src/tokenomics/*`)
  must be consistent with:
  - `docs/VOID-TOKENOMICS-SPEC-V1.md`
  - `docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md`

No component is allowed to invent its own idea of total supply or premine.

---

## 5. Basefee and transaction pricing

High-level rules:

- EIP-1559 basefee per gas:
  - Adjusts up/down based on gas used vs. `TARGET_GAS_PER_BLOCK`.
  - Same formulas as Ethereum London by default.
- Min gas price enforcement:
  - Validators must reject transactions with `maxFeePerGas < basefee`.
- Tip (`maxPriorityFeePerGas`) is paid to the **block proposer / validator**
  as part of their reward bundle (on top of protocol rewards).

This is **orthogonal** to VOID’s emission-based validator rewards. Fees are
purely demand-driven; emissions are controlled by the reward engine and
monetary state.

---

## 6. Finality / confirmation assumptions

This file doesn’t define the consensus algorithm in detail, but sets the
expectations the EVM must live with:

- Consensus layer provides **finalized blocks** after N confirmations
  (VoidBFT epochs).
- Wallets and apps should assume a **“safe confirmation depth”** that will be
  defined per network stage:
  - Devnet: very low (1–3 confirmations).
  - Testnet: mid (5–10).
  - Mainnet: conservative (maybe 16+), to be finalized in the phases doc.

The important bit: once a block is finalized at the consensus layer, the EVM
state ROOT is immutable under normal operation.

---

## 7. AI-centric direction

VOID is **AI-first**, so the EVM spec leaves explicit hooks:

- Reserved precompile range for AI-related operations.
- Reserved **system contracts** (AdminGate, ConfigGate, JobQueue,
  Agent/Model/Dataset registries) that define how off-chain AI agents
  connect to on-chain jobs and receipts.
- Chain must remain EVM-compatible, but we bias future upgrades toward:
  - Attested inference primitives.
  - Model/dataset provenance.
  - AI job marketplaces (via JobQueue + receipts).

Any change to these rules must go through:

- On-chain `UpdateGate` / `ConfigGate` mechanisms.
- The **master key / AdminGate** governance path we already designed.

---

## 8. Open TODOs for this spec

For a v2 of this file we still need to lock down:

1. Exact numeric basefee parameters (`BASEFEE_MAX_CHANGE_DENOMINATOR`,
   target gas, etc.) — currently “same as Ethereum London”.
2. Any deliberate deviations from Shanghai gas schedule (if we decide to tune
   storage costs or opcodes for AI workloads).
3. The exact list of EIPs enabled/disabled, frozen in time at mainnet launch.

For now, v1 is “Ethereum post-Shanghai semantics, chainId 2050, VOID
tokenomics, and our AI/gov contracts layered on top.”

