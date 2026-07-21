# VOID Verified Release Update Channel v1

marker: `VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_DOC_V1`

This lane turns an installed verified VOID release into a bounded update path.
The stable channel is a small canonical JSON document that binds one immutable
GitHub release tag to the release manifest, archive, installer, checksums,
SBOM, and release notes. The lane enforces anti-downgrade policy and
health-gated rollback.

## Safety model

- Stable assets must originate at `https://github.com/6ZoSo9/void-node/releases/download/...`.
- The channel binds every asset by SHA-256 and exact byte length.
- Stable apply verifies GitHub artifact attestations with `gh attestation verify`.
- The updater rejects downgrades unless the operator explicitly supplies
  `--allow-downgrade`.
- A stopped service stays stopped. A running service may only be restarted with
  `--restart-if-running`.
- A restarted running service must pass the readiness health gate. Failure
  causes an atomic health-gated rollback to the previous verified release.
- No wallet, validator, or treasury key is generated. No Buy VOID fulfillment,
  Work Credit ledger mutation, validator admission, treasury action, or
  authority transfer occurs.

## Check without changing anything

```bash
void-node update check \
  --channel https://github.com/6ZoSo9/void-node/releases/latest/download/stable-v1.json
```

## Apply while the service is stopped

```bash
void-node update apply \
  --channel https://github.com/6ZoSo9/void-node/releases/latest/download/stable-v1.json \
  --yes
```

This verifies the stable channel, downloads files to a temporary directory,
checks exact sizes and SHA-256 values, verifies GitHub attestations, invokes the
verified installer, verifies the installed `RELEASE-CONTENTS-SHA256`, and leaves
the service stopped.

## Apply to a running service

```bash
void-node update apply \
  --channel https://github.com/6ZoSo9/void-node/releases/latest/download/stable-v1.json \
  --restart-if-running \
  --health-url http://127.0.0.1:4100/__void/ready.json \
  --yes
```

The health response must report `ready=true`, `gap=0`, and `txroot_live=1`.
Otherwise the updater restores the previous verified release and restarts it.

## Manual rollback

```bash
void-node update rollback
```

The previous release must pass its internal checksum manifest before the
atomic pointer swap.
