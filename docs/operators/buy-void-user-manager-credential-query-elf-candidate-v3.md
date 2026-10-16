# Buy VOID credential-query ELF candidate v3

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_CANDIDATE_V3`.

Status: **reproducible candidate derivation only; unaccepted and uninstalled**.

This lane derives the fingerprint-capable credential query from the exact V3
source generation while preserving the already accepted static preexec.

Three independent Ubuntu 24.04 jobs must produce byte-identical:
- static credential-query preexec;
- V3 dynamic credential query;
- candidate metadata.

Each job:
- compiles with the established deterministic recipe;
- strips both binaries before hashing;
- runs the V3 self-test;
- requires complete drop-in and LoadCredential set fingerprints;
- proves same-length metadata substitutions are detectable;
- executes the shared production transcript emitter and proves unrelated synthetic paths / raw canonical buffers are absent;
- exercises the fixed-path static-preexec path inside a private mount namespace
  with namespace-local tmpfs `/opt`;
- proves hostile loader state reaches a direct dynamic-query launch but is
  stripped by the static preexec;
- verifies host `/opt` identity is unchanged and the fixed host path remains
  absent.

Candidate metadata records the accepted V2 lock as predecessor evidence, but V3
begins:
- `candidate_accepted=false`;
- `install_authorized=false`;
- `replacement_authorized=false`;
- `live_query_authorized=false`;
- `production_host_evidence_authority=false`.

No Precision mutation, credential-content access, signer/key use, service or
systemd mutation, transaction, payment/presale activation or funds movement.

A separate V3 acceptance lock is required.

PROTECT THE CORE.
