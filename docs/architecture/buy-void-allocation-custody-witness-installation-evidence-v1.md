# Buy VOID allocation custody witness installation evidence v1

Marker:

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V1`

Status: **read-only source collector contract; no Nimo installation or mutation is
performed by this lane**.

## Purpose

This collector is the read-only evidence producer for the merged installation
qualification contract in
`src/economic/buy_void_allocation_custody_witness_installation_qualification_v1.ts`.

It observes the future designated witness host and emits:

1. the exact closed qualification packet consumed by that classifier; and
2. a content-addressed derivation receipt describing how the packet was
   collected.

The collector does not install the witness boundary. A source-green collector is
not proof that Nimo currently satisfies it.

## Fixed source and checkout boundary

The collector accepts no alternate repository checkout. `repo_root` must equal
the checkout containing the collector itself.

The checkout must be tracked-clean, and the collector binds:

- exact Git `HEAD`;
- exact `HEAD:tools/void-buy-allocation-custody-witness-forced-command-v1.mjs`
  blob identity; and
- exact installed handler bytes.

Both source and installed handler must equal the reviewed #2504 Git blob:

```text
e19fa1094981b10cea6052ac86281fd6e760b800
```

A different source checkout or handler byte sequence HOLDS before a qualification
packet is emitted.

## Canonical transport-policy input

The operator supplies the already-reviewed #2502 transport policy as evidence
configuration. It must retain exactly:

- SSH transport;
- port 22;
- `ssh-ed25519` host and client identities;
- the reviewed forced-command endpoint marker;
- batch mode;
- strict host-key checking;
- identities-only;
- no TTY;
- all forwarding cleared;
- no local command;
- forced-command-only remote execution;
- no remote shell;
- no caller-selected command or path;
- 8-second connect timeout;
- 30-second operation timeout;
- 256 KiB request bound; and
- 24 MiB response bound.

The collector compares installed server facts to this policy. It deliberately
does **not** prove who selected the client-side known-hosts policy:

```text
client_policy_origin_proven=false
```

## Account and shell evidence

The dedicated remote account is resolved through `getent passwd`.

The packet binds:

- exact username, UID, GID and home;
- fixed shell spelling `/bin/sh`;
- resolved shell path;
- whether `/bin/sh` is a symlink;
- target shell bytes, owner, mode and SHA-256.

The merged qualification profile requires a dedicated non-root account and
root-owned mode-0755 shell target.

## Handler, config and Node evidence

The collector reads the following with bounded nofollow/identity-stable file
reads:

```text
/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs
/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json
/usr/bin/node
```

The protected config must be canonical JSON for the exact supplied transport
policy and must retain:

```text
authority_root=/var/lib/void-allocation-custody-witness-v1
witness_filename=buy-void-allocation-custody-high-water-witness-v1.jsonl
```

The collector also binds the resolved Node path, bytes, SHA-256, owner, mode,
semantic version and supported major. This is file/process-source evidence, not
remote authentication or witness-storage evidence.

## OpenSSH public-key identity

Host and client public keys must be canonical OpenSSH `ssh-ed25519` public-key
records.

The base64 payload is not accepted as arbitrary bytes. It must decode to the
exact SSH wire structure:

```text
string "ssh-ed25519"
string <exactly 32 raw public-key bytes>
EOF
```

The transport-policy key identity is SHA-256 over that complete OpenSSH wire
blob. Trailing bytes, wrong inner algorithm strings, malformed lengths and
non-32-byte Ed25519 keys HOLD.

## Authorized-key boundary

The authorized-key file is fixed at:

```text
/var/lib/<remote_user>/.ssh/authorized_keys
```

It must be a single direct private file under the account's mode-0700
`.ssh` directory.

The observed line is required by the downstream qualifier to retain:

- `restrict`;
- the exact reviewed forced command;
- the exact dedicated Ed25519 client key;
- no `environment=` options;
- no PTY;
- no agent, port or X11 forwarding;
- no user rc; and
- no caller-selected command/path authority.

The exact forced command is:

```sh
test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json
```

## Effective sshd and pre-exec evidence

The collector evaluates the effective sshd profile for the witness account using
absolute `/usr/sbin/sshd -T -C ...` execution.

The packet binds:

- `PermitUserEnvironment`;
- `PermitUserRC`;
- public-key authentication;
- password authentication;
- keyboard-interactive authentication;
- `AuthenticationMethods`; and
- `AcceptEnv`.

The running sshd `MainPID` is read from the configured systemd service. Its
`/proc/<pid>/environ` is bounded and checked for the complete dangerous
environment denylist. The same MainPID is read again after the environment
snapshot; PID drift HOLDS.

The collector also performs two local, read-only semantic probes:

1. invoke the exact forced-command shell expression with a non-empty
   `SSH_ORIGINAL_COMMAND`; it must exit 3 before Node can run;
2. evaluate the `env -i` boundary and require the resulting environment to
   contain exactly:

```text
PATH=/usr/bin:/bin
LANG=C
LC_ALL=C
VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1
```

These probes validate the reviewed command/environment semantics. They are not a
live SSH login and do not prove external transport authentication.

## Host-key binding

The collector observes:

```text
/etc/ssh/ssh_host_ed25519_key.pub
```

and requires its canonical ED25519 wire-blob SHA-256 to equal the transport
policy's pinned host-key identity.

The receipt copies the policy's `known_hosts_sha256` only as a required
comparison identity. It does not read Precision's client-side known-hosts file
and therefore keeps:

```text
client_policy_origin_proven=false
```

## Freshness and generation boundary

The receipt binds `collected_at_ms` and an operator-supplied positive
`evidence_generation`. Neither is promoted to authority merely because it is
well-formed:

```text
trusted_verification_clock_proven=false
evidence_generation_monotonicity_proven=false
```

A later designated-host evidence ceremony must establish trusted origin,
freshness and monotonicity.

## Output

The collector emits one JSON document containing:

- the exact #2508 qualification packet;
- exact source/handler/sshd derivation facts;
- `packet_sha256`;
- `collector_receipt_sha256`; and
- explicit negative authority facts.

A successful packet can classify as
`source_installation_evidence_qualified`. That classification remains source
evidence only.

## Authority boundary

This collector does **not**:

- create or install SSH keys;
- edit `authorized_keys`, known-hosts, sshd or systemd;
- deploy the handler or protected config;
- authenticate over SSH;
- read or append the live external witness;
- mutate witness storage;
- start or restart a service;
- integrate the Buy runtime;
- accept payment;
- access a wallet, signer or private key;
- construct/sign/broadcast a transaction;
- mutate Chain-2050;
- activate the presale or market; or
- move funds.

The following remain false:

```text
trusted_verification_clock_proven=false
evidence_generation_monotonicity_proven=false
client_policy_origin_proven=false
live_ssh_authentication_performed=false
external_transport_authenticated=false
external_witness_storage_proven=false
runtime_integration=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
funds_movement=false
```

## Source verification

The focused proof is synthetic and uses injected read-only I/O. It never reads
the runner's sshd, `/etc/void`, authorized keys or witness state.

```bash
node --check tools/void-buy-allocation-custody-witness-installation-evidence-v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_installation_evidence_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_installation_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
npm run typecheck
npm run build
git diff --check
```

The proof covers the exact successful packet plus adversaries for checkout-root
drift, dirty source, source/installed-handler drift, malformed ED25519 wire
blobs, client-key mismatch, unsafe authorized-key options, `AcceptEnv`
injection, dangerous sshd environment, sshd PID drift, failed original-command
rejection and post-sanitization environment expansion.

## Next gate

After this source collector is merged and reviewed, the next gate is a
**separately authorized read-only run on the designated Nimo host**, followed by
review of the content-addressed receipt.

A live installation or mutation ceremony remains separate.
