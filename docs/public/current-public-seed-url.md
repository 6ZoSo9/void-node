# VOID public seed URL compatibility record

Current configured public HTTPS seed origin:

- https://seed.nullfeed.org

Fresh qualification and an unexpired bootstrap manifest are required before this
origin can be treated as authoritative bootstrap input. This compatibility record
does not extend manifest validity or substitute for live qualification.

The read-only `VOID public seed live qualification v1` workflow samples
`https://seed.nullfeed.org` daily and uploads both the qualification/candidate
artifact and a verified publication review packet bound to the exact source SHA and
tracked predecessor manifest. The packet includes a fail-closed HOLD rollback and
review instructions for the immutable v2 mirror. The automation does not publish or
replace `public/bootstrap/v1.json`; publication remains a separate reviewed source
change.

A companion read-only freshness alarm runs daily at 05:47 UTC, thirty minutes
after the qualifier schedule. It fails closed when the committed manifest is
expired, in HOLD, malformed, authority-bearing, or has **24 hours or less**
remaining. The alarm does not fetch the network, publish a candidate, mutate the
repository, or grant publication authority.

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
