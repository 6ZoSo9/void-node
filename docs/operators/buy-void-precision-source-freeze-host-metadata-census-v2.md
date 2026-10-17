# Precision frozen-source metadata census V2

V2 repairs an implicit-write defect in the V1 host probe from #3415. Git can
fetch missing objects while resolving a commit or tree in a partial/promisor
checkout. An offline reproduction using a local test remote showed V1 writing
four pack-related files under the fixture's Git object directory.

This is a versioned correction to the existing metadata handoff. It does not
add a release-acceptance stage. Frozen V1 source and its evidence, the #3409
source freeze, the V5 lock, and the #3419 payment-policy attestation stay
byte-identical.

## Scope and lineage

The reviewed source parent is #3419 at
`1048cfb584826f84012cdbba4496a7f0df8575b3`. V1's unchanged probe blob is
`e82feb591d3dfab838e0aeb597efab3f2b5866a3`.

Four new paths contain the V2 probe, its behavioral regression, this runbook,
and its focused workflow. V2 retains the same frozen source identities:

- #3409 head: `bfdff02472c57439721ebed0a94498c691c68a9c`;
- source commit: `5e514e4b6e2151c18cf7459bd7a697287eebbd4c`;
- source tree: `47a0c6eb9408b97226472d1297115633b0b3d799`;
- freeze manifest blob: `91d2d7877bc3066e3030337576ca2dddeb55bfc8`;
- V5 lock blob: `61a9d85d285f9c9d249adf401580822c44c6dac6`.

## No-fetch repair

Every Git identity query receives both `GIT_NO_LAZY_FETCH=1` and an empty
`GIT_ALLOW_PROTOCOL`. The first disables on-demand object fetching in Git
versions supporting it. The empty protocol allowlist denies all Git transports
and overrides repository-local protocol permission settings, including when the
no-lazy-fetch variable is ignored.

The existing fixed Git executable, disabled hooks/fsmonitor, closed environment,
disabled system/global Git configuration, replacement-object refusal, and
`GIT_OPTIONAL_LOCKS=0` remain in force. Missing objects are reported as
unavailable. The probe never repairs or fetches them.

The behavioral proof uses temporary local repositories and a counted local
upload-pack helper. It reproduces V1's lazy fetch, proves V2 rejects the same
missing-object lookup without calling that helper or changing the checkout,
and exercises the transport guard with the no-lazy-fetch variable removed.
A complete local-object case must continue to succeed.

## Run on Precision

Use the ordinary `zoso` account without sudo. The script locates
`~/dev/void-node` independently of its own location, so a byte-verified copy
can be run from Downloads without fetching, checking out, or updating the
live repository.

For a reviewed repository copy:

```bash
python3 -I -B scripts/void_buy_void_precision_source_freeze_host_metadata_census_v2.py --self-test
python3 -I -B scripts/void_buy_void_precision_source_freeze_host_metadata_census_v2.py --run
```

For a downloaded copy named `void_precision_frozen_source_census_v2.py`,
verify its supplied SHA-256 first and then run:

```bash
python3 -I -B void_precision_frozen_source_census_v2.py --run
```

No root privilege, installation, file-content read of receipts or credentials,
service action, network contact, Git mutation, signing, RPC, transaction,
payment acceptance, presale/WC activation, or funds movement is part of this
command. `--apply` is not accepted. `-I -B` isolates Python and prevents
bytecode-cache writes.

The only operational path observations are metadata for the existing three
fixed V1 locations: the source-finality receipt, allocation-custody directory
and its mountpoint bit, and the Epoch-2 live-composition root. Git observations
are local object/ref identity queries. No live service or receipt contents are
authenticated.

## Interpret the JSON

The terminal result remains `HOST_RELEASE_EVIDENCE_HOLD` even if every
metadata observation is present. Return the full JSON for evaluation.
Unavailable frozen objects mean the local checkout lacks that evidence;
do not automatically fetch or change it.

The legacy `btc_payment_acceptance_verified=false` field is retained only as
an unchanged negative placeholder from V1. It does not evaluate the approved
presale rail. #3419 records native USDC on Ethereum chain 1 and Base chain 8453
at 2 VOID per USDC; BTC/VOID is a separate post-presale market. The production
WC/VOID market must open with the presale, with market-determined WC/VOID
pricing. This metadata probe proves none of those payment or launch gates.

Hosted CI runs synthetic tests only. It does not run the real host census or
claim Precision evidence. Historical generation-specific failures in the
parent source stack remain visible and are not waived by this repair.

**PROTECT THE CORE.**
