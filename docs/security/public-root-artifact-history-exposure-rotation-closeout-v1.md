# Public root artifact history exposure and rotation closeout v1

Status: current-tree cleanup sealed; historical exposure acknowledged.

## Background

PR #340 removed tracked public-root local/runtime artifacts from the current tree and added a forward-prevention guard.

The current tree cleanup does not claim to remove historical Git objects. Any artifact that was ever committed to a public repository must be treated as publicly exposed.

## Burned / retired artifact classes

The following artifact classes are considered burned or retired if they ever appeared in public Git history:

- node identity files: `.nodeid*`
- node key files: `.nodekey*`
- peerstore files: `.peerstore.json`
- environment files: `*.env`, `*.env.*`, and root env variants
- backup archives: `backup_*.tgz`, `backup_*.tar`, `backup_*.tar.gz`, `backup_*.zip`
- runtime catchup/export dumps: `catchup_*.ndjson`, `export_*.ndjson`
- txroot journal files: `journal-txroot-*.txt`
- local root runtime/service artifacts: `void-node@*`

## Operational boundary

No exposed historical node identity, node key, env credential, token, RPC secret, wallet material, peerstore, backup, or runtime dump may be treated as live trusted operational material.

Any live deployment must use freshly generated node identity/key material and fresh environment configuration outside Git.

Any credential, token, RPC secret, wallet key, mnemonic, private key, or operational secret that was ever committed publicly must be rotated or retired outside the repository.

## History rewrite boundary

This closeout does not perform a destructive Git history rewrite.

A full history rewrite would change commit hashes, invalidate or damage existing checkpoint/tag evidence, disrupt old clones, and require separate coordination. It remains a separate explicit decision, not part of this closeout.

## Proof marker

Expected proof marker:

```text
VOID_PUBLIC_ROOT_ARTIFACT_HISTORY_EXPOSURE_ROTATION_CLOSEOUT_V1_GREEN

