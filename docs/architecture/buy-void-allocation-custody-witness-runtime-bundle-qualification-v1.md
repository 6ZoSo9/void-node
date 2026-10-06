# Buy VOID allocation custody witness runtime bundle qualification v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1` is a pure evidence classifier for the exact executable runtime closure used by the V2 Nimo witness forced-command handler.

The V2 entry file imports runtime modules from `../dist/economic/...`, so pinning only the top-level handler Git blob does not bind every byte `/usr/bin/node` will execute.

Live installation requires both the V2 installation qualification and this runtime-bundle qualification. Neither is production authority by itself.

## Reviewed closure

The reviewed census found 8 runtime files, 11 static relative-import edges, zero dynamic `import()` calls, and zero CommonJS `require()` calls.

Manifest ID: `voidwfb1_d8216a536e9e53035aa5216fd6c2023b0de9ee6a003bc67783da77d954cb38c9`

Manifest SHA-256: `sha256:a2b669873302ebe674376e438692b051affb9d1cb25ce36e05e6c29f4262c54d`

Census source commit: `1c69eff28485e5af7c1f9514d4825f637c418c12`

This is a successor to the previously installed bundle identity. Evidence for
the predecessor manifest is historical only; it does not qualify the repaired
handler bytes. A fresh installation/bundle census is required before later
live use.

## Installed layout

The handler remains `/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs`. Its relative imports resolve under `/usr/local/libexec/dist/economic/`.

Every installed runtime file must be root-owned, mode `0444`, single-link, a regular file, not a symlink, and below a root-owned parent chain. Exact absolute paths and SHA-256 values are bound for all eight files.

The focused proof is build-self-contained: when the reviewed `dist/` runtime files are absent (for example in repository-wide source-proof workflows), it runs the repository's deterministic `npm run build` locally before checking the exact eight file hashes and import closure. This creates only local build artifacts in the test checkout; it does not install or execute the Nimo witness runtime.

## Authority boundary

This classifier does not install files, create the `voidwitness` account, alter config, move or rewrite the historical witness, install the continuity attestation, generate a client key, alter `authorized_keys` or sshd, perform SSH, append the witness, integrate runtime admission, activate the presale, access signers, or move funds. All live and production authority remains false.
