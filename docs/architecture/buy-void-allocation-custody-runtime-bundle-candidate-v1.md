# Buy VOID allocation-custody runtime bundle candidate v1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V1`.

Status: **source/CI-only, unaccepted bundle candidate**.

## Purpose

The designated-host custody census found a root-owned staging directory, but the
future custody system service still lacks one exact immutable ExecStart runtime
generation.

The current custody V2 service is package-free at execution time. This lane
turns that property into a reproducible candidate without installing or starting
anything.

## Runtime layout

The candidate keeps repository-relative layout so the reviewed service imports
resolve without rewriting:

```text
tools/void-buy-allocation-custody-service-v2.mjs
src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs
src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs
src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs
dist/economic/buy_void_allocation_reservation_ledger_v1.js
dist/economic/buy_void_allocation_reservation_high_water_v1.js
dist/economic/buy_void_verified_allocation_replay_binding_v1.js
dist/economic/buy_void_auto_fulfillment_v1.js
dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js
dist/economic/buy_void_preappend_plain_input_v1.js
```

That is exactly ten runtime files: four tracked source modules and six generated
TypeScript modules.

Every runtime import must be either:

- a relative import resolving to another file in this ten-file closure; or
- a Node builtin using the `node:` scheme.

Third-party runtime package imports and `node_modules` runtime files are
forbidden.

## Build-source closure

The deterministic build is pinned to the exact reviewed TypeScript source
closure recorded by #2452:

- allocation reservation ledger;
- allocation reservation high-water;
- verified allocation replay binding;
- auto-fulfillment;
- crash-consistent saga server policy;
- preappend plain input;
- execution-attempt journal;
- inventory-reservation journal;
- verified payment v2;
- fulfillment confirmation;
- fulfillment journal;
- broadcast-outcome journal.

The last six include type/runtime dependencies required by the compiler even
when they are not all present in the final execution import graph.

The candidate also pins `package.json`, `package-lock.json`, and
`tsconfig.build.json`.

## Compiler and reproducibility

CI installs dependencies with:

```text
npm ci --ignore-scripts --no-audit --no-fund
```

and compiles directly with the locked TypeScript compiler:

```text
node node_modules/typescript/bin/tsc -p tsconfig.build.json
```

The lock and installed compiler must both identify TypeScript 5.9.3.
The candidate records SHA-256 identities for the installed TypeScript compiler
implementation files.

Node 22, 24, and 26 each independently build and emit one canonical candidate
JSON. A compare job requires all three candidate files to be byte-identical.

## Candidate identity

The candidate is content-addressed as:

```text
voidbuycustodybundle1_<sha256(canonical-candidate-body + newline)>
```

This is **candidate identity only**. Rehashing another candidate does not grant
production authority. A later lock/acceptance generation must pin the exact
hosted three-node result before any installer may rely on it.

## Deliberate nonclaims

Even three-node GREEN keeps all of these false:

```text
candidate_accepted=false
immutable_root_install=false
node_binary_identity_verified=false
request_root_selected=false
shared_directory_selected=false
service_unit_installed=false
service_started=false
service_restarted=false
systemd_mutation=false
runtime_integration=false
reserve_method_enabled=false
recover_method_enabled=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

The future request root remains owned by #3003. Socket RuntimeDirectory policy
remains owned by #3009. The exact `/usr/bin/node` binary/runtime identity is a
separate designated-host fact.

## Verification

Hosted CI:

1. checks out the exact PR head;
2. installs the lockfile without lifecycle scripts;
3. compiles with the locked TypeScript compiler;
4. runs the real candidate proof;
5. emits one candidate from each supported Node major;
6. compares all three candidate JSON files byte-for-byte.

## Authority boundary

No host install, service/systemd mutation, storage/request/payment content read,
credential/key/wallet/signer access, RPC, transaction, Chain-2050/WC mutation,
reserve/recover, presale/market activation, treasury/liquidity/inventory action,
or funds movement.
