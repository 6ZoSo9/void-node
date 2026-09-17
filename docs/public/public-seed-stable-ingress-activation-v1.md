# VOID stable public-seed ingress activation v1

Status: source-only deployment, qualification, and outside-machine acceptance lane. No service, DNS record, public endpoint, or bootstrap manifest is activated by this source change.

Issue #1005 requires a stable public HTTPS seed that exposes only the restricted read gateway, plus an ordinary-machine clone/run proof from outside the operator Tailnet. PR #1011 defines the server qualification contract, and PR #1013 defines the client and catch-up contract. This lane makes the remaining activation steps reproducible without storing credentials in the repository or placing a tunnel token in process arguments.

## Chosen ingress shape

The first stable ingress packet uses a locally managed named tunnel with an operator-controlled public hostname. It maps exactly one hostname to:

```text
https://<stable-hostname>
        |
        v
named HTTPS tunnel
        |
        v
http://127.0.0.1:4111
        |
        v
VOID restricted public seed gateway v1
        |
        v
http://127.0.0.1:4100
```

The final tunnel ingress rule is always:

```text
service: http_status:404
```

The hostname is an operator input. This lane does not assume `voidchain.io`, `seed.voidchain.io`, a temporary tunnel provider, a public IP address, a Tailnet address, or a plaintext HTTP endpoint.

## Credential boundary

The tunnel credentials JSON is created and stored outside the repository. Packet generation rejects credentials anywhere inside the repository, including ignored files, and requires the filename to match `<tunnel-id>.json`. The packet output directory must also remain outside the repository. Packet generation and verification require the credentials file to be:

- one regular non-symlink file;
- addressed by a canonical absolute path; and
- mode `0400` or `0600`, with no executable, group, or other permission bits.

The packet builder and verifier inspect only file metadata. They do not parse, print, copy, hash, upload, or commit the credentials contents. The generated service runs the tunnel from `cloudflared-config.yml` and a credentials-file reference. It never places a tunnel token on the command line.

## Exact-source packet generation

On the intended seed host, start from one clean exact checkout containing the merged server, client, and activation source.

The local VOID node must already serve exact-green readiness on `127.0.0.1:4100`. Provide an installed `cloudflared` executable and an existing locally managed tunnel credentials file.

Example:

```bash
EXPECTED_HEAD="$(git rev-parse HEAD)"
HOSTNAME="seed.example.org"
TUNNEL_ID="6ff42ae2-765d-4adf-8112-31c55c1551ef"
CREDENTIALS="$HOME/.cloudflared/$TUNNEL_ID.json"
PACKET="$HOME/.config/void/public-seed-ingress-v1/packet-$EXPECTED_HEAD"

node scripts/build_void_public_seed_named_tunnel_packet_v1.mjs \
  --hostname "$HOSTNAME" \
  --tunnel-id "$TUNNEL_ID" \
  --credentials-file "$CREDENTIALS" \
  --repo-root "$PWD" \
  --expected-head "$EXPECTED_HEAD" \
  --cloudflared "$(command -v cloudflared)" \
  --output "$PACKET"
```

The builder requires:

- the exact 40-character repository head;
- a completely clean checkout, including untracked files;
- one real repository directory;
- exact regular non-symlink Node.js, cloudflared, gateway-source, and credentials files;
- a stable fully qualified hostname outside local, onion, IP-literal, and temporary-provider namespaces;
- an exact canonical tunnel UUID;
- successful gateway syntax validation; and
- successful `cloudflared tunnel ingress validate` for the generated configuration.

The content-addressed packet records SHA-256 hashes for the executable inputs and every generated non-secret file. Packet generation does not start services or alter DNS.

## Packet review and installation

Review:

```text
packet.json
cloudflared-config.yml
void-public-seed-gateway-v1.service
void-public-seed-named-tunnel-v1.service
INSTALL.txt
```

The installer has three deliberately separated lifecycle states. `VOID_PUBLIC_SEED_ENABLE_AUTOSTART=1` is rejected unless `VOID_PUBLIC_SEED_START_SERVICES=1` is also present.

### Inert staging

Verify and copy the units without starting them or leaving future autostart state:

```bash
VOID_PUBLIC_SEED_START_SERVICES=0 \
VOID_PUBLIC_SEED_ENABLE_AUTOSTART=0 \
  bash ops/public/install_void_public_seed_named_tunnel_packet_v1.sh "$PACKET"
```

