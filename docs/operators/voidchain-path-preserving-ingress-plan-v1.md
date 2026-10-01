# voidchain.org path-preserving ingress plan v1

Marker: `VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1`

Status: **inert source/review packet only**. This lane does not install or start a
tunnel, modify DNS/TLS, reload systemd, change Tailscale/Funnel routing, restart
the node, or claim independent public acceptance.

This is a bounded current-main source slice of #1614. Live installation,
failure-atomic rollback, DNS/TLS activation, and external path-preservation
acceptance remain later reviewed gates.

## Current public topology

The packet binds the current reviewed Precision web source generation:

```text
VOID node       127.0.0.1:4100
                    |
                    v
public adapter  127.0.0.1:8080
                    |
                    v
composition     127.0.0.1:8082
                    |
                    v
frontdoor       127.0.0.1:8083
```

The public ingress plan terminates at the current loopback frontdoor:

```text
https://voidchain.org/<original path and query>
        |
        v
named HTTPS tunnel
        |
        v
http://127.0.0.1:8083/<same original path and query>
        |
        v
VOID_PUBLIC_FRONTDOOR_V1
```

No Cloudflare ingress `path` rule is generated. No prefix is stripped and no
path rewrite is configured.

The source verifier also requires the frontdoor implementation to retain:

```text
path: req.url || "/"
```

for proxied requests. Therefore the public tunnel forwards the path/query to
the frontdoor, and the frontdoor forwards that same request URL to composition.

The only tunnel rules generated are:

```yaml
ingress:
  - hostname: voidchain.org
    service: http://127.0.0.1:8083
  - service: http_status:404
```

The final 404 rule prevents an unmatched hostname from falling through to a
private/local service.

## Readiness boundary

The plan does not equate "frontdoor process exists" with readiness.

It source-binds the current frontdoor contract from completed #1617. That
frontdoor serves:

```text
/__void/frontdoor/status.json
```

and sets its own `ready` true only when bounded current upstream evidence from
the composition gateway reports ready.

The source contract requires the current markers:

```text
VOID_PUBLIC_FRONTDOOR_V1
VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1
VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1
```

and loopback-only frontdoor binding.

## Precision recovery prerequisite

Current #1618 source defines the reviewed Precision topology and an independent
live-host observation contract.

This ingress packet records:

```text
precision_recovery_issue=1618
source_contract_present=true
independent_live_host_acceptance_required=true
independent_live_host_acceptance_claimed=false
```

Therefore source generation does not convert a structurally valid recovery
receipt into host acceptance.

A later installation/activation lane must consume a separately accepted current
#1618 host observation before changing ingress.

## Canonical source generation

Preparation requires:

- a completely clean repository;
- an exact caller-supplied 40-hex repository HEAD;
- canonical `6ZoSo9/void-node` origin identity;
- absolute reviewed `/usr/bin/git`;
- Git replacement objects disabled;
- ambient Git repository/config/program overrides removed/rejected; and
- exact `HEAD:<path>` blobs for the frontdoor, composition, adapter, current
  Precision recovery contract, frontdoor proof, and public HTML.

The planner reads those source inputs from Git object bytes rather than
executing their mutable worktree modules.

It performs semantic source checks for:

- frontdoor loopback bind;
- frontdoor port 8083;
- composition upstream port 8082;
- original-request-URL proxying;
- current bounded upstream readiness path/markers; and
- the reviewed 8080 -> 8082 -> 8083 Precision topology.

The planner itself imports only Node built-ins. It does not load application
modules or `node_modules`.

## Tunnel credential boundary

The tunnel credential file must be:

- an absolute canonical path;
- outside the repository;
- a regular non-symlink file;
- owned by the current user;
- mode 0400 or 0600;
- between 2 bytes and 2 MiB; and
- named exactly `<tunnel-id>.json`.

The packet does **not** read, hash, parse, print, copy, or embed credential
contents.

Instead it records a content-addressed metadata identity over:

- canonical path;
- tunnel ID;
- device/inode;
- size;
- mode;
- uid/gid; and
- mtime/ctime nanoseconds.

