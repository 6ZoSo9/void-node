# Production Epoch-2 RPC target v1

Marker: `VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1`

Tracks #2316.

## Purpose

The repository has multiple economic consumers that need the same production
Chain-2050 execution endpoint. The reviewed target is now selected as the
Precision Epoch-2 QBFT RPC.

The checked-in state is:

```text
status=PRODUCTION_EPOCH2_RPC_TARGET_SELECTED_OBSERVATION_ONLY
production_rpc_target_selected=true
rpc_url=http://127.0.0.1:18553/
```

Selection is source authority only. It does not install/start a runtime or grant
transaction, migration, market, presale, or funds authority.

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
accepting either HOLD or selected state.

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

The selected descriptor uses
`PRODUCTION_EPOCH2_RPC_TARGET_SELECTED_OBSERVATION_ONLY` and is accepted only
when all of the following are present:

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

The canonical loader now requires evidence-aware selected state. It validates
the selected descriptor structurally, requires the exact checked-in
`ops/mainnet0/production-epoch2-rpc-target-promotion-v1.json` manifest, and
then independently re-executes the checked-in selection evidence packet before
selected state can load.

That manifest pins:

- selected candidate SHA-256
  `305ed03eebe49b992db76c21ffd8930e9b6d07ed4a97984cf0e48f33a9df63dd`;
- accepted activation plan/receipt IDs and file hashes;
- accepted independent runtime-observation ID/hash;
- promotion admission
  `voidpe2rpctapply1_f76ce9f3d147a6097910947e3a8735664ff81bea07d1940ebdb663102589b040`;
- admission receipt SHA-256
  `ad5aa3b0a99e967207ff63c3040d3b9786e3f1345769298c25a19eed20477ac5`; and
- source-promotion manifest ID
  `voidpe2rpctprom1_754cf0701f226a8ac47375757a42aa5dc328110ac89346c699b05565813b382f`.

The exact reviewable packet is stored under
`ops/mainnet0/evidence/production-epoch2-rpc-selection-v1/` and contains the
activation plan, activation receipt, accepted runtime observation, selected
candidate, and authoritative promotion-apply-admission receipt.

The loader invokes the source-only
`void-production-epoch2-rpc-selection-evidence-verifier-v1.mjs` in a separate
Node process. That verifier reruns the existing promotion compiler over the exact
activation/observation bytes, requires the recompiled candidate to equal both
the packet candidate and canonical target byte-for-byte, reruns the apply-
admission input validator, recomputes the authoritative admission content ID,
and independently checks historical Git tree identities and ancestor lineage.
Any packet-byte change HOLDs before `evidence_aware_selection_verified=true`
can be returned.

Before the verifier child is started, the parent loader captures one clean,
non-shallow HEAD/tree and discovers the verifier's full relative executable
closure from exact `HEAD:<path>` Git-object bytes. Bare third-party imports are
forbidden on this path.

The loader then creates a private full-history detached checkout at that exact
HEAD outside the repository worktree. Every reviewed module in that private tree
is rebound to its captured Git-blob identity immediately before execution and
again after the child exits. The verifier process runs from that private checkout
under the Node permission model with filesystem reads limited to the private tree
and child-process allowance only for its reviewed absolute-Git provenance reads.
Hidden or `assume-unchanged` worktree mutations therefore cannot become
execution authority for selection verification.

The earlier compiler and apply-admission lanes remain pre-selection proof tools;
they cannot themselves write/select the canonical target.

## Why the WC/VOID preflight HOLD was correct

After #2310 merged, a fresh role/deployment qualification was produced from a
fresh offline launch-controller proof. The live deployment observation was
then attempted against `127.0.0.1:8545` and HOLDed at the RPC boundary.

Current truth classifies `8545` as historical Epoch-1 authority and `18552`
as an isolated/read proof surface. The selected production target is now the
reviewed `18553` QBFT runtime; downstream consumers must rebind through the
central target rather than substitute an endpoint independently.

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

The reviewed private-QBFT activation, independent Precision host/RPC
observation, selected candidate, authoritative apply admission, and canonical
source promotion are now bound. The next operational gate is for each
downstream consumer to rebind to this central target and repeat fresh read-only
preflights before any later transaction/deployment/public-activation authority
is considered.
