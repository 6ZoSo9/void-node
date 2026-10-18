# Buy VOID Epoch-2 protected-installer bootstrap V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V2`.

Status: **source/test/CI only; no installation or protected-installer authority**.

Tracked blocker: #3414.

## Why V2 exists

Accepted bootstrap V1 is compile-bound to repository head
`0ea097a3fa43dc95a1a0a5272c61afe570361fc7`.

V1 also forwards that frozen value as #3391's `--expected-head`. #3391 then
requires the live checkout to be clean branch `main` with
`HEAD == --expected-head`.

Because acceptance, materialization and create-only install source necessarily
merged after the V1 candidate, canonical main advanced beyond
`0ea097a3...`. A V1 installation can therefore have exact accepted bytes and
still be structurally unable to authenticate #3391 on current main.

V2 removes only that lifecycle deadlock. V1 source/candidate/lock/materializer/
install history remains frozen.

## Unchanged privileged boundary

V2 retains all V1 first-instruction protections:

- static native outer bootstrap before privileged Python;
- fixed root-custodied bootstrap path;
- fixed #3391 installer pathname;
- compile-bound exact #3391 installer SHA-256 and byte count;
- installer opened with `O_NOFOLLOW`, retained, copied to a sealed memfd, and
  hashed before Python starts;
- fixed root-protected `/usr/bin/python3` authenticated against a protected
  policy;
- minimal child environment rather than inherited loader/Python variables;
- caller stdin must be exactly `/dev/null`;
- strict plan/apply argv;
- exact operation-bound child plan ID for apply;
- exact apply confirmation
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY`;
- bootstrap/policy/Python/visible-installer generation revalidation after child
  exit.

The reviewed #3391 installer identity remains:

- Git blob `383b84e71b371de65579e4113469e86a59b807ab`;
- bytes `42054`;
- SHA-256
  `e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef`.

## Versioned production namespace

V2 uses a separate future root:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v2`

Fixed executable:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v2/bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2`

Policy:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v2/policy-v1.conf`

The policy schema is versioned:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V2`.

No V1 root is edited or replaced.

## Runtime expected-head contract

V2 does **not** compile-bind a Git head.

For both plan and apply, `--expected-head` must be exactly 40 lowercase
hexadecimal characters. The bootstrap copies that value into its bounded
request structure and forwards the exact bytes unchanged to the sealed #3391
child.

The bootstrap does not itself claim that an arbitrary caller-supplied head is
trusted. Authentication is completed by the exact sealed #3391 child, whose
existing checks require:

- the supplied head equals the actual checkout HEAD;
- the checkout is branch `main`;
- the worktree is clean;
- the accepted first-entry launcher lock at that head has its exact reviewed
  Git blob and fields;
- launcher/native inputs and protected installer source meet their exact
  reviewed identities.

Therefore removing a moving compile-time HEAD does not remove repository-head
authentication. It moves that check to the authenticated component that already
has the complete Git/lock context needed to prove it.

A successful outer receipt states
`expected_head_forwarded=true` and
`expected_head_authenticated_by_child=true`; it does not state that the
outer C parser independently authenticated repository state.

## Adversarial proof

The hosted proof starts from the reviewed V1 harness and additionally proves:

- the V2 C source contains no
  `VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD` compile contract;
- malformed runtime heads (39 characters, uppercase hex, non-hex) are rejected
  before child creation;
- two distinct valid lowercase 40-hex runtime heads are forwarded byte-for-byte
  into the authenticated child fixture;
- static ELF/no `PT_INTERP`/no dynamic `NEEDED`;
- required installer SHA/bytes/confirmation compile bindings remain mandatory;
- arbitrary caller stdin is rejected before child creation;
- wrong confirmation is rejected before child creation;
- prelaunch installer substitution is rejected;
- Python-policy mismatch is rejected before child creation;
- hostile loader/Python environment variables do not reach the child;
- a visible installer replacement after child start cannot alter sealed child
  bytes and prevents parent GREEN;
- synthetic plan and apply handoffs remain strict.

The proof never runs real #3391 apply.

## Lifecycle

V2 remains source only. A future path is separately versioned:

source -> reproducible V2 candidate -> acceptance lock -> materializer ->
protected create-only V2 install -> non-executing installed qualification ->
separately authorized bootstrap plan/apply.

No V1 accepted identity is rewritten.

## Authority

Always false at this gate:

```text
protected_install_authorized=false
bootstrap_install_authorized=false
bootstrap_execution_authorized=false
credential_access=false
private_key_access=false
signing=false
transaction=false
rpc_call=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

No Precision/Nimo/Xiphos mutation occurs.

**PROTECT THE CORE.**
