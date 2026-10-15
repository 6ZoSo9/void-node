# Buy VOID allocation-custody runtime bundle acceptance lock v1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V1`.

Status: **source/CI acceptance of one exact package-free runtime bundle candidate only**.

## Hosted candidate

This lock consumes the exact cross-node candidate derived by #3013 at
`b532e1e3214cee298ecbf25f15568b2ee9758399`.

Hosted run `38664821990` succeeded on Node 22, 24 and 26 and its compare job
required byte-identical candidate output.

Exact artifacts:

- Node 22: `11940123060`;
- Node 24: `11939814770`;
- Node 26: `11939789748`.

Exact candidate identity:

- bytes: `9930`;
- SHA-256: `5ee2b5e5fc25a7cec8313c7cb7c4cd8bb675e3652ab18dc614577a25376f2279`;
- Git blob SHA-1: `fe3108c93a31fe1e5137929202aa433724285480`;
- candidate ID: `voidbuycustodybundle1_2339d565cc1c298a3f7ca9cae2ef163831288007bb32d9e7c37c01880aaee704`.

## Current-main reconciliation

This successor is rebuilt directly on `main@cc6a92f436f6c129db12c10288bcb98a8033bb45` after #3013 merged. The accepted hosted candidate remains anchored to #3013 source head `b532e1e3214cee298ecbf25f15568b2ee9758399`; the proof requires that head to remain an ancestor and rechecks the exact candidate tool/proof/workflow Git blobs before rederiving the candidate. The current-main branch itself may add only these four lock paths.

## Acceptance boundary

The lock branch changes no runtime, economic, service or host source. Its proof
preserves the exact #3013 candidate derivation tool, proof and workflow blobs,
rebuilds the candidate from the exact pinned source/build closure, and requires
the rebuilt canonical bytes to match the hosted byte count, SHA-256, Git blob
and candidate ID.

Node 22, 24 and 26 independently rederive the candidate and the deterministic
lock. A compare job requires all three lock outputs to be byte-identical.

Only this fact advances:

```text
candidate_accepted=true
```

These remain false:

```text
immutable_root_install=false
install_target_selected=false
node_binary_identity_verified=false
request_root_selected=false
shared_directory_selected=false
service_unit_installed=false
service_started=false
service_restarted=false
runtime_integration=false
reserve_method_enabled=false
recover_method_enabled=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

A later installer/host plan must separately bind an immutable root-owned install
path, the exact host Node binary/runtime identity, accepted request-root policy,
systemd/RuntimeDirectory/socket behavior, Polkit, rollback/independent custody,
and production reserve/recover gates.

No host, service, storage, request/payment, credential/key/wallet/signer, RPC,
transaction, Chain-2050/WC, presale, treasury/liquidity or funds mutation occurs
in this lock.
