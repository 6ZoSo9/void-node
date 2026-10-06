# Buy VOID witness installation evidence collector v1

## Purpose

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V1`
is a **read-only** designated-host collector for the installation contract
merged through #2508/#2509.

It observes the actual host facts required by
`classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(...)`,
passes those facts through that canonical classifier, and emits one
content-addressed receipt. It does not install or mutate the witness boundary.

## Fixed acquisition surface

Security-sensitive paths are fixed in source rather than caller-selected:

- handler:
  `/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs`;
- server config:
  `/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json`;
- witness authority root:
  `/var/lib/void-allocation-custody-witness-v1`;
- root-owned SSH authorization policy:
  `/etc/ssh/authorized_keys/<remote_user>`;
- server ED25519 host public key:
  `/etc/ssh/ssh_host_ed25519_key.pub`;
- shell entry:
  `/bin/sh`;
- environment sanitizer:
  `/usr/bin/env`; and
- Node:
  `/usr/bin/node`.

The caller supplies only the reviewed #2502 transport policy inside the exact
collector config schema. The transport policy itself remains subject to the
canonical transport-policy classifier.

## Read-only collection

Regular files are opened with `O_NOFOLLOW` and compared against the visible
file identity before/after read. The collector binds:

- ownership, mode, link count and exact bytes for handler/config/key/executables;
- root-owned non-writable parent chains for the SSH authorization policy and
  pre-exec executable chain;
- exact reviewed handler Git blob identity;
- exact canonical protected config bytes and internal transport-policy SHA;
- dedicated witness account UID/GID and fixed `/bin/sh` shell;
- actual Node semantic version plus executable digest;
- exact root-owned `authorized_keys` line and ED25519 client key blob digest;
- effective `sshd -T -C ...` settings;
- local ED25519 host-key blob digest;
- hostname, machine-id digest, root block-device serial and WWN;
- witness-root identity plus exact witness journal digest/tip; and
- absence/presence of the durable witness intent namespace.

The observed host identity must equal the witness journal tip's witness
hostname, machine-id digest, root-disk serial and root-disk WWN.

## SSH / pre-exec boundary

The collector requires the hardened #2509 shape:

- root-owned mode-0444
  `/etc/ssh/authorized_keys/<remote_user>`;
- exact `restrict,command="..." ssh-ed25519 <key>` single-line authorization;
- effective `AuthorizedKeysFile` bound to that path;
- `StrictModes=yes`;
- public-key-only authentication;
- passwords and keyboard-interactive authentication disabled;
- `PermitUserEnvironment=no`;
- `PermitUserRC=no`;
- empty effective `AcceptEnv`; and
- the exact absolute `/bin/sh -> /usr/bin/env -i -> /usr/bin/node -> handler`
  execution chain.

The collector **observes static installation facts only**. It does not execute a
live SSH round trip to prove that the forced command actually ran under the
sanitized environment. Therefore:

```text
preexec_runtime_execution_observed=false
external_transport_authenticated=false
```

## Key identity convention

The #2502 policy stores ED25519 host/client identities as
`sha256:<64 lowercase hex>`.

For an OpenSSH `ssh-ed25519` public key, this collector hashes the complete SSH
wire-format public-key blob (algorithm string + 32-byte key) with SHA-256. This
is the same digest represented by OpenSSH's `SHA256:<base64>` fingerprint,
rendered in hex for the #2502 policy.

The **client-side known_hosts file is not observable from Nimo**. Its reviewed
SHA-256 remains policy-bound but this collector explicitly reports:

```text
client_known_hosts_content_observed=false
```

A later Precision-side transport executor must independently prove the actual
known-hosts bytes.

## Stability / receipt

The collector performs the static census twice. A differing evidence, host, or
witness snapshot HOLDs.

On success it emits a receipt binding:

- parent installation `qualification_id`;
- SHA-256 of the complete installation-evidence packet;
- SHA-256 of the canonical normalized #2509 qualification;
- observed host identity;
- exact witness storage/tip state; and
- a content-addressed collector receipt SHA-256.

This receipt is an evidence artifact, not live authority.

## Authority boundary

The collector keeps all of these false:

- `client_known_hosts_content_observed`;
- `preexec_runtime_execution_observed`;
- `live_evidence_origin_proven`;
- `trusted_verification_clock_proven`;
- `evidence_generation_monotonicity_proven`;
- `filesystem_write`;
- `ssh_execution`;
- key generation;
- `authorized_keys`, sshd or config mutation;
- witness mutation;
- service start/restart;
- mount/permission mutation;
- `external_transport_authenticated`;
- `external_witness_storage_proven`;
- `protected_high_water_custody_proven`;
- `independent_custody_proven`;
- runtime integration;
- payment/Chain-2050/activation/funds authority.

A source-green or even real-host collector receipt therefore **does not install
the witness** and does not open the presale.

## Verification

```bash
npm run build
node --check tools/void-buy-allocation-custody-witness-installation-evidence-v1.mjs
node scripts/prove_void_buy_allocation_custody_witness_installation_evidence_v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_installation_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
git diff --check
```

The focused proof uses injected read-only I/O. It performs no real SSH
connection and no host mutation.
