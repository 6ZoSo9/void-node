# Epoch-2 Buy VOID — live read-only delivery-gas qualification V1

Marker: `VOID_BUY_VOID_EPOCH2_READONLY_DELIVERY_ESTIMATE_V1`

## Purpose

Establish that **the selected, already-running Epoch-2 Chain-2050 RPC** can
simulate one EIP-1559 presale `fulfill` call with VOID's exact access-list
domain marker and zero native gas fee. This closes one execution compatibility
unknown that cannot be resolved by synthetic tests alone. It does **not**
verify Base USDC payment/finality or authorize a customer delivery.

Unlike the July 24 successful Base-mainnet payment → historical Epoch-1
two-VOID delivery, this observation targets the **current successor**:
- Production RPC: `http://127.0.0.1:18553/`
- Epoch-2 presale: `0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce`
- Immutable fulfiller (public **from**, not a signing key):
  `0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`
- Epoch-2 token: `0x470075b85352eb86f7d089fb9ba88945f12aad94`

## Operator invocation

Only after reviewing the merged, canonical source on Precision, run:

```sh
node --import tsx tools/void-buy-void-epoch2-readonly-delivery-estimate-v1.mjs --live
```

**This is not a presale opening command.** It never opens a wallet, reads a key
or systemd credential, signs a message, calls `eth_sendRawTransaction`,
issues a payment instruction, touches buyer or allocation ledgers, restarts a
service, or moves VOID. It makes only fixed-loopback, allowlisted RPC *reads* and
one **`eth_estimateGas` simulation**. A different RPC, recipient, nonce source,
payment transaction or amount cannot be supplied at the command line.

It uses a fresh random **synthetic** bytes32 payment ID, an intentionally
non-customer address `0x000000000000000000000000000000000000dead`, and
a simulated 2 VOID delivery. Neither ID nor address comes from the real $1
historical purchase. The simulated transaction is EIP-1559 type 2, chainId
2050, zero gas-price caps, zero native value, canonical `fulfill` calldata
and the exact marker:
`0x0000000000000000000000000000000000002050` /
`0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7`.

The qualification checks:
- Chain ID and canonical epoch-2 genesis hash, no block-height rollback, two
  live peers;
- exact reviewed presale and VOID bytecode hashes;
- token supply 333,333,333 VOID, presale's actual token balance plus fulfilled
  counter reconciled to the 10M inventory, with capacity for 2 VOID;
- successful marked transaction `eth_estimateGas` with estimate <=320,000.

An RPC error, oversized/malformed response, wrong contract/code, wrong storage,
quorum loss, excessive estimate or source identity mismatch is a **HOLD**.
Only an exact qualified read-only estimate reports
`READONLY_EPOCH2_DELIVERY_ESTIMATE_GREEN`.

That result is *not* proof of a real transaction, signer private-key control,
deployed current runtime, funded buyer payment, automatic fulfillment, an
on-chain delivery receipt, WC/VOID market readiness or public-launch authority.

## Source tests

```sh
node --import tsx scripts/prove_void_buy_void_epoch2_readonly_delivery_estimate_v1.mjs
```

The inert source proof loads the already-reviewed client-neutral Epoch-2
genesis manifest (including real contract runtime hex) and a synthetic
JSON-RPC result set, without opening any listener or touching a running node.
The companion PR workflow runs this proof on Node 22, 24 and 26.

**Production intake and WC/VOID market stay OFF. PROTECT THE CORE.**
