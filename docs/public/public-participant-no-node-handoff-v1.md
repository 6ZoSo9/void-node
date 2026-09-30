# Earn Work Credits without running a node

The public participant entrypoint provides a one-shot Node.js client rather
than exposing the local operator dashboard.

Service availability and coordinator identity trust are intentionally separate.
A healthy Public Earn coordinator is not enough to make the page copy-ready.
For public HTTPS, the composition gateway requires the canonical
`VOID_NODE_PUBLIC_ORIGIN_BINDING_V1` document, verifies its Ed25519 signature
through the reviewed node-identity trust registry, and requires the signed node
ID to equal the live `/health` node ID.

Until that cryptographic binding verifies, the page renders **Identity HOLD**,
emits no coordinator commands, and explicitly refuses manual coordinator-origin
or node-ID substitution. The sanitized status JSON may still report that work is
available, but it exposes `public_copy_ready=false` and labels the health node
ID as self-report rather than trusted identity.

Once copy-ready, the rendered command keeps only the participant account as a
user-supplied value. The coordinator base and node ID come from the verified
signed-origin/health identity pair.

The client:

1. creates a private local Ed25519 executor identity;
2. verifies the signed public-origin coordinator identity;
3. reads generic Public Earn availability without an account query;
4. signs one capability-ticket claim;
5. receives server-selected work, dataset, expected hash, award, and expiry;
6. fetches and verifies the selected dataset;
7. submits one signed outbound result bundle;
8. verifies capability consumption and canonical +3 WC accounting from the
   submit response;
9. writes a private sanitized receipt and deletes the consumed ticket.

It does not run a VOID node or background service. It does not access a wallet,
move money, select its own award, submit generic jobs, expose arbitrary
participant balance lookup, or infer trust from the browser Host header.
