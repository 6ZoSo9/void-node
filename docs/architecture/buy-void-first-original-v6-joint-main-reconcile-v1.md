# Buy VOID — first-original buyer and V6 operator joint current-main review

## Why this source-only reconciliation exists

Two active Drafts independently reconciled the same checkpoint-enabled main
generation `ba853a4bfb237701504225ddba615f7b46eeb991`:

- [#2675](https://github.com/6ZoSo9/void-node/pull/2675) current head
  `8696309719a88a5f06345b13701092ab3bdc9ceb`, tree
  `b0dc296adda37d07a348ab34a52af94fbd51b9a6`, combines V6
  source-finality and operator admission with current main.
- [#2752](https://github.com/6ZoSo9/void-node/pull/2752) current head
  `4350c87181cb44dce28b66eb691bdbc26dd68551`, tree
  `eafba1e25424f51a7a307c1adf1ea81118e0561e`, combines the
  first-original buyer wallet, Base/Ethereum receipt-to-allocation and
  crash/custody source proofs with the identical current main.

Both parents were **Draft, open and unmerged** when this separate child was
authored. The purpose is to make the exact two branches **shared Git
ancestry** and provide a reviewable source tree for full exact-head CI.
No owner branch, main source, deployed runtime, wallets or funds are changed.

## Independent before-authoring tree census

Fetched both complete Git tree manifests, each nontruncated (10,366
blobs in #2675, 10,387 in #2752). The #2752 tree has **21 added blobs,
zero removed blobs and twelve differing file records** compared with #2675.
Eleven are actual first-original source/proof byte changes; the twelfth was
an *unintended file-mode regression* on the public bootstrap proof.

All **six checkpoint and seal source blobs** were verified byte-for-byte
identical across both parents and current main. One mode differed:

```text
scripts/prove_void_public_bootstrap_outside_machine_target_v1.mjs
Git blob (ALL branches) = 47064b1daa20a52236ceeb394e3bf409eba61463
#2675 / current main mode = 100755 (executable)
#2752 mode                = 100644 (not executable)
JOINT REVIEW mode         = 100755, preserving the exact source blob
```

This is a **mode-only correction**. The protected checkpoint's original
source bytes are NOT rewritten, nor are the first-original economic source
files, historical evidence/manifests, payment or allocation guards.

## Explicit two-parent construction and exact proof

The join commit has the #2752 first-original current-main head as parent
**1** and the #2675 V6 current-main integration as parent **2**. Its
tree is #2752's reviewed complete tree with only:
1. the canonical executable mode restored to `100755` on the exact
   existing proof blob; and
2. this explanatory note and one exact-head Git-only workflow added.

The workflow checks exact parent order, shared current-main and first-original
ancestors; requires **exactly** those three changes relative to parent 1;
requires all six checkpoint file blobs and modes match parent 2; verifies
representative first-original wallet and original buyer/dual-rail proofs are
still present with the same Git blobs. No npm install, Docker, signer, RPC,
external runner node or live customer file is needed for this ancestry
proof. The normal repo CI checks on the joint exact head are still
independently required for source/test compatibility; no parent success is
inherited across the new merge.

## Remaining gates

Source ancestry does not prove the installed Nimo witness, protected custody
high-water, verified buyer payment finality, authentic operator principal or
exactly-once allocation append; it does not render a historical failed source
attestation green. Independent review and exact-head CI of this joined stack
must precede a later narrowly authorized merge decision. The external
checkpoint/bootstrap acceptance is a separate test and remains unproven
by any local source reconciliation.

No operator/customer ledgers, keys, signers, runtime services, real
transactions, Chain2050/WC, inventory/treasury, presale/market activation,
liquidity or funds action has been performed.

**PROTECT THE CORE.**

## Maintaining the review branch without rewriting its joining event

The original joining commit remains
`cff927e850dfc078419be06a468aa77c6c1f41c3`. Its exact ordered parents
and three-path mode repair describe a historical event, not the immediate
parents of every later PR tip. The former `HEAD^1` / `HEAD^2` checks rejected
an ordinary single-parent follow-up even when all protected bytes survived.

The workflow now requires that immutable join to be an ancestor of the exact
checked-out PR head, checks its complete ordered parent list, and evaluates
its original three-path delta at that join. Current-head cleanliness, both
source identities, all six checkpoint blobs/modes and the buyer proof bytes
remain enforced separately. Both historical and new-range whitespace checks
run. Changes to the protected paths also trigger this same existing workflow.
This permits source-preserving CI/documentation maintenance; it does not
accept a new economic or checkpoint source generation under the old pins.

`python3 scripts/test_buy_void_joint_main_ancestry_v1.py` runs the actual four
workflow shell blocks against disposable local Git histories. It verifies
the original workflow blob, reproduces its descendant rejection, and checks
28 positive/negative cases for descendants, parent order/count, copied trees,
wrong checkout identity, dirty files, mode regression and protected content.
Only object-ID literals are translated into synthetic Git fixture IDs; the
shell predicates are extracted from the workflow rather than reimplemented.
For an offline checkout, `--historical-workflow PATH` accepts only the exact
original workflow bytes with Git blob `8a63ff411d915b487c0ce8290b700f272ebc54a3`.
These tests have no network, customer-data, service or financial operations.
Historical Nimo V1 and replay-source failures remain separate and unchanged.
