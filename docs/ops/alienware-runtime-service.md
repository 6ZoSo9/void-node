# Alienware Runtime Service — Historical Record

Status: retired historical evidence
Current authority: none
Mutation: documentation/proof only

VOID_RETIRED_ALIENWARE_RUNTIME_SERVICE_HISTORY_V1

Alienware is permanently retired and is not part of the active VOID operator fleet.
The service/restart details below are preserved only as dated operational evidence.
Do not execute these commands as current operations.

## Historical summary

At the recorded checkpoint, Alienware ran the VOID node as a user-level systemd
service rather than a system-level service.

Historical restart path:

    systemctl --user restart void-node.service

Historical incorrect restart path:

    sudo systemctl restart void-node.service

The system-level command failed on Alienware because there was no system-level
`void-node.service` unit.

## Historical user services

The recorded expected user services were:

- void-node.service
- void-wc-relayer.service
- void-workcredits-devnet-http.service

## Historical runtime process

Alienware started the node through:

    npm exec tsx src/index.ts

The node owned ports:

- 4100
- 4700

## Proof history

The user-service restart path was proven after the VOID native web-hosting
current-plan checkpoint:

- checkpoint: ckpt-void-native-web-hosting-current-plan-green-20260530-205937
- head: 75d26150
- restart command: systemctl --user restart void-node.service
- result: service active
- ready: true
- gap: 0
- txroot_live: 1
- cross-box smoke: passed

These facts describe that historical observation window only. They do not restore
Alienware to the active fleet and do not authorize restart, SSH, Funnel, update,
or deployment activity.

## Required markers

VOID_ALIENWARE_USER_SERVICE_RESTART_V1
VOID_ALIENWARE_NO_SYSTEM_SERVICE_RESTART_V1
VOID_ALIENWARE_RUNTIME_SERVICE_DOC_V1
VOID_RETIRED_ALIENWARE_RUNTIME_SERVICE_HISTORY_V1
