# Buy VOID credential-query ELF lock V3 repaired

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V3_REPAIRED`.

Status: **binary acceptance only; no replacement or live-query authority**.

## Why this is a new lock

Historical Draft #3264 accepted the predecessor V3 candidate generation from
head `33ee23d7...`. Review later proved that generation did not fully bind the
native toolchain closure and did not require the accepted V2 preexec identity
before candidate publication.

Repaired candidate #3262 fixed those gaps and produced a new hosted generation
at exact candidate head:

`a8f133c7542491af1e48018e917f0cbcd73cf15f`.

The candidate itself must remain tied to that exact historical producing tree.
A later attempt to restack its three candidate files onto current main correctly
failed the candidate's own exact-scope guard. The repaired lock therefore does
not weaken or repin the candidate proof.

## Hosted repaired candidate

Hosted run: `38852664866`.

Artifacts:
- A: `12025587886`,
  digest `sha256:00cffbe37139a597d9d74f729a8c1e5169ab3df69344c015963af761fd486e69`;
- B: `12025533003`,
  digest `sha256:a8e90b3f570420f8c755975415cf3cd18acf0a7a606baf7ff42159708de20c32`;
- C: `12025933150`,
  digest `sha256:ce5d6a2c398a69b3e1c0545b5ebdef501b41e4d4e13941e8756fa4fcf353a285`.

Exact accepted evidence:
- candidate ID
  `voidbuyumqcredelfcand3_b5c405437bd40582908e097a6f021bd575315d018a9d8457af6549458cbe0922`;
- metadata: 62,948 bytes,
  SHA-256 `4ec781f2fb9a8e6c84246c12d7634f895f93b1c5cbc7cda07ce655a4475b55b2`,
  Git blob `8892892149203a027872034cbe4521c147d03e46`;
- static preexec: 706,504 bytes,
  SHA-256 `67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c`;
- V3 query: 47,160 bytes,
  SHA-256 `d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923`.

The candidate metadata binds the resolved compiler driver, cc1, assembler,
collect2, linker, strip, GCC specs/search directories, preprocessed source,
compile objects, closed ordered linker traces, every accepted link input, and
the exact V2 predecessor preexec identity.

## Acceptance proof

The lock proof runs from current main, but it does not execute the candidate
derivation against the current main tree.

Instead it:

1. verifies the current lock tree still carries the exact reviewed V3 query,
   query proof, V2 preexec, preexec proof, peer guard and V2 predecessor lock;
2. verifies source parent `6d8d0725...` is an ancestor of exact candidate
   head `a8f133c7...`;
3. requires that the historical candidate head differs from that source parent
   by exactly the three reviewed candidate files;
4. creates a temporary detached Git worktree at the exact candidate head;
5. executes the original repaired candidate proof there with
   `--derive-dir`;
6. requires the rederived metadata bytes/SHA/Git-blob/candidate ID and both
   binaries to match the hosted repaired generation exactly;
7. removes the detached worktree;
8. deterministically rederives and byte-compares this lock.

The 62-KiB hosted metadata report is not duplicated into the repository. Its
exact digest/size/Git-blob/candidate ID are locked, and the complete report is
reconstructible from the exact producing tree and proof after hosted artifacts
expire.

## Lock

`voidbuyumqcredelflock3r_8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34`

V2 predecessor:

`voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54`

## Authority boundary

This lock sets only `candidate_accepted=true`.

It keeps:
- `replacement_authorized=false`;
- `live_query_authorized=false`;
- `credential_contents_read=false`;
- `production_host_evidence_authority=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `transaction=false`;
- `funds_movement=false`.

No Precision protected replacement, live credential query, credential-content
read, private-key/signer access, service/systemd mutation, payment acceptance,
transaction, presale/WC activation, treasury/liquidity action, or funds
movement is authorized.

The next gate is a separately reviewed protected V2-to-V3 credential-query
replacement generation that consumes this exact repaired lock.

PROTECT THE CORE.
