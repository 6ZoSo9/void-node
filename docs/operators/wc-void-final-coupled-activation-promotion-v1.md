# WC/VOID final coupled activation promotion v1

Marker: `VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1`

Status: source-only final readiness promotion for issue #2200.

This lane does not update a canonical candidate, enable Buy VOID process gates,
enable public intake, mutate a runtime/service, access a wallet/signer/key,
construct/sign/broadcast a transaction, activate WC/VOID or the presale, or move
funds.

## Purpose

The WC/VOID production candidate and coupled-economic successor candidate both
have an explicit final `coupled_activation_ready` gate. All upstream source and
live-evidence applications are intentionally required to stop with that final
gate false.

This contract defines the missing final source transition after every other
independent gate has already been applied to canonical Git.

It does not replace or weaken any upstream application contract.

## Required canonical prestate

The successor migration candidate must independently classify:

```text
SOURCE_READY
migration_authorized=false
public_activation_authorized=false
money_movement_authorized=false
```

The WC/VOID production classifier must be held on exactly:

```text
coupled_activation_ready_required
```

The coupled-economic successor classifier must also be held on exactly:

```text
coupled_activation_ready_required
```

Any other missing gate causes this promotion to HOLD.

That means the final promotion cannot be used to bypass:

- epoch-2 public economic verification;
- market-vault deployment/runtime/funding/lock application;
- WC-ledger persistence and quote-reserve custody application;
- durable opening claim/replay application;
- participant post-purchase VoidToken-control application; or
- bounded-canary application.

## Applied lineage requirement

The operator supplies one private manifest with exactly six application-plan
entries:

```text
economic_epoch2_public_verification
market_vault
ledger_custody
opening_durable
participant_postpurchase
bounded_canary
```

Each entry contains:

- the lane name;
- the absolute private application-plan path; and
- an independently reviewed SHA-256 of the exact plan file.

The final-promotion CLI does **not** trust a caller-supplied
`verified_applied=true` boolean.

For each lane it loads the canonical application module from the current
checkout and invokes that lane's exported `verify...CanonicalApplicationV1`
function on the exact private plan bytes. Those existing verifiers independently
bind the plan to canonical `main`, its application base ancestry, the exact
target candidate Git blob/file SHA-256, and the reviewed application/promotion
source lineage.

The six required verifier results are:

| lane | required verified status |
| --- | --- |
| epoch-2 public verification | `EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_VERIFIED_SOURCE_READY` |
| market vault | `MARKET_VAULT_CANONICAL_APPLICATION_STATE_VERIFIED_FINAL_ACTIVATION_HOLD` |
| ledger custody | `LEDGER_CUSTODY_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD` |
| durable opening | `OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD` |
| participant post-purchase | `PARTICIPANT_CONTROL_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD` |
| bounded canary | `CANONICAL_BOUNDED_CANARY_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD` |

The resulting private promotion artifact records each content-addressed
application plan ID, plan SHA-256 and exact verified status.

Canonical candidate state remains authoritative too: even six valid applied
plans cannot create final readiness unless every non-final gate independently
classifies GREEN in the current candidate files.

The promotion artifact also binds the exact canonical repository HEAD/tree,
canonical HTTPS origin/remote-main identity, and raw file SHA-256 + Git blob
SHA-1 identities for the production, coupled, and successor source candidates.
The worktree bytes must equal the exact `HEAD:<path>` blobs and canonical
two-space JSON bytes.

Authority-bearing Git runs through the reviewed absolute Git executable under a
minimal explicit environment: global/system config and ambient loader/tool
variables are not inherited; replacement objects are disabled; local fsmonitor,
hooks, ambient attributes, preload index, untracked cache and submodule recursion
are forced off. The fixed canonical GitHub `ls-remote` runs outside repository
discovery with TLS verification forced on.

## Exact final source delta

Production candidate:

```text
status: hold -> source_ready
coupled_activation_ready: false -> true
```

Coupled-economic candidate:

```text
status: HOLD -> SOURCE_READY
gates.coupled_activation_ready: false -> true
```

The tool reconstructs each input candidate by reverting only those fields and
requires canonical equality. Any additional target mutation fails closed.

The successor candidate is copied without modification.

The prepared promotion also binds exact pretty-JSON target identities for both
canonical files:

- target file SHA-256; and
- target Git blob SHA-1.

