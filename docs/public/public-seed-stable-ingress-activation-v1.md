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

The final tunnel ingress rule is always `service: http_status:404`.

The hostname is an operator input. This lane does not assume `voidchain.io`, `seed.voidchain.io`, a temporary tunnel provider, a public IP address, a Tailnet address, or a plaintext HTTP endpoint.

## Credential boundary

The tunnel credentials JSON is created and stored outside the repository. Packet generation and verification require it to be one regular non-symlink file, addressed by a canonical absolute path, with mode `0600`.

The packet builder and verifier inspect only file metadata. They do not parse, print, copy, hash, upload, or commit the credentials contents. The generated service runs the tunnel from `cloudflared-config.yml` and a credentials-file reference. It never places a tunnel token on the command line.

## Exact-source packet generation

On the intended seed host, start from one clean exact checkout containing the merged server, client, and activation source. The local VOID node must already serve exact-green readiness on `127.0.0.1:4100`. Provide an installed `cloudflared` executable and an existing locally managed tunnel credentials file.

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

The builder requires the exact 40-character repository head, a completely clean checkout including untracked files, exact regular non-symlink inputs, a stable fully qualified hostname outside local/onion/IP-literal/temporary namespaces, a canonical tunnel UUID, gateway syntax success, and successful `cloudflared tunnel ingress validate`.

The content-addressed packet records SHA-256 hashes for the executable inputs and every generated non-secret file. Packet generation does not start services or alter DNS.

## Review and installation

Review:

```text
packet.json
cloudflared-config.yml
void-public-seed-gateway-v1.service
void-public-seed-named-tunnel-v1.service
INSTALL.txt
```

Install the units without starting them:

```bash
VOID_PUBLIC_SEED_START_SERVICES=0 \
  bash ops/public/install_void_public_seed_named_tunnel_packet_v1.sh "$PACKET"
```

Activation remains explicit:

```bash
VOID_PUBLIC_SEED_START_SERVICES=1 \
  bash ops/public/install_void_public_seed_named_tunnel_packet_v1.sh "$PACKET"
```

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

No public bootstrap claim exists merely because the local services started. Public DNS, TLS, hostname routing, multi-sample qualification, and outside-machine synchronization must still pass.

## Manual live qualification

The workflow `VOID public seed live qualification v1` accepts:

```text
endpoint=https://<stable-hostname>
expected_source_sha=<exact reviewed source SHA>
```

It performs three public observations over at least 60 seconds, using the DNS-pinned qualification contract from PR #1011. It produces an artifact containing `qualification.json`, `public-bootstrap-v1.json`, `source.txt`, and `SHA256SUMS`.

The candidate manifest remains an artifact. The workflow cannot commit, deploy, modify DNS, access tunnel credentials, or publish the manifest. A separate exact-scope review must replace the checked-in hold manifest with the builder's unmodified candidate output.

## Manual outside-machine acceptance

After the stable manifest is merged and publicly reachable, run `VOID public bootstrap outside-machine acceptance v1` with:

```text
manifest_url=<published canonical HTTPS manifest URL>
expected_source_sha=<exact merged source SHA>
```

A fresh GitHub-hosted Ubuntu machine executes the normal root launcher with `VOID_PUBLIC_BOOTSTRAP_REQUIRE=1`. It starts without `.runtime`, `node_modules`, build output, `.env`, node identity, or chain data.

Acceptance requires sustained evidence of:

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
