# Buy VOID allocation-custody runtime install archive acceptance lock V3

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_LOCK_V3`.

Status: **source/CI acceptance of one exact hosted V3 install-archive candidate only**.

## Exact parent generation

This lock is a four-file ADD-only successor to exact archive-source head:

```text
105b9417d4a89a6a461554f6e2fd785cc5907401
```

The accepted source generation derives from the separately accepted runtime
bundle V3 and contains the repaired unnamed-inode publication boundary.

Exact archive-source blobs:

- tool: `2d46a4aa08599552f47c28ab6954f31a9d5669ea`
- proof: `eb656dc44e8f67e0fdbaf230941b300e037283e7`
- document: `2dd46d7577624ce4b318296437860807d8f84c76`
- workflow: `781c472ad9db73c28870a685fe952066d0ffe8e1`
- accepted runtime-bundle lock:
  `9e371ebc4ba1dcf494e55823eddb8a183c31d69f`

## Exact hosted archive

Hosted run `39941043471` completed successfully on Node 22, 24 and 26.
Cross-node compare job `120372580801` required the archive bytes and receipts
to be byte-identical.

Artifacts:

- Node 22: `12496465410`
- Node 24: `12495941936`
- Node 26: `12496271348`

Accepted archive identity:

```text
archive_candidate_id=voidbuycustodyarchive3_0b1c997cb4649be6b6eaf161712230ad3ee1a0b69720133d3adc4875bae322cb
archive_bytes=266240
archive_sha256=5c77db938bcfd353e72628088f1e02c4b22d73814cbae555b9c13ce3ba3a95d1
runtime_files_exact=10
deterministic_ustar=true
```

The accepted archive generation also proves:

```text
unnamed_tmpfile_staging=true
atomic_create_only_link_publication=true
failure_cleanup_unlink_not_used=true
```

Prepublication write failures therefore have no archive pathname to clean up,
and successful publication is a single create-only link of the already
validated retained inode.

## Acceptance boundary

The proof rederives the canonical archive from the exact accepted V3 runtime
bundle, independently inspects its complete manifest and ten runtime payload
records, and requires its bytes and SHA-256 to equal the hosted three-node
receipt.

Only this fact advances:

```text
archive_candidate_accepted=true
```

These remain false:

```text
immutable_root_install=false
install_target_selected=false
existing_target_replaced=false
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

This lock does **not** install the archive, replace the legacy
`/opt/void-buy-allocation-custody-runtime-v1` tree, alter users/groups or
permissions, select the production Node binary, create or start a service,
mount an IPC/payment route, access credentials or wallets, accept a payment,
deliver VOID, activate the presale, or move funds.

A separately reviewed install/replacement planner must bind this lock and
fresh host prestate/rollback evidence before any durable host mutation.

**PROTECT THE CORE.**
