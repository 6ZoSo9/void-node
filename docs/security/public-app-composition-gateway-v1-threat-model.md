# Public App Composition Gateway v1 threat model

## Protected assets

- node RPC and developer routes;
- account IDs and account-scoped wallet or Work Credit records;
- peer IDs and peer addresses;
- jobs, receipts, and DataNet evidence not already public;
- wallet, validator, operator, treasury, and economic mutation authority.

## Controls

- GET and HEAD only;
- explicit blocked prefixes before either upstream is reached;
- account-bound Wave 3 and Wave 4 adapters are never proxied;
- peer output contains connected-count placeholders only;
- version output strips local paths and package hashes;
- app HTML receives an explicit public-mode boundary;
- all unmatched routes fall back to the existing public allowlist gateway;
- service installation and Funnel cutover are separate actions;
- rollback restores the previous Funnel target.

## Residual risk

The composition gateway trusts the local node and existing public gateway as
upstreams. A future UI may add new dependencies that are not covered by this
contract. The end-to-end public smoke proof must therefore run after every UI
migration and before every cutover.
