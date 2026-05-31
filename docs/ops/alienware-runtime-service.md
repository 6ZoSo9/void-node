# Alienware Runtime Service

Status: current operational truth
Mutation: documentation/proof only

## Summary

Alienware runs the VOID node as a user-level systemd service, not as a system-level service.

Correct restart path:

    systemctl --user restart void-node.service

Incorrect restart path:

    sudo systemctl restart void-node.service

The system-level command fails on Alienware because there is no system-level void-node.service unit.

## Current user services

Expected active user services:

- void-node.service
- void-wc-relayer.service
- void-workcredits-devnet-http.service

## Runtime process

Alienware starts the node through:

    npm exec tsx src/index.ts

The node owns ports:

- 4100
- 4700

## Proof history

The user-service restart path was proven after the VOID native web-hosting current-plan checkpoint:

- checkpoint: ckpt-void-native-web-hosting-current-plan-green-20260530-205937
- head: 75d26150
- restart command: systemctl --user restart void-node.service
- result: service active
- ready: true
- gap: 0
- txroot_live: 1
- cross-box smoke: passed

## Required markers

VOID_ALIENWARE_USER_SERVICE_RESTART_V1
VOID_ALIENWARE_NO_SYSTEM_SERVICE_RESTART_V1
VOID_ALIENWARE_RUNTIME_SERVICE_DOC_V1
