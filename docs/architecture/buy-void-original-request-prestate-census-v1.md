# Buy VOID original request prestate census v1 — operator read-only

Marker: `VOID_BUY_ORIGINAL_REQUEST_PRESTATE_CENSUS_V1`

## Launch blocker addressed

Buy VOID allocation recovery cannot trust a later mutable request row or a
`payment_verified` event to invent the original request's USDC contract, source
chain, or coupled launch receipt. The new pure #2615 replay classifier holds an
unqualified **original** request but intentionally allows unrelated unverified
legacy requests to coexist. The checkout source appears to construct those
fields for current-generation new requests; that does not prove the contents
of the operator's historical `requests.jsonl`.

This script is an **operator-invoked, read-only and privacy-minimizing prestate
census** to discover how much historical request data needs a separately
reviewed migration/adjudication decision. It does not classify actual payments,
trust a file merely because it looks valid, change the live app, or authorize
an allocation or sale.

## Operator interface (not run by CI against any production data)

```bash
node tools/void-buy-original-request-prestate-census-v1.mjs --plan
node tools/void-buy-original-request-prestate-census-v1.mjs --read-only /ABSOLUTE/KNOWN/REQUEST_DIRECTORY/requests.jsonl
```

The file path must be explicitly provided by the operator and be absolute. The
tool does not guess a data directory, follow symlinks, enumerate the filesystem,
read arbitrary files, or print the full path. If access fails, it **HOLDs**;
do not use `sudo`, change ownership/permissions, or copy live private ledgers
merely to satisfy this script. Its plain stdout JSON is a source-level
observation, not an attestation. A sandbox/temporary fixture is suitable for
review and CI. The production run requires a separate operator decision.

The script requires the basename `requests.jsonl`, rejects symlink ancestors
and final target, and retains a `O_RDONLY | O_NOFOLLOW` descriptor. It strictly
bounds reads to 64 MiB and 100,000 lines, verifies a regular single-link file,
checks the descriptor and visible path's identity and size/timestamps before
and after the read, and revalidates ancestor identity. Concurrent mutation,
truncated/noncanonical JSONL, unexpected request IDs and short reads HOLD. A
stable observation **cannot** establish external rollback prevention or the
identity of the original accepted history. A replace-and-restore attack or a
forged self-consistent file is outside this observation's trust boundary.

## Aggregate output only

The only output values derived from the request data are aggregate counts and
one content SHA-256 digest of the complete observed file. It never writes or
prints buyer details, individual request IDs, wallet addresses, payment
transaction hashes, USDC addresses or activation receipts.

Counts include: first-row explicit chain/alias consistency, canonical
USDC contract and schema-closed coupled launch tuple, how many distinct
requests satisfy all three shape checks, later retroactive token/launch/chain
backfills (which **never** qualify an originally missing field), **separate
post-original drift counters** for source-chain and USDC contract changes even
when each later row has internally consistent aliases, repeated exact snapshot
lines including A→B→A, conflicting chain aliases, and changed launch lineage
after an initially complete row. Missing/invalid late fields also count as
drift after an initially qualified original; the first-row qualification
count stays independent of the later anomaly counters. It scans **all request IDs**, without
using an unrelated unverified legacy row as a global blocker. However malformed
JSONL or request IDs cannot be safely localized and HOLD the entire census.

These checks are deliberately only **shape / consistency observations**. The
presence of an apparent valid launch tuple does not authenticate the original
signed receipt, live generation chronology or sovereign activation. A readable
file and its hash are not proof that the operator originally durably fsynced
it, that an attacker could not restore an older valid prefix, that a buyer
actually paid, or that any allocation may be written.

## Next approval gate

Run the prestate only through an explicitly reviewed operator read-only lane.
If there are legacy incomplete first rows, retain fail-closed per-request HOLD
and decide their individual migration/adjudication path based on separate
verified original payment/launch evidence; **never backfill** the original
contract or generation from a later mutable row. Then compose descriptor-bound
accepted `payment_verified` bytes and canonical `allocation_reserved` under
the existing serialized capacity/duplicate lock, #2433/#2442/#2446/#2451
allocation publication, and independently protected #2452 custody. The source
of the original launch authority and source-chain-specific server USDC policy
must be independently checked at use. No funds, keys, chain/WC writes,
readiness state or production service action follows from this census.

## Source validation

`node --check tools/void-buy-original-request-prestate-census-v1.mjs`

`node scripts/prove_void_buy_original_request_prestate_census_v1.mjs`

The focused Node 22/24/26 workflow uses only synthetic temporary private
files, and never accesses production request history or credentials.

**PROTECT THE CORE.**
