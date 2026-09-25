# Buy VOID production activation evidence v1

Marker: `VOID_BUY_VOID_PRODUCTION_ACTIVATION_EVIDENCE_V1`

Status: source-only production evidence and dormant configuration candidate. This lane does not enable the payment-keyed runtime, enable apply, read credentials, sign, broadcast, restart services, move funds, or activate the public Buy VOID surface.

## Exact live deployment

The accepted fulfillment deployment is:

```text
chain_id=2050
contract=0xa40a43adfd174f88309173cb3daa6e09c10154a7
transaction_hash=0x36d9763907e86f6623f2a548269211ffc8e04f69e1e05622e7486bf61708622b
deployment_block=37373
deployment_block_hash=0x54c4a6534289eda4b9b774ed6ce58f84f8d039a393e0cb065007932159ed4d23
deployment_attestation_id=voidbvpfda1_bdf7aa4d8821c0f724960e588f5dddecb25985c28665f525323ab0627a56d2b3
```

The live observer established exact creation transaction, CREATE address, runtime bytecode, immutable token/fulfiller/predecessor bindings, contract views, and the three-confirmation floor.

The deployment state was durably captured and selected for restart at block 37375.

## Exact presale inventory funding

The presale fulfillment contract now holds the full gross lifetime inventory:

```text
10,000,000 VOID
10000000000000000000000000 token atoms
```

Funding used the established two-leg treasury path:

```text
VoidTreasury.sendToOps
  tx=0xda2e6f4a58c8e094bcead160bf5ed89d5dfd98286686cb0cfb85f39d2205b1d8
  block=37376

OpsTreasury.spend(fulfillment, 10,000,000 VOID, tag)
  tx=0x81a3f8c199021d8cef9da3de999417c02ade6064671a9de073764ca4dea22f56
  block=37377
```

The exact post-state is:

```text
VoidTreasury=323207333 VOID
OpsTreasury=0 VOID
fulfillment_contract=10000000 VOID
maxInventoryAtoms=10000000 VOID
totalFulfilledAtoms=0
remainingInventoryAtoms=10000000 VOID
```

Block 37377 was captured as finalized checkpoint:

```text
checkpoint_id_sha256=8ed034620efb9ab2d960bc3ee5086a3510acff7f5572b8204254c794be871ac9
state_sha256=263284bf624e3c8ab8795ecadec05d96f3127fabd76cc476f5b526687d32460b
```

The startup selector chooses that exact checkpoint, so restart selection protects the funded inventory state.

## Real production-token gas result

The merged production gas observer measured the deployed fulfillment path against the actual canonical VOID token at block 37377.

```text
live_estimated_transaction_gas=149005
candidate_multiplier_bps=15000
rounded_live_candidate=230000
local_lower_bound_candidate=320000
accepted_production_runtime_gas_ceiling=320000
```

The observer used only `eth_estimateGas` and revalidated that the payment ID, fulfillment-contract balance, probe-recipient balance, and observation block were unchanged.

Therefore `320000` is accepted as the production maximum gas limit for the dormant candidate.

## Dormant production candidate

The candidate is stored at:

```text
ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json
```

The important runtime values are:

```text
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL=http://127.0.0.1:8545/
VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS=0xa40a43adfd174f88309173cb3daa6e09c10154a7
VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS=15000
VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT=320000
VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS=20000
VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI=3000000000
VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI=1000000000
VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS=3
```

The existing pure production configuration verifier must accept the complete candidate before this lane is GREEN.

## Activation boundary

Acceptance of this lane means:

```text
production_configuration_candidate_verified=true
deployment_attested=true
predecessor_lineage_attested=true
inventory_funding_verified=true
production_runtime_gas_ceiling_accepted=true
runtime_enabled=false
runtime_apply_enabled=false
public_activation=false
```

It does not install or modify a systemd unit and does not change the running host environment.

## Native-gas liability remains a launch gate

