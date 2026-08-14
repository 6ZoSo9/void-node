# VOID App validator read-only v1

Marker: `VOID_APP_VALIDATOR_READONLY_V1`

## Purpose

Replace the participant App's placeholder Validate experience with an honest read-only view of the existing Mainnet-0 public validator candidate-readiness contract.

The view does not create a second validator protocol. Its canonical source is the existing public-safe definition-only matrix:

`/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json`

The App fetches a byte-identical, checked-in static alias at:

`/app/assets/data/mainnet0-validator-candidate-readiness-matrix-hold-v1.json`

The alias sits inside the existing `/app/` static shell, so both the loopback node origin and the public composition gateway can serve the same reviewed bytes. The focused proof fails if the alias drifts from the canonical source.

## Current product truth

A successfully validated matrix renders:

- minimum public candidate stake policy: `10,000 VOID`;
- all eight published candidate-readiness requirements;
- candidate registration: closed;
- candidate intake: closed;
- public submission: disabled;
- wallet connection: disabled;
- stake locking: disabled;
- active validator admission: disabled; and
- validator-set writes: disabled.

The UI therefore does not present a Stake, Submit, Connect Wallet, or Activate control while those capabilities are explicitly off in the source contract.

## Transport and validation

The browser client performs one same-origin `GET` to the App-local static alias using `cache: no-store`, `credentials: omit`, redirect rejection, same-origin fetch mode, and no referrer. The response must be stream-readable and is capped at 128 KiB before JSON parsing.

The client validates a closed schema for the top-level record, candidate-readiness object, all eight ordered matrix entries, readiness assertions, and authority boundary. It binds the exact marker, version, route, current 10,000 VOID policy reference, and the disabled mutation/admission flags.

Unknown fields, changed item identities, missing requirements, elevated authority, changed stake policy, malformed body, oversized body, wrong content type, or unavailable evidence produces a visible HOLD state rather than inferred or cached values.

Fetched requirement text is inserted with DOM `textContent`, not interpolated as HTML.

## Composition boundary

Darwin's active Data UI lane owns `app.js`; this lane does not touch it. The existing globally loaded `home-live.js` imports the additive `validate-live.js` module with one side-effect import. The Validate module takes ownership only when the current hash route is `#/validate`; Home behavior otherwise remains unchanged.

This keeps the lane path-disjoint from the active DataNet adapter while avoiding broad edits to `views.js` or the App foundation mount. The existing foundation already serves `public/void-app-wave1-v1` under `/app/`; the matrix alias is therefore available without a second runtime route or a collision with the active foundation lane.

## Authority boundary

This source does not:

- register a candidate;
- open validator intake;
- connect or request a browser wallet;
- access a local wallet, key, signer, or mnemonic;
- lock or transfer stake;
- submit a validator action;
- admit or activate a validator;
- write the validator set or runtime truth;
- sign or broadcast a transaction;
- deploy or restart a service; or
- move treasury, liquidity, or user funds.

Any later candidate intake, staking, admission, validator-set mutation, deployment, or runtime activation remains an independent reviewed and authorized gate.
