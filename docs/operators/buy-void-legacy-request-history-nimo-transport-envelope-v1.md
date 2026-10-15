# Buy VOID legacy-history Nimo transport envelope v1

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1`.

Status: **source-only request/response protocol; no SSH execution**.

## Reused remote-identity policy

This layer reuses the existing reviewed allocation-custody witness SSH policy
classifier. The policy must require:

- SSH with Ed25519 host/client identities;
- strict host-key checking;
- identities-only;
- batch mode;
- no TTY;
- all forwardings cleared;
- no local command;
- forced-command-only remote endpoint;
- no remote shell;
- no caller-selected command or path.

This PR does not invent live host-key or client-key fingerprints. Those remain
installed-host evidence supplied through the existing policy contract.

## Server-side re-planning

An append request does **not** carry arbitrary bytes to append.

It carries the exact disposition candidate, Sovereign-signed authorization,
public key, canonical UTC witness timestamp, policy/challenge binding, and
prior/next witness hash expectations.

The remote server must:

1. parse its own current witness journal;
2. reverify the Sovereign authorization;
3. rerun the canonical legacy-history witness planner;
4. require the client's prior compare-and-swap hash;
5. require the independently derived event ID and next witness SHA;
6. only then expose the exact next witness bytes to a later forced-command
   writer.

This keeps a compromised client transport credential from becoming a generic
remote append primitive.

## Round trip

Read and append responses return the complete bounded witness bytes plus event
count/tip hashes. The client validates challenge, policy hash, request ID,
response ID and full witness summary. Exact idempotent retries remain valid when
the already-witnessed event is historical rather than the current journal tip.

This source-only protocol still performs no SSH. Therefore:

`external_transport_authenticated=false`

`external_witness_storage_proven=false`

`live_remote_read_performed=false`

`live_remote_append_performed=false`

`external_witness_verified=false`

`historical_request_history_disposition_accepted=false`

`stable_root_apply_authorized=false`

A later child must implement the fixed Nimo forced-command filesystem writer
using descriptor-pinned custody, durable intent/fsync recovery and this exact
server classifier.

No credentials, private key, Nimo contact, filesystem/service mutation,
payment, presale activation or funds movement occurs in this PR.

PROTECT THE CORE.
