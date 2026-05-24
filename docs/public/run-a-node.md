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

Start the node using the project runtime command or installed user service for your environment.

Operator machines currently use a user service named:

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
