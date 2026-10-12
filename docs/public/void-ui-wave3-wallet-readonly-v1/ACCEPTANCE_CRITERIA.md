# Wave 3 Wallet Acceptance Criteria

- Wallet placeholder is replaced by a usable read-only account lookup.
- Account input is explicit and validated before any request.
- Frontend fetches exactly one same-origin Wave 3 adapter.
- Adapter is loopback-only and GET/HEAD-only.
- Adapter reads exactly three fixed local GET sources.
- Raw wallet records, keystores, private fields, and source bodies are absent.
- VOID balance is not invented.
- Ledger WC is not called spendable.
- Production WC is marked non-spendable and separate.
- No browser wallet provider is requested.
- No wallet mutation, signing, broadcast, settlement, ledger write, or money
  movement route is called or exposed.
- Existing Home, participant, public-node, and Tailnet containment remain intact.
- Desktop and narrow/mobile visual review is required before commit.