The CLI writes one create-only private promotion artifact outside the repository
with mode `0600`. An existing destination is never overwritten. Output creation
is bound to a retained parent-directory descriptor and uses
`/proc/self/fd/<dirfd>/<basename>` with `O_CREAT|O_EXCL|O_NOFOLLOW`; the exact
file descriptor is fsynced and read back, the exact retained directory is
fsynced, and parent/output inode identity is rechecked before success. Parent
replacement therefore fails closed and the redirected file is removed from the
original retained directory.

## Required poststate

The tool reruns:

- `classifyVoidWcVoidProductionReadinessV1`;
- `classifyVoidCoupledEconomicSuccessorGateV1`; and
- `classifyVoidWcVoidCoupledLaunchReadinessV1`.

All three required readiness decisions must be `SOURCE_READY`.

The composite result supplies the content-addressed coupled-launch
`composition_id`.

Even then, authority remains:

```text
activation_authority=false
funding_authority=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

## Private lineage manifest shape

Example shape only:

```json
[
  {
    "lane": "economic_epoch2_public_verification",
    "application_plan_path": "/absolute/private/epoch2-application-plan.json",
    "application_plan_file_sha256": "64hex"
  }
]
```

The actual manifest must contain all six exact lanes and be a direct private
regular file with no group/other permissions. Every referenced plan must also be
an absolute direct private regular file outside the repository, with exact
independently supplied SHA-256 bytes. The manifest and every plan are individually
bounded to 16 MiB.

Private input custody is descriptor-bound. The parent directory is opened as a
direct `O_DIRECTORY|O_NOFOLLOW` descriptor, the file is opened through that
retained directory via `/proc/self/fd/<dirfd>/<basename>`, bytes are read with
an exact bounded loop, and before/after file identity plus parent/path identity
must remain unchanged. A pathname swap cannot redirect the bytes after custody
validation.

The participant application verifier is intentionally loaded dynamically. On a
generation where that canonical application module has not yet merged, the
final promotion HOLDs with a missing-verifier error rather than weakening the
dependency.

## Library API boundary

The exported `deriveVoidWcVoidFinalCoupledActivationPromotionV1(...)` is a
structural preview only. Caller-supplied candidate, lineage, and repository
objects can be useful for deterministic delta inspection, but that exported
function emits:

```text
marker=VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_PREVIEW_V1
status=FINAL_COUPLED_STRUCTURAL_PREVIEW_NOT_SOURCE_VERIFIED
```

It never emits the final promotion marker/status or a `promotion_id`. Its
authority metadata also marks source promotion, canonical candidate read, Git
application-lineage read, and create-only authoritative output as unproven.

The authority-bearing derivation is module-private and requires a module-private
verified-source capability. Only the CLI path obtains that capability, after it
has derived repository identity, read the canonical `HEAD:<candidate>` inputs,
and completed the six application-verifier checks. The create-only writer also
requires the exact in-process verified promotion object. A caller cannot turn a
preview into reviewed output by merely changing marker/status fields.

This closes the exported-library bypass. The Git and private input/output custody
boundaries are also hardened as described above. The separate immutable
reviewed-execution/runtime provenance for authority-bearing classifiers and the
six verify-applied modules still keeps this PR Draft.

## CLI

Once all upstream canonical applications are merged:

```bash
node tools/void-wc-void-final-coupled-activation-promotion-v1.mjs \
  --lineages /absolute/private/final-coupled-applied-lineages.json \
  --output /absolute/private/final-coupled-promotion.json
```

On current main this command is expected to HOLD because upstream canonical
applications are not all complete yet.

A later GREEN result derives candidate copies and persists only the private
review artifact. Applying those copies to canonical source remains a separate
reviewed Git transition.

## Launch boundary

A green final source promotion or even later canonical `SOURCE_READY` state is
**not economic activation**.

These remain separate operator/runtime gates:

- claimed PostgreSQL selector;
- payment-keyed full runtime;
- admitted guarded runtime;
- full-runtime apply;
- `VOID_BUY_REQUESTS_ENABLED`;
- the coupled launch ceremony and its explicit operator authority.

No source-ready result may itself install a systemd drop-in, restart a service,
access signing credentials, submit a transaction, open public intake, or move
funds.

## Verification

```bash
node scripts/prove_void_wc_void_final_coupled_activation_promotion_v1.mjs
```

The focused proof additionally installs hostile repository-local/global
`core.fsmonitor` sentinels plus dynamic-loader debug variables and requires
none to execute during Git authority reads. It also replaces a private input
parent and a private output parent during the custody windows and requires both
operations to fail closed without accepting redirected bytes/output.