The accepted `320000` runtime gas ceiling bounds one fulfillment attempt, but
that alone does not make the presale gas-self-funding. Chain-2050 gas is paid
from the canonical fulfiller's native balance, which is separate from
`VoidToken` inventory.

Coupled launch now requires
`VOID_COUPLED_NATIVE_GAS_LIABILITY_V1`. Every payment obligation must reserve
two bounded fulfillment attempts before its payment instruction can gain public
money authority:

```text
320000 gas
* 3000000000 wei max fee per gas
* 2 bounded attempts
= 1920000000000000 wei reserved per accepted obligation
```

The second attempt is manual recovery only; automatic retry remains disabled.

This does not introduce a hidden minimum purchase or alter the fixed presale
rate. If the shared payer lacks enough **unreserved** native balance, new
payment admission stops before more customer money is accepted.

That statement does not mean arbitrarily small purchases must remain admissible
forever. A microscopic USDC payment can create nearly the same fulfillment gas
liability as a large purchase. Public activation therefore also requires an
explicit anti-grief policy. If the selected design uses a minimum purchase, the
minimum must be public and policy-bound before payment instructions are issued;
batching, user-paid gas, or another bounded mechanism may instead close the
gate. No amount is selected by this source audit.

Public payment instructions also need bounded lifetime. If issuing an
instruction reserves gas or inventory, production must bind a TTL plus
per-requester and global outstanding limits so unpaid instructions cannot pin
capacity indefinitely. On expiry, the system must recheck for an observed
source-chain payment before releasing the soft reservation. A payment observed
after expiry enters deterministic late-payment/customer-resolution handling; it
does not automatically reactivate the stale instruction or silently trigger an
automatic refund.

The reservation journal and runtime guard are not yet integrated, so public
activation remains HOLD even though the production gas ceiling itself is
accepted.

The shared payer also serves as the authorized WC/VOID settlement executor.
Before coupled activation, both lanes therefore require one nonce scheduler in
addition to the gas-liability journal. A per-lane nonce allocator is not enough:
two independently prepared type-2 transactions from the same EOA can collide or
replace one another even when their gas balances were reserved correctly.

Admission must use a fresh Chain-2050 fee observation. An observation whose base
fee no longer fits the configured max-fee cap cannot authorize a new customer
payment instruction.

Gas reservations remain open through pending, crash-uncertain, or
reorg-uncertain states and are released only after the terminal receipt satisfies
the required finality boundary. Unused capacity is reconciled from actual
receipt gas usage rather than from transaction submission alone.

Finally, per-payment reservation safety does not prove lifetime presale
capacity. The recorded gas balance must not be described as sufficient for the
entire 10,000,000-VOID sale unless a separately reviewed capacity or replenishment
proof establishes that fact. A paid-but-unreservable customer resolution/refund
policy is also still separate; any future Base/Ethereum refund must fund its own
source-chain transaction fee and cannot consume the Chain-2050 fulfillment-gas
reserve.

There is also an execution-layer identity HOLD. The economic contracts and
`VoidToken` currently live on a private loopback Anvil RPC using chain ID
`2050`, while the public VOID node/P2P runtime has its own block history.
Current audited source does not prove those histories are identical or
cryptographically anchored. Public presale activation therefore also requires a
reviewed economic execution-layer identity, an independently verifiable public
`VoidToken` state/receipt path, explicit native-gas currency
supply/accounting, and a reviewed post-purchase participant control path. A
successful delivery is not sufficient product readiness if the buyer cannot
later verify, authorize, and submit a transfer/use of the delivered token under
the reviewed gas model.

The private EVM state also contains historical standard Anvil prefunded
development accounts with publicly known keys. Those historical receipts remain
evidence, but public economic activation is HOLD until every known-key balance
is reconciled/neutralized in the accepted state model and any public transaction
submission path rejects known dev-key transactions until that transition is
proven.

## Next gate

The next separate gate is host runtime configuration preparation with both child runtime flags still disabled. That gate should bind the dormant candidate into the Precision runtime/service environment and prove the status surface reports the exact candidate fingerprints before any enable transition is considered.
