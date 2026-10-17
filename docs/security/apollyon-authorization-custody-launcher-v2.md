# Apollyon authorization custody launcher v2

Marker: `VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_V2`

Status: **source-only current-stack launcher candidate; no deployment**.

## Purpose

Historical Draft #2902 introduced a reviewed custody launcher, but that exact
path never entered the current Apollyon stack. The current-V2 source/session
binding must not depend on an unmerged historical branch.

V2 carries the reviewed launcher semantics forward under a new path on the
current stack.

## Dependency closure

Before the first dynamic import, V2 requires exact root-owned immutable bytes:

```text
custody service 8961572ba5834371b1229f790a1960940fc74935
custody core    f9f18db5bbfeea466202ef0d7babe08c3c401d66
auth verifier   c224ebc4fcb332b70e83900a8e086e0257f31670
```

It also refuses non-empty `NODE_OPTIONS`, `NODE_PATH`, `LD_PRELOAD` and
`LD_LIBRARY_PATH` before import.

## Runtime boundary

The launcher is intended for the dedicated non-root custody identity. It refuses
root runtime, accepts only fixed custody-service configuration fields, verifies
the public Ed25519 key fingerprint, starts only the existing AF_UNIX custody
service implementation, and stops it on SIGTERM/SIGINT.

The launcher never reads an operator private key and grants no attempt-claim,
training, candidate-weight, wallet, signing, transaction or funds authority.

This PR performs no installation or service action.

The next source gate is the complete current-V2 live custody source/session
execution closure.
