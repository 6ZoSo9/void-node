# Buy VOID legacy-history Nimo installation plan v1

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1`.

Status: **source-only installation plan / HOLD**.

This generation closes only the missing planning boundary between the merged
legacy-history Nimo forced-command source and a future separately authorized
Nimo installation ceremony. It performs no SSH, no Nimo filesystem write, no
`authorized_keys` mutation, no key generation and no witness append/read.

## Exact source parent

The plan is rooted at:

`main@b912662c4fea95f9b2bff314e7f11003dd91672a`

It binds the current reviewed legacy-history handler/transport/witness/
Sovereign/disposition roots plus the economic/security/build source roots that
produce the handler's current compiled dependencies. These source roots are
**not** claimed to be a complete installed runtime bundle.

The plan therefore keeps:

- `runtime_bundle_candidate_accepted=false`;
- `complete_transitive_runtime_closure_bound=false`;
- `installed_runtime_bytes_selected=false`.

A deterministic runtime-bundle candidate/lock remains a separate next gate.

## Fixed future layout

The plan selects, but does not create:

- handler root:
  `/usr/local/libexec/void-legacy-history-witness-v1/void`;
- handler:
  `/usr/local/libexec/void-legacy-history-witness-v1/void/void-buy-legacy-request-history-nimo-forced-command-v1.mjs`;
- config:
  `/etc/void/buy-void-legacy-history-external-witness-v1.json`;
- authority root:
  `/var/lib/void-legacy-history-external-witness-v1`;
- witness:
  `/var/lib/void-legacy-history-external-witness-v1/legacy-history-sovereign-authorization-v1.jsonl`;
- durable intent:
  `/var/lib/void-legacy-history-external-witness-v1/legacy-history-sovereign-authorization-append-intent-v1.json`;
- reviewed SSH authorization file:
  `/etc/ssh/authorized_keys/voidwitness`.

The future witness execution identity remains the source-reviewed
`voidwitness` UID 997 / GID 984 and the already-reviewed Nimo host/disk
identity.

## Forced-command contract

The plan selects the exact future forced command:

```text
test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin HOME=/var/lib/voidwitness LANG=C LC_ALL=C VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_V1=1 SSH_ORIGINAL_COMMAND="${SSH_ORIGINAL_COMMAND-}" /usr/bin/node /usr/local/libexec/void-legacy-history-witness-v1/void/void-buy-legacy-request-history-nimo-forced-command-v1.mjs --config=/etc/void/buy-void-legacy-history-external-witness-v1.json
```

No shell or caller-selected command/path authority is added.

## Dedicated-key / authorized_keys boundary

The existing `/etc/ssh/authorized_keys/voidwitness` is already a reviewed
multi-role authorization surface. This plan explicitly forbids replacing it.

A later gate must:

1. select one dedicated Ed25519 **public** key identity for this legacy-history
   role;
2. bind its public-key SHA-256 to the already-reviewed transport policy;
3. create a reviewed additive successor authorization set that preserves every
   accepted existing entry byte-for-byte and adds exactly one legacy-history
   line whose options include both `restrict` **and** the exact reviewed
   forced-command option;
4. require the **materialized authorized-key entry itself** to contain that
   command option; `restrict` without `command="..."` is never sufficient;
5. require the command option to be the exact OpenSSH-escaped encoding of the
   selected `forced_command.command`: backslashes are escaped first, then
   embedded double quotes are escaped, yielding
   `command="<exact reviewed command>"`;
6. require the decoded command value to equal `forced_command.command`
   byte-for-byte and reject a missing command option, `restrict=false`, a
   differently encoded command option, or any different command value before
   an additive successor can qualify; and
7. prove the effective sshd `AuthorizedKeysFile` is still the reviewed
   root-owned `/etc/ssh/authorized_keys/voidwitness`.

The machine-readable plan exposes the exact expected `forced_command_value`
and exact `forced_command_option` but deliberately does **not** materialize the
complete authorized-key line because no public key has been selected yet.
The pure source classifier accepts only
`{restrict:true, command_option:<exact expected option>}` and keeps
`authorized_keys_mutation_authorized=false`.

This plan contains no private key, no public-key blob, no key fingerprint and
no materialized authorized-key line.

## Future filesystem contract

Later installation must independently qualify:

- runtime root/direct ancestors root-owned and non-group/world-writable;
- installed runtime files root:root 0444;
- config root:root 0444 with root-owned non-writable ancestry;
- authority root `voidwitness:voidwitness` mode 0700;
- empty create-only witness mode 0600;
- durable intent mode 0600 when present;
- no-follow/single-link requirements already enforced by the handler.

These are planned requirements only. Current host state is not inferred.

## Required next gates

The plan emits these explicit successors:

1. `DETERMINISTIC_RUNTIME_BUNDLE_CANDIDATE`;
2. `DEDICATED_CLIENT_PUBLIC_KEY_SELECTION`;
3. `AUTHORIZED_KEYS_ADDITIVE_SUCCESSOR`;
4. `NIMO_READ_ONLY_INSTALL_PREFLIGHT`;
5. `CREATE_ONLY_INSTALL_CEREMONY`;
6. `LIVE_READ_ONLY_TRANSPORT_QUALIFICATION`.

None can be skipped by treating this source plan as installation evidence.

## Source-only verification

```bash
node --check tools/void-buy-legacy-request-history-nimo-install-plan-v1.mjs
node --check scripts/prove_void_buy_legacy_request_history_nimo_install_plan_v1.mjs
node scripts/prove_void_buy_legacy_request_history_nimo_install_plan_v1.mjs
node tools/void-buy-legacy-request-history-nimo-install-plan-v1.mjs --self-test
node tools/void-buy-legacy-request-history-nimo-install-plan-v1.mjs --plan
```

Mutation-shaped modes such as `--apply`, `--install`, `--run` and
`--write-authorized-keys` fail closed.

The focused proof independently derives the OpenSSH command-option escaping and
requires equality with the plan. Adversaries cover a missing command option,
missing `restrict`, `restrict=false`, unescaped/differently encoded command
text, and a different forced command; every case must HOLD while exact-line
materialization and authorized-keys mutation remain false.

Hosted validation also binds committed diff hygiene. Pull-request runs use the
exact event base SHA, require it to be an ancestor of the exact checked-out
head, and run `git diff --check <base> <head>`. Push/manual runs use the
event's prior commit when present and otherwise the exact first parent. The
clean-worktree assertion remains a separate check, so working-tree cleanliness
cannot substitute for checking the committed plan/proof/doc/workflow delta.

## Authority

This lane grants no Nimo/SSH/filesystem/service/systemd/sshd mutation, no
authorized-key update, no private-key access or generation, no Sovereign
signing, no witness append/read, no payment acceptance, no transaction, no
presale/WC activation and no funds movement.

**PROTECT THE CORE.**
