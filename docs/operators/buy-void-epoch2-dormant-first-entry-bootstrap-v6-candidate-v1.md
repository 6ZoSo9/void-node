# Buy VOID Epoch-2 dormant first-entry bootstrap V6 candidate V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CANDIDATE_V1`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

Derive one exact static ELF candidate from the source-generation V3 compatibility repair for standard Git cruft-pack `.mtimes` metadata.

Bound source generation:

`voidbuye2dormantsourcegen3_8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`

The candidate binds:

- bootstrap V6 source Git blob
  `560726bcae6ea0738502cb5e74b65f9116bd447d`,
  106,792 bytes, SHA-256
  `ac8673f51e4325e3ed1912a4f628cc3715c7199cda1c3cbdacbbcb710ae6b145`;
- source-generation V3 manifest Git blob
  `de56bacb30bea0adc418e240cf3fb8d900b061ef`,
  2,382 bytes, SHA-256
  `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`;
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

The candidate ID remains content-addressed:

`voidbuye2dormantbootstrapcand3_<sha256(canonical candidate body)>`.

Precision independently derived the repaired generation four times with identical bytes:

- candidate ID `voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`;
- ELF SHA-256 `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`;
- ELF bytes `874608`;
- ELF Git blob `b577d70666f98ac59a75b84b3dab741fe7b93a4b`.

Hosted acceptance still requires the three GitHub derivation lanes and independent compare job to reproduce those identities exactly.

## Authority

This is candidate evidence only:

- `candidate_accepted=false`;
- `binary_identity_accepted=false`;
- `protected_install_authorized=false`;
- `live_execution_authorized=false`;
- credential/private-key/signing authority false;
- transaction/RPC/payment/presale/WC/treasury/funds authority false;
- production-host evidence authority false.

The observed compatibility defect was a legitimate `pack-<oid>.mtimes` cruft-pack metadata file in Precision's `.git/objects/pack`. The repaired observer treats `.mtimes` exactly like the already non-authoritative `.rev`, `.bitmap`, and `.keep` auxiliaries: it may be present only as a single-link regular file and is never copied into the private object view.

No Precision protected-install mutation occurs.

After hosted V6 identity settles, a separate V3-generation acceptance lock is
required before any V6 materializer, host-policy, or protected-install work.

PROTECT THE CORE.
