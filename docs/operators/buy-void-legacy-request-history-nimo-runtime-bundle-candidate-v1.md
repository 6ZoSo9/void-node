# Buy VOID legacy-history Nimo runtime bundle candidate v1

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V1`.

Status: **source/CI-only deterministic runtime-bundle candidate; unaccepted**.

## Purpose

This is the first runtime-bundle successor to the reviewed legacy-history Nimo
installation plan in #3239.

The parent plan intentionally refuses to claim that its reviewed source roots
are a complete installed runtime generation. This lane closes only that source
gap: it derives and content-addresses the complete package-free JavaScript
execution closure for the fixed future forced-command handler.

It performs no Nimo contact, SSH action, installation, authorized_keys change,
witness read/append, Sovereign signing, payment, transaction, presale/WC
activation, or funds movement.

## Exact parent

The candidate is deliberately stacked on exact #3239 head:

`03f460aa5d98784839c7a31e72b12f81d12e5f72`

and binds the exact parent installation-plan source blob:

`3d41834140eaaca46fb9f5a771278bed49384c65`.

The derived candidate carries the parent's content-addressed `plan_id` and
re-verifies all 19 source/build roots selected by that plan before deriving a
runtime closure.

## Exact runtime closure

The forced-command entrypoint is:

`tools/void-buy-legacy-request-history-nimo-forced-command-v1.mjs`

The execution closure must be exactly these 14 repository-relative files.

Tracked runtime source:

1. `tools/void-buy-legacy-request-history-nimo-forced-command-v1.mjs`
2. `tools/void-buy-legacy-request-history-nimo-transport-envelope-v1.mjs`
3. `tools/void-buy-legacy-request-history-external-witness-v1.mjs`
4. `tools/void-buy-legacy-request-history-sovereign-authorization-v1.mjs`
5. `tools/void-buy-legacy-request-history-disposition-v1.mjs`

Generated TypeScript runtime:

6. `dist/economic/buy_void_filesystem_bakery_lock_v1.js`
7. `dist/economic/buy_void_allocation_custody_witness_transport_v1.js`
8. `dist/economic/buy_void_allocation_custody_external_witness_v1.js`
9. `dist/economic/buy_void_allocation_reservation_high_water_v1.js`
10. `dist/economic/buy_void_allocation_reservation_ledger_v1.js`
11. `dist/economic/buy_void_auto_fulfillment_v1.js`
12. `dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js`
13. `dist/security/void_sovereign_emergency_control_v1.js`
14. `dist/security/void_alignment_layer_v1.js`

The candidate walks static import/export edges starting at the forced-command
entrypoint. Every relative edge must resolve inside this exact closure. Dynamic
`import()` and `require()` are forbidden. Every non-relative runtime import
must use the `node:` builtin scheme.

Third-party runtime packages and node_modules runtime files are therefore both
empty.

The five tracked runtime modules retain their exact reviewed Git-blob
identities from #3239. Generated `dist/` modules carry exact byte length and
SHA-256 but are not falsely represented as tracked Git objects.

## Reproducible build

The candidate does not run the repository's broad npm build script.

CI installs the lockfile without lifecycle scripts:

```text
npm ci --ignore-scripts --no-audit --no-fund
```

and compiles only with the locked TypeScript compiler:

```text
node node_modules/typescript/bin/tsc -p tsconfig.build.json
```

The package lock and installed compiler must both identify TypeScript 5.9.3.
The candidate records the exact SHA-256/byte identity of the installed
TypeScript implementation files.

`tsconfig.build.json` has source maps disabled, so no map file is part of the
runtime bundle.

## Reproducibility gate

Hosted CI independently derives one canonical candidate JSON on Node 22, 24,
and 26.

Each derivation must:

- authenticate exact #3239 ancestry and the parent plan blob;
- authenticate all 19 parent source/build roots;
- compile from a clean `dist/` using the locked compiler;
- prove the exact 14-file runtime import closure;
- prove package-free execution;
- keep every live/install/economic authority false.

The compare job requires all three complete candidate JSON files to be
byte-identical. Structural verification is independent of the candidate ID:
even after recomputing a valid content address, the verifier rejects runtime
kind relabeling, malformed/non-`node:` builtin sets, compiler-file identity
drift, planned-handler layout drift, and authority promotion. Tracked runtime
paths must remain tracked-source records with their parent Git blobs; generated
`dist/` paths must remain compiled records with no fake tracked blob.

The candidate ID is content-addressed as:

`voidblrhnrb1_<sha256(canonical candidate body + newline)>`.

## Deliberate nonclaims

Even a three-Node GREEN result keeps:

```text
runtime_bundle_candidate_accepted=false
runtime_bundle_lock_created=false
protected_runtime_install_authorized=false
live_nimo_installed=false
authorized_keys_mutation_authorized=false
public_key_selected=false
private_key_access=false
external_transport_authenticated=false
witness_read_performed=false
witness_append_performed=false
sovereign_signing=false
payment_acceptance=false
transaction=false
public_presale_activation=false
wc_void_market_activation=false
funds_movement=false
```

A separately versioned lock/acceptance generation must pin the exact hosted
three-Node candidate before any Nimo installer can consume these bytes.

The next gate is
`void_buy_void_legacy_history_nimo_runtime_bundle_lock_v1`.

## Authority boundary

Source/test/CI only. No Nimo filesystem, account, sshd, authorized_keys,
service/systemd, witness, credential, key, signer, wallet, transaction,
Chain-2050/WC, inventory, treasury, liquidity, presale, market, or funds
mutation is authorized.

**PROTECT THE CORE.**
