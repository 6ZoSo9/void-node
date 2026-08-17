# Public Release Update Channel v1 Threat Model

marker: `VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_THREAT_MODEL_V1`

## Protected claims

The selected version, commit, release tag, archive, installer, checksums, SBOM,
and release manifest must remain bound from channel discovery through install.
Stable release authority must remain rooted in the exact canonical repository
`6ZoSo9/void-node` and its matching GitHub attestation repository. The configured
remote channel endpoint itself must not be replaceable through an unreviewed
redirect. Readiness evidence must come from the exact configured health endpoint,
and remote response bodies must not gain unbounded memory authority before their
size contracts are enforced.

## Threats and controls

The controls below address channel substitution, asset tampering, downgrade,
failed-release rollback, endpoint substitution, and response-size exhaustion.

### Channel substitution

For the stable channel, the updater requires exact
`repository="6ZoSo9/void-node"` and exact matching
`verification.attestation_repository` before any asset install path can begin.
Stable HTTPS asset URLs must therefore remain under that canonical GitHub
repository and exact release tag rather than a repository named by an
untrusted channel document.

Remote channel transport is endpoint-bound: redirects are rejected, and an
otherwise successful response is accepted only when its normalized final
`response.url` equals the normalized configured channel URL. The canonical
published stable pointer is a direct `raw.githubusercontent.com` URL, so a
redirecting `releases/latest` URL is not part of the reviewed stable-channel
transport contract.

Local `file://` channels exist only behind a test flag. Loopback HTTP exists
only for the proof harness and requires both `--test-allow-file` and the
explicit `VOID_NODE_UPDATE_TEST_ALLOW_HTTP_LOOPBACK=1` environment gate; it is
not a production transport path. Likewise, `--skip-attestation` is accepted
only inside the explicit `--test-allow-file` proof boundary. A normal HTTPS
stable apply cannot convert a channel-declared required attestation into an
optional check through a CLI flag or ambient environment override.

### Remote response-size exhaustion

The remote channel response is streamed under a 2 MiB ceiling while its request
AbortController remains live. A declared oversize `Content-Length` is rejected
before body consumption, and chunked/streamed overflow aborts immediately
without retaining the excess chunk or waiting for peer-controlled teardown.

Remote assets are not materialized with an unbounded `arrayBuffer()`. Each asset
is streamed directly to its temporary file under the channel's exact byte
contract while SHA-256 is computed incrementally. A declared over- or undersize
length is rejected before body consumption where available; streamed overflow
aborts immediately, streamed undersize fails at EOF, and failed partial files
are removed before installation can begin.

### Asset tampering or truncation

Every asset is bound by exact byte length and SHA-256. The outer
`SHA256SUMS`, release manifest, and channel must agree. Installed content is
then checked against `RELEASE-CONTENTS-SHA256`.

### Compromised mirror or transport

Stable apply requires GitHub artifact attestation verification for the archive,
installer, and release manifest against the exact canonical repository. That
requirement is non-bypassable on a normal production stable apply; any
attestation-skipping behavior is confined to the explicit local/test transport
boundary. Redirected release-asset bytes still have to match the channel's exact
byte count and hashes and the canonical-repository attestations. Release-asset
redirect handling does not grant a redirected channel document authority: the
channel source itself is non-redirecting and endpoint-bound before asset
metadata is trusted.

### Health endpoint substitution

Health checks use `redirect:"error"`; same-origin and cross-origin redirects are
not readiness evidence. As a defense in depth, an otherwise successful health
response is accepted only when its normalized final `response.url` equals the
normalized configured health URL. Exact readiness typing, the 64 KiB response
ceiling, and the per-attempt deadline remain mandatory before a release can be
declared healthy.

### Downgrade and replay

The updater compares semantic versions and refuses a lower version by default.
An operator must deliberately supply `--allow-downgrade` for recovery work.
Applying the current version is idempotent.

### Broken release or restart failure

A stopped service is not started. Restart requires `--restart-if-running`. A
running service must pass the explicit readiness gate. Failure triggers an
exact, journaled rollback to the previous release. The updater stages both
replacement links before publishing either canonical pointer, fsyncs the
transaction journal and each pointer transition, and recovers a detected
interruption before accepting another command. The installed command resolves
to a stable manager outside the mutable `current` pointer, with a verified
control-updater copy refreshed atomically by the installer. It checks for
rollback artifacts before delegating to `current`, keeping journal recovery
reachable when interruption has already exposed a legacy rollback target.
Poisoned or unexplained staging artifacts fail closed before canonical pointer mutation.

### Privilege or authority expansion

No service is started implicitly. The updater does not generate keys, move
money, fulfill Buy VOID, mutate Work Credit ledgers, admit validators, touch the
treasury, or transfer authority.
