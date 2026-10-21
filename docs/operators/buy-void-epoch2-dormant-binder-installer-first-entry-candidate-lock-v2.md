# Buy VOID Epoch-2 dormant-binder first-entry launcher candidate lock V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_LOCK_V2`.

Status: **canonical candidate acceptance evidence only; no install or live authority**.

## Purpose

Accept the exact canonical-main runtime-head launcher V2 candidate derived after
merged #3438.

Historical V1 remains frozen and accepted only for its own historical
generation. V2 does not repin or reinterpret V1.

## Canonical candidate

Canonical merge:

`3a38da1e53ac52374aae4182d24ad4c245dfe504`

Tree:

`4a25e5cb001667920b1b5715679c7cce99bd68fe`

Canonical hosted run:

`39040013478`

Jobs:

- source proof `117417380031`;
- derive A `117417454570`;
- derive B `117417454542`;
- derive C `117417454444`;
- compare `117417559244`.

Artifacts:

- A `12102779578`;
- B `12103855658`;
- C `12103243146`.

The hosted compare proves three report byte identity, three launcher ELF byte
identity and an independent fourth rederivation.

## Exact accepted report

- bytes: `6131`;
- SHA-256:
  `2eafc4dc83d7d59fbd5e1d7a7fa809661c72e3387ae83e7f3badae78780da6ac`;
- Git blob:
  `ec94d8238028a32dbf8a03ac72fc5ce7120607b7`;
- candidate ID:
  `voidbuye2dormantfirstentrycand2_b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b`.

Exact accepted launcher ELF:

- bytes: `731072`;
- SHA-256:
  `4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28`;
- Git blob:
  `798907b18c73ee2cc1dea0fe05b36f27ab4137a7`.

## Runtime-head contract

The accepted V2 launcher no longer compiles repository HEAD into the ELF.

The accepted report requires:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_launcher=true
frozen_child_launcher_path_compatible=true
```

The launcher still compile-binds the exact protected Python installer bytes,
accepted native ELF bytes and exact apply confirmation. Runtime HEAD is supplied
later at invocation and forwarded unchanged into both the private parent proof
and the sealed Python child.

The production pathname deliberately remains the historical V1 installed path
required by the frozen child protocol. This is pathname compatibility only; it
does not authorize replacing an existing V1 installation.

## Accepted source lineage

- launcher V2 source:
  `86dc09e52402c04fb6e4b30a7fcf695833808ca3`;
- complete V2 real-child proof:
  `a6574e2d52f267d4a595c8cad0004d4797fd6f93`;
- V2 focused workflow:
  `4169a50df2b278776e046a8516be92aa3e56cdfc`;
- V2 candidate proof:
  `de2f487c625cf96c812cb6d4246d3d036a589e89`;
- V2 candidate workflow:
  `2bb8366afa1305fbd058745feb27941dafa0e055`;
- V2 candidate doc:
  `630f8b770e34dced3d7b341a85a33f6313a9bcba`;
- protected Python installer:
  `f3d6b1559be7490303cf36338c4bfa38fdaa390a`;
- accepted native V3 lock:
  `5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1`.

## Historical preservation

Historical launcher V1 lock:

`voidbuye2dormantfirstentrylock1_bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85`

Historical lock Git blob:

`f8ff6fbb855aecafc329cd60622cf3af782745a3`

V2 records:

`superseded_v1_lock_install_authority=false`

No historical file is modified.

## V2 acceptance lock

Lock ID:

`voidbuye2dormantfirstentrylock2_89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543`

Lock Git blob:

`227c2fa449abf1387925373c706ecd07775d5898`

The focused proof:

1. checks exact four-file lock-branch scope;
2. checks every candidate/source/native dependency blob at both canonical merge
   and lock head;
3. verifies the committed lock body and content-derived lock ID;
4. verifies historical V1 preservation;
5. creates a detached worktree at the canonical candidate merge;
6. re-executes the exact V2 candidate derivation there;
7. requires exact report bytes/hash/Git blob/candidate ID;
8. requires exact launcher ELF bytes/hash/Git blob;
9. rechecks the runtime-head contract and candidate authority.

## Authority

Only candidate identity is promoted:

```text
candidate_accepted=true
launcher_binary_identity_accepted=true
runtime_head_contract_accepted=true
canonical_main_candidate_authority=true
```

Still false:

```text
protected_install_authorized=false
precision_install_authorized=false
native_or_binder_live_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
funds_movement_authorized=false
production_host_evidence_authority=false
```

Next source gate:

`void_buy_void_epoch2_dormant_binder_installer_first_entry_materializer_v2`

That materializer must reproduce the accepted ELF; it does not install or
execute it.

**PROTECT THE CORE.**