The installer reruns packet verification against current source, executable hashes, credential metadata, the local exact-green node, generated ingress rules, and gateway syntax. Before a `START_SERVICES=0` staging pass it refuses to proceed if either target unit is already active. It then installs the two user service units, reloads the user manager, and explicitly removes any enablement links so the staged units remain inactive and disabled.

### Disabled live canary

Start and prove the services while keeping them disabled for future autostart:

```bash
VOID_PUBLIC_SEED_START_SERVICES=1 \
VOID_PUBLIC_SEED_ENABLE_AUTOSTART=0 \
  bash ops/public/install_void_public_seed_named_tunnel_packet_v1.sh "$PACKET"
```

Every installation pass first removes durable enablement. The installer then starts the loopback gateway, proves its exact-green read-only boundary, starts the named tunnel, and requires the tunnel to remain active. The units may be live after this canary, but they remain disabled for future automatic startup.

### Durable activation

Commit autostart only after the same live activation checks pass:

```bash
VOID_PUBLIC_SEED_START_SERVICES=1 \
VOID_PUBLIC_SEED_ENABLE_AUTOSTART=1 \
  bash ops/public/install_void_public_seed_named_tunnel_packet_v1.sh "$PACKET"
```

The installer enables both user units only after the gateway proof and named-tunnel active check succeed. This prevents a failed or unqualified staging run from leaving a durable future-start condition.

Before starting the named tunnel, the installer proves the loopback gateway:

```text
ready=true
head>0
gap=0
txroot_live=1
x-void-public-seed-gateway=v1
/admin -> 404 route_not_public
POST /follower/start -> 405 method_not_allowed
```

No public bootstrap claim exists merely because the local services started or became enabled. Public DNS, TLS, hostname routing, multi-sample qualification, and outside-machine synchronization must still pass.

## Live qualification workflow

The workflow `VOID public seed live qualification v1` is manual-only. It accepts:

```text
endpoint=https://<stable-hostname>
expected_source_sha=<exact reviewed source SHA>
```

It performs three public observations over at least 60 seconds, using the DNS-pinned qualification contract from PR #1011. It produces an artifact containing:

```text
qualification.json
public-bootstrap-v1.json
source.txt
SHA256SUMS
```

The candidate manifest remains an artifact. The workflow cannot commit, deploy, modify DNS, access tunnel credentials, or publish the manifest.

A separate exact-scope review must replace the checked-in hold manifest with the builder's unmodified candidate output.

## Outside-machine acceptance workflow

After the stable manifest is merged and publicly reachable, manually run `VOID public bootstrap outside-machine acceptance v1` with:

```text
manifest_url=<published canonical HTTPS manifest URL>
expected_source_sha=<exact merged source SHA>
```

A fresh GitHub-hosted Ubuntu machine then executes the normal root launcher with:

```text
VOID_PUBLIC_BOOTSTRAP_REQUIRE=1
```

It starts from no `.runtime`, `node_modules`, build, `.env`, node identity, or data directory. Acceptance requires sustained evidence of:

```text
public_bootstrap=resolved_stable_https_seed
public_sync_via_loopback_adapter=true
tailnet_required=false
direct_remote_fetch_from_node=false
ready=true
head>0
gap=0
txroot_live=1
private_configuration_required=false
private_mutation_routes_exposed=false
wallet_authority=false
signer_authority=false
validator_authority=false
treasury_authority=false
work_credit_authority=false
money_movement_authority=false
```

The workflow uploads only sanitized logs, readiness JSON, source identity, and SHA-256 sums. It does not upload `.env`, node identity, credentials, data files, wallets, or secrets.

## Closure boundary

Issue #1005 remains open until all of these are true against exact merged source:

1. the stable hostname resolves publicly and serves valid HTTPS;
2. the named tunnel and restricted gateway remain durable;
3. a fresh three-sample qualification receipt is green;
4. the exact generated stable manifest is reviewed, merged, and publicly reachable;
5. the outside-machine workflow reaches sustained nonzero exact-green synchronization; and
6. private mutation and economic authority remain absent.

This lane does not authorize service activation, DNS changes, manifest publication, issue closure, credential access, wallet or signer use, validator changes, Work Credit mutation, or fund movement.

## Checkpoint publication binding

Checkpoint publication reuses the same stable named-tunnel ingress. It does not
add another hostname, trust root, public listener, DNS record, or proxy layer.

