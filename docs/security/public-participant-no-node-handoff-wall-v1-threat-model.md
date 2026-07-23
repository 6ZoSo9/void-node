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

## Controls

- static server-owned `/participant` HTML with no forms or account state;
- exact GET and POST route allowlists;
- claim rejects Authorization and requires bounded JSON;
- submit requires a syntactically valid capability and matching ticket ID;
- cookies and arbitrary headers are not forwarded;
- account query is forbidden on public status;
- public balance lookup remains blocked;
- no-node client relies on the capability-bound canonical submit response;
- existing rate limits, coordinator verification, signature checks, replay
  controls, caps, and single-use capability consumption remain authoritative.

## Failure posture

Unknown routes remain 404. Unknown POST routes remain 405. Query-bearing status
or participant requests are rejected. No failure enables wallet, validator,
operator, settlement, or money movement.
