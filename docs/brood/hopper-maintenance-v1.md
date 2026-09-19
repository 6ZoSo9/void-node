# Hopper maintenance audit v1

## Source binding

- Repository: `6ZoSo9/void-node`
- Audited `main`: `98cbbe6216e9c6828fc1c18c49b5b67a5f98d5b9`
- Audit scope: source, tests, documentation, and CI only
- Runtime matrix declared by `package.json`: Node.js 22, 24, and 26

This maintenance lane does not alter deployment, runtime, network, wallet, signer,
transaction, validator, inventory, treasury, liquidity, or scheduler state.

## Defensive-tooling finding

At the audited main generation,
`.github/workflows/void-worker-coordination-v3.yml` used mutable
`actions/checkout@v6` and `actions/setup-node@v6` references, while the
sibling snapshot-freshness workflow pinned the same v6 actions to full commit
SHAs.

A mutable tag can resolve to different action code while the repository source
SHA remains unchanged. That weakens exact-head reproducibility and made the two
coordination workflows apply different supply-chain policies.

## Implemented improvement

The maintenance branch now pins the affected workflow to the same reviewed
immutable revisions already used by the sibling workflow:

- `actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803`
- `actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38`

The worker-coordination proof remains unchanged and continues to execute on Node
22, 24, and 26 with `persist-credentials: false`.

## Existing fail-closed guard

A fresh scan found that the repository already contains the stronger general
guard originally proposed by this audit:

- `tools/void-github-actions-ref-guard-v1.mjs`
- `scripts/prove_void_github_actions_ref_guard_v1.mjs`
- `.github/workflows/void-github-actions-ref-guard-v1.yml`

That guard checks changed workflow and action-manifest references, rejects newly
introduced mutable remote refs with exact path and line diagnostics, accepts only
approved local-action paths, and follows local-action dependency closure. This
lane therefore reuses the existing guard instead of adding a duplicate proof.

## Acceptance boundary

The source repair is complete only when exact-head GitHub checks show both:

1. the worker-coordination Node 22/24/26 matrix is green; and
2. the GitHub Actions reference guard reports no new mutable references.

A source-green Draft does not imply Ready, merge, deployment, runtime activation,
credential access, wallet/signing authority, transaction authority, validator or
Work Credit mutation, inventory funding, treasury/liquidity action, or funds
movement.
