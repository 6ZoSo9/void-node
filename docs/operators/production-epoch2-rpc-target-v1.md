# Production Epoch-2 RPC target v1

Marker: `VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1`

Tracks #2316.

## Purpose

The repository currently has multiple economic consumers that need the same
production Chain-2050 execution endpoint, but no authoritative Epoch-2 RPC
target has been selected.

This contract makes that absence one canonical fact instead of allowing
DataNet, participant-finality, WC/VOID deployment, or Buy VOID lanes to invent
their own endpoint.

The checked-in state remains:

```text
status=HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED
production_rpc_target_selected=false
rpc_url=null
```

This source slice does not install or start a runtime and does not promote any
existing endpoint.

## Reviewed successor identity

Any future selected target must bind the already-reviewed Epoch-2 successor:

- Chain ID: `2050`;
- execution epoch: `2`;
- client: Besu `26.8.1`;
- pinned Besu image digest;
- production-equivalent genesis SHA-256
  `6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941`;
- genesis block hash
  `0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d`;
- genesis state root
  `0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2`;
- exact client-neutral state manifest; and
- exact reviewed QBFT production extra-data identity; and
- exact promoted production-successor equivalence evidence
  `ops/mainnet0/economic-epoch2-production-successor-equivalence-evidence-v1.json`,
  SHA-256
  `5006aa32a298c0fbcea6395e75201af66fedacde5b664ac953699dfb2f0c061b`,
  evidence ID
  `voide2pse1_a10332cc6dcd89bc0988d865946185a22e9a448ce94bde7861512af2b1b8e973`.

The validator checks the current state-manifest and QBFT file bytes before
accepting even the HOLD descriptor.

## Explicitly forbidden targets

The following surfaces cannot become production authority through endpoint
substitution:

```text
http://127.0.0.1:8545/   historical Epoch-1/private execution archive
http://127.0.0.1:18550/  isolated successor-equivalence RPC
http://127.0.0.1:18551/  isolated Besu free-gas proof RPC
http://127.0.0.1:18552/  isolated/public-read successor replica
```

The 18552 replica is useful read evidence. It is not a long-lived production
write target and must not be silently promoted.

The raw QBFT extra-data artifact predates the later promotion and still records
`production_validator_set_bound=false`. The reviewed production-successor
equivalence promotion subsequently establishes
`production_validator_set_bound=true`, offline successor equivalence,
production validator epoch-domain enforcement, and cross-epoch replay
protection while retaining write/migration authority false.

The target contract therefore binds that exact promoted evidence. A future
selected runtime must cite the exact evidence path + SHA-256 above; a caller
cannot substitute an arbitrary new file merely because it is under
`ops/mainnet0/`.

## Existing reviewed activation path

The repository already defines the production-capable private QBFT runtime
ceremony. Its activation plan fixes:

- Precision RPC: `http://127.0.0.1:18553/`;
- service unit on each host:
  `void-economic-epoch2-qbft-validator-v1.service`;
- start order: Precision, Nimo, Xiphos;
- two-of-three quorum at the Nimo start;
- exact three-validator roster; and
- transaction methods forbidden during activation observation.

A green
`VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_RECEIPT_V1`
proves block progression and authoritative successor block production, while
transaction construction/signing/submission/broadcast and funds movement remain
false.

Therefore the central RPC target contract accepts **only** `18553` and the
exact reviewed service identity for its future selected state. Selection also
requires a content-addressed activation plan + activation receipt and a later
independent host observation. No arbitrary spare loopback port can be promoted.

## Selected-state contract

A future selected descriptor may use
`PRODUCTION_EPOCH2_RPC_TARGET_SELECTED_OBSERVATION_ONLY` only when all of the
following are present:

- exact reviewed RPC URL `http://127.0.0.1:18553/`;
- URL SHA-256 fingerprint;
- exact systemd service identity
  `void-economic-epoch2-qbft-validator-v1.service`;
- content-addressed private-QBFT activation plan ID;
- content-addressed green private-QBFT activation receipt ID + file SHA-256;
- content-addressed runtime host-observation ID and artifact SHA-256;
- runtime active verification;
- exact reviewed successor genesis binding;
- production validator-set binding plus the reviewed source path and SHA-256 of
  the validator-binding evidence that established it;
- write-capability classification
  `write_capable_not_authorized`; and
- independent host acceptance.

Even that selected-state **structure** grants no transaction, signing,
submission, broadcast, migration, market, presale, or funds authority.

More importantly, this v1 canonical loader is deliberately HOLD-only. It will
reject a checked-in selected descriptor with
`production_epoch2_selected_target_requires_evidence_aware_promotion`.
Plausible-looking activation/observation IDs in JSON are not evidence by
themselves.

A later evidence-aware promotion lane must consume and semantically reverify the
exact private QBFT activation receipt bytes plus a fresh independent host
observation before it may write/select the production target. Only after that
reviewed promotion exists should downstream consumers rebind and repeat fresh
read-only preflights.

## Why the WC/VOID preflight HOLD was correct

After #2310 merged, a fresh role/deployment qualification was produced from a
fresh offline launch-controller proof. The live deployment observation was
then attempted against `127.0.0.1:8545` and HOLDed at the RPC boundary.

Current truth classifies that endpoint as historical Epoch-1 authority, while
the production Epoch-2 target remains `null`. Pointing the preflight at 18552
would also be invalid because it is an isolated/read surface. The correct
repair is this central target-selection gate, not endpoint substitution.

## Verification

```bash
node tools/void-production-epoch2-rpc-target-v1.mjs
node scripts/prove_void_production_epoch2_rpc_target_v1.mjs
```

The structural validator proof also constructs a synthetic selected-state
object using the exact
reviewed `18553`/service identities plus fake content-addressed receipt IDs to
exercise the future schema. It explicitly rejects an arbitrary alternate
loopback port, wrong service identity, and missing activation lineage. The
synthetic object is test data only and creates no runtime or production
evidence.

## Authority boundary

```text
source_only=true
rpc_call=false
service_action=false
credential_access=false
wallet_or_signer_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
validator_mutation=false
migration_authorized=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

The next operational gate is a separately reviewed real production successor
runtime and a fresh independent host observation. This contract alone cannot
select one.
