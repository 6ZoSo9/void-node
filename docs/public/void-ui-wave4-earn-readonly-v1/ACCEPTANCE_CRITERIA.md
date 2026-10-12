# Wave 4 Earn Acceptance Criteria

- Earn placeholder is replaced by a usable read-only participant-account view.
- Account input is explicit and validated before a request.
- Frontend fetches exactly one same-origin Wave 4 adapter.
- Adapter is loopback-only and GET/HEAD-only.
- Adapter reads exactly seven fixed GET sources.
- Job and receipt history is account-filtered and bounded to five rows each.
- Current useful-work selection is visible without a Run Once control.
- Earned, redeemed, redeemable, and Production WC remain clearly separated.
- Production WC is explicitly non-spendable, non-redeemable, and separate.
- Raw source bodies and sensitive implementation fields are absent.
- No job execution, submission, reward award, runner mutation, redemption,
  transfer, ledger write, browser-wallet connection, or money movement exists.
- Existing Home, Wallet, participant, public-node, and Tailnet containment
  remain intact.
- Desktop and narrow/mobile visual review is required before commit.
