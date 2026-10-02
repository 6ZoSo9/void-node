# VOID site-bundle peer environment transaction executor v1

Marker: `VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_V1`

## Purpose

Replace the legacy sequential two-box site-bundle peer-environment mutation with
the reviewed cross-box transaction contract from
`tools/void-crossbox-mutation-transaction-v1.mjs`.

This source lane makes the mutation crash/failure atomic at the transaction
boundary. It does not execute the mutation in CI and does not grant runtime
authority by being merged.

## Current fleet topology contract

The active fleet service is exactly:

```text
void-node-live.service
```

Each participant must receive an explicit loopback readiness base. Accepted
bases are limited to current fleet ports:

```text
http://127.0.0.1:4100
http://127.0.0.1:4101
http://127.0.0.1:4102
```

This matches the current Precision/Nimo/Xiphos fleet shape without hardcoding
which remote participant the operator selects. Alienware remains retired and is
explicitly rejected.

The site-bundle peer URLs themselves may use ports 4100, 4101, or 4102. They are
separate from the local loopback readiness bases.

## Durable transaction behavior

Before publication, the executor observes both participants and captures:

- exact clean shared repository HEAD and distinct host identities;
- selected drop-in existence, SHA-256 and mode;
- the four relevant systemd manager-environment values/absence;
- service active/inactive posture and InvocationID.

Both participants stage their target drop-in before either participant
publishes.

The coordinator durably journals the reviewed #2278 transaction state before
each publish or restore side effect. Participant receipts are create-only and
durable.

The durable journal filename is content-addressed over an intent containing:

- explicit remote SSH target;
- local and remote peer URL;
- drop-in name;
- fixed service unit `void-node-live.service`;
- local readiness base;
- remote readiness base.

Changing a readiness topology therefore selects a different journal identity.
The executor also refuses to start a new intent while a different nonterminal
site-bundle journal exists in the selected private state root.

## Crash recovery

Publish and restore recovery are observation-first.

For unresolved `RECOVER_PUBLISH_*` and `RECOVER_RESTORE_*` states, the
executor observes the participant before deciding whether a side effect is
already complete, had no effect, is in one of the bounded partial states, or is
ambiguous.

Ambiguous state is HOLD. Recovery never interprets uncertainty as permission to
blindly issue another restart.

The transaction restores exact prestate on failure:

- original drop-in bytes/absence and mode;
- original manager environment;
- original active/inactive service posture;
- restart InvocationID progression when a restart is required.

## Entrypoint

`ops/security/void-site-bundle-peer-env-persistence-proof.sh` is now a thin
confirmed entrypoint. It validates all inputs before invoking the executor.

Required operator inputs:

```text
CROSSBOX_SSH_TARGET=<explicit non-retired SSH alias or user@host>
LOCAL_PEER=<http(s) peer URL on port 4100/4101/4102>
REMOTE_PEER=<http(s) peer URL on port 4100/4101/4102>
LOCAL_READY_BASE=<http://127.0.0.1:4100|4101|4102>
REMOTE_READY_BASE=<http://127.0.0.1:4100|4101|4102>
CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE=applyVoidSiteBundlePeerEnvPersistenceV1
```

`ALIEN` remains accepted only as an explicit compatibility alias for
`CROSSBOX_SSH_TARGET`; there is no default target and retired Alienware
identities remain forbidden.

An optional private state root may be supplied through
`VOID_SITE_BUNDLE_TRANSACTION_STATE_ROOT`.

## Post-commit boundary

A COMMITTED transaction proves exact two-participant configuration publication
and readiness under the selected participant bases. It does **not** by itself
claim end-to-end DataNet site-bundle functionality.

The old shell automatically invoked historical cross-box site-bundle proofs
whose remote endpoint was fixed to port 4100. That behavior is removed because
it is not truthful for the current three-host fleet.

After a real committed mutation, current-topology site-bundle functionality
observation is a separate operator gate.

## Focused proof

```bash
node scripts/prove_void_site_bundle_peer_env_transaction_executor_v1.mjs
```

The proof is hermetic. It uses fake participant adapters and proves:

- two-party prepare-before-publish;
- durable publish/restore intent ordering;
- publish/restore crash recovery without duplicate side effects;
- bounded partial publish/restore completion;
- ambiguous drift HOLD;
- journal failure is not reinterpreted as rollback success;
- create-only participant receipts;
- private journal parent binding;
- retired Alienware rejection;
- `void-node-live.service` source binding;
- explicit readiness-base grammar;
- readiness topology changes durable journal identity; and
- competing nonterminal journals are forbidden by source contract.

## Authority boundary

The committed source contains live-capable SSH/systemd adapter code, but this
source/proof lane does not execute it.

No live SSH, daemon reload, service restart, runtime mutation, validator
publication, Git tag/push, credentials, keys, wallets/signers, transactions,
Chain-2050 writes, Work Credit mutation, treasury/liquidity action, or funds
movement is performed or authorized by source-green status.
