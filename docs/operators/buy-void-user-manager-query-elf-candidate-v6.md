# Buy VOID user-manager query ELF candidate v6

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_CANDIDATE_V6`.

Status: **reproducible binary candidate only; unaccepted and uninstalled**.

V6 derives the `cap_last_cap` projection repair from current main
`0d635ccd9d07fd07bb086bef3202b8b67ec6e5f7`.

Pinned sources:
- peer guard `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- static preexec `f0fbfaae97df3294097a281100f06ada2ef157ff`;
- V6 query `fc1f640689b7da7278ff013669ef8a10cd8f6659`.

The query keeps the V5 Service.ControlGroup repair and adds runtime projection
of the authenticated systemd CapabilityBoundingSet through
`/proc/sys/kernel/cap_last_cap` before comparing with process `CapBnd`.

Three independent Ubuntu 24.04 jobs compile/strip the exact pair, run the query
self-test, exercise the static-preexec loader-sanitization adversary, and must
produce byte-identical ELFs and metadata.

V5 hosted candidate/lock evidence is historical and not installable.

V6 remains:
- `candidate_accepted=false`;
- `install_authorized=false`;
- `live_query_authorized=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

A successful Precision disposable live probe and a separate V6 acceptance lock
are required before any protected replacement successor.

PROTECT THE CORE.
