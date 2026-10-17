# Buy VOID — fixed presale source snapshot candidate V1

**Disposition:** Draft source-freeze proposal only. **NOT an approved launch, deploy, payment, signer or funds operation.**

## Why freeze this generation?

Rapid independent merges to canonical `main` repeatedly made otherwise valid
economic source proofs stale. This proposal selects **one fixed, auditable source
tree** and explicitly forbids the candidate from silently adopting later main
commits. Future source changes must be separate, reviewed versions; they must
not rewrite accepted historical hashes or mutable runtime custody.

This is a candidate for a **release-source decision**, not a request to halt
unrelated development on `main`. The presale launch still requires its own
production readiness, independent security review and explicit authorization.

## Exact immutable source parentage

| Role | Exact commit/tree |
|---|---|
| Reviewed V5 economic+Epoch-2 integration, PR #3402 | `ae1db243066db8c99d778245526c0f5a023444fd` |
| Canonical main snapshot after #3406 | `f77e586807a7a6bdd92324138fe6bf2b50903835` |
| Common source ancestry for delta census | `0ea097a3fa43dc95a1a0a5272c61afe570361fc7` |
| Frozen two-parent source commit | `5e514e4b6e2151c18cf7459bd7a697287eebbd4c` |
| Frozen source tree | `47a0c6eb9408b97226472d1297115633b0b3d799` |

The first parent is the V5 integration and the second parent is canonical
main. The source tree includes **63 inherited economic/integration paths**
byte- and mode-identical to the first parent. Compared to that first parent,
it adds exactly four files—an Epoch-2 protected-bootstrap **acceptance lock**
and its proof, workflow and operator contract—byte-for-byte from the
second parent. No existing source, accepted economic lock, candidate,
signer, custody or presale runtime is modified.

The following four records must retain their exact Git blobs and mode 100644:

- `.github/workflows/buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-candidate-lock-v1.yml`
  — `120c4e9a8967c34413a1738abeeb8ea3d75c59ca`
- `docs/operators/buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-candidate-lock-v1.md`
  — `5f99657424077c527076d8092ca98d54307326e3`
- `ops/security/buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-candidate-lock-v1.json`
  — `a96dee99c89ef386a6cbd05609b8f4a764caada8`
- `scripts/prove_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_candidate_lock_v1.py`
  — `3b665808b28666d8e413063c8bd2a68e4a59b3d7`

## Frozen Buy VOID enforcement source identity

The selected full V5 candidate from [#3396](https://github.com/6ZoSo9/void-node/pull/3396)
and its proposed source-only acceptance lock in
[#3398](https://github.com/6ZoSo9/void-node/pull/3398) are not changed:

- enforcement set: `1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf`;
- accepted V5 lock blob: `61a9d85d285f9c9d249adf401580822c44c6dac6`;
- bounded candidate projection blob: `dd849928bc945478a1a8fcf687f374cfca59f4e4`;
- protected 49-path canonical source inventory digest:
  `e7e0625ff47dc4b4c7e0f93e4b75be30d04d9538acc233174c0abc18198b38e3`.

The freeze manifest stores those identities and the full launch authority HOLD.
Its proof validates exact Git ancestry, all source paths and executable modes,
the accepted V5 tracked candidate projection, all **49 protected source
rows**, and a clean worktree. It refuses any unreviewed added file.

## Hosted evidence and deliberate limits

This PR adds a source proof, static manifest, documentation and CI workflow
on top of the two-parent snapshot. Focused hosted checks:

1. Source proof: fixed ancestry/tree, 63+4 source path identity, frozen
   V5 lock and 49-row inventory and **all false runtime authority flags**.
2. Locked economic build and inert V7 deployment-receipt installer
   `--plan` with exact checkout commit/tree. It must return
   `PLAN_GREEN`, report no filesystem/source/service/credential/signing,
   transaction, presale or funds mutation and create no receipt.

All CI output is **evidence only**. This does **not** qualify the installed
Precision runtime, host signer, BTC observer, merchant purchase completion,
durable custody receipt, chain-2050 gas, treasury fulfillment, or the
WC/VOID capacity/market exchange pool. No real customer payment is accepted.

The **Buy VOID presale and WC/VOID pool remain one coupled launch gate**;
no fixed WC-to-VOID conversion rate is asserted. Production acceptance must
separately verify one verified payment → at most one fulfillment, durable
receipt and fail-closed refund/exception handling before release approval.

## Review and release decision

Historical Epoch-2 first-entry and protected V3/V5 economic workflows
have strict old-generation scope gates. Their red state on a broader
composition is **not a success**, nor permission to weaken the original
checks. Review must classify them individually, preserve their history and
create versioned successor validation where needed.

To proceed beyond source-freeze review, independently qualify:

- this exact source snapshot and lock/projection identities under hosted CI;
- new-generation source transition evidence and remaining historical gates;
- actual installed runtime/service and disk/custody/witness identities;
- purchase safety with BTC-only presale, fulfillment receipt and audit path;
- WC/VOID pool launch coupling and inventory/accounting boundaries;
- explicitly approved production installation and public launch.

If the parent branch or canonical `main` advances, **do not auto-forward**
this frozen candidate. A changed source needs a new versioned release
candidate with new evidence. Do not merge into main or apply to hosts
without a separate authorization and complete review.

**PROTECT THE CORE.**
