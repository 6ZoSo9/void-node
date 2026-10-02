# Epoch-2 private QBFT runtime install v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1`

Status: source-reviewed inactive installation contract. Validator start remains a
separate authority gate.

## Purpose

Install one already-prepared, three-host-verified private QBFT host bundle into
its final local filesystem locations without loading, enabling, or starting the
validator.

The applied installer is intentionally narrower than activation:

- copy the exact reviewed genesis and static-peer file into the role's private
  runtime root;
- create a new empty mode-0700 Besu data directory;
- retain private preparation and bundle-set provenance beside the runtime files;
- install the reviewed user-systemd unit as mode 0600; and
- emit a mode-0600 install receipt.

No daemon reload or service action is performed.

## Required evidence

Applied installation requires all of the following:

1. the private runtime plan;
2. the role's exact prepared bundle;
3. one green
   `VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_BUNDLE_SET_V1` receipt;
4. exact plan-file SHA binding across all three prepared hosts;
5. exact role/materialization ID binding; and
6. a current repository head descended from both the plan and role preparation
   heads.

The installer recomputes the bundle-set ID before accepting the receipt.

## Inactive preconditions

Before filesystem mutation the installer requires:

- canonical clean `main`;
- exact host/role binding;
- the validator service is inactive;
- before publication, `systemctl --user is-enabled` must report only
  `disabled` or `not-found`; a pre-existing `static` unit with the same
  service name is a HOLD because it cannot be the not-yet-published reviewed
  unit;
- no direct `*.wants` or `*.requires` enablement link exists under the reviewed operator user-unit directory;
- any symlinked `.wants` or `.requires` directory is a HOLD rather than
  being skipped;
- the final runtime root does not already exist; and
- the final unit path does not already exist.

The unit itself remains `Restart=no`.

The generated validator unit intentionally has no `[Install]` section, and
the exact reviewed unit bytes are checked for that property before publication.
After the reviewed unit file is published and its hash is verified, the
post-install observation must report exactly `static`. Any `disabled` or
`not-found` post-publication result is a HOLD rather than an alternate
accepted installed state.

`static` is recorded as the exact observed **unit-file state**. It is not
treated as proof that the service cannot be started indirectly. The receipt
field `operator_user_unit_dir_direct_enablement_links_absent=true` means
direct `.wants` / `.requires` links were absent from the reviewed operator
user-unit directory only; it does not claim a global systemd load-path census.
`indirect_activation_absence_proven=false` remains explicit.

## Filesystem publication

The final runtime root is constrained to:

`~/.local/share/void/epoch2-qbft-private-runtime-v1/<role>`

The existing `~/.local/share/void` base must be a canonical non-symlink
directory before the Epoch-2 runtime parent may be created.

The systemd unit path is constrained to:

`~/.config/systemd/user/void-economic-epoch2-qbft-validator-v1.service`

Runtime files and the unit are first staged privately. Publication uses atomic
rename. If the unit, post-install checks, or install receipt fail, newly
published runtime/unit files are rolled back.

## Deliberately absent actions

Even in applied mode this installer does **not**:

- run `systemctl daemon-reload`;
- enable or start a user service;
- start, stop, pull, or otherwise mutate Docker;
- read or copy the validator node-key bytes;
- change the plugin;
- create a P2P or RPC listener;
- construct, sign, submit, or broadcast a transaction;
- create authoritative Chain-2050 blocks;
- mutate validators;
- move tokens or funds;
- authorize migration; or
- authorize public activation.

The installer performs no daemon reload and no activation. Read-only systemd
inspection may resolve the unit file, but the service must remain inactive,
the post-publication unit-file state must be exactly `static`, and
`operator_user_unit_dir_direct_enablement_links_absent=true` must hold. The later activation ceremony owns any reload/start action.
The install receipt does not claim that every possible indirect systemd
activation path is absent.

## Existing-runtime re-attestation

Hosts that already contain the exact reviewed inactive runtime do **not** need
to delete and reinstall it merely because the receipt schema changed.

The same runner supports:

```text
--reattest-existing
--confirmation reattestExistingPrivateEpoch2QbftBundleV1
```

This mode requires the exact plan/bundle/bundle-set/role binding and then proves:

- the runtime root is the exact canonical role path, owned by the operator and
  mode 0700;
- runtime membership is exactly the reviewed genesis, genesis evidence,
  static-peer file, prepared materialization, bundle-set copy and empty data
  directory;
- all reviewed runtime files are direct operator-owned mode-0600 files with
  exact reviewed bytes/hashes;
- the data directory is direct, operator-owned, mode 0700 and empty;
- the installed user unit is direct, operator-owned, mode 0600, exact reviewed
  bytes, and contains no `[Install]` section;
- the service is inactive and the exact installed reviewed unit reports
  `static`;
- no direct operator user-unit `.wants` / `.requires` link exists.

Re-attestation writes **only** the create-only receipt output. It does not write,
replace, rename or remove the runtime root or unit; does not run
`daemon-reload`; does not enable/start a service; does not invoke Docker; and
does not read the validator private key.

The emitted receipt is a state attestation for downstream admission. It
content-binds one exact `receipt_basis`:

- `fresh_install`; or
- `existing_runtime_read_only_reattestation`.

Both bases use neutral `observed_at_utc` and `observed_repo_head` fields.
A read-only re-attestation records
`authority.runtime_root_write=false` and
`authority.service_unit_installation=false`; it does not claim a new
filesystem installation.

After the final inactive/static and direct-enablement-link observation, the
runner rebinds exact installed membership/bytes/modes/data emptiness through
descriptor-bound `O_NOFOLLOW` reads before receipt mint. Fresh installation
uses the same final verifier after publication.

## Exact applied confirmation

The source tool defaults to plan-only mode. Applied filesystem installation
requires both `--apply` and the exact confirmation:

`installPrivateEpoch2QbftBundleV1`

This confirmation authorizes only the inactive filesystem installation described
above. It is not validator-start authorization.

## Next gate

After all three hosts have green install receipts, the next source/operational
gate is a fresh three-host revalidation immediately before validator start.

Validator start requires a separate explicit confirmation because reaching
two-of-three active validators can begin authoritative Epoch-2 QBFT block
production.
