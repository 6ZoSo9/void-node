# DataNet reference copy accounting v2

Marker: `VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_REPLICA_ACCOUNTING_V1`

This is the four-case accounting proof for #1464's reference-only result.
The public result always remains `DATANET_RECONSTRUCTION_HOLD` with `ok=false`.
Its nested counts describe hypothetical copies, not independently verified
replicas or completed publication.

## Preserved correction

The original defect omitted a planned local copy when computing remote demand.
For a target of three with one matching peer, a hypothetical local copy brings
the projected count to two, leaving one remote copy to request.

The calculation remains:

```text
projected_reference_copies_after_local
  = reference_copy_count + hypothetical_local_copy_count
remote_reference_copies_requested
  = max(0, requested_copy_target - projected_reference_copies_after_local)
projected_reference_copies_after_plan
  = projected_reference_copies_after_local + candidate_repair_recipients.length
reference_repair_shortfall
  = max(0, remote_reference_copies_requested - candidate_repair_recipients.length)
```

`missing_reference_copies` remains the pre-plan deficit. The deliberate v2 result
migration replaces old replica/availability names; the main architecture
document defines the complete boundary.

## Four retained cases

- One matching peer plus one recipient projects three reference copies.
- One matching peer plus two recipients selects only one recipient.
- One matching peer without a recipient reports one remaining shortfall.
- Two matching peers plus a hypothetical local copy need no remote recipient.

Each case checks the actual public operational HOLD and zero verified
independent replicas before inspecting the nested reference calculation.
The caller's authentication and repair-acceptance flags are unverified claims.

The accounting workflow is called by the planner workflow at an immutable commit
whose workflow blob is verified to match the current source generation.
Its three Node 22/24/26 jobs upload separate canonical receipts containing this
four-case suite, the planner suite and the evidence verifier suite. The parent
aggregate requires all three accounting and all three planner receipts in the
same run/attempt/source generation. The main architecture document defines the
receipt schema, source bindings, artifact bounds and offline verification.

## Limits

No byte is copied, published, readmitted or repaired. A projected local copy is
not a custody receipt. Peer IDs are not independent physical failure domains.
A requested target is not a release policy. The five runtime verification and
custody prerequisites remain separate, as does independent review of the repair.