The ordinary stable-ingress packet builder remains unchanged for deployments
that do not publish a checkpoint. To bind an independently accepted checkpoint
packet into the gateway service, use the checkpoint composition builder:

```bash
node scripts/build_void_public_checkpoint_named_tunnel_packet_v1.mjs \
  --hostname "$HOSTNAME" \
  --tunnel-id "$TUNNEL_ID" \
  --credentials-file "$CREDENTIALS" \
  --repo-root "$PWD" \
  --expected-head "$EXPECTED_HEAD" \
  --cloudflared "$(command -v cloudflared)" \
  --output "$PACKET" \
  --checkpoint-packet "$CHECKPOINT_PACKET"
```

The checkpoint packet must be one canonical real directory outside the
repository. Before the stable-ingress packet is emitted, the composition
builder runs `tools/void-public-checkpoint-publication-preflight-v1.mjs`
against the packet. That preflight must independently establish:

- canonical checkpoint semantics;
- exact Mainnet-0 restart-authority coverage;
- the accepted raw `checkpoint.json` descriptor SHA-256;
- the exact checkpoint ID and source SHA; and
- the root / checkpoint-ID / manifest-SHA256 gateway tuple.

Only that derived tuple is embedded into the generated loopback gateway unit as:

```text
VOID_PUBLIC_SEED_CHECKPOINT_ROOT
VOID_PUBLIC_SEED_CHECKPOINT_ID
VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256
```

The checkpoint-specific verifier reruns the independent publication preflight
against current bytes and requires the three generated systemd environment
lines to match it exactly. The installer invokes that verifier after the
ordinary stable-ingress verifier, so a packet with a coherently rehashed but
substituted checkpoint binding is still rejected.

This composition step does not start services or alter DNS. It does not publish
the checkpoint merely by creating the packet. Activation remains a separate
explicit operator action through the existing three-state installer lifecycle:
inert staging, disabled live canary, then durable activation. Public HTTPS
checkpoint acceptance still requires an external fetch of discovery,
`checkpoint.json`, and segment bytes after activation.


## Checkpoint clean-environment compatibility

An already-running seed host may have a local hardening drop-in whose
`UnsetEnvironment=` denylist includes the three checkpoint variables. systemd
applies `UnsetEnvironment=` after `Environment=`, so those host-local removals
can mask an otherwise valid checkpoint-bound gateway packet.

Do not remove that hardening wholesale. Compose the reviewed checkpoint packet
with the exact host-local clean-environment drop-in:

```bash
node scripts/compose_void_public_checkpoint_environment_compat_packet_v1.mjs \
  --packet "$CHECKPOINT_BOUND_PACKET" \
  --clean-environment-dropin \
    "$HOME/.config/systemd/user/void-public-seed-gateway-v1.service.d/90-void-nullfeed-clean-environment.conf" \
  --output "$CHECKPOINT_HOST_PACKET"
```

The compatibility binding records the exact source drop-in path and SHA-256,
its mode, the original and preserved unset counts, a SHA-256 over the preserved
name sequence, and the exact three checkpoint names released from that
denylist. The 21 preserved variable names themselves are not copied into
`packet.json`.

Immediately before installation, the renderer re-reads the bound source
drop-in and requires the same SHA-256 and semantic counts. It emits a managed
later drop-in:

```text
[Service]
UnsetEnvironment=
UnsetEnvironment=<the original non-checkpoint names in original order>
```

The empty first assignment resets the earlier `UnsetEnvironment=` list; the
second assignment restores every original non-checkpoint removal. Only
`VOID_PUBLIC_SEED_CHECKPOINT_ROOT`, `VOID_PUBLIC_SEED_CHECKPOINT_ID`, and
`VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256` are released.

If the loaded user-service environment still unsets a checkpoint name and the
packet lacks a valid compatibility binding, installation fails before unit
replacement. After `daemon-reload`, a compatibility-bound installation also
requires the checkpoint names to be absent from merged `UnsetEnvironment` and
present in merged `Environment` before service restart.

For an ordinary non-checkpoint packet the installer removes the managed
`99-void-public-seed-checkpoint-environment.conf` before `daemon-reload`,
restoring the original host-local denylist for rollback.

Compatibility composition itself does not reload systemd, start services,
change DNS, publish checkpoint bytes, or read tunnel credential contents.
