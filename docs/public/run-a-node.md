# Run a VOID Mainnet-0 Node

status: public_mainnet0_live
target: Linux first
windows_status: WSL2 supported path planned/documented, native Windows bundle later

VOID Mainnet-0 is intended to be run by serious participants on Linux first. Windows users should use WSL2 until a later packaged Windows/WSL bundle exists.

## Basic Linux path

    git clone https://github.com/6ZoSo9/void-node.git
    cd void-node
    npm install
    npm run build

Install and start the local user service:

    ./ops/install-user-units.sh

Check the service:

    systemctl --user status void-node.service

When the node is running, verify readiness:

    curl -fsS http://127.0.0.1:4100/__void/ready.json

A healthy Mainnet-0 node should report ready=true, gap=0, and txroot_live=1.

The participant page is served from the local node:

    http://127.0.0.1:4100/participant

## Desktop launcher

VOID has a Linux desktop launcher path for local operator/participant machines. The launcher starts/polls the node and opens the participant page when ready.

Existing launcher scripts live under:

    ops/desktop-linux/

## Windows users

For Mainnet-0, use WSL2. Native Windows packaging can come later. The serious-node path remains Linux-first.

## Safety

Do not expose private keys.
Do not paste seed phrases into chat, issue trackers, or public logs.
Do not run operator/admin commands unless you understand the proof lane.
Do not confuse public validator candidate/waiting registration with active validator admission.

## Network troubleshooting

If your local VOID node remains ready but the host machine loses internet access, use the public node network troubleshooting runbook:

- [Node network troubleshooting](node-network-troubleshooting.md)

The runbook covers interface, route, DNS, carrier-flap, NetworkManager, live-failure capture, non-reboot recovery, and physical cable or port troubleshooting. It is a documentation/support path only and does not mutate chain state, validator state, wallet state, Buy VOID state, or Work Credits state.
