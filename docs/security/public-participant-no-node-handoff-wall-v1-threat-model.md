# Public participant no-node handoff wall v1 threat model

## Protected surfaces

- local participant account names and account directory
- Wallet state and addresses
- Work Credit balances and history
- jobs and receipts
- admin and operator links
- validator live-submit controls
- arbitrary POST routes
- capability tokens
- public coordinator origin and node-identity trust

## Controls

- server-owned `/participant` HTML with no forms or browser account state;
- exact GET and POST route allowlists;
- claim rejects Authorization and requires bounded JSON;
- submit requires a syntactically valid capability and matching ticket ID;
- cookies and arbitrary headers are not forwarded;
- account query is forbidden on public status;
- public balance lookup remains blocked;
- Public Earn availability is not treated as identity trust;
- the live health node ID is explicitly self-report until a signed public-origin
  binding verifies;
- public copy-ready requires the reviewed trust-registry fingerprint, valid
  Ed25519 signed binding, canonical `https://seed.nullfeed.org` origin, and
  equality between signed node ID and live health node ID;
- absent/invalid/expired binding fails closed to Identity HOLD with no
  coordinator CLI arguments;
- Host headers and operator-entered coordinator values are not trust roots;
- no-node client relies on the capability-bound canonical submit response;
- existing rate limits, coordinator verification, signature checks, replay
  controls, caps, and single-use capability consumption remain authoritative.

## Failure posture

Unknown routes remain 404. Unknown POST routes remain 405. Query-bearing status,
participant, or signed-binding requests are rejected. Missing or invalid
identity evidence may leave bounded work availability visible, but it cannot
produce copy-ready coordinator commands.

No failure enables wallet, validator, operator, settlement, service activation,
or money movement.
