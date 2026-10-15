# Buy VOID request-root runtime-topology census v2

Marker: VOID_BUY_VOID_REQUEST_ROOT_RUNTIME_TOPOLOGY_CENSUS_V2.

Status: source/CI definition of a read-only designated-host census. It does not provision, migrate, install, restart, or activate anything.

## Purpose

The V1 topology census intentionally recognizes only the currently installed private 0700/0600 request-store generation. The accepted stable-root policy selects the future custody-readable profile:

- fixed root /var/lib/void-buy-request-journal-v1;
- runtime owner zoso;
- IPC group void-buy-custody-ipc;
- directory mode 0750;
- requests.jsonl and operator-events.jsonl mode 0640;
- private sidecars remain outside this metadata census and remain 0600 by policy.

V2 is the separately versioned census V1 required for that future profile.

## Read-only observation

A V2 run may read only host/process/service metadata plus the existing loopback status route. It reuses the reviewed V1 primitives for user/system service snapshots, process-generation stability, loopback listener ownership, direct path metadata and bounded loopback GET.

For the fixed target it checks only directory and fixed-journal metadata. It never reads request or payment JSONL contents.

The live binding can qualify only when the ordinary zoso observer is on the designated Precision host, the user service is the sole active void-node-live.service generation, TCP/4100 is owned by that stable process, the confirmed-closeout status explicitly reports VOID_BUY_REQUEST_DIR, the reported request root equals the fixed target, and the target metadata matches the accepted 0750/0640 IPC profile.

## Historical disposition remains a separate gate

This census deliberately reports historical_request_history_disposition_proven=false and migration_authorized=false in every result.

It may count bounded legacy/private request-root candidates by metadata only. It does not interpret an absent or empty target as proof that historical obligations never existed. The existing original-request prestate census likewise refuses to treat a zero-byte requests.jsonl as verified historical absence without an independent external anchor.

Therefore even a successful V2 live metadata binding ends at TARGET_LIVE_BINDING_OBSERVED_HISTORY_DISPOSITION_REQUIRED. A separate reviewed history-disposition or migration proof remains mandatory before any apply that could replace the active request root.

## Source binding

The focused proof pins the exact accepted stable-root policy module, the three custody-readable production source blobs, and the reviewed V1 read-primitives collector. CI runs only V2 self-test and plan modes; it never performs the host --run mode.

## Authority boundary

Read-only source/CI gate only. No request/payment content read in CI, no filesystem write, chmod/chown, group mutation, service/systemd change, host apply, migration, credential/key/wallet/signer access, RPC/transaction, Chain-2050/WC write, payment acceptance, presale activation, or funds movement.

PROTECT THE CORE.
