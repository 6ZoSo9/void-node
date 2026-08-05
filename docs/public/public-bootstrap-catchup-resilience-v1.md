# VOID public bootstrap catch-up resilience v1

Status: draft source and proof lane.

This layer sits above public bootstrap autodiscovery. It makes first synchronization faster and prevents one unavailable public seed from permanently stalling a participant node.

## Runtime behavior

When public bootstrap autostart is active, the follower:

- accepts an ordered comma-separated seed pool through `VOID_FOLLOWER_AUTOSTART_PEERS`;
- falls back to `VOID_FOLLOWER_AUTOSTART_PEER` for the single-seed contract;
- pulls up to 999 blocks per bounded catch-up request;
- schedules another pull after 250 ms while the remote head remains ahead;
- returns to a 1-second steady polling interval when caught up;
- rotates to the next seed after a failed pull; and
- applies bounded exponential failure backoff up to 30 seconds.

Operator overrides remain available:

```text
VOID_FOLLOWER_AUTOSTART_INTERVAL_MS
VOID_FOLLOWER_CATCHUP_INTERVAL_MS
VOID_FOLLOWER_CATCHUP_PULL_LIMIT
VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS
```

## Public gateway boundary

The read-only gateway permits a maximum 999-block range and caps each upstream response at 64 MiB by default. Both limits can be reduced by the operator but cannot exceed their compiled maxima.

The gateway still exposes only:

```text
GET /__void/ready.json
GET /blocks/latest/number2.json
GET /head
GET /__void/demo/summary.json
GET /api/health
GET /blocks/range?from=N&to=M
```

All mutation methods and undocumented routes remain rejected. Private JSON-RPC, wallet, signer, validator, treasury, Work Credit, Buy VOID, operator and filesystem surfaces remain outside the gateway.

## Remaining fast-sync work

Bounded range catch-up improves a fresh clone but does not replace snapshot bootstrap. The next scale layer should publish content-addressed verified checkpoints through multiple mirrors, with the participant verifying the checkpoint before applying it and then using range catch-up for the remaining head gap.

Tor, IPFS, GitHub Releases and additional HTTPS seeds should reuse the same verification and authority boundary rather than define separate trusted chain states.
