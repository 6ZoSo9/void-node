# VOID App Network read-only v1

Marker: `VOID_APP_NETWORK_READONLY_V1_PROOF_GREEN`

## Outcome

Replace the VOID App Network route's hard-coded three-machine demonstration values with a bounded, refreshable view of current read-only network evidence.

The view reuses the existing `GET /__void/ui/wave2/home.json` adapter. On a local participant node it admits the original closed local evidence contract. On the public composition origin it admits a separate closed `public_safe: true` contract that exposes sanitized chain/peer/source truth without raw peer identity, participant account data, or remote-machine inference. It does not create a second node/network protocol.

A participant opening `#/network` can inspect:

- Mainnet-0 identity;
- the local node label and role;
- operational readiness;
- a chain head only when the normalized adapter claim exactly agrees with strict numeric raw head evidence;
- locally visible peer count versus the existing two-peer baseline;
- source availability for health, readiness, head, and peers; and
- strict readiness-head / last-mile / gap consistency.

## Browser transport and bounded evidence

The Network module performs same-origin `GET` only with:

- `cache: no-store`;
- `credentials: omit`;
- redirects rejected;
- `mode: same-origin`;
- `referrerPolicy: no-referrer`;
- a 5-second total deadline; and
- a 128 KiB streamed response ceiling before UTF-8 decoding and JSON parsing.

The outer Home-adapter snapshot is validated as a closed contract. Nested head/readiness numeric evidence is admitted only when it is already a nonnegative safe integer; strings, booleans, `null`, arrays, objects, and other coercible values remain unavailable.

The displayed chain head is withheld unless the adapter's normalized `network.chain_head` exactly matches the strict numeric raw latest-block evidence. This prevents the Network view from inheriting a coercion mistake from a lower layer as participant-visible truth.

## Public-safe composition contract

The public composition origin intentionally does **not** expose the private/local Home payload shape. The Network client therefore has two explicit, non-coercing admission paths behind the same same-origin endpoint:

- local snapshots retain the original `source_base`, raw source-body, local-role, and normalized/raw chain-head agreement checks;
- public snapshots must carry `public_safe: true`, `role: public-seed`, no selected participant account, unavailable public balances, sanitized source status/availability only, and an exact all-false public authority boundary.

The public path never fabricates raw readiness-head or last-mile evidence. Those fields remain unavailable when the public-safe snapshot does not publish them. Public chain alignment is displayed only from explicit `chain_synchronized`, `mesh_aligned`, zero-gap, and present chain-head evidence.

Because `network-live.js` is already loaded globally through the reviewed Wallet loader, shell ownership is now route-exclusive: the existing `home-live.js` remains the Home-route shell writer, the validated Network view owns shell truth on `#/network`, and the bounded background Network reader owns Wallet, Earn, Data, Buy, Validate, Foundation, and other non-Home/non-Network routes. This removes competing Home/Network shell writers while giving the previously stale non-Home routes fresh Mainnet-0 node/peer/head truth.

## Refresh and request ownership

Refresh is fail closed.

Before a replacement request begins, all previously validated node/head/peer/source/alignment evidence is immediately withheld. The UI shows HOLD/loading values rather than keeping stale evidence visible under a fresh-validation message.

Exactly one Network request generation is owned at a time:

- starting a replacement aborts the previous owned request before any replacement fetch can begin;
- every streamed `reader.read()` is raced against the owned caller deadline instead of trusting the body to honor abort;
- rejected/aborted body cancellation gets a separate 250 ms teardown terminal, so the caller reaches a bounded result even if `cancel()` never settles;
- an aborted generation with unresolved body work remains quarantined and blocks a replacement generation until its read/cancel terminal is actually witnessed;
- a stream that repeatedly yields zero-length chunks is rejected after a fixed progress bound rather than being allowed to spin indefinitely;
- normal cancellable responses release ownership before the abort is returned;
- route departure or view unmount cancels the owned request; and
- stale/superseded completions cannot render over a newer request.

## Composition and integrity boundary

`wallet-live.js` adds exactly one side-effect import:

```js
import './network-live.js';
```

Wallet is already loaded globally by the App shell, while current Network work does not own `app.js`, `views.js`, or `home-live.js`.

Because `wallet-live.js` is content-addressed by the existing Wave-2 and Wave-3 review manifests, and Wave-4 transitively binds those manifests, this lane refreshes only the required repository hashes in those three manifests. It does not alter the historical source-bundle payload hashes or prior visual-approval receipts.

During current-main reconciliation, repository-hash entries already stale on `main` are also refreshed from the exact merged bytes inside those same three manifest files. This repairs integrity metadata only; it does not import additional source/runtime authority into the Network lane.


## Persistent shell generation ordering

Persistent shell publication is single-writer by route and fail closed across route transitions:

- Home keeps its pre-existing Home adapter writer; the background Network reader does not fetch or write there.
- Network-view success owns `#/network` shell publication, while Network-view failure marks the shell unavailable and clears the success marker.
- Other participant routes use the background Network reader.
- Every view-root route transition invalidates and cancels the prior background shell generation before a new background read is queued.
- A background completion rechecks both its exact serial and current route ownership before either successful publication or unavailable publication.
- Therefore a slow/failed background generation that began before navigation cannot overwrite a fresher Network-view result.

The executable shell proof covers both stale-success and stale-failure orderings, direct Network-view failure truth, Home background-fetch exclusion, and normal background-route success.

## Authority boundary

This source cannot:

- dial, connect, disconnect, add, remove, or rewrite a peer/route;
- probe a remote machine;
- restart or deploy a node/service;
- write network or consensus state;
- connect/unlock a wallet or access a signer;
- register or activate a validator;
- write Work Credits;
- construct, sign, or broadcast a transaction; or
- move treasury, liquidity, or user funds.

Source-green is not deployment or public-origin acceptance evidence.

## Definition of Done

Source DoD requires:

1. the Network loader is actually integrated into the existing App shell;
2. same-origin GET-only transport and the 128 KiB ceiling are preserved;
3. stale evidence is withheld immediately during refresh;
4. response-body reads obey the caller deadline, teardown has a separate bounded terminal, and at most one unresolved/quarantined request generation can exist;
5. nested numeric evidence is strict and chain-head display requires raw/normalized agreement;
6. the focused proof exercises bounded bodies, wrong numeric types, supersession, deadline propagation, unmount cancellation, and no-authority boundaries;
7. a separately closed public-safe Home fixture proves the public Network model and global shell truth without admitting private account/peer identity;
8. the focused workflow is present with immutable action pins and Node.js 22/24/26 coverage;
9. transitive App integrity manifests remain exact; and
10. fresh exact-head focused and proportionate repository checks plus review/collision rereads are green.

Falsification: abandon this lane if truthful Network utility requires a new networking protocol, a mutable topology endpoint, remote probing, credentials/account state, wallet/signing authority, sensitive-path expansion, or a competing owned lane.

## Proof

Run:

```sh
node scripts/prove_void_app_network_readonly_v1.mjs
```

The focused workflow also runs the shared site-theme regression and diff hygiene on Node.js 22, 24, and 26 with immutable GitHub Actions refs.
