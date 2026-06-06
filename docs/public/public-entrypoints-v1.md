# VOID public entrypoints v1

VOID public access is domain-optional.

Current canonical public seed URL:

- https://zoso-alienware-aurora-r7.taila47fd.ts.net

Current public role:

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

Custom domains are not authoritative. They are replaceable aliases over the current public seed surface.

A future custom domain may point at the current seed surface, but the project should always expose machine-readable proof routes so clients can verify what they reached.
