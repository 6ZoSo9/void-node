# Participant public gateway: exact latest parent isolation V3

## Purpose and immutable source generations

**Source-only, no branch integration.** The user's read-only stack merge dry
run showed [Draft #2827](https://github.com/6ZoSo9/void-node/pull/2827)
has a clean virtual merge against [checkout parent #2823](https://github.com/6ZoSo9/void-node/pull/2823),
but its historical V2 gateway source hash was stale. A clean merge does not
make old exact-source positive evidence current or qualify a service.

The additive V3 proof pins these exact immutable objects:

- Stacked child's historical #2823 parent commit:
  `4418617018aeb94a3f065ca3d791aa010f2bcff6`;
  gateway Git blob `d7174ee47ce2438fcc88764a76e08e7cc7f46787`.
- Latest observed #2823 parent commit:
  `d49126c39e298313b1151f1cbd3b4068339c0aaa`;
  gateway blob `b718c5eccedc8d1ac08d1bd8f2281304ca49e152`.
- Original frozen participant V1 preflight blob
  `507ee9a1c9b553a86944b2e5287f220c6af73044`,
  historical participant V2 verifier blob
  `1acd2ab1d46e06dc0b19059c5e8686a9856ca428`,
  and existing actual synthetic V2 proof blob
  `e9e5ab8419534dffafcee195e7b6ab663711108f`.

The existing V1 negative and V2 executable/proof/workflow remain byte-for-byte
untouched. V3 does not weaken old source pins or allow an arbitrary `HEAD`.

## Exact verified change boundary

Both complete gateway source versions are fetched by immutable Git commit.
The code block starting at
`// VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1` and ending immediately before
`const HOST = process.env.VOID_COMPOSITION_HOST` is the *only* changed source
region. The old checkout code block has 11,014 bytes; latest has 17,911
bytes and adds separate public POST upload lifetime, receipt constraints and
related defensive logic.

Outside that one checkout block, **all 88,262 source bytes are identical**:
the participant session-read, durable state composition, account-read route,
role-authority injection and public no-wallet/no-WC authority code did not
change. V3 also binds each of the **other sixteen** source files named by
the V2 reviewed composition verifier to their exact Git blobs in the latest
parent. No other reviewed participant authority dependency changed.

The proof then **executes the existing V2 full disposable actual-client
participant test**, including live-role synthetic admission, durable session
storage, fake-source read limitations, historical V1 refusal, and
`runtime_activation_authorized=false` result.

## CI and hard HOLD

The new V3 workflow runs on **Node 22, 24, and 26**, uses an exact no-credential
checkout and the current parent's immutable commit, builds the reviewed code,
checks proof/source hashes and clean Git status, keeps receipts in
`$RUNNER_TEMP` and compares raw receipts across Node majors. Node 24 also
typechecks. This is a semantic precomposition proof only.

**The child checkout still pins its old gateway blob.** This V3 addition
does **not** merge/rebase the parent, move the child source generation, satisfy
the user's original `pin_match` criterion, make participant sessions live,
qualify the installed gateway or activate buyer payments, Work Credits or
the coupled presale/WC market. The parent/child must later be integrated by
a separately authorized action, with a fresh exact merged-tree and host
acceptance proof. The other ingress/Precision gateway children #2828 and
#2829 remain independently stale and require their own current-source review.

No operator host, wallet, key, credential, customer ledger, private endpoint,
production listener, payment, validator, Work Credit, treasury, transaction or
funds access follows from this source test. **PROTECT THE CORE.**
