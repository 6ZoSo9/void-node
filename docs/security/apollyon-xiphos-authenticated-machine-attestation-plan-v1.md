# Apollyon authenticated Xiphos machine attestation plan V1

Marker: `VOID_APOLLYON_XIPHOS_AUTHENTICATED_MACHINE_ATTESTATION_PLAN_V1`.

Status: **source/test/CI plan only**. No SSH connection, Xiphos read,
protected-store read, service/runtime mutation, training, credential/key use,
signing, transaction, or funds action is authorized.

## Purpose

Parent #3768 deliberately preserves the truth that the observed normalized
Xiphos `/etc/machine-id` digest is **not authenticated provenance**.

This plan defines the next gate without pretending that digest equality,
hostname equality, or a current network connection authenticates a machine.
The future attestation must first bind a separately authenticated SSH transport
identity and then measure the machine-ID digest inside a fresh challenge-bound
session.

Parent #3768 exact head:
`d7c3145dd202a4a7c3914732c8a8920c33a904ef`.

Pinned parent blobs:

- provenance HOLD V2 plan:
  `bd75e2606cb13beb3ba1c6f80f596e2729709c37`;
- proof:
  `5a105aa167488e864b93c4490ddb58e99e70b784`;
- document:
  `f98a2a2dc14f16b760185ed1dcdc55c048e5ae74`;
- workflow:
  `81d875cddd7771aab75e1b7e99cb19b897d498a9`.

Observed digest retained only as comparison evidence:

`543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057`

## Current transport binding: deliberately incomplete

The plan records only:

- host alias: `xiphos`;
- port: `22`;
- host-key algorithm: `ssh-ed25519`;
- client-key algorithm: `ssh-ed25519`.

These remain unbound:

```text
remote_user=null
host_key_sha256=null
known_hosts_sha256=null
client_public_key_sha256=null
transport_identity_bound=false
host_key_fingerprint_independently_authenticated=false
```

Therefore:

```text
attestation_execution_authorized=false
authenticated_transport_attestation_present=false
authenticated_xiphos_machine_identity_proven=false
collector_machine_identity_prerequisite_satisfied_for_host_execution=false
host_pass_authorized=false
```

The plan cannot be used as a TOFU policy and cannot promote a key learned from
the same unauthenticated session it is supposed to authenticate.

## Required SSH transport contract

A later reviewed binding generation must supply exact, independently
authenticated transport identities and enforce the existing repository pattern:

- exact `/usr/bin/ssh`;
- `-F /dev/null`;
- `BatchMode=yes`;
- `IdentitiesOnly=yes`;
- `IdentityAgent=none`;
- public-key authentication only;
- password and keyboard-interactive authentication disabled;
- `StrictHostKeyChecking=yes`;
- `HostKeyAlgorithms=ssh-ed25519`;
- `HostKeyAlias=xiphos`;
- dedicated exact `UserKnownHostsFile`;
- `GlobalKnownHostsFile=/dev/null`;
- `UpdateHostKeys=no`;
- `CanonicalizeHostname=no`;
- no TTY;
- `ClearAllForwardings=yes`;
- no agent or X11 forwarding;
- no local command;
- `ControlMaster=no`;
- `ProxyCommand=none`;
- `ProxyJump=none`;
- one connection attempt;
- 4-second connect timeout;
- 30-second operation timeout.

The dedicated known-hosts file, host-key fingerprint, fixed remote account and
client public-key identity must all be source-bound before execution authority
can become true.

## Required challenge-bound measurement

The future attestation uses a **32-byte client-generated CSPRNG challenge**.

The remote command must be exact reviewed bytes; neither command nor remote
path may be caller-selected. It may read only the fixed
`/etc/machine-id` identity required by this attestation and must:

1. require exact lowercase 32-hex machine-ID text after allowed outer
   whitespace normalization;
2. perform descriptor/generation stability checks around the read;
3. never return the raw machine ID;
4. return only its SHA-256;
5. bind the client challenge by digest;
6. emit one canonical JSON frame plus EOF;
7. stay within 256 request bytes and 4096 response bytes.

The client must reject stale/replayed challenge material and require the
returned machine-ID SHA-256 to match the already observed digest. That match is
meaningful only because the session itself has separately authenticated
transport identity.

The eventual receipt must bind:

- transport policy SHA-256;
- host-key SHA-256;
- known-hosts SHA-256;
- client public-key SHA-256;
- challenge SHA-256;
- machine-ID SHA-256; and
- canonical transcript identity.

## What this plan does not prove

This plan does **not** prove:

- that the current SSH host key is authentic;
- that any current known-hosts file is independently trusted;
- that the current client key is the intended attestation key;
- that an SSH session was performed;
- that Xiphos machine identity is authenticated;
- that the first-host collector may run.

It also grants no protected-store, writer, claim, consumption, trainer,
training, credential, signing, transaction, or funds authority.

## Source proof

The proof:

- strictly rejects duplicate JSON keys and non-finite constants;
- binds the exact four #3768 parent blobs;
- validates the exact transport and attestation contracts;
- requires all transport identities to remain null/unbound;
- requires all authority fields false;
- validates content-addressed plan ID
  `voidapollyonxiphosattestplan1_ed85e5fb63cc2a3785609bb4a1105faf452750c66c06c3fb6f4286d639ea6f37`;
- executes **77 semantic adversaries**; and
- performs no network or host access.

Plan blob: `77acc1248b9c13a570f3840ff85846dcba00d2f7`.

Proof blob: `0b448043c123c3a4833cef3b075e896b463f8d47`.

## Next gate

`INDEPENDENTLY_AUTHENTICATE_AND_SOURCE_BIND_XIPHOS_ED25519_HOST_KEY_KNOWN_HOSTS_AND_CLIENT_KEY_THEN_SEPARATELY_AUTHORIZE_ATTESTATION_EXECUTION`

Only after that binding is reviewed may an attestation execution be considered,
and execution itself remains a separate explicit operator-authorization gate.

**PROTECT THE CORE. PROTECT THE TRUTH.**
