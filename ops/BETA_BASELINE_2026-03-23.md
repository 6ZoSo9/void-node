# VOID Node Beta Baseline — 2026-03-23

## Green user-facing commands

    make public-beta-status
    make public-beta-preflight
    make wc-wallet-proof
    ./ops/public-beta-quickstart.sh
    make public-beta

## What is proven

- live main/follower snapshot status is readable and green
- isolated per-wallet WorkCredits proof is green
- public-beta preflight is green
- public-beta quickstart is green
- main demo proof now defaults to a real wallet address
- install/user-unit/first-run guidance matches the real beta path

## Current checkpoint ladder

- acd8670 — isolated wallet-specific WC awards fixed
- 11e2941 — isolated per-wallet WC proof runner
- 190dd0f — make wc-wallet-proof
- 517d9d6 — public-beta-preflight uses real DataNet publish/fetch/receipt
- f5ca378 — public-beta-quickstart gated on preflight
- 95020b1 — main demo proof defaults to wallet address
- 8d86018 — runbooks refreshed
- 584eb6e — README aligned with public beta / wallet proof baseline
- b50db9b — public beta status target + docs
- 9401a82 — install-user-units starts units immediately and points to beta path
- 0914e6d — first-run-smoke next-step guidance
- c48c550 — install-devbox guidance updated
- 81c57f7 — public beta status output readability polish

## Honest caveat

The bounded wallet-proof and beta-preflight paths are now strong.
Broader demo/proposer/follower surfaces still exist and are useful, but they are wider operational paths than the tight bounded proof gates above.
