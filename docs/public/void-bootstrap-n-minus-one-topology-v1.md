# VOID bootstrap N-1 topology contract v1

## Purpose

Issue #1005 requires a hard resilience gate before VOID can claim plug-and-play
public onboarding: removing any one seed, relay, mirror, transport class, or
other bootstrap component must not prevent a fresh node from retaining at least
one viable introduction path.

This lane defines the **source-only topology contract** for that adversarial
requirement. It does not perform the final external-machine acceptance run and
does not claim that issue #1005 is complete.

## Bootstrap path model

Each modeled join path contains exactly two logically separate components:

1. a content-addressed bootstrap-record distribution component; and
2. a network introduction component.

Record-distribution classes:

- `https_record_mirror`
- `tor_record_mirror`

Introduction classes:

- `direct_ipv6_seed`
- `direct_ipv4_seed`
- `relay`
- `tor_sync_seed`

Each component declares a failure domain. A single join path may not use the
same failure domain for record distribution and network introduction.

A hostname, mirror, seed, relay, or transport remains availability
infrastructure only. It is not VOID network identity or authority.

## Required resilience

The contract requires all of the following:

- at least four usable baseline join paths;
- at least three distinct failure domains;
- every declared component class represented in a usable path;
- removal of **each individual component** leaves at least one join path;
- removal of **all components in each one class** leaves at least one join
  path;
- removal of **each one complete failure domain** leaves at least one join
  path; and
- no single required component is allowed.

The class-wide gate is deliberately stronger than merely testing one instance:
for example, removing all HTTPS record mirrors must still leave a Tor-record
path, and removing all relays must still leave a non-relay introduction path.

## What this proves

This source contract proves that a proposed topology fixture cannot accidentally
encode an N=1 dependency while still being labeled "multipath."

It also provides deterministic adversarial scenarios that a later live
acceptance harness can execute against real machines.

## What this does not prove

This lane performs no network calls and does not prove:

- that a real public seed is reachable;
- that a real relay reservation is live;
- that Tor is installed or usable;
- that a fresh node reaches nonzero head, `gap=0`, or `txroot_live=1`;
- that an outside machine successfully joins;
- that `run-void-node.sh` is wired to all modeled component classes; or
- that issue #1005 may be closed.

The topology policy explicitly requires `live_acceptance_claimed=false`.

## Authority boundary

Every topology object requires all private/economic authority flags to be
false.

This lane modifies no runtime P2P code, relay code, launcher, firewall, router,
DNS, service, credentials, wallet, signer, validator, treasury, Work Credit,
transaction, or money-moving state.

## Follow-on

When the relevant transport/runtime lanes are merged, a separate acceptance
runner can consume this topology model and replace synthetic availability with
real bounded attempts. That runner must record exact repository commit,
component removals, successful join path, nonzero head, `gap=0`,
`txroot_live=1`, learned verified peers, and continued connectivity after the
first-contact component disappears.
