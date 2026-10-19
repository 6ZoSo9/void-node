# Buy VOID Epoch-2 repaired protected-bootstrap materializer V3

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_MATERIALIZER_V3`.

Status: **source/CI artifact materialization only**.

## Purpose

This is the materializer successor to canonical acceptance lock V4 from #3432.

It rederives the accepted repaired V3 bootstrap from the exact canonical source
generation and emits a create-only mode-`0555` ELF for a later install gate.
It does not write under `/opt`, execute the bootstrap in a privileged mode, or
invoke the inner protected installer.

## Accepted canonical generation

V4 lock:

`voidbuye2bootstraplock4_6568c1cd0195405d49001fbf6cb9a086364e401f78f3bfcf1d6cbb080947cb67`

Lock Git blob:

`57ecc08d465fe2a3c395546d349864312cd08a3f`

Canonical candidate source:

- head: `78875f7379c2dd995e1b545dd0543c934e59907a`;
- tree: `a2c1b6b9989ceb11c4fbea3f2fc4ecf64eb50176`;
- candidate proof blob:
  `1c49abf74e464b3d509a33e2fa3f1a9acc42c771`;
- candidate ID:
  `voidbuye2bootstrapcand3_9e914f52eb3cde5a5fef42fbdf065b375f89fdabb768034b09615861bba67ce3`.

Candidate report:

- bytes: `4789`;
- SHA-256:
  `90f70f1dbabd71bc97860608a3650331b1ed6efb007c64f2257e4523e2362050`;
- Git blob:
  `a94f63689f7a1e1ca63cd3051aec84cf89b74d46`.

Accepted repaired V3 bootstrap ELF:

- bytes: `731072`;
- SHA-256:
  `904e6b05df45bc9212be7689ea0617ccfbf65d5edf8535a381abcbb588f236cd`;
- Git blob:
  `69e3bf6db7baf614eb0b7d8c5e93aafce0deab46`.

The accepted candidate binds repaired inner installer V2 blob
`69a018c0eccedf3782055c56725579d02463b05e`, 58,454 bytes, SHA-256
`6db5c9520af7070056acfd854d79219053fbcb561f63e7530423974ddd80562a`.

## Deterministic rederivation

The materializer requires V4 on the current clean repository, creates a detached
worktree at exact candidate head `78875f73...`, loads the exact candidate proof
bytes, and calls its deterministic derivation.

The report and ELF must match all identities above exactly.

No downloaded CI artifact is trusted as the source of executable bytes.

## Create-only output

The output parent must already exist. The output leaf is created with
`O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`.

The retained descriptor is fully written, chmodded to `0555`, fsynced,
rewound/read back, matched against the exact expected bytes/SHA/Git blob, checked
against the visible inode, and followed by parent-directory fsync.

Duplicate output fails closed.

An uncertain post-create failure does not delete the visible output pathname by
name.

## Historical locks

V4 requires:

```text
canonical_main_candidate_authority=true
superseded_v3_lock_install_authority=false
superseded_v2_lock_install_authority=false
superseded_v1_lock_install_authority=false
```

The materializer preserves those boundaries in both self-test and derive
receipts.

## Runtime-head contract

The V3 bootstrap remains runtime-head based:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_bootstrap=true
```

Its fixed inner installer is repaired protected installer V2.

## Authority

Materialization does not authorize or perform:

- writes under `/opt`;
- protected-bootstrap installation;
- protected-installer apply;
- live bootstrap/native/binder execution;
- credential/private-key access;
- signing;
- RPC/transaction;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

Next source gate:

`void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v3`.

**PROTECT THE CORE.**