Verification re-reads that metadata. If the credential file is replaced,
rewritten, chmodded, or otherwise changes filesystem identity, the packet no
longer verifies and must be regenerated.

## cloudflared executable boundary

The planner never executes `cloudflared`.

The operator supplies:

- one canonical absolute executable path outside the repository; and
- an independently reviewed expected SHA-256.

The planner hashes the exact executable through a stable open file descriptor
with a 256 MiB ceiling and requires the SHA-256 to match. It records stable file
identity and `executed=false`.

A later install/activation review may additionally establish version/provider
provenance. This packet supplies exact executable-byte identity but does not
turn it into activation authority.

## Generated private packet

Preparation creates one new mode-0700 directory outside the repository and
create-only mode-0600 files:

```text
packet.json
cloudflared-config.yml
void-voidchain-ingress-v1.service
REVIEW.txt
```

The service unit is inert packet material. It is not copied to a systemd unit
directory and is not started.

It contains:

```text
After/Wants=network-online.target void-public-frontdoor-v1.service
--no-autoupdate
--config <exact packet config>
tunnel run <exact tunnel UUID>
```

No tunnel token or credential contents appear on the command line.

Verification reconstructs the config, unit, and review text from the
content-addressed packet and requires exact bytes/mode/SHA-256.

## Deliberate HOLDs

The packet always records:

```text
packet_inert=true

install_plan_defined=false
rollback_plan_defined=false
services_started=false
unit_installed=false
dns_changed=false
tls_changed=false
tunnel_started=false
public_ingress_qualified=false
external_path_preservation_accepted=false

installation_authorized=false
ingress_activation_authorized=false
independent_public_acceptance=false
```

Those are intentional.

#1614 must not close from this plan alone. The next source lane must define a
failure-atomic install/rollback transaction that preserves unrelated service
and routing state. Only after current #1618 independent host acceptance may a
separately authorized live lane install/start the named tunnel and change
DNS/TLS. External qualification must then prove representative non-root paths
arrive unchanged through `https://voidchain.org`.

## CLI

Prepare:

```bash
HEAD="$(git rev-parse HEAD)"
TUNNEL_ID="<canonical UUID>"
CREDENTIAL="$HOME/.cloudflared/$TUNNEL_ID.json"
CLOUDFLARED="$(command -v cloudflared)"
CLOUDFLARED_SHA256="$(sha256sum "$CLOUDFLARED" | awk '{print $1}')"

node tools/void-voidchain-path-preserving-ingress-plan-v1.mjs \
  prepare \
  --tunnel-id "$TUNNEL_ID" \
  --credentials-file "$CREDENTIAL" \
  --cloudflared "$CLOUDFLARED" \
  --expected-cloudflared-sha256 "$CLOUDFLARED_SHA256" \
  --expected-head "$HEAD" \
  --output "$HOME/.config/void/voidchain-ingress-plan-$HEAD"
```

Verify:

```bash
node tools/void-voidchain-path-preserving-ingress-plan-v1.mjs \
  verify \
  --packet "$HOME/.config/void/voidchain-ingress-plan-$HEAD"
```

The example SHA command is an operator convenience only. Independent executable
review remains a separate decision.

## Authority

```text
source_only_plan=true
canonical_git_source_binding_required=true
exact_frontdoor_source_required=true
path_preservation_required=true
external_cloudflared_sha256_required=true
credential_metadata_binding_required=true
credential_content_read=false
create_only_private_packet_write=true
precision_recovery_independent_acceptance_required=true

repository_write=false
cloudflared_execution=false
network_call=false
dns_mutation=false
tls_mutation=false
systemd_install=false
systemd_reload=false
service_start=false
routing_mutation=false
tailscale_or_funnel_mutation=false
node_restart=false
credential_content_access=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_broadcast=false
validator_mutation=false
work_credit_mutation=false
funds_movement=false
installation_authorized=false
ingress_activation_authorized=false
independent_public_acceptance=false
```
