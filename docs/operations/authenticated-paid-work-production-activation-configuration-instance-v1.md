# Authenticated paid-work production activation configuration instance v1

This lane creates the exact source-controlled configuration instance required by
the authenticated paid-work production activation-readiness HOLD decision. It
satisfies only `activation_configuration_instance`.

The instance is a reviewed repository candidate. It is not written to the
installed disabled runtime, and it does not authorize activation.

## Exact instance

The canonical source path is:

`config/activation-candidates/authenticated-paid-work-production-activation-configuration-v1.json`

Its SHA-256 digest is:

`abe7974246d47a4802a936e78f952d6db76d98cccfccc1ce7130309c56b3ee8f`

The instance conforms to the schema merged in PR #920 and uses the exact
four-key runtime shape:

- the existing runtime configuration marker;
- version `1`;
- `enabled=true`, as required by the runtime schema;
- the exact persistence configuration object.

The enabled value describes the future configuration passed to an explicit
activation execution. Merely tracking this file does not load it. The installed
disabled launcher does not scan the repository candidate path.

## Production operator binding

The instance binds the persistence root to the canonical Precision production
installation:

`/home/zoso/.local/share/void-authenticated-paid-work-runtime-disabled-v1/activation`

The persistence limits match the already-proven runtime values:

- pointer bytes: `65,536`;
- generation-file bytes: `4,194,304`;
- generation count: `10,000`;
- exact orphaned-generation recovery: required.

The target root remains absent until a separately confirmed activation lane
creates and verifies it with owner-private permissions. This source lane does
not create the directory or the installed `enabled-config.json`.

## Secret boundary

The closed runtime schema leaves no field for credentials, tokens, private
keys, mnemonics, authorization headers, wallets, or signers. The proof rejects
secret-bearing keys and verifies the exact content digest. Trusted-context and
credential reference metadata remain separate blockers.

## Readiness effect

The configuration schema and source instance now exist. Seven requirements
remain:

1. trusted-context reference metadata;
2. credential reference metadata;
3. bounded replay snapshot;
4. service unit design;
5. rollback plan;
6. activation-execution confirmation;
7. live-canary scope.

Readiness remains **HOLD**. A separate activation-execution lane is still
required after all seven companion artifacts are independently defined and
proven.

## Proof

Run:

```bash
node scripts/prove_authenticated_paid_work_production_activation_configuration_schema_v1.mjs
node scripts/prove_authenticated_paid_work_production_activation_configuration_instance_v1.mjs
```

The instance proof validates the tracked JSON against the merged schema, locks
its digest, exact operator path and bounded persistence values, rejects secret
fields, proves that the runtime does not auto-load the tracked path, and keeps
the activation authority boundary closed.

## Authority boundary

This lane creates one source configuration instance. It does not write an
installed configuration, create persistence, read credentials or tokens,
deploy, install or restart a service, create a listener, mount the runtime,
accept a quote, authorize or execute payment, construct or broadcast a
transaction, dispatch work, issue a ticket, write Work Credits, access a wallet
or signer, sign, settle VOID, or move funds.
