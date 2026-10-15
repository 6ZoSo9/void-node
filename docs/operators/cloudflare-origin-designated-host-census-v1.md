# Cloudflare origin designated-host census v1

Marker: `VOID_CLOUDFLARE_ORIGIN_DESIGNATED_HOST_CENSUS_V1`.

Issue: #2984.

Status: **read-only designated-host observer; never live acceptance by itself**.

## Purpose

The merged Cloudflare origin path now has reviewed source contracts for:

- Cloudflare visitor-IP translation into strict PROXY-v2;
- one loopback adapter runtime;
- one public-443 dispatcher;
- exact sensitive credential/Public Earn paths;
- dedicated service UID separation;
- root-owned local nftables isolation; and
- an all-five-Linux-capability-set-zero service posture.

Those source contracts do not prove the intended Precision host actually has that
shape. This census observes the current host without installing, starting,
stopping, rewriting or reconfiguring anything.

## Invocation boundary

The live census requires root **read visibility** because it binds:

- system service MainPID/process generations;
- complete `ss -ltnp` listener ownership;
- `/proc/<pid>/status` capability sets;
- private Tunnel config/credential **metadata**;
- nftables table metadata.

Root is observation authority only. The source contains no service/firewall/
Tunnel/DNS mutation path.

Modes:

    python3 -I -B ops/public/void_cloudflare_origin_designated_host_census_v1.py --self-test
    python3 -I -B ops/public/void_cloudflare_origin_designated_host_census_v1.py --plan
    sudo python3 -I -B ops/public/void_cloudflare_origin_designated_host_census_v1.py --run --tunnel-config /reviewed/private/cloudflared-config.yml

A later operator bundle should pin the exact reviewed source generation and its
SHA-256 before using `--run`.

## Historical user Tunnel observation

The ordinary `zoso` user-manager query is **informational only**. The census
may invoke `systemctl --user show` through a minimal environment to record what
the visible user bus reports, but that D-Bus pathname is controlled by the same
ordinary-user trust domain and is not authenticated systemd authority.

Accordingly the emitted historical snapshot always keeps:

- `query_authenticated=false`;
- `authority=untrusted_user_bus_shape_only`;
- `retired_candidate_observed=false`;
- `retirement_verified=false`.

Even an apparently inactive + disabled/masked user unit cannot promote the
retirement gate from this query. A fake same-UID user-bus response reporting a
retired unit is explicitly proved unable to promote retirement evidence.

A later retirement gate must use a separately reviewed root/kernel-anchored
manager/process identity or another host boundary that cannot be forged by the
ordinary user. Until then, `next_action` holds at
`HISTORICAL_USER_TUNNEL_AUTHORITY_HOLD` after the informational query.

## System service process identity

The census observes these system units:

- cloudflared: `void-public-seed-named-tunnel-v1.service`;
- adapter: `void-cloudflare-origin-proxy-v2-adapter-v1.service`;
- dispatcher: `void-public-443-proxy-v2-dispatch-v1.service`.

For each active process it binds MainPID plus Linux start ticks before and after
the observation window.

The running process status must show all five capability sets empty:

- effective (`CapEff`);
- permitted (`CapPrm`);
- inheritable (`CapInh`);
- ambient (`CapAmb`);
- bounding (`CapBnd`).

`NoNewPrivs=1` and absence of effective CAP_NET_ADMIN are also recorded.

The adapter and dispatcher running entry-script bytes are matched to the exact
reviewed Git blobs. Cloudflared is an external binary, so this census records
only process name plus root-owned/non-group-world-writable executable custody
and a digest of the executable path. It does **not** invent an accepted
cloudflared binary hash.

## Listener ownership

The observer reads one bounded `ss -H -ltnp` snapshot.

For adapter and dispatcher, a local listener candidate requires exactly one TCP
listener owned **exclusively** by the service PID and it must be IPv4 loopback
`127.0.0.1:<port>`. If the same `ss` listener row names any second process
PID, ownership is shared and the candidate fails closed. Any extra or IPv6
listener also keeps the candidate false.

