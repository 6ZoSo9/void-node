# VOID App Network read-only v1

Marker: `VOID_APP_NETWORK_READONLY_V1_PROOF_GREEN`

## Outcome

Replace the VOID App Network route's hard-coded three-machine demonstration values with a bounded, refreshable view of current read-only **local** network evidence.

The view reuses the existing `GET /__void/ui/wave2/home.json` adapter. It does not create a second node/network protocol or infer remote-machine health from peer visibility.

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

## Refresh and request ownership

Refresh is fail closed.

Before a replacement request begins, all previously validated node/head/peer/source/alignment evidence is immediately withheld. The UI shows HOLD/loading values rather than keeping stale evidence visible under a fresh-validation message.

Exactly one Network request is owned at a time:

- starting a replacement aborts the previous owned request before the replacement fetch begins;
- the caller deadline remains linked through response-body consumption;
- ownership lasts until the bounded body has been consumed and validated;
- route departure or view unmount cancels the owned request; and
- stale/superseded completions cannot render over a newer request.

## Composition and integrity boundary

`wallet-live.js` adds exactly one side-effect import:

```js
import './network-live.js';
```

Wallet is already loaded globally by the App shell, while current Network work does not own `app.js`, `views.js`, or `home-live.js`.

Because `wallet-live.js` is content-addressed by the existing Wave-2 and Wave-3 review manifests, and Wave-4 transitively binds those manifests, this lane refreshes only the required repository hashes in those three manifests. It does not alter the historical source-bundle payload hashes or prior visual-approval receipts.

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
4. superseded/unmounted requests are aborted and only one request is owned at a time;
5. nested numeric evidence is strict and chain-head display requires raw/normalized agreement;
6. the focused proof exercises bounded bodies, wrong numeric types, supersession, deadline propagation, unmount cancellation, and no-authority boundaries;
7. the focused workflow is present with immutable action pins and Node.js 22/24/26 coverage;
8. transitive App integrity manifests remain exact; and
9. fresh exact-head focused and proportionate repository checks plus review/collision rereads are green.

Falsification: abandon this lane if truthful Network utility requires a new networking protocol, a mutable topology endpoint, remote probing, credentials/account state, wallet/signing authority, sensitive-path expansion, or a competing owned lane.

## Proof

Run:

```sh
node scripts/prove_void_app_network_readonly_v1.mjs
```

The focused workflow also runs the shared site-theme regression and diff hygiene on Node.js 22, 24, and 26 with immutable GitHub Actions refs.
