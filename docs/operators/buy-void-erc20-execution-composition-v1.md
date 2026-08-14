# Buy VOID ERC-20 execution composition v1

Marker: `VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1`

## Outcome

Close the source gap between the merged coherent-`pending` ERC-20 planner and the retained canonical delivery runtime without mounting or activating that runtime.

The runtime request is no longer an authority for nonce, gas limit, max fee, or priority fee. Those values come only from the server-controlled ERC-20 planner and are persisted with the exact unsigned transaction and signed transaction hash before any broadcast stage can run.

## Preparation

A canonical reserved execution attempt is planned against Chain 2050 `pending` state. The exact observed pending nonce is claimed under a wallet-scoped filesystem bakery lock. A competing unbroadcast attempt observing the same pending nonce receives HOLD rather than a speculative later nonce.

Immediately before signing, the planner is rerun and the pending nonce must still equal the durable reservation. The signer must report the configured fulfillment wallet. The returned signed transaction is locally parsed and must exactly match the server-derived ERC-20 type-2 transaction. Only its hash is persisted; raw signed bytes are discarded and never returned.

The immutable preparation record binds token, recipient, VOID units, token atoms, transfer calldata, nonce/gas/fees, planner fingerprint, RPC fingerprint, unsigned transaction fingerprint, and signed transaction hash. The existing execution-attempt journal is then advanced to `prepared`, and the existing crash-consistent saga is reconciled through its generic `transaction_prepared` event.

## Broadcast and crash recovery

Broadcast runs only from a recoverable preparation. The coherent planner is rerun immediately before the stage and a nonce drift is a HOLD.

The existing saga supervisor writes `broadcast_intent_committed` before the external sign/broadcast adapter runs. The adapter consumes only the persisted server-derived plan. The request body cannot provide a plan or submission idempotency key.

If a crash occurs after provider acceptance but before the execution-attempt broadcast projection is persisted, restart does not rebroadcast. The composition performs one bounded read-only receipt-presence query for the known signed hash. Only an actual matching receipt permits reconstruction of `record_broadcast_accepted`; the existing full ERC-20 receipt reconciler then performs token-transfer and confirmation-stability validation.

## Confirmation and closeout

A successful ERC-20 receipt is projected through the existing pipeline `record_confirmed` action. Only after that canonical confirmed-state write succeeds is the generic saga advanced to `receipt_confirmed`.

The composition stops there. The existing saga terminal-closeout family remains the sole owner of inventory consumption and public fulfilled closeout.

## Crash proof

The focused proof injects failure at two durable boundaries:

1. after signed-hash custody but before execution-attempt preparation; restart must reuse custody without signing again;
2. after synthetic provider acceptance but before broadcast projection; restart must reconcile the receipt while broadcaster invocation remains exactly one.

All RPC and signing/broadcast behavior in the proof is local/injected synthetic behavior. No production credential, production RPC, live transaction, or funds are used.

## Authority boundary

This is source/proof/docs/CI only. Runtime route mounting remains false at the canonical parent. No deployment, service activation, production credential access, live wallet use, live RPC, live transaction signing/broadcast, inventory funding, treasury/liquidity action, or funds movement is authorized or performed.
