# VOID App Network read-only v1

Marker: `VOID_APP_NETWORK_READONLY_V1_PROOF_GREEN`

## Purpose

Replace the VOID App Network route's hard-coded three-machine demonstration values
with current read-only local network evidence. The view reuses the existing
`/__void/ui/wave2/home.json` adapter instead of creating a second node/network
protocol or backend route.

The Network view reports only what the local adapter can prove:

- Mainnet-0 identity;
- local node label and role;
- operational readiness;
- local chain head;
- locally visible peer count versus the existing two-peer expectation;
- source availability for `/health`, `/__void/ready.json`,
  `/blocks/latest/number2.json`, and `/p2p/peers`; and
- local readiness-head, last-mile, and gap consistency.

It does **not** infer that Precision, Nimo, Alienware, or any other remote machine
is online, aligned, or healthy merely because a peer is visible. It does not
render remote peer identities from unreviewed peer payload fields.

## Browser contract

The live module performs one same-origin `GET` to the existing Home adapter with:

- `cache: no-store`;
- `credentials: omit`;
- redirects rejected;
- `mode: same-origin`;
- `referrerPolicy: no-referrer`;
- a 5-second timeout; and
- a 128 KiB accumulated streamed-body limit before UTF-8 decoding and JSON
  parsing.

The response is validated against the closed Home-adapter top-level, node,
network, account, balance, source, and authority shapes. Unknown fields in the
closed contract, contradictory health/readiness state, non-loopback source base,
invalid counts, account/balance authority drift, or any elevated authority flag
fail closed.

Dynamic text is written with `textContent`. Failure renders `HOLD` rather than
cached, hard-coded, or inferred topology state.

## Composition boundary

`wallet-live.js` adds exactly one side-effect import for `network-live.js` because
Wallet is already loaded globally by the shell and no current worker owns that
path. The Network module takes over only while the route is `#/network`.

The active Data lane owns `app.js`; this lane does not touch it. The Validate lane
uses `home-live.js`; this lane does not touch it. `views.js` is also unchanged.

## Authority boundary

This is participant-facing read-only rendering only. It cannot:

- dial, connect, disconnect, add, remove, or rewrite a peer/route;
- probe a remote machine;
- restart or deploy a node/service;
- write network or consensus state;
- connect/unlock a wallet or access a signer;
- register/activate a validator;
- write Work Credits;
- construct, sign, or broadcast a transaction; or
- move treasury, liquidity, or user funds.

Source-green is not deployment or public-origin acceptance evidence.

## Proof

Run:

```sh
node scripts/prove_void_app_network_readonly_v1.mjs
```

The focused workflow repeats syntax, proof, the shared site-theme regression,
and diff hygiene on Node.js 22, 24, and 26 with immutable GitHub Actions refs.
