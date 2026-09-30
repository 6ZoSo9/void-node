# VOID public seed URL compatibility record

Current configured public HTTPS seed origin:

- https://seed.nullfeed.org

Fresh qualification and an unexpired bootstrap manifest are required before this
origin can be treated as authoritative bootstrap input. This compatibility record
does not extend manifest validity or substitute for live qualification.

Documented public role:

- public-safe VOID seed adapter
- participant page entrypoint
- public bootstrap entrypoint
- public readiness entrypoint

Documented safety posture:

- /__void/adapter.json is public
- /__void/ready.json is public
- /__void/public-bootstrap.json is public
- /__void/public-seed-adapter/status.json is public
- /participant is public
- /rpc is blocked
- sensitive surfaces are blocked
- 8545 remains private on 127.0.0.1

Retired historical public seed origin:

- https://zoso-alienware-aurora-r7.taila47fd.ts.net

The Alienware Funnel coordinate is historical verification evidence only and must
not be used as the default current seed.

Cost posture:

- no Google Cloud hosting
- no Google Cloud load balancer
- no paid VPS required
- no paid custom domain is required for protocol authority

Domain note:

DNS names are routing coordinates, not authority. The configured origin
`seed.nullfeed.org` must still satisfy the repository's bootstrap qualification,
expiry, gateway-safety, and live-admission checks.
