# VOID public participant designated-host census v1

Marker: `VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1`.

Issue: #1648.

## Purpose

Current main already contains the default-off participant production composition:
a reviewed live Chain-2050 role-authority bridge, branded durable session-state
store, participant session HTTP contract, and read-only Wallet/Earn edge.

This tool is the next **read-only** designated-host census. It does not activate
that surface. It answers only whether the reviewed composition runtime is
present on Precision and whether the two participant read-only status surfaces
are currently observable on loopback.

## Observation boundary

The live `--run` mode:

- requires hostname `zoso-Precision-Tower-7810`;
- refuses root execution and requires ordinary user `zoso`;
- reads `/usr/bin/ss` to identify exactly one IPv4-loopback listener on
  `127.0.0.1:8082`;
- binds the listener PID across three `/proc/<pid>/stat` process-generation
  observations: before the first HTTP set, between the two HTTP sets, and after
  the complete second HTTP set;
- verifies the visible running gateway entry file matches the exact reviewed
  Git blob;
- reads proc/gateway files through one retained no-follow descriptor with a hard
  `maximum + 1` byte ceiling; the visible gateway source additionally requires
  a stable direct regular-file generation before/after the bounded read;
- performs only bounded loopback GETs to:
  - `/__void/public-app/status.json`;
  - `/__void/participant/session/v1/status.json`;
  - `/__void/participant/account-read/v1/status.json`;
- repeats listener/process/status observations and requires stable endpoints
  before reporting an active loopback participant surface;
- takes the final listener/process snapshot only after all second status GETs,
  so both HTTP sample sets are bracketed by one stable PID/start-tick/listener
  generation and reviewed visible gateway source generation.

This is a sampled bracket, not continuous kernel ownership proof. A sufficiently
fast listener/process A→B→A transition entirely between discrete snapshots is
outside this census and remains `continuous_listener_ownership_proven=false`.
Later authenticated service/lifecycle acceptance must close that stronger
boundary.

It never reads `/proc/<pid>/environ`, never reads bearer/session/account
contents, and never calls challenge/login/logout routes.

## What an active result proves

`PARTICIPANT_LOOPBACK_SURFACE_OBSERVED_HOST_GATES_REMAIN` means only:

- exact reviewed gateway bytes are visible for the stable 8082 Node process;
- the generic public-safe composition status is healthy and stable;
- the session status reports Ed25519, AGENT role authority, and the branded
  durable state store;
- composition, session and account status bodies use exact reviewed key sets;
  unknown response fields fail closed rather than extending authority implicitly;
- participant session status requires exactly a 60,000 ms challenge TTL and
  900,000 ms session TTL;
- the account-read status reports the exact Wallet/Earn read-only routes with
  mutation/money authority false;
- both branded status surfaces are mounted on loopback inside one observed
  process generation bracket spanning the complete two-sample HTTP window.

It does **not** prove the bytes originally loaded by Node equal the currently
visible file bytes.

## Explicit remaining gates

Even a positive census keeps all of these false:

- authenticated systemd service ownership;
- exact scalar activation configuration values;
- binding-registry path custody;
- durable session-state path custody;
- exact live role-RPC target;
- startup/restart/rollback acceptance;
- public/external reachability;
- real AGENT-bound participant login;
- production session issuance authority;
- public route activation authority;
- runtime activation authority.

Those require separate reviewed host/config/lifecycle evidence.

## Modes

```bash
node tools/void-public-participant-designated-host-census-v1.mjs --self-test
node tools/void-public-participant-designated-host-census-v1.mjs --plan
node tools/void-public-participant-designated-host-census-v1.mjs --run
```

`--self-test` and `--plan` are inert. `--run` is read-only and loopback
only.

## Focused CI continuity

The focused proof runs both on pull requests and accepted pushes to `main`
for the same complete set of reviewed census input paths. A later accepted
dependency/source drift therefore cannot bypass this census proof.

## Authority boundary

No file write, service/systemd action, Tailscale/DNS mutation, session/challenge
mutation, bearer-token access, account data read, wallet/key/signer access,
Chain-2050 write, Work Credit mutation, transaction, validator action, payment,
presale activation, treasury/liquidity action, or funds movement is authorized.
