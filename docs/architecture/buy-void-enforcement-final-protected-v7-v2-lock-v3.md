# Buy VOID final protected V7/V2 enforcement acceptance lock V3

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3`.

Status: **source/CI acceptance of one exact receipt-custody enforcement identity only**.

## Exact candidate

This lock accepts the exact V3 candidate derived by #3390 at:

`cf9aabcc5c1e904938c786a61ca66e0c9fdc0be6`.

Hosted run `38978151185` produced byte-identical Node 22/24/26 candidate
JSON and a fourth independent rederivation:

- Node 22 artifact `12079722793`;
- Node 24 artifact `12079364829`;
- Node 26 artifact `12079344798`;
- cross-node job `117232972440`;
- full candidate bytes `24178`;
- full candidate JSON SHA-256
  `d882529c2791bf9073b50aebbf751e54dc36c2a954b5b4f29044474d829289d7`;
- full candidate Git blob SHA-1
  `101433562c848fbb279d08b039239d56a299c4db`;
- candidate enforcement set
  `75fe0351276ed21b7231b3dd9b50f3d4d6b68ad930b508a1f1f7fdb18d2063c4`.

## Tracked lock projection

The full hosted candidate is retained as hosted derivation evidence. To make the
accepted identity directly consumable by the existing deployment-receipt
verifier without reserializing the 24-KiB hosted artifact, this lock tracks an
exact bounded projection:

`ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3-lock-projection-v1.json`

Projection identity:

- bytes `8157`;
- SHA-256
  `1f0a25214b778b24c1f920cd2f875b36b9d13b118944280c337268b308444eab`;
- Git blob SHA-1
  `d6ccd1e19ba5454b69e76242088b342f4ae5331e`.

The projection contains only the acceptance-bearing fields consumed by the V7
deployment-receipt verifier:

- exact candidate head and enforcement set;
- complete-closure / unaccepted-candidate state;
- exact 49-row current protected source inventory;
- all deployment/runtime/finality/presale/funds flags false;
- immutable identity of the full hosted candidate JSON.

## Independent full-candidate rederivation

The lock proof does **not** accept the projection by itself.

In hosted CI it creates a detached worktree at the exact candidate head,
installs the frozen package lock, typechecks/builds, and re-executes candidate
V3 derivation.

The independently rederived full candidate must exactly match:

- 24,178 bytes;
- SHA-256 `d882529c...`;
- Git blob `10143356...`;
- enforcement set `75fe0351...`;
- V5 protected-inventory SHA `6b108cd4...`;
- complete executable closure verified;
- unaccepted candidate state;
- all deployment/runtime/finality/presale/funds authority false.

The proof then requires every one of the projection's 49 protected inventory
rows and every projected authority field to equal the independently rederived
full candidate.

This makes the projection a bounded transport/consumer surface, not a
replacement for the full candidate evidence.

## V5 protected census

The accepted V3 identity remains rooted in:

- V5 census ID
  `voidbefv7c5_5c022759d732fec4f42907c11451f7b90036ac823ef4fc090642eab700417966`;
- V5 census JSON SHA-256
  `ba572e907372c1873f5b7f7e994b8b5dce607791ebb5d4974de94a46764c5337`;
- current protected inventory SHA-256
  `6b108cd4a41a46a2f26cad072bfea013707011cd1a13c083f7176e04f041934e`.

The V5 evidence proves exactly one protected source change for the reviewed
deployment-receipt custody repair, 48 unchanged protected paths, and exact
preservation of the frozen economic executable closure.

## Historical predecessor

Accepted lock V2 remains historical evidence and is not rewritten:

- lock blob `589845615654da8b688764377b34296267ac0063`;
- predecessor enforcement set
  `05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852`.

V3 acceptance records a new source generation; it does not mutate V2 history.

## Acceptance boundary

Only these facts are promoted:

```text
complete_executable_closure_verified=true
current_enforcement_tracked_source_inventory_verified=true
candidate_enforcement_identity_accepted=true
```

These remain false:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

This lock performs no Precision install/apply, service/runtime mutation, RPC,
credential/private-key/wallet/signer access, transaction construction/signing/
broadcast, payment acceptance, presale/WC activation, treasury/liquidity action,
or funds movement.

**PROTECT THE CORE.**
