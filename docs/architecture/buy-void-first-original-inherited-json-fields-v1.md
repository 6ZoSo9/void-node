# Buy VOID original-buyer JSONL: inherited-field isolation V1

## Source-generation and threat model

This security fix is stacked on the exact [Draft PR #2774](https://github.com/6ZoSo9/void-node/pull/2774)
head `9b88c20b72ee2e7b0fa1c7dc7eef95b5cd65e821`,
which already protects first-original chronology against mutable
`Array.prototype` iteration/mapping and `String.prototype` JSONL framing.

A separate *same-process* inherited-property risk remains in that generation:
`JSON.parse(line)` creates a new object inheriting `Object.prototype`.
The replay classifier then accesses `row.delivery_address`,
`row.usdc_contract`, `row.launch_authority`, or `row.request_id`
directly, including when the historical JSONL row **does not contain** that
property. If unrelated same-process code has previously defined an
`Object.prototype.delivery_address` getter or value, an original R0 row
without an authenticated buyer wallet can appear qualified while
`JSON.stringify(row)` still reproduces precisely the original JSON bytes.

**Node 22 isolated primitive reproduction:** a canonical JSON object
missing `delivery_address` inherited a forged valid EVM address through
`Object.prototype.delivery_address`; `Object.hasOwn(row,"delivery_address")`
remained false and `JSON.stringify(row)` remained equal to the original
bytes. This is a source integrity attack hypothesis in the already-reviewed
prototype-pollution threat model, **not proof of remote entry or real fraud**.

## Narrow source fix

Only the JSONL row decoder in
`src/economic/buy_void_verified_allocation_replay_binding_v1.ts`
changes. It captures native `JSON.parse` and `Object.setPrototypeOf`
at module load, then uses a JSON.parse reviver to assign **null prototypes
to every parsed JSON object and array**, including nested payment/verifier
records, before canonical serialization or field interpretation.

This preserves the exact raw newline, UTF-8, JSON member order and hash-chain
bytes and prevents the new row values from inheriting attacker-supplied
`Object.prototype` fields/getters/`toJSON` or `Array.prototype.toJSON`.
It does not synthesize missing JSON members or rewrite old ledger bytes.
Old initial buyer wallet, original launch generation, native Base/Ethereum
USDC, exact payment identity and allocation lineage guards remain.

The compiled-module regression uses inert original R0 (wallet missing)
followed by later R1 wallet backfill, plus complete original, missing USDC
token, missing original launch authority, missing original request ID, and
nested array canonicalization controls. It installs and restores malicious
inherited getters and `toJSON` hooks after all fixtures are written,
requires every missing-original row to HOLD, all hooks to remain uncalled,
and the complete buyer to remain `verified_allocation_missing`.

A focused exact-head Node **22/24/26** workflow rebuilds from the
new source bytes, executes these tests, then requires byte-equal receipts.
**Its CI must run before claiming completion.**

## Hard qualifications

The original parent's seven-file combined source/proof generation stays
unchanged. This is a *new reviewed source identity*, so historical
source-blob-pinned workflows (including the earlier Array-only and
historical crash/dispatch generations) may properly fail; DO NOT rewrite,
waive, repin or misstate their historic hashes. A separate current-main
successor review must qualify the new generation's first-original replay
and downstream payment/allocation integration.

`descriptor_bound_read=false`, `independently_proven_event_fsync=false`,
`payment_verified_append=false`, `allocation_write=false`,
`runtime_integration=false`, `production_gate_ready=false`.
This does not solve authenticated private custody roots, protected
high-water, original durable payment source finality, installed Nimo
witness, exactly-once reserve/recover, or WC/VOID launch coupling.

No Ready/merge, host/service, customer records, wallet/key/signer,
transaction, Chain-2050/WC, presale/market, inventory, treasury/liquidity,
or funds movement. **PROTECT THE CORE.**
