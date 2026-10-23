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
remote_endpoint=null
remote_user=null
host_key_sha256=null
known_hosts_path=null
known_hosts_sha256=null
client_identity_file_path=null
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

The dedicated known-hosts file, host-key fingerprint, exact numeric remote
endpoint, fixed remote account, exact client identity-file path and client
public-key identity must all be source-bound before execution authority can
become true.

The future binding must be at least as strict as the repository's reviewed
custody SSH adapter pattern.

The host key cannot become "independently authenticated" from a boolean or
from the same network session it is meant to authenticate. The binding
generation must source-bind a reviewed independent host-key authentication
artifact (and its content digest/provenance), and that artifact must originate
outside the attestation transport being authorized.

Digest conventions are exact and shared with the reviewed custody transport:
- host-key SHA-256 is SHA-256 of the decoded raw SSH `ssh-ed25519` public-key blob;
- client-public-key SHA-256 uses the same raw SSH public-key blob convention;
- known-hosts SHA-256 is over the exact complete known-hosts file bytes,
  including its single canonical trailing newline.

- destination uses one exact source-bound numeric endpoint; the string
  `xiphos` is only the host-key alias, not a DNS trust decision;
- the client invokes exactly one reviewed `-i <identity-file>` path and binds
  its parent custody and mode 0600; implicit/default identity-file selection is
  not accepted;
- the retained identity file must be an Ed25519 private identity; an exact
  source-bound derivation method must derive its SSH public-key blob, and that
  derived blob's SHA-256 must equal the independently bound
  `client_public_key_sha256`;
- the identity file's inode/device, owner/group, mode, link count, size and
  relevant generation timestamps must remain stable from pre-derivation through
  the completed SSH use; a separately claimed public key cannot substitute for
  the key actually used by `-i`;
- the eventual attestation receipt binds the **derived** client public-key
  digest in addition to the transport-policy/client-key field;
- the dedicated known-hosts path is source-bound, its parent is root-owned and
  non-writable, and the file is root-owned/read-only;
- that file contains exactly one canonical `xiphos ssh-ed25519 <key>` entry
  whose decoded key fingerprint equals the independently authenticated host
  key;
- `PreferredAuthentications=publickey` is explicit, client certificates are
  forbidden, and `VerifyHostKeyDNS=no` is explicit;
- the local SSH environment is minimal and `HOME` is fixed to the reviewed
  identity-file parent so ambient user configuration cannot add identities or
  behavior.

## Required remote execution chain

Authenticating the SSH host key does not by itself authenticate the code that
produces the measurement. The future binding/attestation generation must also
prove the server-side execution chain that receives the bound client key:

- the exact client public key is present in a reviewed authorized-keys record;
- that record uses `restrict` and one exact forced command;
- authorized-key environment options are absent and the authorized-keys file
  itself is under reviewed custody;
- the forced command rejects any non-empty `SSH_ORIGINAL_COMMAND`;
- effective sshd policy has `PermitUserEnvironment no`, `PermitUserRC no`,
  and an empty accepted-environment surface for this account;
- the account shell is exact, reviewed, root-owned and non-writable;
- that shell path is a startup-free fixed launcher for this account, or the
  complete startup dependency chain is exact/source-bound and non-replaceable;
- the account home is root-owned/non-writable so user startup files cannot be
  created or changed between review and execution;
- shell-startup environment influence (including Bash-style startup hooks) is
  forbidden before the forced-command handler begins;
- any system SSH rc path is absent or exact/reviewed;
- the forced-command handler and measurement runtime are root-owned,
  non-writable, exact-source-bound artifacts.

This prevents a valid host key plus mutable account startup state from
substituting a fake canonical measurement before the fixed
`/etc/machine-id` reader runs.

## Required challenge-bound measurement

The future attestation uses a **32-byte client-generated CSPRNG challenge**.

The request itself must be one closed-schema canonical JSON frame plus EOF.
Duplicate keys, non-finite values, trailing bytes, additional frames and
noncanonical encodings are HOLD. The response has the same closed-schema,
duplicate-key/nonfinite rejection requirement in addition to the existing
canonical single-frame + EOF rule.

The remote command must be exact reviewed bytes; neither command nor remote
path may be caller-selected. The remote measurement runtime/interpreter and
absolute execution path must themselves be reviewed/bound, and the command
must not depend on caller-controlled `PATH`, shell startup state or an
ambient interpreter/module search path. It may read only the fixed
`/etc/machine-id` identity required by this attestation and must:

1. require exact lowercase 32-hex machine-ID text after allowed outer
   whitespace normalization;
2. perform descriptor/generation stability checks around the read;
3. never transmit the raw machine ID on stdout, stderr, command arguments,
   environment, framing fields, diagnostics, or any other attestation channel;
4. return only its SHA-256;
5. bind the client challenge by digest;
6. emit one canonical JSON frame plus EOF;
7. stay within 256 request bytes and 4096 response bytes;
8. return zero exit status with no signal and an empty SSH stderr channel.

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
  `voidapollyonxiphosattestplan1_b7d9c1600cfe03fd41d4a36f801f82d49d6da72f3ea378c291a12af8bd581d60`;
- executes **133 semantic adversaries**; and
- performs no network or host access.

Plan blob: `519399adc85c70a3e7257ad023b7f954b333385a`.

Proof blob: `fdbb54c90919afb151c554f91340c1c8a112cf2d`.

## Next gate

`INDEPENDENTLY_AUTHENTICATE_AND_SOURCE_BIND_XIPHOS_ED25519_HOST_KEY_KNOWN_HOSTS_CLIENT_IDENTITY_AND_ENDPOINT_THEN_SEPARATELY_AUTHORIZE_ATTESTATION_EXECUTION`

Only after that binding is reviewed may an attestation execution be considered,
and execution itself remains a separate explicit operator-authorization gate.

**PROTECT THE CORE. PROTECT THE TRUTH.**
