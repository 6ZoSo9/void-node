# VOID public seed URL compatibility record

Current configured public HTTPS seed origin:

- https://seed.nullfeed.org

Fresh qualification and an unexpired bootstrap manifest are required before this
origin can be treated as authoritative bootstrap input. This compatibility record
does not extend manifest validity or substitute for live qualification.

The read-only `VOID public seed live qualification v1` workflow samples
`https://seed.nullfeed.org` every six hours, nominally at 00:17, 06:17, 12:17,
and 18:17 UTC, and uploads both the qualification/candidate artifact and a
verified publication review packet bound to the exact source SHA and tracked
predecessor manifest. The packet includes a fail-closed HOLD rollback and
review instructions for the immutable v2 mirror. The automation does not publish or
replace `public/bootstrap/v1.json`; publication remains a separate reviewed source
change.

A companion read-only freshness alarm runs at 00:47, 06:47, 12:47, and 18:47
UTC, thirty minutes after each nominal qualifier schedule. It passes the committed manifest through the same
exact predecessor-manifest admission used by reviewed publication, then fails
closed when the manifest is expired, in HOLD, malformed, authority-bearing, or
has **24 hours or less** remaining. This includes exact keysets, content-derived
manifest identity, endpoint shape/public-HTTPS rules, and the onion/Tailnet
boundary. The alarm does not fetch the network, publish a candidate, mutate the
repository, or grant publication authority.

These six-hour schedules give earlier and more frequent **opportunities** to
qualify and detect expiring reviewed bootstrap inputs; scheduled GitHub runs
may be delayed or skipped. A qualification receipt is usable for publication
only while its separate two-hour freshness check passes. No schedule can
renew an expired committed manifest automatically: a fresh packet, owner
review/approval, an exact-source publication, and independently checked served
bytes are still mandatory. A pending Draft or passing workflow is not
published seed authority. Six-hour cadence means four read-only runs per day
for each workflow instead of one; it does not take effect until a separately
approved merge reaches the default branch.

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
