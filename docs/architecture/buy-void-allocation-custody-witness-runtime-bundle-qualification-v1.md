# Buy VOID allocation custody witness runtime bundle qualification v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1` is a pure evidence classifier for the exact executable runtime closure used by the V2 Nimo witness forced-command handler.

The V2 entry file imports runtime modules from `../dist/economic/...`, so pinning only the top-level handler Git blob does not bind every byte `/usr/bin/node` will execute.

Live installation requires both the V2 installation qualification and this runtime-bundle qualification. Neither is production authority by itself.

## Reviewed closure

The reviewed census found 8 runtime files, 11 static relative-import edges, zero dynamic `import()` calls, and zero CommonJS `require()` calls.

Manifest ID: `voidwfb1_3a680125403ce20ff3f20c37b9f6aae7a3cbf550c2d0b1883a7fc9130e6a7f21`

Manifest SHA-256: `sha256:887543aac385cc9bba9535de145548efdbfa97590837ba6048d210fd527f3940`

Census source commit: `8a5c7ab1543b9270164adac11a40de46df5388e2`

## Installed layout

The handler remains `/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs`. Its relative imports resolve under `/usr/local/libexec/dist/economic/`.

Every installed runtime file must be root-owned, mode `0444`, single-link, a regular file, not a symlink, and below a root-owned parent chain. Exact absolute paths and SHA-256 values are bound for all eight files.

The focused proof is build-self-contained: when the reviewed `dist/` runtime files are absent (for example in repository-wide source-proof workflows), it runs the repository's deterministic `npm run build` locally before checking the exact eight file hashes and import closure. This creates only local build artifacts in the test checkout; it does not install or execute the Nimo witness runtime.

## Authority boundary

This classifier does not install files, create the `voidwitness` account, alter config, move or rewrite the historical witness, install the continuity attestation, generate a client key, alter `authorized_keys` or sshd, perform SSH, append the witness, integrate runtime admission, activate the presale, access signers, or move funds. All live and production authority remains false.
