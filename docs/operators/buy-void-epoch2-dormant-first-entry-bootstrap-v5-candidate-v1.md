# Buy VOID Epoch-2 dormant first-entry bootstrap V5 candidate V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V5_CANDIDATE_V1`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

Derive one exact static ELF candidate from the repaired first-entry source generation merged by #3442.

Bound source generation:

`voidbuye2dormantsourcegen2_3ab7f9b6e23c6fd2fe82486fd2a396c3bd207e335675e6c5bfe58776ab99d6ff`

The candidate binds:

- bootstrap V5 source Git blob
  `81fc960f1cec597b01875ed944b25e5b6574d34d`,
  106,764 bytes, SHA-256
  `3971380e0aa814ec2b600b7913f82080c27fa34a8d817b351c2cc8e0470d5ff8`;
- source-generation manifest Git blob
  `782f747cda24a214c64e8ec3f49b6791bbb62f97`,
  2,382 bytes, SHA-256
  `3ab7f9b6e23c6fd2fe82486fd2a396c3bd207e335675e6c5bfe58776ab99d6ff`;
- the exact static compile contract already exercised by the merged V4 source proof;
- a sealed `memfd` source snapshot used as the compiler input;
- protected compiler/readelf identities and post-build tool revalidation;
- exact V5 self-test output identity;
- static ELF/no-interpreter/no-NEEDED checks.

The mutable checkout source pathname is not compiler input after the sealed source snapshot is created.

## Hosted derivation

Three independent Ubuntu 24.04 jobs each derive:

- canonical `candidate-v1.json`;
- `bootstrap-v5` static ELF.

The compare job requires all three reports and all three ELF files to be byte-identical, then independently rederives both a fourth time.

The candidate ID is:

`voidbuye2dormantbootstrapcand2_<sha256(canonical candidate body)>`.

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

After hosted V5 identity settles, a separate V2-generation acceptance lock is required before any V5 materializer, host-policy, or protected-install work.

PROTECT THE CORE.
