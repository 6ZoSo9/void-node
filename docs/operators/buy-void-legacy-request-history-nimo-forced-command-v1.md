# Buy VOID legacy-history Nimo forced-command handler v1

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_V1`.

Status: **source handler only; not installed on Nimo**.

## Fixed layout

Future installation is fixed to:

- handler:
  `/usr/local/libexec/void-legacy-history-witness-v1/void/void-buy-legacy-request-history-nimo-forced-command-v1.mjs`;
- config:
  `/etc/void/buy-void-legacy-history-external-witness-v1.json`;
- authority root:
  `/var/lib/void-legacy-history-external-witness-v1`;
- witness:
  `legacy-history-sovereign-authorization-v1.jsonl`;
- durable intent:
  `legacy-history-sovereign-authorization-append-intent-v1.json`.

It never reuses or mutates the replay witness journal.

## Filesystem boundary

The handler requires:

- root-owned/non-writable config ancestry;
- config owner root:root, mode 0444, single link;
- authority root owned by the `voidwitness` execution UID, mode 0700;
- witness/intent owner equal to execution UID, mode 0600, single link;
- `O_NOFOLLOW` on config/witness opens;
- descriptor-pinned authority root;
- shared filesystem bakery lock;
- file and directory fsync;
- post-mutation path rebind.

The witness file must already exist. Creation belongs to a later create-only
installation ceremony.

## Nimo identity

Before read or append, the handler rechecks the already-reviewed Nimo identity:

- hostname `Nimo`;
- machine-id SHA-256
  `sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4`;
- root disk serial `50026B76873B25AB`;
- root disk WWN `eui.00000000000000000026b76873b25ab5`.

## Append/recovery

The handler consumes only #3083 canonical read/append envelopes. For append it
independently reruns the signed-authorization planner against its own current
journal.

Before any append it creates and fsyncs a 0600 intent that binds:
- exact request bytes/hash;
- prior witness size/hash;
- exact next witness size/hash;
- exact event ID.

Recovery with a durable intent permits only:
1. exact prior bytes -> append the planned suffix;
2. exact prior + a prefix of the planned suffix -> append the remainder;
3. exact complete next bytes -> cleanup and return idempotent.

After a successful append has been fsynced and the intent has already been
cleaned up, loss of the response is also recoverable: replay of the exact same
request is accepted only when the current witness is exactly that request's
expected-next generation and a fresh server replan proves the same signed event
is already present. The retry performs no second append. A stale request against
a later witness generation remains a compare-and-swap HOLD.

Any non-prefix, rollback, or mismatched-generation state fails closed.

## Forced-command process boundary

Future authorized_keys must invoke the fixed handler/config with an empty,
minimal environment and marker
`VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_V1=1`.

The handler rejects any nonempty `SSH_ORIGINAL_COMMAND`, root execution,
caller-selected path and caller-selected command.

## Authority

This PR installs nothing and runs no SSH. It keeps:

- `live_nimo_installed=false`;
- `live_handler_execution_performed=false`;
- `live_remote_read_performed=false`;
- `live_remote_append_performed=false`;
- `external_transport_authenticated=false`;
- `external_witness_storage_proven=false`;
- `external_witness_verified=false`;
- `historical_request_history_disposition_accepted=false`;
- `stable_root_apply_authorized=false`;
- payment/presale/funds authority false.

A separate create-only installation + dedicated forced-command key lane must
bind the exact runtime closure and install it on Nimo before any live ceremony.

PROTECT THE CORE.
