# Coupled native-gas reconciliation custody source binding v1

Marker:

`VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1`

## Purpose

This contract closes one narrow source-vs-host gap from issue #2498:

```text
writer_generation_binding_proven=false
```

The merged reconciliation writer, custody classifier, and designated-host
collector are useful only if later evidence is tied to the exact reviewed source
generation. This contract binds that generation without promoting source review
into host trust.

## Reviewed generation

Reviewed base commit:

`70faa71371eed9a8a0de4ffeb6c20e2c737cbc66`

The manifest contains 21 exact Git blobs:

- the complete relative semantic source closure reachable from
  `coupled_native_gas_reconciliation_writer_v1.ts`;
- the custody qualification classifier;
- the host-evidence collector and its allocation-custody mountinfo helper; and
- `package.json`, `package-lock.json`, and `tsconfig.build.json` as reviewed
  build context.

The closure was mechanically derived from Git objects. No relative import was
left unresolved.

A later change to any bound dependency intentionally invalidates this v1
generation and requires explicit review/rollover.

## Repository checks

The read-only inspector requires:

- absolute `/usr/bin/git`;
- a closed Git subprocess environment;
- replacement objects disabled;
- global/system Git config disabled;
- hooks, fsmonitor, attributes, untracked cache, preloading, and submodule
  recursion disabled for the observation;
- canonical VOID repository origin;
- a clean worktree;
- reviewed base commit ancestry; and
- exact `HEAD:<path>` Git blob identity for all 21 bindings.

The contract does not require the checkout branch itself to be `main`.
A reviewed feature or later descendant generation may pass only while all
reviewed dependency blobs remain exact and the reviewed base remains ancestral.

The pure supplied-observation classifier is exported only as a
`testOnly...` helper. Production source-generation claims come only from the
read-only repository inspector, which gathers Git identity itself under the
closed Git environment.

## Success meaning

Success returns:

```text
status=SOURCE_GENERATION_BOUND_NOT_TRUSTED
writer_generation_binding_proven=true
qualification_generation_binding_proven=true
collector_generation_binding_proven=true
```

The content-addressed `source_generation_id` is derived only from the reviewed
21-blob manifest and is therefore stable across unrelated descendant commits
that leave the reviewed closure exact. The separate `source_binding_id` also
binds the observed repository HEAD/tree, so an individual observation remains
content-addressed to its exact checkout.

This is source-generation evidence only. It is not a deployed-artifact
attestation.

## Deliberately false boundaries

Success still reports:

```text
deployed_artifact_generation_verified=false
trusted_collector_proven=false
bootstrap_receipt_external_trust_proven=false
evidence_generation_monotonicity_proven=false
verification_clock_authority_proven=false
live_host_qualification_performed=false
storage_bootstrap=false
runtime_integration=false
production_gate_ready=false
funds_movement=false
```

Therefore this contract cannot turn synthetic collector output, a local clock,
or an untrusted host JSON object into production custody authority.

The next #2498 gate remains separately trusted designated-host evidence /
receipt continuity. Live service, mount, storage, RPC, wallet/signer,
transaction, gas-spend, activation, treasury/liquidity, and funds authority are
outside this source contract.

## Proof

```bash
node scripts/prove_coupled_native_gas_reconciliation_custody_source_binding_v1.mjs
npm run typecheck
npm run build
git diff --check
```

The focused proof:

- accepts the exact 21-blob generation;
- independently mutates every reviewed blob and requires HOLD;
- rejects dirty worktree, wrong repository origin, missing reviewed ancestry,
  malformed repository identity, missing records, and duplicate records;
- requires every non-allowlisted authority bit to remain false; and
- poisons ambient Git repository/config/replacement variables while the real
  checkout inspector must still pass through its closed Git environment.
