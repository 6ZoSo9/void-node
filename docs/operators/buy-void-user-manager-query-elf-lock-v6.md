# Buy VOID user-manager query ELF acceptance lock v6

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V6`.

Status: **source/CI acceptance of the exact cap_last_cap-projected V6 ELF pair only**.

## Accepted candidate

Exact source head:

`d7ebb60ca1bc59f16972ffe3671dfaa44ffb7cdf`.

Hosted derivation run:

`38768570795`.

Artifacts:

- slot a: `11990620937`;
- slot b: `11991015426`;
- slot c: `11990478684`.

Cross-job byte equality: **GREEN**.

Accepted identities:

- source parent `0d635ccd9d07fd07bb086bef3202b8b67ec6e5f7`;
- peer source `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- static preexec source `f0fbfaae97df3294097a281100f06ada2ef157ff`;
- V6 query source `fc1f640689b7da7278ff013669ef8a10cd8f6659`;
- preexec: 706504 bytes, SHA-256 `8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11`;
- query: 43064 bytes, SHA-256 `e791944bfa025a510d3693093668d71a9d122de8c581a924a1b45b4331ab43a6`;
- candidate metadata: 1289 bytes, SHA-256 `d39409be8fbeb8a6237a5fd24acb6f19f00acfa2028f713679ad17e852627296`, Git blob `a341112695b1abbc61e0b4d88db9675b4fa15d83`;
- candidate workflow Git blob `fe914ecbf81fd6c42ad25e3b5ebf70b7623dbee4`.

## V6 security contract

The accepted query preserves:

- authenticated retained private user-manager connection;
- reexec/deserialization manager argv closure;
- `Service.ControlGroup`;
- manager/service pidfds and generation revalidation;
- exact MainPID direct-parent/cgroup/executable binding;
- systemd `NoNewPrivileges=true`;
- systemd `PrivateUsers=false`;
- configured ambient capabilities zero;
- kernel `NoNewPrivs=1`;
- kernel CapInh/CapPrm/CapEff/CapAmb zero;
- kernel capability ceiling from `/proc/sys/kernel/cap_last_cap`;
- `KernelCapBnd == AuthenticatedSystemdCapabilityBoundingSet & KernelSupportedMask`;
- post-query process-security revalidation.

The last merged predecessor lock remains V4:

`voidbuyumqelflock4_846047629dd2dd58f73f926d85cddde5b0a1510493d59a2d7ef778d235a70301`.

V5 hosted evidence is retained only as superseded evidence. V5 was never
installed and was superseded by the successful Precision V6 live proof.

## Lock identity

`voidbuyumqelflock6_3526916b76e015ad2860be8f207b39013a9c4d71218b500620383a59ff893aa6`.

Node 22, 24 and 26 independently recompile/strip the exact source pair,
verify compiler/strip identities, execute the V6 self-test and require
byte-identical lock JSON.

## Authority

This lock accepts binary identity only:

- `candidate_accepted=true`;
- `install_authorized=false`;
- `live_query_authorized=false`;
- `protected_install_performed=false`;
- `production_host_evidence_authority=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

A separately reviewed protected replacement successor is required before
Precision may consume V6 from `/opt`.

PROTECT THE CORE.
