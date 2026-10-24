# Epoch-2 V6R3 collapse external admission V1

This control exists to authenticate the content of the 21-path Epoch-2 V6R3
collapse candidate from **outside** the candidate's adapted composition
workflow.

Target branch:

`ren/epoch2-v6r3-stack-collapse-current-main-v1-20261020`

Historical cumulative leaf:

`41380839014d202421643d252288bd89985a1191`

The manifest binds exact Git mode/type/blob identities for all 21 paths. Exactly
17 entries must remain byte-for-byte and mode-for-mode identical to the
historical cumulative leaf. Exactly four reviewed adaptations are admitted:
the composition workflow, native preentry C source, live-binding source proof,
and operator document.

The adapted workflow is externally bound to Git blob:

`3d1f8cc8a0d377063c9dd3ca3509648d3a859ec5`

This avoids relying on a mutable workflow to authenticate its own new content.
The admission workflow fetches the target branch independently and verifies the
manifest against its actual Git tree. When the workflow is triggered by the
target branch itself, it additionally requires the live pull-request base to be
`main` and to be an ancestor of the candidate head.

This is source/CI admission only. It grants no protected-host installation,
service mutation, credential access, signing, transaction, payment acceptance,
public presale/WC activation, treasury/liquidity action, or funds movement.

PROTECT THE CORE.


## Trusted execution model

The bootstrap pull request uses a `pull_request` job only to test this
four-file admission implementation before it lands. Bootstrap output is not
trusted admission of the target candidate.

After this control is merged to `main`, target-candidate verification runs
only under `pull_request_target`. That event loads the workflow definition
from the trusted base branch. The job explicitly checks out the exact base SHA
for the verifier and manifest, fetches the target branch only as Git-object
input, requires the exact 21 ADD-only target delta, and then validates all 21
mode/type/blob identities. No file or executable from the candidate checkout is
used as admission logic.

The object verifier therefore reports
`candidate_objects_match_manifest=true`; only the trusted-base job may promote
that mechanical fact to `trusted_target_admission=true`.
