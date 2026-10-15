# Buy VOID user-manager query ELF candidate v4

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_CANDIDATE_V4`.

Status: **reproducible binary candidate only; unaccepted and uninstalled**.

## Exact source generation

This candidate is a direct child of canonical #3101 exact accepted head:

`1f46c16d272f7eb1917719f1f0c17d7cf398819e`

with 23/23 hosted SUCCESS.

It pins:

- private-manager peer guard Git blob `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- static preexec Git blob `f0fbfaae97df3294097a281100f06ada2ef157ff`;
- repaired kernel-capability + `PrivateUsers=false` query Git blob `6aefc385bcc4212d3c45e36871bfde0da3529baa`.

Historical V1/V2 candidate, lock, installer and live-query evidence remain immutable and are not repinned.

## Derivation

Three independent Ubuntu 24.04 jobs:

- require #3101 exact source ancestry and a two-path additive child scope;
- compile the preexec statically with no PIE/build ID;
- compile the dynamic query with fixed flags and `-ldl`;
- strip both binaries;
- require the preexec to have no dynamic interpreter;
- execute the exact query self-test, including `private_users_false_required=true`;
- install the stripped pair only inside the ephemeral hosted runner;
- prove a direct dynamic-query execution is susceptible to the test LD_PRELOAD adversary;
- prove the fixed static preexec sanitizes that loader environment before executing the query;
- require byte-identical stripped binaries and candidate metadata across all three jobs.

## Security contract retained

The query requires the authenticated retained private systemd-manager connection and binds:

- systemd `NoNewPrivileges=true`;
- systemd `PrivateUsers=false`;
- systemd `AmbientCapabilities=0`;
- kernel `NoNewPrivs=1`;
- kernel `CapInh/CapPrm/CapEff/CapAmb=0`;
- kernel `CapBnd` equal to the authenticated systemd `CapabilityBoundingSet`;
- manager/service process generation and post-query security-state revalidation.

## Promotion boundary

This lane establishes only reproducible V4 binary bytes:

- `candidate_accepted=false`;
- `install_authorized=false`;
- `live_query_authorized=false`;
- `complete_host_evidence_collector=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

A separate versioned acceptance lock must consume the exact cross-job bytes before any protected replacement or live query may use this generation.

No production host/service/systemd/filesystem mutation, credentials, keys, wallet/signers, customer/payment reads, transaction, presale/WC activation or funds movement occurs.
