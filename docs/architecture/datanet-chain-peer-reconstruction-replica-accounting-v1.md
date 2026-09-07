# DataNet reconstruction replica accounting v1

Marker: `VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_REPLICA_ACCOUNTING_V1`

Status: source/proof correction for the pure planner in #1464. No network,
filesystem, peer, repair, or Chain-2050 mutation authority is added.

## Defect

The first planner generation counted only replicas already valid at evaluation
time when calculating remote repair demand. When the local copy was absent or
corrupt but an exact authenticated peer could reconstruct it, the planned local
copy was omitted from projected replica accounting.

For a target of three replicas and one exact source peer, that could report two
remote repairs and a shortfall of two even though the plan itself would first
create one exact local replica. The real remaining remote demand is one.

## Corrected order

Replica planning now uses this exact sequence:

1. count exact replicas present at evaluation time;
2. select an exact authenticated reconstruction source;
3. when local bytes are invalid, credit exactly one planned local
   reconstruction replica;
4. calculate the remaining remote repair count against the target;
5. select no more repair recipients than that remaining count; and
6. report projected replicas and any true recipient-capacity shortfall.

New result fields are:

```text
planned_local_reconstruction_replica_count
projected_replica_count_after_local_reconstruction
remote_repair_replica_count_required
projected_replica_count_after_plan
repair_capacity_shortfall
```

`missing_replica_count` remains the deficit at evaluation time. It is not
silently relabeled as post-plan deficit.

## Executable falsifiers

The supplemental proof requires:

- one exact peer plus one repair recipient projects exactly three replicas;
- one exact peer plus two eligible recipients selects only one, preventing a
  false double repair;
- one exact peer without a recipient reports one true shortfall, not two; and
- two exact peers plus the reconstructed local copy require zero remote repair.

These four cases supplement the original 128-case planner proof for a combined
132-case focused contract.

## Authority boundary

The corrected counts are a plan only. They do not copy bytes, create the local
replica, contact a recipient, execute repair, prove post-repair retrieval, or
prove durable future availability.
