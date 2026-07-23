# Earn Work Credits without running a node

The public participant entrypoint provides a one-shot Node.js client rather
than exposing the local operator dashboard.

The client:

1. creates a private local Ed25519 executor identity;
2. verifies the trusted coordinator node ID;
3. reads generic Public Earn availability without an account query;
4. signs one capability-ticket claim;
5. receives server-selected work, dataset, expected hash, award, and expiry;
6. fetches and verifies the selected dataset;
7. submits one signed outbound result bundle;
8. verifies capability consumption and canonical +3 WC accounting from the
   submit response;
9. writes a private sanitized receipt and deletes the consumed ticket.

It does not run a VOID node or background service. It does not access a wallet,
move money, select its own award, submit generic jobs, or expose arbitrary
participant balance lookup.
