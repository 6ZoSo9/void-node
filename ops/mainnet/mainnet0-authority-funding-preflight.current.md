# VOID Mainnet-0 Authority and Funding Preflight

status: plan_only_not_execution
launch_state: not_go_for_public_mainnet0
launch_approval: false
mutation_allowed: false
funding: false
authority_transfer: false
money_step: last

## Purpose

This document defines the future authority-transfer and funding preflight lane.

This is not launch approval.
This does not fund any wallet.
This does not transfer AdminGate authority.
This does not transfer UpdateGate authority.
This does not mutate contracts.
This does not enable public active validator admission.
This does not execute Buy VOID fulfillment.

## Completed prerequisites

- Key ceremony public addresses are recorded.
- Key ceremony public artifact is gitleaks-clean.
- VOIDKEY2 encrypted backup receipt is recorded.
- Post-key-backup launch checklist is green.
- Precision and Alienware are both ready.
- Launch remains NO-GO.

## Future authority-transfer preflight requirements

Before any authority transfer can happen:

- The exact target contract must be named.
- The exact current owner/admin must be recorded.
- The exact new public address must be recorded.
- The exact transaction command must be written in dry-run form first.
- The dry-run proof must pass.
- The live transaction must require a separate explicit operator intent string.
- The live transaction must be recorded by tx hash after execution.
- Launch approval must remain separate.

## Future funding preflight requirements

Before any funding can happen:

- The exact source wallet must be named.
- The exact destination wallet must be named.
- The exact asset and amount must be recorded.
- The exact transaction command must be written in dry-run form first.
- The dry-run proof must pass.
- The live transaction must require a separate explicit operator intent string.
- The live transaction must be recorded by tx hash after execution.
- Funding must not imply launch approval.

## Current decision

NO-GO.
