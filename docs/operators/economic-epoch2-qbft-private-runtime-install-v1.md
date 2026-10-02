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
- the validator service is not active or activating;
- before publishing the reviewed unit, `systemctl --user is-enabled` is only
  `disabled` or `not-found` — a pre-existing `static` unit with the same
  name is not accepted;
- no `*.wants` or `*.requires` autostart link exists, including dangling
  symlinks;
- any `.wants` / `.requires` entry itself must be a direct directory;
  symlinked or non-directory dependency entries fail closed;
- the final runtime root does not already exist; and
- the final unit path does not already exist.

The unit itself remains `Restart=no`.

The generated validator unit intentionally has no `[Install]` section. The
installer now proves that fact from the exact reviewed unit bytes before
publication and again from the installed unit bytes after publication.

Once that exact unit is published, `systemctl --user is-enabled` may report
`static`. V1 accepts that **unit-file state** only after the no-`[Install]`
identity is proven and direct `.wants` / `.requires` dependency links are
absent. `static` is not described as systemd `disabled`; it is a distinct
state for a unit that cannot be enabled through its own `[Install]` metadata.

The existing receipt field `unit_enabled=false` is retained for schema
compatibility and means this installer performed no enable action and accepted
no direct enable/autostart link. It is not a serialization of the raw
`systemctl is-enabled` string. The operator log records
`post_unit_file_state=<disabled|not-found|static>` explicitly.

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
inspection may resolve the unit file, but the service must remain inactive and
must satisfy the bounded no-enable/no-direct-autostart-link contract above.
The later activation ceremony owns any reload/start action.

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
