# Buy VOID source-finality generation provenance V7

## Purpose

V7 closes the two production-authority gaps that V6 intentionally leaves open:
deployed runtime generation identity and independent provider quorum.

This PR is source/proof only and does NOT import V7 from the execution preflight.
The existing V6 runtime graph remains unchanged. V7 must pass independently
before a later integration PR switches the preflight to it.

## Deployment authority without self-approval

V7 does not accept a caller boolean or environment string saying that a source
generation is deployed.

Production success requires a separate operator-installed, private, content-
addressed deployment receipt. The receipt binds:

- immutable process-source marker, commit, tree and main branch;
- exact accepted V6 enforcement identity `ea7abb9300215e4f76caea4706fa4c4c81465c32f30a3350fe4f01177f845cfb`;
- the SHA-256 of the exact seven source files V7 treats as its reviewed runtime
  source surface; and
- the exact reviewed-source file count.

The receipt is read through retained descriptor custody. Every filesystem
ancestor from the receipt parent through the filesystem root must be a
root-owned, non-symlink directory with no group/world write bits. Those
directories remain open while the leaf is opened descriptor-relative through
the retained parent; the leaf must be a direct single-link regular file,
**root-owned and exactly mode 0444**. This closes rename/unlink replacement by
the unprivileged service UID at the directory-entry boundary.

A structurally valid deployment object is not authority. The public receipt
classifier can describe valid bytes, but only the filesystem verifier brands
the exact successful object inside this module; the provider-quorum classifier
refuses synthetic or cloned success objects that did not cross that retained
custody boundary. The receipt contents are non-secret identity evidence;
root-controlled immutable placement, rather than confidentiality, is the
authority boundary.

No production source path in this PR creates or installs that receipt. A later
operator lane must create it only after the final integrated source/enforcement
generation is reviewed and deployed.

## Two-provider production threat model

For the selected rail, V7 executes the existing authenticated V3 observation
twice under one outer total deadline.

The two server-controlled policies must use:

- HTTPS;
- distinct configured RPC identities;
- distinct normalized RPC URL fingerprints, each rederived from its exact normalized HTTPS URL; and
- distinct hostnames.

V7 does not claim knowledge of the remote companies' legal identities. The old
V3 truth remains explicit as remote_provider_identity_verified=false. The new
production property is instead
independent_remote_provider_transport_verified=true.

Both observations must independently preserve the existing V3 same-provider
receipt/finalized consistency and finality threshold. Quorum additionally
requires exact agreement on the payment identity, payer/delivery/receiver,
USDC contract and amount, transaction/log identity, receipt block number and
receipt block hash.

The two finalized-reference heights may differ because providers can be sampled
at slightly different moments. Each must independently place the agreed receipt
block at or below its finalized reference and satisfy the configured minimum
confirmations.

Under this reviewed threat model, agreement on the exact receipt-block hash
plus two independent finalized observations establishes the operational
ancestry/quorum condition used by V7.

## Success boundary

Only when the operator deployment receipt and two-provider quorum both verify
may a V7 result state:

- source_generation_verified=true
- deployed_artifact_generation_verified=true
- independent_remote_provider_transport_verified=true
- ancestry_verified=true
- provider_quorum_verified=true
- production_source_finality_authority_ready=true

Even then the observer itself has no wallet, signing, transaction-broadcast,
inventory, Chain-2050 mutation, public-presale activation or money authority.

## Proof coverage

The focused proof covers a successful quorum with different finalized heights,
plus fail-closed cases for:

- same provider identity under two labels;
- same URL fingerprint;
- same HTTPS hostname;
- non-HTTPS secondary transport;
- receipt-block hash disagreement;
- payment amount disagreement;
- finalized reference below the receipt;
- insufficient secondary confirmations;
- structurally forged or cloned deployment success objects;
- well-formed receipt with the wrong accepted V6 enforcement identity;
- unaccepted deployment generation;
- unprivileged-owned or writable deployment receipt;
- root-owned receipt below a writable ancestor directory; and
- process commit mismatch.

## Next gate

After V7 source/proof is green, integrate it into the existing execution
preflight with additive secondary-provider and deployment-receipt configuration.
That integration changes the runtime graph and therefore requires one fresh
compiled/enforcement lock before any deployment or real canary.

No runtime/service/config mutation, credential/key/wallet/signer action, live
RPC, payment, transaction, Chain-2050/WC mutation, presale activation or funds
movement occurs here.

PROTECT THE CORE.
