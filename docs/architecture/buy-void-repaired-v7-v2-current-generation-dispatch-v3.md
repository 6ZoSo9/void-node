# Buy VOID repaired V7/V2 current-generation dispatch V3

## Purpose

V3 is the source-only successor to the immutable V2 current-generation dispatch.
V2 remains byte-identical at Git blob
`796cad42e6413a1894eef8dc0466848377176645`.

Current main `29057c25f06fcb214853bc612ea7606211778f81`
contains two independently reviewed successors to paths in the frozen 49-path
protected inventory:

- `src/index.ts`: frozen `123ec1792a027f93d4c9030749a0e7e136a75a44`
  -> current `a09661797aa4295371c036be36d82995e5233269`, mode `100644`;
- `ops/run-void-node-live-v1.sh`: frozen
  `6fb040de128ce0df16e848d61ea5f4acb62794da` -> current
  `bc6a17ccdf389299fb139db37e742f0b1ad9dc4e`, mode `100755`.

The first successor is the reviewed current router/dispatcher V6 generation. The
second is the canonical-producer V5 launcher that selects the V5 self-HTTP
guard only for the exact current router blob.

## V3 acceptance rule

The frozen V2 candidate, lock, census proof, and 49-row inventory are not
rewritten. V3 requires:

- exactly 47 frozen protected rows remain byte/mode identical at current HEAD;
- exactly the two named protected rows retain their frozen identities in the
  historical candidate while current HEAD matches the exact reviewed successor
  blobs and modes;
- the frozen 49-row inventory digest remains unchanged;
- no third protected-path successor is accepted;
- the immutable V2 dispatch remains exact;
- the current router V6 proof executes successfully and reports that verified
  allocation dispatch remains unmounted and no funds moved;
- the canonical-producer V5 dispatcher executes successfully and proves the
  exact current router/guard selection with no deployment, signer, wallet, or
  launch authority.

## Receipt semantics

A V3 receipt therefore reports:

- `protected_path_count=49`;
- `frozen_protected_inventory_preserved=true`;
- `protected_path_identity_preserved=false`;
- `unchanged_protected_path_count=47`;
- `reviewed_protected_successor_count=2`;
- `current_protected_successor_binding_verified=true`;
- `current_router_v6_successor_verified=true`;
- `canonical_producer_v5_successor_verified=true`.

The explicit `protected_path_identity_preserved=false` prevents V3 from
misrepresenting the frozen V2 inventory as current byte identity.

## Authority boundary

V3 is review/CI evidence only. It does not accept the protected enforcement
candidate as current production authority. It does not establish runtime mount
authority or production source-finality readiness, and it does not activate
public Buy VOID, WC/VOID, signing, broadcasting, or funds movement.

PROTECT THE CORE.
