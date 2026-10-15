# Cloudflare historical user-Tunnel retirement query v1

Marker: `VOID_CLOUDFLARE_HISTORICAL_USER_TUNNEL_RETIREMENT_QUERY_V1`.

Issue: #2984.

## Purpose

The Cloudflare designated-host census intentionally refuses to treat the ordinary
user D-Bus pathname as authenticated systemd authority. This source-only
successor defines a purpose-bound, root/kernel-anchored snapshot of the exact
historical user unit:

`void-public-seed-named-tunnel-v1.service`.

It reuses the reviewed private-manager trust pattern from the protected
user-manager query source without changing that accepted source generation.

## Authenticated transport

The query:

- runs as root only for read authority;
- locates exactly one `systemd --user` manager for the supplied positive UID;
- retains a pidfd for that manager generation;
- connects to `/run/user/<uid>/systemd/private`;
- requires kernel `SO_PEERCRED` to match the proven manager PID/UID/GID;
- gives the same retained socket to sd-bus;
- rechecks peer credentials and manager generation after the query window.

The unit name is compiled in. There is no arbitrary `--unit` argument.

## Accepted snapshot shape

One snapshot is source-qualified only when two consecutive authenticated
observations are identical and show:

- UnitFileState exactly `disabled` or `masked`;
- LoadState exactly `loaded` or `masked`;
- ActiveState exactly `inactive`;
- SubState exactly `dead`;
- MainPID exactly `0`;
- ControlGroup empty.

The query performs no start/stop/enable/disable/mask/unmask operation.

## Static pre-exec boundary

The dynamic query is launched only through a separate static pre-exec candidate
under:

`/opt/void-cloudflare-user-tunnel-retirement-query-v1`.

The pre-exec requires root-owned non-writable ancestry, a fixed self path, a
root-owned non-writable single-link query executable, opens it with
`O_NOFOLLOW`, rechecks the visible generation, and enters it with
`fexecve()`.

The child receives a minimal environment. Caller loader variables are not
forwarded.

## Nonclaims

This is an authenticated **retirement snapshot**, not durable proof that the
ordinary user can never reactivate a historical connector.

The source therefore keeps:

- `future_restart_prevented=false`;
- `historical_user_tunnel_retirement_verified=false`;
- host installation/runtime integration/external acceptance false.

A later #2984 composition must combine this snapshot with the reviewed
config/credential custody, dedicated system-service identity, nftables/listener
evidence, Cloudflare control-plane evidence and external acceptance before
promoting live retirement/local transport trust.

No credential contents, private keys, payment data, Work Credit state, signer,
transaction, presale/market or funds authority is introduced.
