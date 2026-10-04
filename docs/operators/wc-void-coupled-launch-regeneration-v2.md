# WC/VOID coupled launch regeneration v2

Marker: `VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_V2`

Status: **source-only corrected generation derivation; not applied**.

This lane follows the market-vault compiled-identity correction v2. It does not
rewrite the historical `fe02…` generation in place. Instead it deterministically
derives a new coupled-launch generation from the retained compiler identity:

- creation bytecode SHA-256
  `84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540`;
- runtime template SHA-256
  `99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e`;
- immutable layout SHA-256
  `61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b`.

The corrected coupled launch ID is:

`sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d`

with vault bytes32:

`0xb893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d`.

The corrected source-model derived identities are:

- WC opening state:
  `sha256:8f027c95e3b2376a50957600c57e9afe4c0e06422de05f1f8691fe44f0da54af`;
- shared reconciliation:
  `sha256:9b74e695f3988b4bcaa7abcdbdb767ea927fc294440a1ff2ecfbcd4db9bf7f04`.

The tool re-derives the current `fe02…` source-model state first and requires
an exact match with the canonical candidate. Only then does it derive the
corrected opening-state and shared reconciliation IDs using the same canonical
opening and shared-market modules.

This stage does **not** update:

- the canonical coupled-successor candidate;
- classifiers;
- canary bindings;
- participant at-use bindings;
- launch-controller signing domain;
- market-vault qualification;
- any runtime state.

The later atomic application must also rebind every current consumer of the
superseded V1 compiled identity, even where the old coupled-launch ID is not
present literally. That includes production readiness, market-vault runtime
attestation and import, market-vault canonical application, and bounded-canary
evidence, in addition to the launch-ID authority surfaces. The migration plan
now carries the complete 9-consumer compiled-identity set identified by the
regeneration census; a launch-ID-only migration is explicitly incomplete.

No RPC call, key access, signing, broadcast, Chain-2050 write, inventory
funding, market/presale activation, or funds movement is permitted.

Verification:

```bash
node scripts/prove_void_wc_void_coupled_launch_regeneration_v2.mjs
```

Next gate:

`pin_corrected_generation_then_atomically_update_all_coupled_launch_dependencies`.