The adapter port is derived from that owned listener; no process environment is
read.

## Tunnel config and credential metadata

The census does **not** read cloudflared's process command line. Live `--run`
requires one operator-reviewed absolute canonical Tunnel config path through
`--tunnel-config`. This avoids ingesting a possible cloudflared `--token`
or other credential-bearing argv merely to discover the config location.

The config text may be read, bounded to 1 MiB, to classify the fixed
`seed.nullfeed.org` route shape. Custody metadata and parsed bytes come from
one retained `O_NOFOLLOW` descriptor generation opened relative to one retained
parent-directory descriptor. The initial visible file/parent generation, opened
file/parent generation, post-read descriptor generation, and final visible
file/parent generation must all match before route or custody evidence is
accepted. A config pathname swap therefore fails closed instead of mixing
custody facts from one inode with route bytes from another. The emitted evidence
contains only a SHA-256 of the config bytes and classification booleans; it does
not print the config, Tunnel ID or path.

The canonical v1 sensitive candidate is deliberately strict: three explicit
seed-host rules, one for each sensitive path, all to one IPv4-loopback adapter
port. Because cloudflared interprets the `path` field as a regular expression,
each sensitive path must be the exact anchored form `^<path>$`; an unanchored
raw path is rejected because it can match longer request-path prefixes. Each
rule also requires:

- `httpHostHeader: seed.nullfeed.org`;
- `disableChunkedEncoding: true`.

Cloudflared evaluates ingress rules from top to bottom and uses the first match.
The three sensitive rules must therefore appear before exactly one ordinary
`seed.nullfeed.org` rule with no path. An ordinary seed rule placed first would
shadow every later sensitive path and now fails the census.

A wildcard hostname that can match `seed.nullfeed.org` must not appear before
that ordinary seed rule, because it could likewise shadow the intended public
route. The configuration must also end with exactly one hostless/pathless global
catch-all rule, as required by cloudflared ingress semantics.

The ordinary seed rule must target a service other than the sensitive adapter so
the census does not treat a sensitive-only Tunnel configuration as preserving
the public site/read surface. Any additional exact seed-host rule makes the
canonical v1 rule set fail closed.

The config's `credentials-file` path is used for **metadata only**. Credential
contents are never read. The configured pathname itself must be canonical and
non-symlink; it is opened with Linux `O_PATH|O_NOFOLLOW` relative to a retained
parent-directory descriptor, then its file and parent generations are rebound
against the visible path before custody can qualify. Both config and credential
paths therefore bind owner/mode/link/immediate-parent custody to the exact
retained generation, and only path SHA-256 values are emitted.

## nftables boundary

The census may run:

`nft -j list table inet void_cloudflare_origin_edge_v1`

read-only and emit only table presence, rule count and SHA-256 of the returned
JSON.

It intentionally keeps:

`nftables_ruleset_live_verified=false`.

This version does not reinterpret nft JSON expression syntax as exact four-rule
policy authority. Exact rule semantics require a separate reviewed classifier or
content-addressed installed-rule evidence.

## Mandatory nonclaims

Even when `local_metadata_candidate_observed=true`, the following remain false:

- `cloudflare_worker_route_absence_proven`;
- `pseudo_ipv4_mode_off_proven`;
- `nftables_ruleset_live_verified`;
- `adapter_dispatcher_target_verified`;
- `cloudflared_uid_isolation_proven`;
- `dispatcher_exclusive_reachability_proven`;
- `local_transport_trust_proven`;
- `runtime_integration`;
- `external_acceptance`.

Cloudflare Worker-route and Pseudo-IPv4 state belong to a separate
control-plane evidence domain. The adapter's configured dispatcher target is
also not inferred from an idle listener or process environment.

## Privacy and authority

The census explicitly reports:

- `process_environment_access=false`;
- `raw_process_command_line_output=false`;
- `tunnel_config_text_output=false`;
- `credential_content_access=false`;
- all service/systemd/nftables/Tunnel/DNS/network mutation false;
- payment, Work Credit, presale and funds authority false.

PROTECT THE CORE.
