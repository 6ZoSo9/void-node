# VOID VPS public seed deploy preflight v1

Status: pre-deploy proof lane.

This document defines the first safe preflight for a VPS that may become the
VOID public bootstrap seed/gateway.

## Purpose

The preflight checks whether a VPS is suitable for public VOID gateway work
without mutating the VPS.

It must not install packages, write files, change firewall rules, start services,
open ports, clone secrets, or deploy the gateway.

## Required operator inputs

Optional runtime inputs:

- VPS_SSH: SSH target, for example void@203.0.113.10
- VPS_HOST: public DNS name or IP, optional
- VPS_PORT: SSH port, optional, defaults to 22

If VPS_SSH is missing, the preflight must exit cleanly in local-only mode.

## Checks

The preflight records:

- local repository truth
- local runtime readiness
- local RPC private-bind invariant
- remote uname
- remote OS release
- remote listening ports
- remote public IP discovery if available
- whether remote tcp/8545 appears to be listening
- whether remote public gateway ports appear already occupied

## Safety invariants

The preflight must not expose private RPC.

Required:

- local 8545 must not bind to 0.0.0.0
- remote 8545 must not be listening publicly
- no private keys, mnemonics, wallet files, .env files, auth tokens, or runtime secrets are copied
- no public reverse proxy to 8545 is configured

## Expected result

A suitable VPS should have:

- SSH reachable
- Linux OS
- public IP
- no public 8545 listener
- ports 80/443 available or intentionally managed
- enough disk and memory for a small public gateway

## Decision boundary

Passing this preflight does not mean the VPS is deployed.

It only means the VPS is a candidate for the next lane:

- VPS public seed gateway install v1
