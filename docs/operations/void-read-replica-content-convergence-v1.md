# VOID Read Replica Content Convergence V1

## Decision

Read-replica freshness is determined by `content_root_sha256`, not by the
timestamped `release_id`.

Two manifests with equal content roots are content-converged even when their
release IDs differ. In that state the release-ID difference is metadata only
and must not be reported as stale replica content.

## Source behavior

The publisher reuses its current release when a freshly assembled candidate
has the same content root. It reports `content_changed=false` and
`reused_current_release=true` rather than minting another timestamped release.

The pull helper preserves its no-transfer equal-content path and now reports:

- `content_converged`
- `release_id_converged`
- `local_release_id`
- `remote_release_id`
- `skipped_same_content`
- `rsync_performed`
- `activated`

No rsync or activation is required when the content root is already present.

## Fail-closed boundary

A release-ID match never overrides differing content roots. Differing content
roots remain a non-converged state.

This source change does not deploy either helper, alter a service or timer,
change a production release pointer, execute a payment, write work credit,
access a wallet or signer, or move funds.
