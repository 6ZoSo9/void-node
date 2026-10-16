# Buy VOID installed credential-query qualification v2

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V2`.

Status: **read-only live-qualification source; production execution remains
separately authorized**.

## Why V2 is required

The historical V1 qualifier was written for the original single-credential
generation. It requires `LoadCredentialCount=1` and a smaller drop-in bound.
Precision now legitimately composes multiple unrelated systemd credentials and
37 drop-ins.

The installed V3 native query already solves that representation problem. It
observes the complete bounded metadata sets, requires unique credential IDs and
exactly one Epoch-2 target credential/drop-in, and emits SHA-256 identities for
the complete canonical `DropInPaths` and `LoadCredential` sets without
printing unrelated credential names or paths.

This qualifier consumes that V3 contract rather than weakening it back to the
historical V1 assumptions.

## Installed generation binding

Before, between and after live observations, the qualifier requires the exact
protected V3 state from the merged guarded replacement:

- unchanged accepted static preexec;
- accepted V3 current query;
- exact retained V1 predecessor;
- exact retained V2 predecessor;
- no staging or unknown generation accepted.

The repaired V3 acceptance lock is:

`voidbuyumqcredelflock3r_8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34`.

## Native metadata contract

Each native V3 observation remains bounded and fail-closed:

- at most 64 canonical drop-in paths;
- exactly one Epoch-2 credential drop-in;
- at most 64 KiB of canonical drop-in metadata;
- at most 32 effective `LoadCredential` entries;
- exactly one `buy-void-epoch2-fulfiller-v1` target credential;
- at most 64 KiB of canonical credential metadata;
- complete canonical drop-in SHA-256 required;
- complete canonical credential SHA-256 required;
- credential contents never opened or read.

Unrelated credentials are allowed because they are part of the complete
generation digest. They are not silently ignored.

## Successor live qualification

A separately authorized `--run` performs:

1. exact protected V3 snapshot;
2. first authenticated V3 credential query through the fixed static preexec;
3. exact protected V3 snapshot;
4. existing V6 user-manager security qualification;
5. exact protected V3 snapshot;
6. second authenticated V3 credential query;
7. final exact protected V3 snapshot.

The two credential observations must be byte-for-byte equivalent. Therefore
both complete metadata SHA-256 identities, all bounded counts, manager/service
PID generations and target bindings must remain identical across the V6
security observation.

The credential query and V6 security record must also identify the same user
manager and live node MainPID/start-ticks generation.

## Authority boundary

This PR does not authorize live execution.

Hosted CI executes only synthetic `--self-test` and non-executing `--plan`.
It performs no production query, credential-content access, filesystem write,
service/systemd mutation, external network call, key/wallet/signer access,
payment acceptance, transaction, public presale/WC activation, or funds
movement.

A GREEN merge means only that the V3 qualification source is accepted. A
separate operator authorization is required before `--run`.

PROTECT THE CORE.
