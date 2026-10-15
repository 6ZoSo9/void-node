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

The pre-exec is not trusted from its pathname alone. The separately bounded
create-only installer admits one exact hosted candidate generation before any
privileged snapshot execution:

- pre-exec: 785,824 bytes,
  SHA-256 `9852c4754de5daa901e67b05c612c1c906de107ac6684f620d41415a275c89cb`;
- query: 40,152 bytes,
  SHA-256 `bd8703cdc7a0ee8e502ecc081dc2cbd3a825d426dbbfc9075bf07b424389c605`;
- hosted evidence: workflow run `38787746099`, byte-identical on Node 22,
  24 and 26 lanes.

The protected installer is create-only: it refuses an existing install root,
uses `O_EXCL` and `O_NOFOLLOW`, and requires the installed directory and
both executables to be root-owned, single-link where applicable, mode 0555 and
exact-hash/size matched. The read-only installed verifier is required
immediately before the privileged pre-exec boundary. CI deliberately makes the
installed pre-exec mode 0777 and proves that external admission rejects it
before restoring the protected generation.

The child receives a minimal environment. Caller loader variables are not
forwarded.

## Nonclaims

This is an authenticated **retirement snapshot**, not durable proof that the
ordinary user can never reactivate a historical connector.

The source therefore keeps:

- `future_restart_prevented=false`;
- `historical_user_tunnel_retirement_verified=false`;
- the snapshot itself does not prove production-host installation, runtime
  integration or external acceptance; the create-only installer is source
  authority only until separately authorized on the designated host.

A later #2984 composition must combine this snapshot with the reviewed
config/credential custody, dedicated system-service identity, nftables/listener
evidence, Cloudflare control-plane evidence and external acceptance before
promoting live retirement/local transport trust.

No credential contents, private keys, payment data, Work Credit state, signer,
transaction, presale/market or funds authority is introduced.
