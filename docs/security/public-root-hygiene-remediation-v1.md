# Public root hygiene remediation v1

Status: forward cleanup and prevention.

This remediation removes local runtime artifacts from the tracked public tree and adds a proof/CI guard to prevent reintroduction.

## Current-tree cleanup scope

The current public tree must not track:

- node identity/key artifacts such as `.nodeid*` and `.nodekey*`
- peerstore artifacts such as `.peerstore.json`
- local env/secret files such as `*.env` and `*.env.*`
- local backup archives such as `backup_*.tgz`
- runtime export/catchup dumps such as `catchup_*.ndjson` and `export_*.ndjson`
- runtime txroot journals such as `journal-txroot-*.txt`
- local service/runtime artifacts such as `void-node@*`

Template files such as `.env.example`, `.env.template`, and `.env.sample` remain allowed.

## History and rotation boundary

This remediation is a current-tree cleanup and prevention guard. It does not claim to purge historical Git objects.

Any key, node identity, token, credential, RPC secret, wallet material, or live operational secret that was ever committed to the public repository must be treated as public/burned and rotated or retired outside the repository.

A full history rewrite, GitHub cached-view removal, and old-clone coordination is a separate destructive operation and should not be mixed into this forward-cleanup PR.

## Proof

Run:

```bash
bash tools/check_public_repo_hygiene.sh

Expected marker:

VOID_PUBLIC_REPO_HYGIENE_V1_GREEN

