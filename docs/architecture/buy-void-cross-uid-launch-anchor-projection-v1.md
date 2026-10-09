# Buy VOID cross-UID launch anchor projection v1 — SOURCE-ONLY

## The remaining operator→custody authority boundary

The unmounted [operator verified-allocation dispatcher #2676](https://github.com/6ZoSo9/void-node/pull/2676)
cannot safely run the protected allocation writer directly from the ordinary
public node UID. The protected ledger/high-water roots are designated for
`void-buy-custody`; the reviewed AF_UNIX custody service still explicitly
holds `reserve` and `recover` until original payment and generation
provenance can be independently validated.

The canonical coupled-launch gate currently binds its **external launch
generation anchor** and authority lock through:
```text
os.userInfo().homedir
  /.local/state/void-node-authority-v1/
  buy-void-coupled-live-generation-anchor-v1.jsonl
```

That is an **OS-account home path**, not merely `process.env.HOME`.
Starting a future custody service with `HOME=<public-node-home>` would not
rebind this source function or independently prove the public anchor. A
service UID has its own identity and state/trust context; the fact two
processes can see the same DATA_DIR journal is **not** independent evidence
that they validated the same external high-water anchor and live lease.

## Exact source and test contract

This Draft pins two reviewed repository Git blobs on source main
`5a8787cea06fc545331f6223eafb9b8182f071ef`:

- `src/economic/buy_void_coupled_launch_gate_v1.mjs`:
  `e0402744ae51bb7bda2dc1e2038aae217d868ed9`.
- `tools/void-buy-allocation-custody-service-v1.mjs`:
  `a53ed0c6c506b3c30a5d219a72295740b7a6761f`.

`scripts/prove_buy_void_cross_uid_launch_anchor_projection_v1.mjs`
executes the **exact three extracted source function bodies** in an inert
Node `vm` context with injected synthetic `userInfo()`, `path` and
`process.env`. It never imports or executes the full launch gate, reads an
external authority file, opens a custody IPC socket, or switches real users.
The simulated public and custody home directories are explicit fictional
`/synthetic/...` paths; they are **not** assertions of actual installed
account home directories.

The proof establishes source semantics: different OS-account homes select
different external anchor paths and lock paths, even when the DATA_DIR
journal is held constant; changing ambient HOME alone does not override the
OS-account-derived anchor. It separately checks the actual custody service
source retains `reserve_method_enabled=false`, unbound verified payment
provenance, and both explicit reserve/recovery denial error paths. It
prints **no actual local home directory, account or customer data**.

An exact-head Node 22/24/26 workflow runs this only against the read-only
GitHub source checkout and requires three byte-identical HOLD receipts.

## Production launch bridge still unqualified

A future custody-service V2 contract must independently authenticate the
canonical original buyer/request history, durable verified payment, capacity
and duplicate admission, authoritative coupled launch generation, external
high-water anchor/journal and signer/lease evidence at use time. A caller's
`verified: true`, source-reported digest, supplied anchor filename or
green-flag IPC field is **not** trusted evidence. Cross-UID custody should
derive validity from an explicitly reviewed, privilege-separated source of
authority, not broad read access to public process home or a forged env
variable. No new key class, signature scheme, secret sharing, service
permissions or authenticated channel is proposed as approved in this Draft.

The result **always** reports:
```text
cross_uid_launch_generation_bound=false
canonical_durable_payment_provenance_bound=false
custody_reserve_or_recover_enabled=false
production_allocation_mutation_ready=false
real_external_anchor_read=false
service_start_or_permission_change=false
presale_or_market_activation=false
funds_moved=false
```

Nothing here attests actual Precision/Nimo/Xiphos host state, a current user
UID's effective home, installed service policy, the live launch lease or
external evidence. Future server-side implementation needs separate exact
source review, temp-ledger crash/replay security tests and designated-host
qualification.

**No Ready/merge, host/service/runtime, UID changes, credentials, wallet,
signer, original customer ledger, transaction, Chain-2050/WC, inventory,
presale/market, treasury, liquidity or funds action.**

PROTECT THE CORE.
