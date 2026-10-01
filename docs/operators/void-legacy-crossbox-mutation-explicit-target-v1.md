# Legacy cross-box mutation explicit target v1

Marker: `VOID_LEGACY_CROSSBOX_MUTATION_EXPLICIT_TARGET_V1`

Two legacy operator scripts still performed real cross-box mutation while carrying
defaults from the retired Alienware topology:

- `ops/security/void-site-bundle-peer-env-persistence-proof.sh`
- `ops/mainnet/validator-crossbox-closeout.sh`

This contract removes implicit retired-host execution without removing the valid
current-host mechanisms.

## Site-bundle peer persistence

The script now requires all three operator inputs explicitly:

- `ALIEN`: remote SSH target;
- `LOCAL_PEER`: peer URL persisted into the local service; and
- `REMOTE_PEER`: peer URL persisted into the remote service.

It also requires:

`CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE=applyVoidSiteBundlePeerEnvPersistenceV1`

before any durable drop-in write, systemd reload/restart, SSH mutation, or proof
composition runs.

The parent propagates its reviewed `ALIEN` target into both composed child
proofs:

- `ops/security/void-public-site-bundle-auto-materialize-proof.sh`
- `ops/security/void-public-site-bundle-peer-readiness-proof.sh`

Those child proofs also require an explicit `ALIEN` value and reject the retired
Alienware coordinates before creating output directories or performing SSH. They
no longer carry independent retired-host defaults.

## Validator cross-box closeout

The script requires an explicit remote target through
`CROSSBOX_SSH_TARGET`. The legacy `ALIEN` environment variable remains an
explicit compatibility alias only; it has no default.

It also requires:

`CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT=publishValidatorCrossboxCloseoutV1`

before staging/publishing validator runtime truth, remote SSH copy/link/restart,
or Git tag/push actions.

## Retired-host wall

Both scripts reject target material containing any retired Alienware coordinate,
including:

- `100.122.79.39`;
- `zoso-alienware-aurora-r7.taila47fd.ts.net`; or
- the token `alienware`.

A rejected or incomplete invocation exits with status 2 before mutation.

## Boundary

This source lane does not execute either mutating workflow. It does not write
systemd configuration, restart a service, publish validator state, SSH to any
host, create/push a tag, access credentials, sign, submit a transaction, or move
funds.

Expected source-proof marker:

`VOID_LEGACY_CROSSBOX_MUTATION_EXPLICIT_TARGET_V1_GREEN`
