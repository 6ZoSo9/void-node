# Original buyer wallet replay provenance — current-source proof successor

## Narrow defect, source ancestry, and immutable history

[Current V6 operator + buyer allocation composition #2750](https://github.com/6ZoSo9/void-node/pull/2750)
adds the security repair from [#2739](https://github.com/6ZoSo9/void-node/pull/2739):
the FIRST observed request row must already contain the buyer delivery wallet.
Subsequent snapshots may legitimately fill some pending fields, but cannot
invent an original buyer address after a claimed verified payment.

The exact newer `src/economic/buy_void_verified_allocation_replay_binding_v1.ts`
Git source blob is `0a74a3652081c3e142d0b887676771a7ac148f32`.
The predecessor source blob is
`970e686cd96b43d496c44acb4ff343a5e61e26c5`. Their
exact file-content diff is **eight added lines, zero removed**:
one historical RequestState boolean `initialDeliveryQualified`,
initialization from `Boolean(delivery)`, preservation across snapshots,
and checks for it at target replay, verified event binding, and preappend.
The stronger guard does not permit any new monetary state transition.

The existing pure hypothetical crash matrix and custody reserve-plan proof
from #2750 still checked the predecessor source blob. The old source-identity
HOLD was legitimate because the executable trust boundary changed.
This successor changes only TWO synthetic proofs and documents exactly why
their source expectations now bind to the current reviewed source. It does
not alter, replace, or reissue a historically accepted runtime manifest.

## Negative proof and delivery properties

Both independent proof suites now test absence of the delivery wallet in
the initial customer request, **including a later snapshot with the exact
originally missing wallet added**. The immutable verified-payment event can
otherwise appear well formed, yet replay MUST return
`request_initial_delivery_address_missing`; the composed pure custody
planner MUST return a corresponding verified-replay HOLD and never produce
a new allocation candidate.

All existing tests remain: duplicate payment event, conflicting USDC token
and chain, altered quote, original launch generation drift, replay/recovery
across intent-only / ledger-only / full high-water publication, sold-out
10-million-VOID capacity, idempotent replay after a hypothetical crash, and
source-only no-transaction/no-funds claims.

The newly pinned output includes
`original_first_delivery_lineage_required=true`. Exact-current-head Node
22, 24 and 26 independently build, run both proofs, and compare deterministic
receipts. A passing focused job is not evidence of installed custody or
production payment finality.

## HARD HOLD remains for presale

The current real operator HTTP route still uses the payment-only writer;
the verified-payment→allocation dispatcher is **UNMOUNTED**. The Nimo
**original frozen V1** bundle is installed with matching bytes; proposed
V2 is staged as an inert archive, not installed/accepted. Its frozen
historical identity must not be repinned to current compiled code.
Custody reserve/recover IPC, protected high-water/writer, cross-UID
authentication, first real fsynced buyer payment, provider quorum, WC/VOID
market-vault inventory, and paired launch remain separately HOLD.

No deploy, source promotion, installed file, service restart, customer
ledger, wallet/signer, transaction, liquidity/treasury, or funds action.

`production_allocation_mutation_ready=false`
`presale_activation=false`
`funds_moved=false`

**PROTECT THE CORE.**
