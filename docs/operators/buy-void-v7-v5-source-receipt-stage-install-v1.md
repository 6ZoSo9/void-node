## Current source-security repair — October 23, 2026

This generation closes the remaining exact-source review blockers before any trusted-admission successor may rely on these installers:

- receipt-stage Python enforces isolated + safe-path + unoptimized execution immediately after the compiler-only future directive and before any shadowable standard-library import;
- receipt proof includes a hostile local `argparse.py` regression and requires refusal before that module can execute;
- retained regular-file reads in the source-stage installer require `O_NONBLOCK|O_NOFOLLOW`, preserving descriptor-generation checks while preventing lstat→FIFO substitution from blocking before validation;
- source self-test performs a real regular-file→FIFO substitution through the retained-open test seam and requires fail-closed type/generation rejection;
- the focused workflow is intentionally PR-generation-only; the unstable default-branch `workflow_dispatch` entrypoint is removed rather than weakening the exact six-file source boundary.

Canonical implementation decision: this #3715 lineage is the sole selected V5 staging implementation for the current successor stack. The independent #3712 implementation remains Draft/historical and has no concurrent apply authority over the shared protected staging destinations. This selection does **not** itself grant root execution or stage-apply authority.

# V7 V5 create-only source and receipt stage installers V1

Status: **source/test/CI only**. This generation implements the create-only
stage builders described by Draft #3709. It does not authorize running them on
Precision.

## Source stage

`ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py` is a V5 generation fork of reviewed full-history protected
replica installer blob `a4d5762fe0e1c41b0919b8abb827123e556552ca`.

It preserves the predecessor's built-in pack/index/object parser,
complete-history closure verification, descriptor-bound iterative copy,
operation-bound node/byte/depth budgets, root-private staging, runtime-UID
read-only verification with no_new_privs/capability clearing, create-only
`renameat2(RENAME_NOREPLACE)`, parent fsync and truthful retained-stage
failure receipts.

V5 differences are intentionally narrow:

- source commit `3dc143bb16d7c1d1d5e0f674881cf12621818661`;
- tree `21e7fae2d3dfeb6a918c11799ae6644c6ca70a64`;
- single parent `b9d8ad7aec19592b104d47da4a496710d4fde8db`;
- 18,390 reachable commits;
- candidate `/home/zoso/Downloads/void-v7-v5-full-history-candidate`;
- final non-authoritative stage
  `/opt/.void-buy-void-v7-reviewed-v1.stage-v5`;
- private construction stage
  `/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1`;
- final root/directories mode `0755` with regular files sealed
  `0444`/executables `0555`;
- old live-shallow cross-binding is replaced by revalidation of the exact fixed
  V4 protected source.

The fixed V4 source is never exchanged by this installer.

## Receipt stage

`ops/precision/void_buy_void_v7_v5_receipt_stage_install_v1.py` stages only the exact committed 1136-byte V5 deployment
receipt at:

`/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5`.

It requires exact receipt ID/SHA-256/Git blob, creates via a root-private temp
file, fsyncs, seals root:root `0444`, publishes with
`RENAME_NOREPLACE`, fsyncs the parent, verifies nlink `1`, and revalidates
the fixed V4 receipt unchanged.

It never calls the production fixed-path receipt installer and has no fixed
receipt exchange authority.

## Separate apply authority

Both tools expose read-only plan modes. Apply requires:

- root execution from a separately root-custodied source tree;
- an exact content-addressed plan ID;
- an explicit create-only confirmation token.

This PR itself does not supply that privileged launcher/source boundary and does
not authorize execution.

No service/systemd mutation, provider RPC, credential/key/wallet/signer access,
signing, transaction/payment acceptance, public presale/WC activation,
treasury/liquidity action or funds movement is introduced.

After both hidden stages are independently GREEN, the next gate is a read-only
pair qualification followed by the separately reviewed hardened exchange
implementation.

PROTECT THE CORE.
