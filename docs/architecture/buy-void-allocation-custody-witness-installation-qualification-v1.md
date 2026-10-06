# Buy VOID allocation custody witness installation qualification v1

Marker:

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1`

Status: **pure source evidence classifier only; no live Nimo installation or
qualification is performed**.

## Purpose

This contract defines the exact installation evidence that a later read-only
Nimo collector must provide before the merged witness transport and forced
command can be treated as an installed candidate.

It composes, but does not replace:

- the merged allocation-custody witness transport policy;
- the merged forced-command persistence handler; and
- the separate identity-continuity evidence.

A successful classification is only
`source_installation_evidence_qualified`. It does not prove that the evidence
came from Nimo, that a trusted clock produced it, or that its generation is
monotonic.

## Reviewed handler generation

The classifier pins the merged forced-command source Git blob exactly:

```text
e19fa1094981b10cea6052ac86281fd6e760b800
```

The evidence must report the same Git-blob identity for both the reviewed source
and the installed handler bytes.

The installed handler path is fixed:

```text
/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs
```

It must be a root-owned, non-symlink, single-link regular file under a
root-owned parent chain, mode `0444`. The witness account therefore cannot
rewrite the reviewed program.

## Dedicated account and protected config

The dedicated SSH account must:

- equal the remote user in the canonical witness transport policy;
- have a non-root UID/GID;
- be explicitly classified as dedicated; and
- use the fixed shell identity `/bin/sh`.

The protected config path is fixed:

```text
/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json
```

The handler itself requires the config file to be owned by its effective UID,
mode `0600`, so qualification requires that exact account ownership plus a
root-owned non-writable ancestor chain.

The evidence additionally binds:

- exact config SHA-256;
- exact authority-root path;
- fixed witness filename;
- the complete parent transport-policy SHA-256.

The classifier does not accept a caller-selected alternate handler or config
path.

## Node identity

Execution is pinned to:

```text
/usr/bin/node
```

Evidence must bind:

- its resolved absolute path;
- root ownership;
- regular/non-symlink identity;
- exact mode `0755`;
- exact binary SHA-256;
- exact semantic version; and
- a reviewed major in `22`, `24`, or `26`.

This is content binding, not live process attestation.

## Authorized-key boundary

The evidence must bind a private mode-`0600`, single-link
`authorized_keys` file owned by the dedicated witness account and a
content-addressed exact key line.

The key must:

- be `ssh-ed25519`;
- equal the client-key identity in the parent transport policy;
- carry `restrict`;
- carry the reviewed forced command;
- carry no `environment=` options;
- permit no PTY;
- permit no agent, port, or X11 forwarding;
- permit no user rc;
- expose no caller-selected command; and
- expose no caller-selected path.

The exact reviewed command body is:

```sh
test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json
```

Its SHA-256 is:

```text
sha256:8a625211d41d6044bb87abaafa954cd89db07d81a5bbb3f4ac6a788c7e1ae422
```

### Why the original-command check precedes `env -i`

A direct `env -i ... node handler` forced command would erase
`SSH_ORIGINAL_COMMAND` before Node starts. The handler could then no longer
prove that a caller supplied a command.

This profile therefore requires the fixed shell expression to reject any
non-empty `SSH_ORIGINAL_COMMAND` **before** the environment is cleared.
Only after that check may `env -i` launch Node.

The quoted variable is consumed only by `test -z`; it is not evaluated as
shell syntax.

## sshd and pre-exec environment

The effective sshd evidence must require:

- `PermitUserEnvironment=no`;
- empty `AcceptEnv` for the witness account profile;
- public-key-only authentication;
- password authentication disabled;
- keyboard-interactive authentication disabled; and
- no authorized-key environment injection.

The pre-exec evidence must additionally prove that the following names were
absent before the account shell/forced-command boundary:

```text
BASH_ENV
BASHOPTS
ENV
GCONV_PATH
LD_AUDIT
LD_LIBRARY_PATH
LD_PRELOAD
NODE_OPTIONS
NODE_PATH
OPENSSL_CONF
PS4
SHELLOPTS
```

After the original-command rejection, `env -i` must provide Node exactly:

```text
PATH=/usr/bin:/bin
LANG=C
LC_ALL=C
VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1
```

No user rc or shell startup hook may execute before the rejection/sanitization
boundary.

These are evidence requirements. This pure classifier does not itself inspect
sshd, a process environment, or the filesystem.

## Host/key binding

The installation evidence must reproduce exactly the parent transport policy's:

- remote host;
- remote port;
- ED25519 host-key identity;
- dedicated known-hosts identity; and
- dedicated ED25519 client public-key identity.

A mismatch HOLDS rather than falling back to ordinary operator SSH authority.

## Evidence freshness boundary

The classifier content-addresses:

- `collected_at_ms`; and
- `evidence_generation`.

It does not trust either field merely because it is well-formed.

Therefore:

```text
live_evidence_origin_proven=false
trusted_verification_clock_proven=false
evidence_generation_monotonicity_proven=false
```

A later live collector/receipt gate must establish those properties.

## Authority boundary

Even a GREEN synthetic proof does **not**:

- generate or install an SSH key;
- edit `authorized_keys`, known-hosts, or sshd;
- install the handler or config;
- execute SSH or contact Nimo;
- read or append the live witness;
- prove external transport authentication;
- prove external witness storage;
- integrate the public Buy runtime;
- accept payment;
- access wallet/private keys/signers;
- construct/sign/broadcast transactions;
- mutate Chain-2050;
- activate the presale or market; or
- move funds.

The following therefore remain false:

```text
live_evidence_origin_proven=false
trusted_verification_clock_proven=false
evidence_generation_monotonicity_proven=false
live_nimo_installed=false
external_transport_authenticated=false
external_witness_storage_proven=false
runtime_integration=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
```

## Focused verification

```bash
npx tsx scripts/prove_buy_void_allocation_custody_witness_installation_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
npm run typecheck
npm run build
git diff --check
```

The proof covers a valid synthetic packet plus adversaries for handler source
drift, installed-handler drift, alternate handler path, writable handler
ancestry, non-executable Node identity, unsupported Node major, config-owner
mismatch, transport-policy mismatch, alternate authority root form,
authorized-key environment injection, missing `restrict`, alternate forced
command/digest, user-rc/forwarding authority, unsafe sshd environment policy,
missing pre-exec original-command rejection, missing environment sanitization,
startup-hook evidence, missing dangerous-environment denial, extra Node
environment keys, host-key mismatch, account mismatch, and non-integer evidence
generation.

## Next gate

After this source classifier is reviewed, the next gate is a **read-only,
content-addressed Nimo installation evidence collector/receipt** that proves the
required facts from the actual host. Live installation/mutation remains a
separate operator ceremony.
