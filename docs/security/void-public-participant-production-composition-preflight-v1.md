# Public participant production composition preflight v1

Marker:
`VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_PREFLIGHT_V1`

Status: source-only compatibility preflight. It does not mount participant routes,
issue production sessions, contact production Chain-2050 RPC, start/restart a
service, read a production session-state file, or authorize money/mutation.

## Why this gate exists

The two source prerequisites tracked by #1648 are now merged:

- durable challenge/session/logout state from #2191; and
- canonical live Chain-2050 role-source binding from #2194.

The public composition gateway also already contains participant session and
Wallet/Earn account-read route code behind the opt-in environment gate:

```text
VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE=1
```

However, those facts do not yet make the route production-ready.

The current gateway constructs the session HTTP object with only:

```js
createVoidPublicParticipantSessionHttpV1({
  bindingRegistryFile: PARTICIPANT_BINDING_REGISTRY_FILE,
})
```

The merged session HTTP contract now fails closed unless both a role-authority
adapter and a durable state store are supplied. Therefore the current gateway,
which injects neither, correctly remains a composition wiring HOLD before any
participant route can mount.

## Exact reviewed source generation

The preflight requires a clean repository and exact current `HEAD:<path>` Git
blob identities for:

- durable session-state file/store;
- participant read-session;
- participant session HTTP;
- account-read projection;
- account-read HTTP edge;
- public app composition gateway;
- Chain-2050 participant live-binding preflight;
- participant role-authority session adapter;
- participant role-authority guard; and
- Chain-2050 live-RPC role-source binding.

The preflight reads source through Git object identity and never imports or
executes the composition gateway. This is important because the gateway is a
listener-bearing runtime module.

Those Git reads are themselves provenance-bound. The preflight uses the reviewed
absolute Git executable, revalidates its filesystem identity and SHA-256 around
each read, supplies a minimal explicit environment rather than inherited
`process.env`, disables replacement objects plus hooks/attributes/fsmonitor,
untracked-cache/preload-index, and submodule recursion, and ignores caller
repository/worktree/index/object/config/program overrides. It captures one clean
HEAD/tree, reads every reviewed source from that exact captured commit, then
requires the repository to remain clean at the same HEAD/tree before returning.

The focused proof runs the same preflight under a hostile fake-`git` PATH,
repository/object/config/replacement overrides, and a global fsmonitor sentinel.
The preflight identity must remain identical and neither hostile executable may
run.

Any change to those reviewed blobs requires a new reviewed preflight generation.

## Durable session contract

The reviewed durable store must retain all of the merged #2191 guarantees,
including:

```text
durable=true
bearer_token_persisted=false
atomic_same_directory_replace=true
file_fsync_before_replace=true
directory_fsync_before_ack=true
descriptor_bound_startup_read=true
state_file_nofollow_required=true
parent_dev_inode_custody_retained=true
installed_inode_bound_to_fsynced_descriptor=true
installed_content_revalidated_after_parent_fsync=true
```

Wallet/private-key/signing/transaction/Work-Credit/validator/Chain-2050-write
and money authority remain false.

The production HTTP layer does not trust the public `durable=true` field by
itself. The reviewed file-store factory registers each created store in a
module-private `WeakSet`, and the HTTP constructor requires that factory
identity. A shape-identical spread clone of a real store is not registered and
must fail closed.

The proof also instantiates the real store only in a disposable mode-0700
temporary directory, rejects a forged durable-store clone, and verifies the
session HTTP layer reports a durable state store.

## Role-authority contract

The merged role path remains:

```text
Chain-2050 canonical live role source
  -> participant role-authority guard
  -> participant role-authority session adapter
  -> participant read session
```

The reviewed contract requires:

- Chain ID 2050;
- canonical live role-source binding ID
  `participant-role-authority-mainnet0-live-v1`;
- required role `AGENT`;
- exact subject binding;
- binding-descriptor SHA-256;
- role-authority generation and role-record SHA-256;
- admit + revalidate operations; and
- no wallet/signing/WC/validator/Chain-2050-write/money authority.

The live-binding preflight remains explicitly read-only and separately requires
durable session state before route activation.

## Session/account-read composition

The merged session HTTP contract requires:

```text
role_authority_required=true
required_role=AGENT
durable_state_store_required_for_production=true
durable_state_store_required (constructor enforcement)
production_route_mounted=false
```

The focused proof additionally proves that a valid role-authority adapter with
no durable state store is rejected; role authority alone cannot fall back to the
read-session memory store. It also proves that an object with the same public
store shape and `durable=true`, but without reviewed factory identity, is
rejected before session HTTP construction.

The account-read path uses the exact same session HTTP instance and remains
limited to `participant.account.read.v1`.

It does not forward caller Authorization upstream and grants no raw Wallet,
raw Work Credit, wallet private-key, unlock, send, signing, validator, generic
RPC, or money-movement authority.

The focused proof composes the real durable store, a role-authority-adapter
shaped hermetic authority, the real session HTTP module, and the real account
read edge. This proves the merged components themselves are compatible without
mounting a listener or contacting production.

## Current source HOLD

Current gateway source is still default-off and requires a binding registry when
enabled. It also shares one session HTTP instance with the account-read edge.

But the gateway does **not** yet inject:

- `roleAuthority`; or
- `stateStore`

into `createVoidPublicParticipantSessionHttpV1(...)`.

Therefore the expected current result is:

```text
status=PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_WIRING_HOLD
composition_role_authority_injection_present=false
composition_durable_state_injection_present=false
source_composition_ready=false

production_session_issuance=false
public_session_route_mount_authorized=false
runtime_activation_authorized=false
```

This is a useful HOLD, not a failure of the prerequisite work. It identifies the
next exact source transition.

## Next gate

The next source change must wire reviewed live-role authority and the durable
state store into the composition gateway while preserving default-off behavior.

After source wiring is reviewed, a **separate designated-host lifecycle
preflight** must still prove:

- exact live role-authority RPC/binding configuration;
- exact production login-binding registry path/custody;
- exact durable session-state path/custody;
- systemd/environment configuration;
- startup and restart behavior;
- crash/restart durability;
- rollback evidence;
- public route reachability; and
- explicit production activation authority.

Only after that later gate may production session issuance or participant route
mounting be considered.

## Authority

This source lane grants only repository/source inspection authority.

It explicitly remains:

```text
production_rpc=false
filesystem_state_read=false
filesystem_state_write=false
listener_creation=false
route_mount=false
service_action=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
transaction_construction=false
transaction_signing=false
transaction_broadcast=false
chain2050_write=false
work_credit_mutation=false
validator_mutation=false
production_session_issuance=false
funds_movement=false
```

Verification:

```bash
node scripts/prove_void_public_participant_production_composition_preflight_v1.mjs
```
