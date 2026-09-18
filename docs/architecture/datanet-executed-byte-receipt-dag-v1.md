# DataNet executed-byte receipt DAG v1

This contract closes only the machine-readable evidence-topology gap identified on
PR #1464. It does **not** claim that the required natural executions have occurred.

The experiment shape is fixed at 144 adversarial schedules:

- Node majors: 22, 24, 26;
- mutable artifact classes: runtime executable, observer, proof/script tree;
- launch cuts: after digest, before process creation, after child creation before
  open/read confirmation, and after open/read with a crash before post-run recheck;
- custody profiles: current pathname and protected;
- termination modes: normal and supervisor crash/restart.

Every attack has one fresh recovery control. Therefore each `(major, profile)`
member carries 24 attacks plus 24 controls, and each evidence tier contains exactly
six members (`Node 22|24|26 × current|protected`). Hosted and designated-host tiers
remain separate. A final two-tier aggregate is structurally admissible only when
both exact six-member tiers are present and agree on head, tree, generation,
schedule-manifest hash and source-inventory hash. Tier and two-tier artifacts
embed the actual child receipts they validate. Member/tier SHA-256 roots are
commitments over those embedded receipts, not placeholders that can stand in for
missing evidence.

## Member contract

Every schedule binds the expected and kernel-opened identities for four launch
objects: runtime, preload, observer and proof. Opened identities carry device,
inode, byte length and SHA-256. Pre/post target-path hashes must both equal the
expected digest for the attacked artifact, so the current pathname profile can
demonstrate the historical false-green without substituting an unrelated stable
path. Partial-evidence discard is true only for crash attacks, and normal schedules
must report zero recovery ticks.
The schedule-manifest hash is not caller-selected: it is deterministically derived
from the committed mutable-artifact, cut-point, termination-mode and 48 schedule-ID
contract. Every member, tier and two-tier aggregate must carry that exact digest.
Each member carries a bounded, lexically ordered source inventory. Every entry binds
repository-relative path, Git mode, Git blob SHA-1, byte length and SHA-256, and
`source_inventory_sha256` must equal the canonical digest of those exact entries.
All six members in one tier must bind the same derived source-inventory hash, and
the hosted and designated-host tiers must bind the same hash before a two-tier
aggregate can become structurally green. Natural collectors must additionally
verify those declared entries against the member's exact `head`/`tree`; the
schema does not treat a self-declared inventory as Git provenance.

A tier validator recursively validates all six member receipts, recomputes each
member commitment, and rejects digest-only summaries. The two-tier validator
likewise recursively validates both complete tiers before recomputing its root.

The current profile must reproduce at least one marked substituted execution. The
protected profile must record zero marked executions, zero accepted substituted
identities, zero writable aliases and zero writable VMAs, while every opened hash
matches its expected hash. Crash schedules must discard partial evidence and all
recovery paths are capped at 64 ticks. All fresh controls must return one identical
deterministic projection.

The protected mechanism is intentionally not implemented by this source-contract
commit. Natural collectors must later compose the already-merged Nimo executed-runtime
FD custody and current DataNet retained-FD/ext4 primitives, or another independently
reviewed mechanism satisfying the same contract. Synthetic contract fixtures are not
host evidence.

## Authority boundary

The contract forces every Chain-2050, DataNet acceptance, source, review, merge,
deployment, runtime-canary, legal, inventory and public-presale authority Boolean to
`false` in every member and aggregate. A schema-valid receipt cannot grant those
authorities.

The source proof is synthetic and establishes only exact shape, deterministic
aggregation and fail-closed rejection. It does not establish GitHub artifact origin,
designated-host identity, executed-byte custody, writable-alias/VMA extinction,
peer retention, repair, chain finality, deployment or funds authority.
