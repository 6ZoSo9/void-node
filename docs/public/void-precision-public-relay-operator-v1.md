# VOID Precision public relay operator v1

Status: reviewed source/operator lane. This source does not activate a host by itself.

## Purpose

Convert the externally proven Precision home-edge transport into one persistent VOID rendezvous relay without weakening the existing public-P2P authority boundaries.

The exact intended public endpoints are:

- authenticated TCP P2P: `24.40.99.171:4700`
- UDP rendezvous: `24.40.99.171:4711`

The relay identity remains:

`9d89483769e469e0473b489dc50dba96`

## Runtime configuration

`void-precision-public-relay-activate-v1.sh` installs a relay-runtime systemd drop-in and updates the existing terminal P2P advertisement truth file. Together they:

- bind P2P TCP on `0.0.0.0:4700`;
- change both `P2P_ADVERTISE_HOST` and `VOID_P2P_ADVERTISE_HOST` in `~VOID-P2P-ADVERTISEMENT-TRUTH-V1.conf` from the historical Tailnet value to the already externally proven public address `24.40.99.171`;
- leave the earlier `50-tailnet-p2p-advertise.conf` and public-friend history intact rather than deleting them;
- enables the existing authenticated TCP relay server;
- enables the UDP swarm runtime on `0.0.0.0:4711`;
- publishes `24.40.99.171:4711` as the UDP relay endpoint;
- keeps relay self-orchestration disabled;
- keeps the public relay-introduction collector disabled pending reviewed live discovery publication; and
- labels the reachability failure domain `precision-home-edge`.

The node identity key is unchanged. No wallet, validator, treasury, Work Credit, transaction, or money-moving authority is added.

## NAT-PMP lease

`void-public-relay-natpmp-v1.mjs` is a non-root user service. It:

1. requires the expected gateway `192.168.1.1`;
2. requires the expected interface `enp11s0`;
3. asks the gateway for its external IPv4 and requires exact `24.40.99.171`;
4. requests exact TCP `4700 -> 4700` and UDP `4711 -> 4711` NAT-PMP leases;
5. uses a 600-second lease and renews every 240 seconds;
6. refuses remapped external ports;
7. rechecks route/WAN identity before each renewal; and
8. deletes both mappings on normal SIGTERM/SIGINT.

If the helper crashes or the host loses power, its leases expire at the router rather than becoming permanent forwarding state.

## Firewall scope

The installer adds only:

- TCP `4700` inbound on `enp11s0`;
- UDP `4711` inbound on `enp11s0`.

Existing Tailscale-only management rules are not broadened. HTTP `4100`, SSH `22`, JSON-RPC `8545`, wallet/admin routes, and other ports are not made public by this lane.

## Host activation boundary

Activation is explicit and mutating. The installer:

- requires clean `main`;
- requires the existing live node identity and TCP/4700 listener;
- verifies NAT-PMP external-address support before mutation;
- refuses pre-existing conflicting public relay UFW/unit state;
- requires the existing `~VOID-P2P-ADVERTISEMENT-TRUTH-V1.conf` to contain exactly the two expected Tailnet advertisement assignments before changing it;
- saves the exact pre-change advertisement-truth bytes plus before/after evidence under `~/.local/share/void/public-relay-activation-v1/`;
- writes the public address into that existing advertisement-truth layer, then verifies systemd resolves both advertise variables to `24.40.99.171` before restarting the node;
- installs the bounded NAT-PMP lease service and exact UFW rules;
- restarts only `void-node-live.service`; and
- verifies the post-restart node ID, public HELLO listen address, UDP runtime role and port, collector state, sockets, and firewall rules.

An activation failure restores the exact backed-up advertisement-truth file, removes the newly added relay-runtime drop-in/unit and UFW rules, reloads systemd, and restarts the prior node configuration.

## External acceptance still required

Local GREEN is not public reachability acceptance. After activation, an independent external runner must re-prove:

- TCP `24.40.99.171:4700` reaches the exact VOID identity and now advertises `24.40.99.171:4700`;
- UDP `24.40.99.171:4711` receives an unsolicited external datagram and returns the expected response.

This host is one failure domain only. Issue #1005 still requires a second independently operated relay/failure domain and N-1 acceptance. The existing VPS/public-seed lane is the preferred candidate for that second relay.
