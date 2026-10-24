# VOID V7 static privilege bridge V1 — source review

**Status: merged source-review control; source/test/CI only. No production authority.**

## Evidence basis

On Precision, an unprivileged, fully-static Python 3.12.15 experiment with built-in modules _voidfs, _voidpriv and _ctypes passed an isolated-path test and capability-boundary census:

- experimental ELF SHA-256: d4b61c19a21ca0b95a058c32760cb9a76b7942ee9ca13e46844522d2d4c4cfa4;
- closed stdlib ZIP SHA-256: 842e7392c9392379bd345bc559c41ac0da923c97afd63c4fadc56ad5bd2d6b50;
- experimental bridge C source SHA-256: a6f125fb407b5b9b4f94a6cd1f8bc4647353352387afd55b5ec9c37f45b3ebac;
- operator markers: VOID_V7_STATIC_PRIVILEGE_BRIDGE_EXPERIMENT_GREEN and VOID_V7_CAPABILITY_BOUNDARY_CENSUS_GREEN;
- observed: NoNewPrivs=1; CapInh, CapPrm, CapEff and CapAmb zero; CapBnd=000001ffffffffff (NOT zero); no root transition, protected install or service mutation.

The C file proposed here is **not identical to the source in that experimental ELF**: this review revision additionally rejects primary GID 0 before clearing capabilities, alongside existing UID 0 and unstable saved-ID rejection. Do not claim the experimental ELF validates the revised source. The focused CI compiles this exact revised C source as a built-in to a disposable **hosted** interpreter. A new exact-source static candidate would need independent subsequent evidence.

## Minimal native API

Module _voidpriv exposes exactly:

1. set_no_new_privs(): direct Linux x86-64 prctl syscall to set and check NoNewPrivs=1.
2. clear_capabilities(): requires stable matching real/effective/saved nonzero UID and GID, NoNewPrivs=1, then clears ambient and process capability sets using direct Linux x86-64 prctl and capset syscalls.

No ctypes, CDLL(None), dlsym, dlopen, host shared-library fallback, shell, external helper, process identity mutation, ordinary rename, or _voidfs functionality is introduced.

The native module does not clear CapBnd, supplementary groups, or saved IDs. The protected V5 source-stage caller must retain its own exact UID/GID, group, NoNewPrivs and process-status verification. No claim that all capabilities are cleared is permitted while CapBnd remains nonzero.

## Future source/receipt-stage successor review requirements

1. Set NoNewPrivs in the intended child before its credential drop.
2. Keep exact os.setgroups([]), os.setgid(runtime_gid), os.setuid(runtime_uid), and real/effective/saved UID/GID + supplementary-group verification.
3. Call the native capability-clear API only after the identity drop. Verify CapInh, CapPrm, CapEff, CapAmb and NoNewPrivs from the actual process. Report CapBnd and specify the acceptance policy separately.
4. Replace the canonical source/receipt installers' ctypes.CDLL(None).renameat2 publication with the separately reviewed built-in _voidfs rename_noreplace. Preserve retained same-parent FD, ASCII distinct-leaf contract, atomic RENAME_NOREPLACE, EEXIST preservation, publication/fsync ordering, and after-state reconciliation.
5. Update both installer self-tests, manifest/launcher root-of-trust source pins, build inventory, proofs, exact source blobs, and independent security review before any staged or privileged apply.

Current canonical V5 staging #3719 still uses dynamic symbol lookup for renameat2, prctl and syscall; #3726 currently accepts only narrow manifest-candidate derivation, not production manifest authority.

## Focused proof

The hosted workflow is intentionally **pull-request only**. Manual `workflow_dispatch` is not accepted because this proof's reproducibility depends on GitHub's immutable pull-request base/head tuple. Post-merge successor PRs must remain confined to the four reviewed bridge paths, pass committed base→head diff hygiene, and preserve the pinned C/proof/document identities unless an explicitly reviewed successor updates them.

Run as an ordinary user on Linux x86-64:

    python3 -I -B scripts/prove_void_v7_static_privilege_bridge_v1.py

The test binds the revised source SHA-256, compiles a disposable hosted interpreter embedding _voidpriv via PyImport_AppendInittab, and verifies NoNewPrivs=1, the four zero process capability sets, unchanged CapBnd and identities, two public API methods, and error handling. The hosted build and its disposable child **never run as root**.

The proof does NOT qualify fully static CPython closure, same-UID-resistant immutable snapshots, CapBnd zero, root-to-unprivileged transition, production staging, source seals, manifest acceptance, or presale readiness.

## Authority boundary

This is a merged source-review control only, not production authority. Any successor that changes the native bridge or its proof requires fresh independent review before protected use. No runtime authority, no root execution, protected install, host service changes, credentials/signing, transactions, public presale/WC activation, or funds movement.

PROTECT THE CORE.
