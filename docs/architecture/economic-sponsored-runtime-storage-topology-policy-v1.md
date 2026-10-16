# Sponsored runtime storage topology policy v1

Marker: `VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1`.

Issue: #2458.

Status: **source-only topology contract; no production path, UID/GID, service, host evidence, installation, or runtime activation selected**.

## Purpose

Merged sponsored runtime admission already composes three durable authorities:

1. sponsored observation-time store;
2. sponsored intent/gas reservation store; and
3. Epoch-2 durable execution-replay store.

Their source implementations pin and revalidate open filesystem generations while an operation is running. They do not by themselves prove that a writable runtime identity cannot replace one of the visible root paths between process generations.

That distinction matters after merged #3228. Same-boot restart arithmetic can be source-qualified without proving that the evidence or durable roots came from a protected host topology.

This policy defines the **minimum storage/service shape** that a later designated-host census must prove before #2458 may promote any of:

- `time_store_root_stability_proven`;
- `reservation_store_root_stability_proven`;
- `execution_replay_store_root_stability_proven`;
- live evidence-origin custody; or
- production cross-process continuity.

It performs no host observation or mutation.

## Current canonical dependency generations

The policy is tied to the exact current store generations:

```text
observation-time store:
  53f0bae06b3361088712eaf6ef6d17e5d9c676de
reservation store:
  8804c99ccdcf4fbcd2becb11689ccfa90b0391f8
durable replay store:
  2b267e11d087bec0e0a56825dce9f998d5bc3ad5
historical production replay-binding artifact:
  ab7982b52fb0850eb2f1e796c88dcd7a7c743b6c
```

A dependency generation change requires requalification. The focused workflow watches all four sources.

## Runtime identity policy

The topology shape requires one dedicated non-root runtime identity.

The source contract requires evidence asserting:

- system-manager service identity;
- non-root UID/GID;
- root-owned, non-group/world-writable service definition;
- the runtime identity cannot control that service;
- `NoNewPrivileges=true`;
- empty effective capability set;
- empty ambient capability set; and
- empty capability bounding set.

The proof uses synthetic identities only. This policy selects **no production service unit or numeric UID/GID**.

## Three private writable roots

The runtime requires three pairwise-disjoint roots:

- observation-time root;
- sponsored-reservation root;
- execution-replay root.

Each root must be:

- an absolute canonical path;
- a real, non-symlink directory;
- owned by the runtime UID/GID;
- mode exactly `0700`;
- pre-provisioned before runtime admission;
- writable by the runtime for the store's reviewed operation; and
- non-replaceable by that runtime identity through its parent namespace.

The last condition is not inferred from the root mode. Rename/recreate authority belongs to the parent directory.

## Required pre-provisioned children

The current observation-time store requires:

```text
records/
observation-time-v1.queue/
```

The current sponsored reservation store requires:

```text
records/
sponsorship-admission-v1.queue/
```

Each required child is runtime-owned, mode `0700`, real, non-symlink, and pre-provisioned.

The durable replay store has no fixed pre-provisioned child directory. Its digest marker directories are created dynamically beneath the already-provisioned private replay root.

This policy does **not** bootstrap any directory.

## Complete protected ancestry

For each root, supplied topology evidence must enumerate every visible parent directory from the immediate parent through `/`, without gaps.

The policy requires every ancestor to be:

- a real non-symlink directory;
- root-owned (UID/GID 0);
- not group- or world-writable; and
- explicitly classified as denying the runtime identity write, rename, and recreate authority.

The later host census must derive those facts from the operating system. Caller assertions are not host evidence.

This source policy is intentionally stronger than the generic same-UID assumptions accepted by some historical stores.

## Historical replay topology is not promoted

Current canonical replay evidence selects:

```text
/home/zoso/.local/state/void-economic-epoch2-public-submission-gateway-v1/replay-v1
```

That historical evidence is valid for the authority it explicitly claimed. Its own checked-in threat model also records:

```text
hostile_same_uid_namespace_race_not_closed=true
production_binding_requires_explicit_same_uid_trust_or_stronger_namespace_custody=true
```

Therefore the historical home-directory replay topology is a **negative fixture** for this stronger #2458 root-stability policy. It is not reinterpreted as compromised or invalid historical evidence; it is simply insufficient to prove the new stronger custody property.

The focused proof reconstructs that same-UID ancestor pattern and requires HOLD.

## What GREEN means

A positive classifier result is:

```text
POLICY_SHAPE_QUALIFIED_NOT_LIVE
```

It means only that one proposed topology object satisfies this source policy.

Even GREEN keeps all of these false:

```text
production_service_identity_selected=false
production_runtime_uid_gid_selected=false
production_root_paths_selected=false
live_host_evidence_verified=false
time_store_root_stability_proven=false
reservation_store_root_stability_proven=false
execution_replay_store_root_stability_proven=false
storage_bootstrap=false
service_installation=false
service_start=false
systemd_mutation=false
filesystem_mutation=false
runtime_integration=false
gas_sponsorship_performed=false
transaction_submission=false
public_presale_activation=false
work_credit_write=false
funds_movement=false
```

The proof paths such as `/proof/...` and proof service names are fixtures only and are never production recommendations.

## Next gate

After source acceptance, the next separately reviewed work is:

1. explicitly select the production service identity and three absolute roots;
2. separately authorize any required host provisioning;
3. run a read-only designated-host census that derives service identity, root metadata, complete ancestry, required children, and replacement denial from live host evidence;
4. bind that evidence to exact reviewed source generations; and
5. only then consider promoting root-stability/evidence-origin flags in a later runtime wrapper.

No public route, gas sponsorship, replay consumption, transaction, Chain-2050 write, presale/WC activation, treasury/liquidity action, or funds movement is authorized by this policy.

**PROTECT THE CORE.**
