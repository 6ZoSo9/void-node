# Hopper maintenance audit v1

## Source binding

- Repository: `6ZoSo9/void-node`
- Audited `main`: `98cbbe6216e9c6828fc1c18c49b5b67a5f98d5b9`
- Audit scope: source, tests, documentation, and CI only
- Runtime matrix declared by `package.json`: Node.js 22, 24, and 26

This maintenance lane does not alter deployment, runtime, network, wallet, signer,
transaction, validator, inventory, treasury, liquidity, or scheduler state.

## Live defensive-tooling finding

The repository has a broad GitHub Actions surface, but external action references
are not consistently immutable. At the audited head:

- `.github/workflows/void-worker-coordination-v3.yml` uses
  `actions/checkout@v6` and `actions/setup-node@v6`.
- `.github/workflows/void-worker-coordination-snapshot-freshness-v1.yml`
  pins those actions to full commit SHAs.

A mutable tag can resolve to different action code while the repository source
SHA remains unchanged. That weakens exact-head reproducibility and makes the two
coordination workflows enforce different supply-chain policies.

## Actionable improvement

Add a source-only, fail-closed proof such as
`scripts/prove_github_action_sha_pinning_v1.mjs` that:

1. enumerates every committed `.github/workflows/*.yml` and `*.yaml` file in
   deterministic lexical order;
2. accepts local `./` actions but requires each external
   `owner/repository/path@ref` reference to use a full 40-hex commit SHA;
3. rejects mutable tags, branches, short SHAs, malformed references, unreadable
   workflow files, and an empty workflow inventory;
4. reports the exact workflow path and line for each rejection without printing
   environment values or secrets;
5. includes negative fixtures for tag, branch, short-SHA, and malformed inputs,
   plus a positive local-action fixture; and
6. runs under the repository's Node 22/24/26 matrix with a path-filtered
   workflow that includes the proof, its fixtures, and all workflow files.

The first implementation should migrate only collision-free references needed to
make the proof green. Active product lanes and exact head-bound evidence remain
out of scope.
