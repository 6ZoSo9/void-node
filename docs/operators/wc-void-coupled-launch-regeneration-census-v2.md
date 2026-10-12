# WC/VOID coupled-launch regeneration census v2

Marker: `VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_V2`

Status: **corrected generation atomic rebind source-green; runtime/economic action HOLD**.

## Purpose

The compiled-identity correction changes the WC/VOID coupled-launch commitment.
The corrected launch identity is:

```text
sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d
```

and the corresponding vault bytes32 is:

```text
0xb893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d
```

Historically, the pre-application form of this census only derived the corrected
identity and inventoried authoritative source bindings still tied to the
superseded `fe02b5...fdc26` generation. That historical behavior is preserved
as lineage.

On the current #2533 source generation, the atomic rebind has been applied across
the reviewed current-authority set. The census now requires and reports:

- `status=CORRECTED_GENERATION_ATOMIC_REBIND_SOURCE_GREEN`;
- `remaining_superseded_authoritative_path_count=0`;
- `all_authoritative_rebindings_complete=true`;
- `remaining_superseded_compiled_identity_consumer_count=0`; and
- `all_current_authority_compiled_identity_rebindings_complete=true`.

The census still independently rederives the corrected identity from the
corrected compiler artifacts plus the unchanged canonical presale/WC-opening
policy and retains explicit superseded lineage as non-authoritative historical
evidence.

The correction input is accepted only through the canonical #2435 correction
verifier against the superseded v1 acceptance packet; a copied set of corrected
hash constants or a forged correction ID is insufficient. The census also
performs a bounded scan of current source-authority roots for the superseded
digest. Exact-head proof requires the discovered set to contain all 14
authoritative paths and only the explicitly classified correction/census/
historical source files beyond them. Any unknown old-generation source pin or
partial authoritative rebind fails closed.

The census also inventories a second dependency class that does not necessarily
contain the old launch digest: current authority surfaces that directly carry
the superseded V1 market-vault creation/runtime hashes or import the V1 compiled
identity acceptance module. That class is scanned independently, so correcting
the launch-ID pins alone cannot make the rebind appear complete while production
readiness, runtime attestation, canonical application, bounded-canary evidence,
or related vault checks still consume the superseded deployment identity.

A launch-wide identity is not safe to migrate by search/replace. Candidate
state, runtime admission, policy bundles, vault revalidation, controller
challenges, offline signing requests, canary promotion, participant post-use
checks, deployment qualification, and live observation must agree on one exact
generation.

## Corrected derivation

The derivation binds:

- Chain 2050 / execution epoch 2;
- canonical presale pool: 10,000,000 VOID;
- canonical rate: 2 VOID per 1 USDC;
- existing WC/VOID opening inventory and settlement policy;
- compiled identity
  `voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a`;
- corrected creation SHA-256
  `84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540`;
- corrected runtime-template SHA-256
  `99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e`;
- unchanged immutable-layout SHA-256
  `61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b`;
- simultaneous presale/WC-VOID launch ordering.

Canonical JSON SHA-256 of that commitment is exactly the corrected
`b893f68c...1d75a3d` generation.

## Authoritative rebind census

The census treats the following as the current-authority bindings that had to be
reviewed and rebound together. On the current #2533 generation all 14 are
required to carry the corrected generation, and any remaining superseded pin
fails closed:

1. canonical coupled-economic candidate;
2. coupled-economic source classifier;
3. Buy VOID coupled-launch runtime gate;
4. WC/VOID vault at-use revalidation;
5. coupled-launch policy bundle;
6. bounded-canary semantic promotion;
7. coupled-launch reviewed policy core;
8. bounded-canary candidate promotion;
9. participant post-purchase at-use revalidation;
10. bounded-canary canonical application;
11. launch-controller control requalification;
12. Nimo launch-controller signing request;
13. market-vault role/deployment qualification;
14. market-vault live-deployment observation preflight.

The v1 reconciliation generator and its documentation are historical lineage,
not current generation authority. They must remain explicitly superseded rather
than being rewritten to pretend the old generation never existed.

The parent corrected-generation derivation tool
`tools/void-wc-void-coupled-launch-regeneration-v2.mjs` also intentionally
retains the superseded generation as derivation input lineage. It is classified
as a non-authority source surface; discovering that old digest there is expected
and must not be mistaken for another current rebind consumer.

### Superseded compiled-identity consumers

The current #2533 corrected-generation application also requires these nine
current consumers of the old V1 deployment identity to be rebound. The exact
current census requires zero remaining superseded compiled-identity consumers:

1. WC/VOID production candidate;
2. production-readiness classifier;
3. market-vault runtime attestation;
4. runtime-attestation import;
5. market-vault canonical application;
6. bounded-canary evidence;
7. bounded-canary candidate promotion;
8. market-vault at-use revalidation; and
9. market-vault role/deployment qualification.

The V1 compiled-identity acceptance JSON/module and the V1 launch-identity
reconciliation tool remain explicit historical lineage. The correction-v2
packet/verifier and this census are non-authority evidence surfaces. Any other
source-authority path that still carries the superseded creation/runtime hashes
or imports the V1 acceptance module makes the census fail closed.

## Fail-closed rule

The current #2533 census deliberately reports
`all_authoritative_rebindings_complete=true` only when the full reviewed set
is on the corrected generation. It also requires
`all_current_authority_compiled_identity_rebindings_complete=true`.

Source-green rebind completion is not live authority. In particular:

- the old control signature is not reusable;
- old signing requests are not reusable;
- old live-activation receipts are not reusable;
- a mixed old/new authoritative source set is HOLD;
- deployment is not authorized;
- inventory funding is not authorized;
- market activation is not authorized;
- public presale activation is not authorized; and
- funds movement is not authorized.

## Verification

```bash
node scripts/prove_void_wc_void_coupled_launch_regeneration_census_v2.mjs
node tools/void-wc-void-coupled-launch-regeneration-census-v2.mjs
git diff --check
```

## Next gate

`fresh_corrected_generation_control_ceremony_then_read_only_vault_observation`

The source rebind is complete, but old controller signatures, signing requests,
and live-activation receipts are not reusable for the corrected generation.
The next reviewed lifecycle step is therefore a fresh corrected-generation
control ceremony, followed by read-only vault observation. This census does not
authorize signing, deployment, inventory funding, runtime activation, market or
public-presale activation, Chain-2050 mutation, treasury/liquidity action, or
funds movement.
