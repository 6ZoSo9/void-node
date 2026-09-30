# Xiphos VOID node onboarding v1

Marker: `VOID_XIPHOS_NODE_ONBOARDING_V1`

Status captured: 2026-09-26 America/Chicago.

## Role

Xiphos is the fourth project-operated VOID host. It is a non-canonical follower
and must not inherit wallet, validator, treasury, ceremony, deployer, or
constitutional-authority material from another machine.

Current fleet note (2026-09-30): Alienware is retired. The active operator fleet is
Precision, Nimo, and Xiphos. The “fourth host” wording above records onboarding
chronology, not current active-fleet cardinality.

Current runtime profile:

- repository: `~/dev/void-node`;
- service: user-systemd `void-node-live.service`;
- HTTP: loopback-only `127.0.0.1:4102`;
- P2P: `0.0.0.0:4702`;
- data directory: `data_xiphos`;
- node identity: fresh local `.nodekey`, mode `0600`;
- runtime: repository-pinned Node.js 24 from `.runtime/clone-run-v1`;
- public bootstrap: HTTPS required;
- remote administration: SSH over the operator tailnet;
- user lingering: enabled.

Do not commit the machine's private Tailscale address or private SSH material.

## Source/runtime boundary

Xiphos was prepared from canonical `main` using:

```bash
./run-void-node.sh prepare
```

The persistent service intentionally executes the canonical launcher directly:

```text
ExecStart=/home/zoso/dev/void-node/run-void-node.sh run
```

Do not replace this with `ops/install-void-node-live-user-service-v1.sh` unless
that installer is first made compatible with the repository-local Node runtime.
The older live-service wrapper resolves `node` from the host PATH; a clean
Xiphos install deliberately has no global Node requirement.

## Synchronization state

At onboarding, HTTPS bootstrap trust was verified and renewed and the public
bootstrap adapter became active. The node began importing history in bounded
999-block batches from canonical remote head `1951058`.

Observed during initial catch-up:

- service active/running with zero restarts;
- HTTP listener on `127.0.0.1:4102`;
- P2P listener on `0.0.0.0:4702`;
- `/health` returned `ok=true`;
- fresh node id was created locally;
- historical head advanced continuously;
- `txroot_live=0` while catch-up remained incomplete;
- Tor introduction attempts failed because no local SOCKS listener exists on
  `127.0.0.1:9050`, but HTTPS bootstrap remained active.

Do not install or enable Tor merely to silence those retries unless Xiphos is
deliberately promoted into a Tor-capable role.

## Precision access

Precision uses a dedicated SSH identity and a local operator alias named
`xiphos`. Fleet tooling should refer to the alias, not embed an address or key
path in committed configuration.

Required proof shape:

```bash
ssh -o BatchMode=yes xiphos 'hostname; id -un'
```

Expected host/user:

```text
Xiphos
zoso
```

## Readiness

A fresh follower may expose HTTP while historical catch-up is still active.
Do not interpret an HTTP response alone as convergence.

Before classifying Xiphos as fully synchronized, verify current runtime evidence
including:

```bash
curl -fsS http://127.0.0.1:4102/__void/ready.json
curl -fsS http://127.0.0.1:4102/health
```

The operator should compare the local head with current canonical head/source
evidence. Fleet `CURRENT` requires `ready=true`, `gap=0`,
`txroot_live=1`, and at least one connected peer before convergence can be
claimed.

## Fleet-audit admission

The local Precision fleet config may add Xiphos with:

```json
{
  "name": "xiphos",
  "transport": "ssh",
  "ssh_target": "xiphos",
  "repo": "~/dev/void-node",
  "service": "void-node-live.service",
  "http_base": "http://127.0.0.1:4102",
  "min_peers": 1
}
```

Keep the peer floor at one during the initial catch-up state. Catch-up remains
`HOLD` until a live peer is observed and the complete readiness contract is
green; do not use a zero peer floor to convert onboarding into `CURRENT`.

## Authority boundary

Xiphos onboarding grants no wallet/signer/validator/treasury/Work Credit or
economic mutation authority and moves no funds.
