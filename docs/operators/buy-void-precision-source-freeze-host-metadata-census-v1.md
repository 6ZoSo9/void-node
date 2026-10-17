# Precision — Buy VOID frozen-source metadata census V1

**Status: read-only host observation, not an installation or release gate.**

This operator tool is the first host-facing handoff after the reviewed
[Buy VOID V5 presale source-freeze candidate](../../ops/security/buy-void-presale-source-freeze-candidate-v1.json)
from draft #3409. It does not accept source freeze, qualify an installed receipt,
or authorize customer payments. Source candidate #3409 is pinned to:
- exact draft head `bfdff02472c57439721ebed0a94498c691c68a9c`;
- frozen source parent `5e514e4b6e2151c18cf7459bd7a697287eebbd4c`;
- tree `47a0c6eb9408b97226472d1297115633b0b3d799`;
- full candidate enforcement set
  `1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf`.

**No external network, sudo, privilege escalation, service mutation,
credential access, wallet/key access, RPC, signing, payment acceptance, or
funds movement.** Do not use root or `sudo`: the probe deliberately refuses
root execution. Python is invoked with `-I -B` for isolation and to avoid
`__pycache__` writes.

## Operator commands (Precision only)

From the checked-out reviewed repository source containing the tool:

```bash
python3 -I -B scripts/void_buy_void_precision_source_freeze_host_metadata_census_v1.py --self-test
python3 -I -B scripts/void_buy_void_precision_source_freeze_host_metadata_census_v1.py --run
```

The tool independently locates the ordinary checkout at
`~/dev/void-node` and does not require it to be currently on this PR branch.
It runs only local `git rev-parse --verify` identity queries with
`GIT_OPTIONAL_LOCKS=0` and globally disabled configuration. It does **not**
`git fetch`, pull, checkout, checkout/rewrite branches, enumerate secrets,
read private files, hash receipts, inspect environment variables, query RPC
or enumerate processes/systemd units.

It uses `lstat` without following the final path or opening file contents on
**three fixed locations only**:

- `/var/lib/void-source-finality-v7/deployment-receipt.json`;
- `/var/lib/void-allocation-custody-v1` (mountpoint bit only);
- `/opt/void-buy-void-epoch2-live-composition-v3`.

The local Git report distinguishes: whether exact freeze objects are available
locally, whether checkout HEAD is *exactly* the reviewed source-freeze PR,
whether that checkout contains the exact manifest and V5 lock blobs, and
whether the 49-path source **could** be qualified in a separate source proof.
Even when all identities match, this census does **not** authenticate receipts,
installed/runtime code, active services, provider quorum, spend controls,
actual payment, one-payment-one-fulfillment, or WC/VOID activation.

## Result interpretation

The result is printed as structured JSON. Any path that is absent,
inaccessible, a symlink, or a special file is explicitly marked **HOLD**.
No path content or key material is printed. The only host identifier emitted
is the boolean `hostname_matches_designated_precision`; the hostname itself
is not disclosed. File mode and regular-file byte count are metadata only
and do not validate a custody receipt.

The terminal state is **always** `HOST_RELEASE_EVIDENCE_HOLD`. This is
intentional: a metadata probe must never promote itself to source-finality
or public-release authority. A false `frozen_pr_commit_locally_present` may
simply mean that the draft commit has not been fetched by the operator.
Do not fetch/update the live checkout as an automatic response.

## Next independent qualifications

Require separately reviewed proof of:
- accepted frozen source & any later canonical release selection;
- installed root-custodied deployment receipt **content authenticity** and
  exact running generation;
- custody/witness continuity without exposing any credential contents;
- provider quorum, live-chain finality, signer and gas/nonce safety;
- the fixed 2 VOID per USDC native-USDC presale flow and **one confirmed
  payment → at most one fulfillment**;
- coupled WC/VOID production pool readiness (market-determined WC/VOID price);
- explicit owner approval and a bounded production canary.

The presale and WC/VOID pool remain closed until all release and value-moving
gates are independently qualified. This operator tool authorizes **nothing**.

**PROTECT THE CORE.**
