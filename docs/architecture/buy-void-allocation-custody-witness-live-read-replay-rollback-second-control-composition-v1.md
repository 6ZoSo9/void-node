# Buy VOID allocation custody witness live-read replay rollback second-control composition v1

## Scope

\`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_V1\`
is the source-only composition gate that binds two independently reviewed live
facts for the current replay state:

1. the merged reviewed Nimo external-custody qualification; and
2. the fresh Precision rollback-policy observation captured after replay
   sequence 2 was durably consumed and mirrored to Nimo.

It performs no filesystem access, SSH, network operation, replay mutation,
witness append, service mutation, wallet/signer access, transaction,
Chain-2050 write, activation, inventory movement, treasury/liquidity action, or
funds movement.

## Reviewed rollback-policy receipt

The accepted live policy receipt is pinned by both its collector receipt hash
and exact file hash:

\`\`\`text
receipt_sha256 =
sha256:e59a2a9024025fe0ffea453008e373ea12642801dadef88d1b1156cbe5d1c8af

receipt_file_sha256 =
sha256:e78f48a901a2cf197f9c1538884a0c97ab96267c093d31b0f9aa50623ad8e114
\`\`\`

The receipt was collected read-only on Precision after the live issue/read/
consume ceremony. It reobserved the replay roots three times and rebound the
root-owned rollback policy before returning GREEN.

The receipt is tied to the current replay high-water:

\`\`\`text
sha256:2ce3c4fca02a5567a41d0466d47721a4756253979e18521550ab83b8e99279b9
\`\`\`

and to the reviewed installed policy:

\`\`\`text
policy_file_sha256 =
sha256:01cd65ffbe549f3e6c03591d649c79edcc83934c31bccef8349621222d2fb05a

parent_policy_qualification_id =
voidwlrrq1_7b2d377dfc38cf00e329abcffec2801420d84a1f2bf1e15fbcac47df9e103f71

policy_fingerprint_sha256 =
sha256:0a0d5392a0e9cdae22257cdf644c0958c3cfe18fdd0466c0f92b8044a6ebcdeb
\`\`\`

## Cross-artifact binding

The composition re-runs the merged reviewed external-custody classifier over
the exact live operator receipt, current replay journal/high-water, and complete
Nimo external-witness journal.

It then requires the live rollback-policy receipt to describe the same:

- Precision hostname;
- replay high-water SHA-256;
- journal disk WWN; and
- high-water disk WWN.

The current replay terminal event time must also precede the reviewed live
policy observation time. V1 therefore proves this policy receipt is a
post-cycle observation of the exact replay state already retained by the
authenticated Nimo second-control domain.

## Second-control policy semantics

The reviewed rollback policy requires:

- no host-wide snapshot/backup/restore able to revert both replay roots;
- no shared rollback controller;
- no coordinated rollback without the required second control;
- automatic restore forbidden;
- manual approval and separate credentials for both restore domains;
- distinct journal/high-water restore domains, rollback controllers and
  credential domains; and
- \`restore_second_control_required=true\` for the high-water root.

The merged external-custody qualification independently proves the reviewed
Nimo replay witness transport/storage provenance and its exact monotonic
sequence through replay sequence 2.

V1 therefore reports:

\`\`\`text
rollback_independence_policy_qualified=true
live_policy_observation_proven=true
policy_file_installation_proven=true
external_transport_authenticated=true
external_witness_storage_proven=true
live_remote_read_performed=true
live_remote_append_performed=true
external_second_control_domain_qualified=true
external_second_control_policy_binding_proven=true
post_cycle_live_policy_observation_bound=true
\`\`\`

## Authority intentionally not promoted

The policy evidence collector explicitly does **not** prove enforcement by
every restore/control path. This composition preserves that boundary:

\`\`\`text
live_policy_enforcement_proven=false
live_rollback_test_performed=false
live_durable_storage_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
runtime_integration=false
production_gate_ready=false
funds_movement=false
\`\`\`

A policy file plus an authenticated second-control domain is not equivalent to
proof that every privileged restore path is forced to consult that second
control.

## Next gate

The remaining gate is live enforcement evidence.

A later collector/composition must prove that the actual restore/rollback
surfaces capable of replacing either replay root cannot bypass the reviewed
policy and authenticated Nimo second control. Only that later gate may consider
promoting rollback resistance or protected high-water custody.

A destructive rollback of production replay state is not required for this
composition and should not be used merely to satisfy a source proof.

## Focused proof

\`\`\`bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_rollback_second_control_composition_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_external_custody_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_rollback_independence_v1.ts
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_evidence_v1.mjs
git diff --check
\`\`\`

The focused proof consumes the exact reviewed live artifacts and rejects:

- rollback-policy receipt byte drift;
- replay journal tamper;
- external witness tamper; and
- live-cycle operator receipt tamper.

All stronger authority flags remain explicitly false.
