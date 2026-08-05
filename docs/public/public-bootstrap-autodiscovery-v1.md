# VOID public bootstrap autodiscovery v1

Status: source implementation and external-activation lane.

## Decision

The default onboarding transport is public HTTPS discovered through a small manifest committed to GitHub.

Tor Onion Service is a secondary mirror and censorship-resistant fallback. It is not the default because an onion address is reachable only through a Tor-capable client, while ordinary users should be able to run the standard clone command without first installing or configuring another network client.

## Participant experience

The intended participant path is:

```bash
git clone https://github.com/6ZoSo9/void-node.git
cd void-node
./run-void-node.sh
```

The launcher:

1. prepares the verified Node.js runtime and locked build;
2. reads `public/bootstrap/v1.json` through the canonical GitHub raw URL;
3. rejects expired, malformed, private, loopback, LAN, CGNAT, and Tailnet seed addresses;
4. probes the selected HTTPS seed for exact-green readiness and a positive head;
5. exports the selected seed only to the local node process; and
6. starts the existing bounded HTTP follower automatically.

No participant-side Tailscale login, Tailnet approval, VPN, SSH, router configuration, port forwarding, or `.env` peer editing is part of the default path.

## Public seed gateway

`tools/void-public-seed-gateway-v1.mjs` binds to loopback and proxies only the read surfaces required by the existing follower:

- `GET /__void/ready.json`
- `GET /blocks/latest/number2.json`
- `GET /head`
- `GET /__void/demo/summary.json`
- `GET /api/health`
- bounded `GET /blocks/range?from=...&to=...`

Every other path returns `404`. Every method other than `GET` and `HEAD` returns `405`.

The gateway does not expose follower control, P2P control, wallets, signers, validator mutation, Work Credit mutation, Buy VOID execution, treasury, operator, admin, filesystem, credential, or private JSON-RPC routes.

## First free external proof

On a healthy canonical node, run:

```bash
bash ops/public/run_void_public_seed_quick_tunnel_v1.sh
```

The helper:

- requires a local exact-green node;
- downloads the pinned Cloudflare `cloudflared` Linux AMD64 binary;
- verifies its exact SHA-256;
- starts the loopback-only read gateway;
- creates a free temporary Quick Tunnel;
- verifies the public readiness and head routes; and
- writes a candidate live manifest under `.runtime/public-seed-v1/`.

Keep the terminal open during the external proof. The temporary URL changes whenever the Quick Tunnel is recreated.

After the URL is verified, publish it in `public/bootstrap/v1.json` for the bounded external test. Replace it only with a stable public HTTPS seed hostname whose DNS, TLS, route boundary, availability, and outside-node synchronization have all been independently proven.

## Domain policy

`voidchain.io` is a replaceable legacy DNS alias, not the network identity and not a required bootstrap dependency. Earlier apex and public-route probes were unreliable, so this lane must not assume `voidchain.io`, `seed.voidchain.io`, Google Cloud DNS, or any other unproven custom domain is available.

The canonical discovery authority for this lane is the versioned GitHub manifest. A custom hostname may be added later as one independently verified endpoint without changing VOID identity, the manifest schema, or the participant command.

## Tor mirror

A Tor v3 Onion Service can map a generated onion address to the same loopback gateway without opening an inbound port or exposing the origin address. That is valuable for censorship resistance, fallback availability, and privacy.

The onion address belongs in `onion_endpoints` after its operator proof exists. The default resolver does not select it until a Tor-capable follower transport is implemented and proven. Publishing an onion address alone does not make ordinary Node.js HTTP requests Tor-aware.

## Current activation state

The committed manifest initially contains no enabled seed and reports `hold_no_public_seed`. That is deliberate: the launcher must not silently substitute private Tailnet addresses or claim public onboarding before the first public endpoint is live.

The lane becomes externally green only when a machine outside the operator Tailnet resolves the manifest, starts the node without private configuration, imports a nonzero head through the public gateway, and reaches `gap=0` and `txroot_live=1`.
