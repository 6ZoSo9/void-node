# Buy VOID replay: first-original history must not trust ambient Array methods

## Scoped problem

This review candidate is based on the merged October 10 presale source
generation, exact main ancestor `aa7f265a3f177e0de26ee51cfd6dc7a0caa33449`.
The reviewed original `src/economic/buy_void_verified_allocation_replay_binding_v1.ts`
Git blob is `435ed6000caad046f48fb318fbc7c865393f3b6c`.

The exact canonical JSONL parser used `lines.map(callback)` to construct
request and operator event histories, then used ambient array iterators,
`sort`, `every`, and `some` in first-buyer and launch/chain binding.
A mutated `Array.prototype.map` could select only the **last** request
snapshot, omitting an original request with no delivery wallet.
A synthetic local Node 22.16.0 reproduction showed two otherwise
unaltered JSONL row strings being reduced to the later row with a
replacement `map` function, without modifying the input bytes.

This is an **in-process ambient prototype contamination** threat, not a
claim that the public network permits injecting JS into a production node.
This class of adversary is already considered by related Buy VOID
toJSON/inherited numeric-index repair tests. The parser must not rely on
mutable Array.prototype to preserve first-original-buyer evidence.

## Narrow source-only correction

The successor uses `ownArrayIndexV1` with exact own DATA descriptors
to parse each split JSONL row into the same ordinal slot, avoiding
`Array.prototype.map`, `push`, iterators, and inherited numeric setters.
Request, verified-payment event, and allocation history traversal use
indexed own slots. Initial exact-line duplicate tracking uses a direct
`Set.add(exactLine)` instead of `new Set([exactLine])`, which would
consume an ambient Array.prototype iterator and could silently omit its
first duplicate-evidence member. The immutable launch-authority nine-key shape and
top-level classifier input shape use exact `Reflect.ownKeys` comparisons,
not inherited `sort`. Fixed dual-rail aliases use direct Boolean
comparisons instead of `some`/`every`.

The synthetic proof uses the **actual compiled replay classifier** on
an original request lacking a buyer wallet, a later backfill and a matching
synthetic USDC verified event. The original missing buyer must still
HOLD when an attacker swaps `Array.prototype.map` or
`Array.prototype[Symbol.iterator]` to discard the first history row.
The regression also checks that identical historical request snapshots
remain rejected when an injected Array iterator would otherwise suppress
the one-member `Set` constructor iterable. A separate source-chain alias
mismatch must HOLD even with corrupted `every/some`, and a forged extra
launch-authority key must HOLD with corrupted `sort`. The proof also verifies an intact request's original
missing-allocation classification and restores every native prototype
descriptor in `finally`.

Each exact-head Node 22/24/26 workflow performs locked install,
typecheck/build, the original reviewed replay proof and these adversarial
comparisons, requiring exact-byte transcript equality.

## Invariants and remaining holds

This is **a new source generation**. Historical replay/first-buyer
source Git blob checks may legitimately HOLD at the changed source path.
Their frozen reviewed source identities must NEVER be repinned to make
old workflows green; a separate independently reviewed generation
successor must bind these bytes before any production acceptance.

The changed code only protects the **named Array.prototype method and
iterator reliance in this classifier**. It does not prove all JavaScript
intrinsics or other modules immune to same-process arbitrary code execution.
It does not independently establish durable original request origin,
event fsync, protected high-water, Nimo custody reserve/recover, cross-ledger
exactly-once allocation, operator authentication, true provider finality,
mounted route, deployed artifact, or coupled WC/VOID presale opening.

No Ready/merge, deployment, live RPC, ledger append, customer data,
wallet/keys/signers, transaction, Chain 2050/WC, treasury/liquidity
or funds movement occurs.

**PROTECT THE CORE.**
