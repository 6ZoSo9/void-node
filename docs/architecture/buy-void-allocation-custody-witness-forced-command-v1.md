# Buy VOID allocation custody witness forced-command v1

Marker:

`VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_V1`

Status: **source-only handler and durable remote-store contract; no live Nimo
installation**.

## Purpose

This is the next layer above the merged narrow witness transport contract.

The transport module remains the sole authority for request policy, canonical
request/response bytes, one-event compare-and-swap classification, append
idempotence and mandatory read-after-append semantics.

This handler adds only the server-side responsibilities that the pure transport
contract intentionally left out:

- protected server-controlled configuration;
- a fixed witness pathname;
- descriptor-pinned filesystem access;
- cross-process exclusion;
- durable append intent;
- append/fsync/postcheck;
- exact crash recovery; and
- forced-command stdin/stdout framing.

It does not reimplement the witness protocol.

## Protected configuration

The forced command receives exactly one fixed `--config=<absolute-path>`
argument from the future `authorized_keys` command string.

The configuration file is opened through a retained `O_DIRECTORY|O_NOFOLLOW`
parent descriptor, must be a direct owner-held mode-0600 single-link file, and
must contain one canonical JSON object.

The config fixes:

- the Nimo authority root;
- the exact witness filename; and
- the complete #2502 transport policy.

Remote request bytes cannot supply or override any of those values.

This proves the server-controlled-policy **contract**, not the live deployment.
`server_controlled_policy_origin_proven` remains false until the exact config and
forced-command entry are installed and qualified on Nimo.

## Authority root and witness

The authority root is opened component-by-component with
`O_DIRECTORY|O_NOFOLLOW`, retained by descriptor, and must be owner-held mode
0700.

The witness filename is fixed:

`buy-void-allocation-custody-high-water-witness-v1.jsonl`

The file must already exist as an owner-held mode-0600 single-link regular file.
The handler never bootstraps or replaces it.

Reads and writes occur through `/proc/self/fd/<root-fd>/...`, and the visible
root/witness pathname is rebound to the retained descriptors before success.

## Serialization

Each request is serialized by the existing
`withBuyVoidFilesystemBakeryLockV1` primitive using a lock path underneath the
retained authority-root descriptor.

This prevents concurrent forced-command SSH sessions from racing the witness
compare-and-swap boundary.

## Durable append intent

Before a fresh append can touch the witness, the handler durably creates:

`buy-void-allocation-custody-witness-append-intent-v1.json`

The intent is mode 0600 and binds:

- exact request bytes and request SHA-256;
- request ID and policy SHA-256;
- prior witness SHA-256, byte length, event count and tip;
- exact next event line;
- expected next witness SHA-256 and byte length; and
- expected next event count and tip.

The intent file is fsynced and then the authority directory is fsynced before
witness mutation.

Normal append writes only the exact new event bytes at EOF and fsyncs the witness.

After exact reread/postcheck and #2502 append-response construction, the intent
is removed, the authority directory is fsynced, and the visible authority-root
pathname is rebound to the retained directory identity before success.

## Crash recovery

An existing intent is reconciled before any new request is classified.

Only three durable states are accepted:

1. exact prior witness: append the intended event;
2. exact next witness: remove the completed intent;
3. prior witness plus a strict prefix of the intended event: truncate only that
   proven torn tail, fsync, append the complete event, fsync and revalidate.

Any other witness/intent combination HOLDS.

Synthetic proof covers interruption:

- after durable intent but before append;
- after a durable partial/torn append; and
- after complete witness append but before intent cleanup.

## Nimo identity binding

Every request re-observes:

- hostname;
- SHA-256 of `/etc/machine-id`;
- root physical disk serial; and
- root physical disk WWN.

The observed values must equal the identity embedded in the current canonical
witness tip before request processing succeeds.

Recovery applies the same boundary before any recovery mutation. For an
intent-only prior witness, host identity is checked before append. For a torn
tail, the validated prior prefix is checked before truncate or append. For an
already-completed append, host identity is checked before intent cleanup. A
mismatch therefore leaves both witness bytes and the durable intent unchanged.

This source proof dependency-injects the already-qualified Nimo identity; the
actual commands remain fixed `/usr/bin/findmnt` and `/usr/bin/lsblk`.

## Forced-command framing

The executable CLI:

- requires `VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1`;
- rejects any non-empty `SSH_ORIGINAL_COMMAND`, including whitespace-only caller commands;
- accepts exactly one fixed config argument;
- accepts exactly one newline-terminated request on stdin; and
- emits only the canonical #2502 response on stdout.

A failed request exits nonzero. It does not fall through to a shell.

## Authority boundary

This PR does **not**:

- generate an SSH key;
- install a public key or edit `authorized_keys`;
- pin a live SSH host key;
- deploy the handler to Nimo;
- mutate the live Nimo witness;
- change sshd or systemd;
- create the live protected config;
- provide the Precision SSH executor;
- integrate the public reservation runtime;
- accept payment;
- access wallets/signers;
- broadcast transactions; or
- move funds.

Therefore these remain false:

```text
live_nimo_installed=false
authorized_keys_mutated=false
ssh_key_generated=false
server_controlled_policy_origin_proven=false
challenge_freshness_proven=false
response_replay_resistance_proven=false
external_transport_authenticated=false
external_witness_storage_proven=false
runtime_integration=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
```

## Next gate

After this source handler is reviewed and merged:

1. qualify Nimo's current SSH host key;
2. generate the dedicated transport-only key;
3. install the exact protected config and pinned handler;
4. install one `restrict,command="..."` public-key entry;
5. prove live read-only transport and negative controls without advancing the
   witness;
6. then integrate the Precision witness-gate proxy and qualify a controlled
   append/recovery ceremony before presale activation.
