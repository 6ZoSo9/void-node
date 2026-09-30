# VOID public entrypoints v1

VOID public access is domain-optional.

Configured public seed origin:

- https://seed.nullfeed.org

Fresh qualification and an unexpired bootstrap manifest are required before the
configured origin is authoritative for bootstrap clients.

Retired historical seed origin:

- https://zoso-alienware-aurora-r7.taila47fd.ts.net

The retired Alienware Funnel URL is historical verification evidence only and is
not the current default.

Documented public role:

- public-safe seed adapter
- participant page
- public bootstrap
- public readiness
- seed adapter health/status

VOID-native names:

- void://mainnet0/public-seed
- void://mainnet0/participant
- void://mainnet0/bootstrap
- void://mainnet0/status

Current HTTP routes:

- /__void/adapter.json
- /__void/ready.json
- /__void/public-bootstrap.json
- /__void/public-seed-adapter/status.json
- /participant

Safety invariants:

- /rpc is blocked
- /wallet is blocked
- /admin is blocked
- /operator is blocked
- /validator/admin is blocked
- /.env is blocked
- /keys is blocked
- /secrets is blocked
- 8545 remains private on 127.0.0.1

Cost posture:

- no Google Cloud hosting required
- no Google Cloud load balancer required
- no paid VPS required
- no paid custom domain required
- custom DNS aliases are optional wrappers only

Domain policy:

DNS names and custom aliases are replaceable routing coordinates, not protocol
authority. Clients should rely on the qualified bootstrap manifest and public-safe
proof routes to verify what they reached.
