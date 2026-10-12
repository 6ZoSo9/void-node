# Main CI Rollup After PR12 v1

Marker: `VOID_MAIN_CI_ROLLUP_AFTER_PR12_V1`

This rollup records the cleaned PR/CI state after the recovery stack:

- PR #9 public-node self-check snapshot contract
- PR #10 guard baseline debt
- PR #11 remaining CI baseline cleanup
- PR #12 ops executable-bit cleanup

Scope:

- CI/PR proof only
- no runtime route change
- no public-node mutation
- no wallet, money movement, validator mutation, or WC ledger mutation

Expected result:

- no open PRs
- PRs 9 through 12 merged
- recent post-merge checkpoint tags present
- local CI guard checks green

Post-merge note:

- The fixture records the baseline main head observed when the rollup branch was created.
- The proof accepts current `origin/main` when it contains that expected head as an ancestor, so post-merge main can advance without making the rollup red.

