# Buy VOID Epoch-2 dormant first-entry bootstrap V6 candidate V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CANDIDATE_V1`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

Derive one exact static ELF candidate from source-generation V3 merged by #3455.

Bound source generation:

`voidbuye2dormantsourcegen3_aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`

The candidate binds:

- bootstrap V6 source Git blob
  `a317d3dce324337f107909bd6e33e98622b3ef09`,
  106,764 bytes, SHA-256
  `c87110d83029c5c475a6ed1033dfaa1d94c3c173fe7c2e81c4a0daed88e81088`;
- source-generation V3 manifest Git blob
  `6e0630af72111bd9976dcc38cdcdada1904dd067`,
  2,382 bytes, SHA-256
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`;
- the exact static V6 compile contract exercised by the merged V3/V6 source proof;
- a sealed `memfd` source snapshot used as compiler input;
- a stable compiler logical source name via `-x c -` and sealed-source stdin,
  so incidental inherited descriptor numbers are not embedded into the ELF;
- two simultaneously open sealed source descriptors with distinct FD numbers,
  required to produce byte-identical candidate ELFs;
- protected compiler/readelf identities and post-build tool revalidation;
- exact V6 self-test output identity;
- static ELF/no-interpreter/no-`NEEDED` checks.

The mutable checkout source pathname is not compiler input after the sealed source
snapshot is created. The sealed source descriptor number is also not candidate
identity: the proof compiles identical reviewed bytes from two distinct retained
FD numbers through compiler stdin and requires exact ELF byte identity.

## Hosted derivation

Three independent Ubuntu 24.04 jobs each derive:

- canonical `candidate-v1.json`;
- `bootstrap-v6` static ELF.

The compare job requires all three reports and all three ELF files to be
byte-identical, then independently rederives both a fourth time. Each derivation
also proves `compiler_logical_source_name=stdin`,
`distinct_source_fd_numbers_exercised=true`, and
`descriptor_number_not_candidate_identity=true`.

The candidate ID is:

`voidbuye2dormantbootstrapcand3_<sha256(canonical candidate body)>`.

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

After hosted V6 identity settles, a separate V3-generation acceptance lock is
required before any V6 materializer, host-policy, or protected-install work.

PROTECT THE CORE.
