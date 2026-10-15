# Buy VOID authenticated user-manager unit evidence v4

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4`.

Status: **source/read-only transcript parser and classifier; complete host evidence still HOLD**.

## Purpose

The V3 evidence contract assumed an empty configured `CapabilityBoundingSet`.
Precision's accepted user-runtime hardening V2 intentionally preserves the
configured/kernel bounding mask while requiring `NoNewPrivileges=yes` and zero
active kernel capability masks.

V4 consumes the exact authenticated native query V2 transcript instead of
reusing the obsolete V3 user-service shape adapter.

## Exact native transcript requirements

The parser accepts only marker:

`VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V2_GREEN`

It requires the complete exact field set and rejects duplicates, unknown fields,
missing fields, malformed integers, malformed 64-bit masks, or caller-built
object substitutes.

Required security state:
- manager private peer authenticated;
- same retained authenticated FD used for the unit query;
- sanitized dynamic-loader environment;
- fixed retained libsystemd provenance;
- loaded/active/running `void-node-live.service`;
- implicit empty systemd `User=` / `Group=`;
- `NoNewPrivileges=yes`;
- `PrivateUsers=no`;
- configured `AmbientCapabilities=0000000000000000`;
- kernel `NoNewPrivs=1`;
- kernel `CapInh/CapPrm/CapEff/CapAmb` all zero;
- kernel `CapBnd` byte-equal to configured `CapabilityBoundingSet`;
- direct service-parent relation to the authenticated manager;
- retained manager/service pidfds and generation revalidation;
- all mutation/payment/presale/funds authority booleans false.

## Authority

V4 is still a source-composition/evidence-shape layer. It does not install or
execute the protected query, perform host mutation, read request/payment
contents, access credentials/keys/wallets, accept payment, activate presale/WC,
or move funds.

A separately reviewed V2 live qualifier must execute the fixed protected query
twice and bind stable manager/service/query generations before request-root
census authority can consume this evidence.

PROTECT THE CORE.
