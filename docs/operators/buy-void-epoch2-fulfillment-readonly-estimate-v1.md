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
- Chain ID and canonical epoch-2 genesis hash **plus the independently
  accepted October 2 block 3,854 hash**
  `0x67e0ceaeee70c966271d37ebda1b07ee8d33c9b16bf4016a0d9eaefc3126c942`.
  A chain that shares genesis but not this reviewed history must HOLD;
- Exact immutable three-validator QBFT roster (Precision, Nimo, Xiphos)
  independently queried at **both pinned initial and final block heights**.
  The initial head can be valid while the final head has drifted; missing,
  changed, duplicate, or malformed validators at either height HOLD even if
  peer count is two and blocks were produced;
- two live peers, and **at
  least one new block** across a deliberate 12-second post-estimate observation
  window (more than two reviewed five-second QBFT periods). Connected peers
  with a stalled head must HOLD; no block-height rollback is ever accepted;
- exact reviewed presale and VOID bytecode hashes;
- token supply 333,333,333 VOID, presale's actual token balance plus fulfilled
  counter reconciled to the 10M inventory, with capacity for 2 VOID;
- successful marked transaction `eth_estimateGas` **and** computed runtime
  gas limit equal to `ceil(raw_estimate × 15,000 / 10,000)`, no more than
  `320,000`. These values must match the current reviewed dormant candidate's
  `VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS=15000` and
  `VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT=320000`. A raw estimate of
  `213333` computes to `320000` (GREEN), but `213334` computes
  to `320001` (HOLD). A green simulation does not substitute for the later
  production runtime configuration and credential attestation.

All RPC methods remain read-only on fixed `127.0.0.1:18553`, with a
separate **6-second absolute total-request deadline** covering connection,
headers and full response body, as well as the existing socket inactivity
timeout and 65,536-byte response bound. A peer trickling data indefinitely
must not postpone a definitive HOLD. All timers and the request transport are
closed on timeout, error, and normal completion.

An RPC error, missing/different accepted block 3,854, oversized/malformed
response, wrong contract/code, wrong storage,
quorum loss, validator-set drift (including final-head drift), excessive
estimate, absolute RPC deadline or source identity mismatch is a **HOLD**.
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
It also injects an inert simulated Node HTTP transport with a deliberately slow
response trickle, verifies the absolute deadline terminates it with zero
outstanding synthetic sockets or intervals, and rejects a final validator
roster that changed after a legitimate initial roster and block progression.
This proof invokes no production RPC endpoint or real signer.

**Production intake and WC/VOID market stay OFF. PROTECT THE CORE.**
