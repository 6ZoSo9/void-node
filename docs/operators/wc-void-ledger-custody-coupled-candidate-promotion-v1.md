# WC/VOID ledger + quote-custody coupled-candidate promotion v1

Marker: `VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1`

Status: source-only promotion/admission preparation. It does not read the live
WC ledger, update the checked-in coupled candidate, activate WC/VOID, open the
presale, access a wallet/signer/key, submit a transaction, or move funds.

## Purpose

Current main already contains two separate reviewed mechanisms:

1. `VOID_WC_VOID_LEDGER_PERSISTENCE_V1` can inspect the canonical WC opening
   append window under bounded stable custody; and
2. `VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1` can bind one exact verifier
   receipt to a separately reviewed opening settlement set.

A valid imported result may establish:

```text
wc_ledger_persistence_verified=true
quote_reserve_custody_verified=true
production_candidate_binding_allowed=true
production_candidate_updated=false
```

The checked-in coupled candidate still deliberately records both gates as
`false`. This tool defines the missing **preparation** step between a future
real imported receipt and a later reviewed canonical-candidate update.

## No fabricated evidence

This lane does not create production ledger evidence.

The input to the promotion tool is the exact input that the existing importer
consumes:

```json
{
  "expected": { "...": "reviewed opening binding" },
  "evidence": { "...": "real ledger persistence verifier receipt" }
}
```

The promotion tool reruns
`importWcVoidLedgerPersistenceV1(...)` itself. It does not trust a caller's
summary that persistence or custody was verified.

The import-input file must be:

- an absolute canonical path;
- a direct regular file, opened once with `O_NOFOLLOW`;
- private against group/other access;
- byte bounded;
- stable by device/inode/size/mtime/ctime through the read;
- strict UTF-8 JSON;
- exact two-space JSON plus one terminal newline; and
- equal to a separately reviewed raw-file SHA-256 supplied to the command.

The builder recomputes that same standard-file digest from the parsed input so a
library caller cannot pair unrelated input bytes with a claimed reviewed digest.

## Fixed production-candidate sources

The caller cannot choose the coupled candidate or successor-migration candidate.
The command always reads:

```text
ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json
ops/mainnet0/economic-evm-successor-migration-candidate-v1.json
```

Both standard file digests are recomputed inside the pure builder.

The current checked-in coupled candidate explicitly labels its shared
post-discovery reconciliation as a **source-model fixture** rather than
runtime/launch evidence. This promotion mechanism does not upgrade that status.

Most importantly, the imported persistence evidence must carry the **same exact
`coupled_launch_id`** as the fixed candidate. A valid receipt from a different
launch is rejected. If the production launch identity later changes, that
candidate transition is a separate reviewed source change; this tool does not
silently rewrite it.

## Exact two-gate transition

The fixed candidate must begin:

```text
status=HOLD
wc_ledger_persistence_verified=false
quote_reserve_custody_verified=false
coupled_activation_ready=false
```

and the existing coupled-gate classifier must report both:

```text
wc_ledger_persistence_verification_required
quote_reserve_custody_verification_required
```

A successful promotion artifact changes a candidate **copy** only:

```text
wc_ledger_persistence_verified: false -> true
quote_reserve_custody_verified: false -> true
```

No other candidate field may change. The prestate is reconstructed from the
promoted copy and must be canonical-JSON identical to the original candidate.

The existing classifier is run again after the two flips. The missing-gate list
must equal the original list with exactly those two requirements removed. The
candidate must still classify `HOLD`, with market/presale/funds authority
remaining false.

## Promotion artifact

A green preparation emits one create-only private JSON artifact containing:

- exact source candidate and successor-candidate file digests;
- exact reviewed import-input raw-file SHA-256;
- canonical import-input SHA-256;
- persistence import ID and review-binding ID;
- source verifier receipt digest;
- exact coupled launch ID;
- settlement adapter, prestate offset, settlement-set root, settled WC total and
  expected settlement count;
- the promoted candidate copy and content digest;
- before/after classifier results; and
- content-addressed `voidwclccp1_<sha256>` promotion ID.

It explicitly retains:

```text
canonical_candidate_file_updated=false
candidate_promotion_application_required=true
coupled_activation_ready=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

## Command

After independently reviewing the exact real importer-input bytes:

```bash
node tools/void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs prepare \
  --import-input /absolute/ledger-persistence-import-input.json \
  --import-input-sha256 <64-hex-reviewed-file-sha256> \
  --output /absolute/ledger-custody-promotion.json
```

The output is evidence only. Applying its candidate copy to canonical source is
a separate reviewed transition.

## Current launch truth

This source lane does **not** claim that a real production ledger-persistence
receipt currently exists. Synthetic proof fixtures are not launch evidence.

Other independent coupled gates—including durable opening claim binding,
participant-control promotion, bounded canary and final coupled activation—remain
separate. A source-green promotion mechanism is not a launch authorization.

## Authority boundary

This lane authorizes no:

- production WC-ledger read or write;
- WC balance mutation;
- runtime/service mutation;
- credential/private-key/wallet/signer access;
- external network request or RPC;
- transaction construction, signing, submission or broadcast;
- authoritative Chain-2050 write;
- inventory funding or liquidity movement;
- market activation;
- public presale activation; or
- funds movement.

## Proof

```bash
node --check tools/void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs
node --check scripts/prove_void_wc_void_ledger_custody_coupled_candidate_promotion_v1.mjs
node scripts/prove_void_wc_void_ledger_custody_coupled_candidate_promotion_v1.mjs
```

The proof uses only local synthetic ledger-import input. It never treats that
fixture as production evidence.
