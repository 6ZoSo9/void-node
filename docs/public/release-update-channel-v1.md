# VOID Verified Release Update Channel v1

marker: `VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_DOC_V1`

This lane turns an installed verified VOID release into a bounded update path.
The stable channel is a small canonical JSON document that binds one immutable
GitHub release tag to the release manifest, archive, installer, checksums,
SBOM, and release notes. The lane enforces anti-downgrade policy and
health-gated rollback.

## Safety model

- Stable assets must originate at `https://github.com/6ZoSo9/void-node/releases/download/...`.
- The remote channel body is streamed under a 2 MiB ceiling; a declared oversize
  `Content-Length` or a streamed overflow is rejected before excess bytes are
  retained.
- Every remote release asset is streamed directly to its temporary file under
  the channel's exact byte contract. Declared size mismatches and streamed
  overflow fail before installation, and SHA-256 is computed incrementally.
- The channel binds every asset by SHA-256 and exact byte length.
- Stable apply verifies GitHub artifact attestations with `gh attestation verify`.
- The updater rejects downgrades unless the operator explicitly supplies
  `--allow-downgrade`.
- A stopped service stays stopped. A running service may only be restarted with
  `--restart-if-running`.
- A restarted running service must pass the readiness health gate at the exact
  configured health URL. Health redirects are rejected, and the final response
  URL must normalize to that configured URL. Failure causes a crash-recoverable,
  journaled rollback to the previous verified release.
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

This verifies the stable channel, streams remote files to a temporary directory
under their declared bounds, checks exact sizes and SHA-256 values, verifies
GitHub attestations, invokes the verified installer, verifies the installed
`RELEASE-CONTENTS-SHA256`, and leaves the service stopped.

## Apply to a running service

```bash
void-node update apply \
  --channel https://github.com/6ZoSo9/void-node/releases/latest/download/stable-v1.json \
  --restart-if-running \
  --health-url http://127.0.0.1:4100/__void/ready.json \
  --yes
```

The health response must come directly from the exact configured URL without a
redirect and must report `ready=true`, `gap=0`, and `txroot_live=1` with those
exact JSON types. The response remains under the per-attempt deadline and the
64 KiB health-body ceiling. Otherwise the updater restores the previous
verified release and restarts it.

## Manual rollback

```bash
void-node update rollback
```

The shorter `void-node rollback` entrypoint delegates to the same updater
transaction rather than maintaining a second pointer-swap implementation.

The previous release must pass its internal checksum manifest before the
pointer transaction begins. Both replacement links are staged before either
canonical pointer changes, and an exact durable journal makes interruption
between the two pointer publications detectable and recoverable. On the next
updater invocation, `VOID_NODE_RELEASE_UPDATE_V1_ROLLBACK_RECOVERED` confirms
that the interrupted swap was completed; the requested command then stops and
must be run again deliberately. The installer keeps the user-facing manager and
a verified updater copy under the installation root, outside the mutable
`current` release pointer. That stable entrypoint detects rollback artifacts
before delegating any command, so recovery remains reachable even after
`current` has already moved to a genuinely older release whose updater predates
the journal protocol. Unexpected staging artifacts fail closed before an update
or rollback can mutate either canonical pointer.

## Canonical promoted channel

`VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_WALL_V1`

The canonical stable pointer is the reviewed `main` branch artifact:

```text
https://raw.githubusercontent.com/6ZoSo9/void-node/main/public/public-node/void-network/channels/stable-v1.json
```

Official promoted channels carry immutable publication and hash-chained
promotion metadata. Revoked releases are rejected, and candidate application
requires `--allow-candidate`.
