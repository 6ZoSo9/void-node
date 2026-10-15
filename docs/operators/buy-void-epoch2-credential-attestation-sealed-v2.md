# Buy VOID Epoch-2 sealed credential attestation V2

Marker: `VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V2`.

Status: **source/CI credential-generation repair only; live execution is not
authorized by this document**.

## Purpose

V2 preserves the reviewed builtin-only V1 credential capability probe while
closing the materialized credential generation window tracked in #3178.

The V1 source verified the credential directory/file while reading bytes, but
closed both descriptors before private-key derivation, the non-transaction
signature, and the closing live systemd observation. V2 retains those
descriptors and their original metadata generation until all of those operations
finish.

A GREEN V2 probe requires:

- exact reviewed current-main source tuple and exact V2 Git-object source;
- the same reviewed systemd/process/credential metadata semantics as V1;
- the credential directory and credential file opened with no-follow semantics;
- original directory/file dev+inode+uid+gid+mode+nlink+size+mtime+ctime retained;
- visible directory/file paths still naming that exact generation after the
  signature and final live observation;
- all reviewed credential-path ancestors still naming their admitted
  generations; and
- successful descriptor close before GREEN output is emitted.

Same-size/same-mode file replacement, metadata-only drift on the retained
credential inode, and whole credential-directory replacement therefore HOLD.

## Source-only operator shape

A later separately reviewed live wrapper must bind one exact current-main Git
generation before invoking this source. The V2 source still rejects ordinary
worktree execution.

Reference source selection only:

```bash
head="$(/usr/bin/git -C ~/dev/void-node rev-parse --verify HEAD)"
/usr/bin/git -C ~/dev/void-node show "${head}:scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs" >/dev/null
```

Any future live invocation must pass `--expected-head "$head"` and the exact V2
confirmation, but **#3177 remains a separate blocker**: caller-streamed root
JavaScript is not an authenticated privileged first instruction. This V2 does
not claim to close #3177.

## Authority

Hosted CI uses only synthetic credential directories and files. It does not read
a live credential or perform a live signature.

Still false/unperformed:
- live credential access;
- transaction construction/signing/submission/broadcast;
- payment acceptance;
- public presale/WC activation;
- runtime activation;
- funds movement.

PROTECT THE CORE.
