# Public Release Distribution v1 Threat Model

marker: `VOID_PUBLIC_RELEASE_DISTRIBUTION_THREAT_MODEL_V1`

## Protected assets

- the source commit and version bound into the release;
- participant host integrity;
- existing participant data and explicitly configured key files;
- the separation between public installation and guarded operator lanes.

## Main threats and controls

The archive traversal guard is fail-closed before extraction.

| Threat | Control |
|---|---|
| Tampered download | Stable manifest plus outer SHA-256 and optional GitHub attestation verification |
| Archive traversal or escaping symlink | Pre-extraction tar member and link validation |
| Post-extraction corruption | Internal `RELEASE-CONTENTS-SHA256` verification |
| Nondeterministic or untraceable build | Fixed `SOURCE_DATE_EPOCH`, normalized tar metadata, commit-bound build info |
| Dependency ambiguity | Locked `npm ci --omit=dev --ignore-scripts` and SPDX SBOM |
| Secret leakage | Fail-closed secret-bearing path exclusions and package-private assertion |
| Surprise daemon activation | Installer requires explicit `--enable` and `--start`; default is stopped |
| Bad update | Versioned releases, atomic `current` switch, verified `previous` rollback |
| Destructive uninstall | User confirmation and separate `--purge` for config/state |
| Privilege expansion | Refuses root by default and installs only under user-owned paths |

No private key material is generated, imported, copied from the repository, or
included in release artifacts. The installer does not activate validator,
treasury, Buy VOID, authority-transfer, or economic mutation capabilities.

## Residual risks

This v1 wall targets Linux x86-64 and Node.js 22. It does not yet provide native
Windows/macOS packages, OS package-repository signing, reproducible builds
across multiple independent builders, or automated live-fleet deployment. Those
are separate walls and must not be implied by this lane.
