# Public Release Update Channel v1 Threat Model

marker: `VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_THREAT_MODEL_V1`

## Protected claims

The selected version, commit, release tag, archive, installer, checksums, SBOM,
and release manifest must remain bound from channel discovery through install.

## Threats and controls

The controls below address channel substitution, asset tampering, downgrade,
and failed-release rollback.

### Channel substitution

The updater accepts HTTPS channels and requires stable asset URLs to remain
under the configured GitHub repository and exact release tag. Local `file://`
channels exist only behind a test flag.

### Asset tampering or truncation

Every asset is bound by exact byte length and SHA-256. The outer
`SHA256SUMS`, release manifest, and channel must agree. Installed content is
then checked against `RELEASE-CONTENTS-SHA256`.

### Compromised mirror or transport

Stable apply requires GitHub artifact attestation verification for the archive,
installer, and release manifest. Redirected bytes still have to match the
channel hashes and attestations.

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
Poisoned or unexplained staging artifacts fail closed before canonical pointer
mutation.

### Privilege or authority expansion

No service is started implicitly. The updater does not generate keys, move
money, fulfill Buy VOID, mutate Work Credit ledgers, admit validators, touch the
treasury, or transfer authority.
