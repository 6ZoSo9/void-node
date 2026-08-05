# Public Earn gateway service binding v1

Marker: `VOID_PUBLIC_EARN_GATEWAY_SERVICE_BINDING_V1`

## Problem fixed

The public seed adapter already supports a separate
`VOID_EARN_COORDINATOR_UPSTREAM`, but the maintained systemd installer did not
write that variable into the service unit. A service installed through that path
could serve public-node routes while reporting Public Earn as disabled.

This lane binds the earning upstream through:

- `ops/public/run-public-seed-adapter-v1.sh`;
- `ops/public/install-vps-public-seed-adapter-v2.sh`; and
- `ops/public/deploy-vps-public-seed-adapter-v2.sh`.

It also adds a guarded Precision/local installer for a loopback-only gateway.

## Local installation

The local installer uses these defaults:

```text
VOID_SEED_UPSTREAM=http://127.0.0.1:4100
VOID_EARN_COORDINATOR_UPSTREAM=http://127.0.0.1:4100
VOID_ADAPTER_HOST=127.0.0.1
VOID_ADAPTER_PORT=4111
```

Install the unit without enabling or starting it:

```bash
bash ops/public/install-local-public-earn-gateway-v1.sh
```

The default invocation writes a mode-600 user unit, reloads the user systemd
manager, and exits with:

```text
VOID_LOCAL_PUBLIC_EARN_GATEWAY_INSTALLER_V1 INSTALLED_DISABLED
```

It does not enable or start the service.

## Enable without starting

```bash
ENABLE_SERVICE=1 \
START_SERVICE=0 \
CONFIRM=activate-loopback-public-earn-gateway-v1 \
bash ops/public/install-local-public-earn-gateway-v1.sh
```

This preserves an explicit separation between installation and runtime
activation.

## Guarded activation

```bash
ENABLE_SERVICE=1 \
START_SERVICE=1 \
CONFIRM=activate-loopback-public-earn-gateway-v1 \
bash ops/public/install-local-public-earn-gateway-v1.sh
```

Before starting, the installer requires the private coordinator upstream to
prove:

- a valid 32-character node identity;
- the `VOID_WC_PUBLIC_EARNING_PILOT_V1` marker;
- coordinator role enabled;
- executor role disabled;
- fixed award exactly **3 WC**;
- public claim enabled and available;
- server-selected work only;
- participant-selected dataset, input hash, and award disabled; and
- money movement disabled.

After start, it requires the loopback gateway at `127.0.0.1:4111` to report
`VOID_PUBLIC_EARN_GATEWAY_V1`, then runs the maintained read-only coordinator
readiness gate with `--require-ready`.

If any condition fails, activation stops rather than exposing a misleading or
partially configured earning surface.

## Network boundary

The local service is hard-bound to `127.0.0.1`. Supplying `0.0.0.0`, a public
address, or public plain-HTTP upstream is rejected. External HTTPS publication
remains a separate proxy or tunnel lane.

The user unit contains only reviewed public origins, host, and port. It does not
reference an environment file and does not request a wallet, signer, private
key, seed phrase, mnemonic, payment credential, treasury key, or validator key.

## VPS path

The VPS installer and deploy wrapper now accept:

```text
VOID_EARN_COORDINATOR_UPSTREAM=http://PRIVATE-OR-TAILNET-COORDINATOR:4100
```

When that value is set, the deploy smoke test requires the gateway status to
report `enabled=true`. When omitted, the adapter remains a public-seed-only
service and does not falsely claim earning availability.

## Proof

```bash
node scripts/prove_public_earn_gateway_service_binding_v1.mjs
```

The proof checks:

- shell syntax;
- run-wrapper variable forwarding;
- VPS unit and deploy-wrapper binding;
- loopback-only local unit generation;
- mode-600 unit permissions;
- disabled-by-default behavior;
- exact activation confirmation;
- no systemd mutation after a denied confirmation;
- rejection of public binding and public plain-HTTP upstreams;
- Node.js 22 and GitHub Actions v6; and
- no wallet, signing, ticket, WC-write, settlement, or fund-movement authority.
