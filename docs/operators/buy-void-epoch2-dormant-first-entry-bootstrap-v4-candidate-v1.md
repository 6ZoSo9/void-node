# Buy VOID Epoch-2 dormant first-entry bootstrap V4 candidate V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V4_CANDIDATE_V1`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

Derive one exact static ELF candidate from the immutable first-entry source generation merged by #3439.

Bound source generation:

`voidbuye2dormantsourcegen1_435345cd442c4d59760984c3445d178461cbbf163a0a53e760a392ca2d0bae77`

The candidate binds:

- bootstrap V4 source Git blob
  `c7d2125b59dcbecc1d6aae8818e84cac8ce85da9`,
  60,997 bytes, SHA-256
  `55228b9cb291bc6c758503735caa47367a8ac9f5c5db84a77e9b94f69d4db5ec`;
- source-generation manifest Git blob
  `a484a7d2e1159ebbef3357ec849af92d7f12cff1`,
  2,380 bytes, SHA-256
  `435345cd442c4d59760984c3445d178461cbbf163a0a53e760a392ca2d0bae77`;
- the exact static compile contract already exercised by the merged V4 source proof;
- a sealed `memfd` source snapshot used as the compiler input;
- protected compiler/readelf identities and post-build tool revalidation;
- exact V4 self-test output identity;
- static ELF/no-interpreter/no-NEEDED checks.

The mutable checkout source pathname is not compiler input after the sealed source snapshot is created.

## Hosted derivation

Three independent Ubuntu 24.04 jobs each derive:

- canonical `candidate-v1.json`;
- `bootstrap-v4` static ELF.

The compare job requires all three reports and all three ELF files to be byte-identical, then independently rederives both a fourth time.

The candidate ID is:

`voidbuye2dormantbootstrapcand1_<sha256(canonical candidate body)>`.

## Authority

This is candidate evidence only:

- `candidate_accepted=false`;
- `binary_identity_accepted=false`;
- `protected_install_authorized=false`;
- `live_execution_authorized=false`;
- credential/private-key/signing authority false;
- transaction/RPC/payment/presale/WC/treasury/funds authority false;
- production-host evidence authority false.

No Precision mutation occurs.

After hosted identity settles, a separate acceptance-lock generation is required before any host-policy or protected-install work.

PROTECT THE CORE.
