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
  package/TypeScript context.

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
- repository-local include directives and filter configuration rejected in
  both local and enabled worktree config scopes;
- no content-converting porcelain or modified-file comparison is used for
  clean-state authority: assume-unchanged/skip-worktree index flags are
  forbidden, the index is compared to the pinned commit with cached plumbing,
  every tracked regular file/symlink is direct-read and Git-blob rehashed
  against its stage-0 index record (including executable mode), and only
  untracked names are obtained from `ls-files --others --exclude-standard`.
  The reviewed 21 paths remain independently nofollow/nonblocking rehashed.
  This removes repository clean-filter execution from the clean-state path
  rather than relying on a prior config check to remain current;
- hooks, fsmonitor, global attributes, untracked cache, preloading, and submodule
  recursion disabled for the observation;
- legacy `.git/info/grafts` rejected before ancestry evaluation;
- one immutable 40-hex commit captured at observation start; its tree, every
  reviewed Git blob, and reviewed-base ancestry are all resolved against that
  exact commit rather than a moving `HEAD`;
- the visible `HEAD` must equal the captured commit again at observation end;
- canonical VOID repository origin, repository execution settings, and reviewed
  ancestry are revalidated again before the final HEAD acceptance;
- a clean reviewed checkout with no assume-unchanged/skip-worktree index
  suppression flags, no staged delta from the pinned commit, and no ordinary
  unstaged/deleted/untracked paths;
- the exact index flags and stage-0 manifest are captured around the raw tracked
  worktree census, required byte-identical afterward, and the pinned-HEAD
  cached-index comparison is repeated after that census. A stage/index mutation
  that lands after the first clean check therefore cannot become the accepted
  manifest generation;
- reviewed base commit ancestry against the pinned commit; and
- exact `<pinned-commit>:<path>` Git blob identity for all 21 bindings; and
- exact no-follow/nonblocking working-tree bytes for every reviewed path,
  rehashed with the Git blob algorithm and required to equal the reviewed blob.
  Reads use the original descriptor size as a hard 16-MiB cap, positional reads,
  an EOF growth probe, and stable descriptor/path identity checks. This prevents
  `assume-unchanged` / `skip-worktree` flags from hiding byte drift and makes
  regular-file-to-FIFO replacement fail closed without blocking on FIFO open;
- every reviewed worktree path is rehashed again after the full repository-clean
  census and must equal the first reviewed observation, preventing a reviewed
  source from changing underneath the broader tracked-file scan.

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

This is source-generation evidence only. The package/lock/`tsconfig.build.json`
inputs are bound as selected dependency/compiler context; this v1 does not claim
that every script or input capable of affecting emitted artifacts is bound.
`deployed_artifact_generation_verified=false` remains authoritative.

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
- independently mutates every reviewed HEAD blob and every reviewed worktree
  blob and requires HOLD;
- reproduces hidden worktree drift under both `assume-unchanged` and
  `skip-worktree`, proves ordinary porcelain can be deceptively clean, and
  requires the source inspector to reject those suppression flags before clean
  authority;
- proves the observation plan resolves tree/blob/ancestry specs from one pinned
  commit and rejects a changed final HEAD;
- stages a modified reviewed file after the initial cached-index clean check but
  before the stage manifest is read, and requires
  `source_binding_repository_index_changed_during_observation` rather than
  accepting the newer staged/worktree generation;
- installs both repository-local and per-worktree executable filter settings
  and requires HOLD before source inspection;
- separately arms a repository clean filter after the config-check boundary and
  proves the full tracked-file raw-hash clean-state census does not execute it;
- installs a temporary legacy graft overlay and requires HOLD before ancestry is
  trusted;
- swaps a regular proof file to a FIFO between lstat/open and requires bounded
  HOLD, and grows a file after open so the EOF growth probe must reject it;
- rejects dirty worktree, wrong repository origin, missing reviewed ancestry,
  malformed repository identity, missing records, and duplicate records;
- requires every non-allowlisted authority bit to remain false; and
- poisons ambient Git repository/config/replacement variables while the real
  checkout inspector must still pass through its closed Git environment.
