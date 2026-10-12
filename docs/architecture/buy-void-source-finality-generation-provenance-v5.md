# Buy VOID source-finality generation provenance V5

## Purpose

V5 is the reviewed-source successor to historical V4 after the canonical
verified-payment V2 verifier changed its payment-log-index domain.

V4 remains historical evidence for its exact five reviewed source identities.
V5 preserves the four unchanged source identities and rolls only the verified
payment source identity to the reviewed bytes that enforce the canonical uint32
`voidpay1:<chain>:<tx_hash>:<log_index>` domain and classify overflow only
after per-log receipt provenance is established.

V5 remains source provenance only. A successful V5 source check does not by
itself attest the executing compiled or deployed artifact.

## Reviewed source set

V5 verifies exactly five runtime source files:

1. `src/economic/buy_void_source_finality_authenticated_composition_v3.ts`
2. `src/economic/buy_void_source_finality_authority_v2.ts`
3. `src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts`
4. `src/economic/buy_void_payment_rpc_observer_v1.ts`
5. `src/economic/buy_void_verified_payment_v2.ts`

The first four retain their historical reviewed commit/blob identities. The
verified-payment source is bound to Git blob
`c0e4660bb238e1b718b8a471890901bd5a59badf`.

Each record carries a reviewed commit containing the exact recorded blob. The
runtime verifier derives paths from `import.meta.url`, rejects symlink or
non-regular files, requires a bounded single-link file, reads through a
descriptor, checks stability across the read, recomputes Git blob SHA-1, and
requires exact equality with the internal reviewed record.

## Composition and deadline

V5 verifies the reviewed source set before dynamically entering the unchanged V3
authenticated source-finality composition. The original total deadline begins
before source verification. Only the remaining budget is passed to V3, and the
deadline is checked again after composition.

Caller-supplied commit, blob, source-generation, or verification assertions are
not accepted as authority.

## Historical V4

V4 is not rewritten to accept the new verified-payment bytes. Its prior
commit/blob mappings remain historical evidence and are checked separately by
`prove_buy_void_source_finality_generation_provenance_v4_historical.ts`.

## Downstream artifact rollover

Because one reviewed runtime source changed, the old compiled V2 generation and
old package/enforcement artifact identities cannot authorize the new bytes.

The required successor chain is:

```text
V5 reviewed source generation
  -> compiled source-finality artifact attestation V3
  -> enforcement artifact successor
  -> packaged/final-image successor
  -> runtime/deployment qualification
```

Historical predecessor manifests remain immutable.

## Authority boundary

V5 may read the reviewed source files and perform the existing bounded
source-finality observation. It does not write source/runtime state, mount a
runtime route, access wallets or signers, construct/sign/broadcast transactions,
mutate Chain-2050 or inventory, activate the presale/market, or move funds.

`source_generation_verified=false`,
`deployed_artifact_generation_verified=false`, and
`production_source_finality_authority_ready=false` remain required until later
artifact/deployment gates independently close.
