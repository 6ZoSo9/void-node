# VOID public internet bootstrap acceptance v1

Status: launch blocker.

A VOID node is not publicly adoptable when joining requires Tailscale, a VPN, private 100.x addresses, Tailnet admission, router changes on the participant machine, or manual operator coordination.

## Required user experience

From an ordinary fresh Linux machine on the public internet:

```bash
git clone https://github.com/6ZoSo9/void-node.git
cd void-node
./run-void-node.sh
```

That path must, without additional network membership or private configuration:

1. obtain a public bootstrap manifest over HTTPS;
2. discover at least one stable VOID-owned public seed hostname;
3. connect or synchronize through a public internet transport;
4. advance above head zero;
5. reach `gap=0` and `txroot_live=1` when the seed is healthy; and
6. preserve a local-only HTTP listener unless the participant explicitly enables public exposure.

## Forbidden onboarding dependencies

The default public path must not require:

- Tailscale installation or login;
- Tailnet sharing or device approval;
- private `100.x` addresses;
- a VPN;
- SSH access;
- participant-side router configuration or port forwarding;
- copying operator IP addresses into `.env`;
- wallet, validator, treasury, or authority keys; or
- contact with the operator before first synchronization.

## Public seed contract

The bootstrap manifest must be available through a stable VOID-owned HTTPS name such as `https://seed.voidchain.io/` and must publish:

- network name and chain ID 2050;
- one or more public seed endpoints;
- supported transport and protocol version;
- readiness and current head;
- expiration/freshness metadata;
- blocked private surfaces; and
- an explicit statement that private JSON-RPC, wallet, validator-admin, treasury, and operator mutation routes are not public.

The launcher must fail clearly when no public seed is available. It must not silently fall back to private Tailnet addresses.

## Acceptance proof

The lane is green only after one external machine that is not on the operator Tailnet completes the clone/run path, remains alive, synchronizes from the public seed, and produces a sanitized proof containing:

- no Tailscale process or Tailnet address dependency;
- exact repository commit;
- discovered public seed hostname;
- nonzero head;
- `gap=0`;
- `txroot_live=1`;
- at least one public transport connection or successful public HTTP synchronization source; and
- no wallet, signer, validator, treasury, Work Credit, or money-moving authority.
