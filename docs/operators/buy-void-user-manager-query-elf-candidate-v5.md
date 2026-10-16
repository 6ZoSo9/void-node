# Buy VOID user-manager query ELF candidate v5

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_CANDIDATE_V5`.

Status: **reproducible candidate only; unaccepted and uninstalled**.

V5 is derived from current main `f894cc5cbdccab0265a9a2265df45efa07170c4a`
plus the exact ControlGroup interface repair.

Pinned sources:
- peer guard `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- static preexec `f0fbfaae97df3294097a281100f06ada2ef157ff`;
- query `ddca2c544ce14261dffb80a202c0a4ae2979ec1e`.

The source repair changes only the D-Bus interface used to read
`ControlGroup`: it now uses `org.freedesktop.systemd1.Service`, matching the
service-specific systemd property. The Precision live probe isolated the prior
generic-Unit lookup as the first failing property.

Three independent Ubuntu 24.04 jobs compile/strip the exact pair, execute the
query self-test, exercise the static-preexec loader-sanitization adversary, and
must produce byte-identical ELFs and metadata.

The accepted V4 candidate/lock remain frozen predecessor evidence.

V5 remains:
- `candidate_accepted=false`;
- `install_authorized=false`;
- `live_query_authorized=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

A separate V5 lock and protected replacement successor are required.

PROTECT THE CORE.
