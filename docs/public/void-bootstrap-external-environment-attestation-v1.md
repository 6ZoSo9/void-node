# VOID bootstrap external environment attestation v1

## Purpose

Issue #1005 requires final acceptance from ordinary fresh Linux machines on the
public internet without Tailnet admission, private bootstrap addresses, manual
operator coordination, router changes, or economic authority.

This source-only contract defines a sanitized content-addressed attestation for
that machine/environment boundary.

It does not perform a live bootstrap attempt.

## Machine boundary

A valid external acceptance environment must declare:

- `os_family=linux`;
- `fresh_checkout=true`;
- `outside_operator_tailnet=true`; and
- `operator_managed_machine=false`.

The machine label is a non-secret logical label only. Raw host identity is not
part of the attestation.

## Launcher boundary

The acceptance launch must use exactly:

```text
./run-void-node.sh
```

with no positional arguments.

The attestation is invalid if the launch requires:

- manually supplied bootstrap addresses;
- private addresses;
- Tailscale addresses;
- an SSH tunnel; or
- a manual environment edit.

## Forbidden dependencies

Every dependency flag must be false:

- Tailscale requirement;
- Tailscale path actually used;
- VPN requirement;
- SSH requirement;
- participant-side router configuration;
- port forwarding;
- operator contact before first synchronization;
- required commercial cloud provider;
- required DNS provider; or
- required tunnel provider.

The contract describes the acceptance path, not incidental software that may
happen to be installed on a machine.

## Authority boundary

All private/economic authority flags must be false.

## Sanitized evidence

The attestation binds SHA-256 values for:

- exact repository state;
- exact launcher invocation;
- sanitized network posture; and
- sanitized environment scan.

Raw route tables, IP addresses, hostnames, environment secrets, credentials,
and wallet material must never be embedded in this attestation.

## Evidence mode

The proof uses `synthetic_test_fixture`.

A future real acceptance machine must use `external_machine_observation`.

## Authority boundary

This lane performs no live network calls, external-machine acceptance,
launcher execution on an external host, bootstrap/relay activation, runtime
integration, deployment/restart, firewall/router/DNS mutation, credential
access, economic action, transaction broadcast, or fund movement.

It does not close issue #1005.
