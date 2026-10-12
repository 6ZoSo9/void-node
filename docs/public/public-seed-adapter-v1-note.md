# VOID public seed adapter v1 note

VOID nodes should not require direct public inbound reachability to contribute public seed data.

Build target: a public seed adapter that exposes only allowlisted public VOID surfaces from a trusted upstream node.

The adapter separates node truth from public reachability.

First implementation target: a read-only HTTP adapter that pulls from VOID_SEED_UPSTREAM and serves only safe public routes.

Blocked: private JSON-RPC, tcp/8545, admin/operator routes, validator mutation, wallet files, keys, mnemonics, .env files, secrets, funds movement, and authority changes.
