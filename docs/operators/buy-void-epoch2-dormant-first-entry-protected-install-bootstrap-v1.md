# Buy VOID Epoch-2 dormant first-entry protected-install bootstrap V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V1`.

Status: **source/test/CI only; not installed and not authorized to apply #3391 on Precision**.

## Finding closed by this source candidate

Merged #3391 provides coherent create-only publication mechanics for the accepted
authenticated dormant-binder first-entry bundle. Its future root `--apply`
entry, however, is ordinary Python. A caller-selected or substituted Python
program can begin executing before #3391's internal lock, head, plan-ID and
confirmation checks authenticate that program.

This bootstrap moves the privileged first instruction outside Python.

It does **not** change #3391's create-only filesystem algorithm. It authenticates
the exact #3391 program before Python starts, executes only a sealed snapshot of
those bytes, and emits the outer provenance receipt that a future operator lane
must require.

Direct root Python remains non-authoritative.

## Exact merged installer generation

The source candidate is bound to merged #3391 installer:

`ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py`

- Git blob: `383b84e71b371de65579e4113469e86a59b807ab`;
- bytes: `42054`;
- SHA-256:
  `e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef`.

The production bootstrap build must also compile-bind:
- exact accepted repository head;
- exact installer byte count and SHA-256;
- exact #3391 confirmation token
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY`.

A later canonical candidate/lock gate must rederive those identities from the
accepted merge generation. This source PR itself creates no production launcher
identity.

## Future protected namespace

The default future root-custodied bootstrap namespace is:

```text
/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v1/
  bin/
    void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v1
  policy-v1.conf
```

The policy is exact-order:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V1
python_sha256=<exact root Python SHA-256>
python_bytes=<exact root Python byte count>
```

The native bootstrap requires its own fixed root-owned, non-group/world-writable
executable generation and root-owned protected policy generation before any
installer child is created.

## Installer snapshot boundary

The bootstrap opens the fixed merged #3391 source path with `O_NOFOLLOW`,
retains that generation, copies it into a Linux memfd and seals the memfd against
write, grow, shrink and further seal changes.

Before Python starts it requires:
- exact compile-bound installer byte count;
- exact compile-bound installer SHA-256;
- unchanged visible installer generation after snapshot;
- fixed root-owned Python generation matching the protected policy;
- caller stdin exactly `/dev/null`;
- exact operation/argument allowlist.

The Python child receives the installer only through
`/proc/self/fd/<sealed-memfd>`.

A later visible checkout replacement therefore cannot change the Python payload
already selected by the bootstrap.

## Strict operation handoff

Only these outer invocation shapes are admitted:

Plan:

```text
--installer-plan
--launcher <absolute path>
--native <absolute path>
--expected-head <compile-bound exact head>
```

Apply:

```text
--installer-apply
--launcher <absolute path>
--native <absolute path>
--expected-head <compile-bound exact head>
--expected-plan-id voidbuye2dormantfirstentryinstall1_<64 lowercase hex>
--confirm INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY
```

The child Python environment is rebuilt from a minimal fixed set. Caller
`LD_PRELOAD`, `LD_LIBRARY_PATH`, `LD_AUDIT`, `LD_DEBUG`,
`PYTHONPATH`, `PYTHONHOME`, `PYTHONSTARTUP`, `PYTHONINSPECT`,
`PYTHONWARNINGS` and `PYTHONBREAKPOINT` do not cross the boundary.

Python itself is entered by retained descriptor with `fexecve()`.

## Post-child truth

After the child exits, the native parent revalidates:
- its own fixed installed generation;
- the protected policy generation;
- the root Python alias/target generation;
- the visible #3391 installer generation.

A mid-child replacement of the visible installer cannot alter the sealed child
program, but it prevents parent GREEN.

For a plan child, failure remains non-mutating evidence.

For an apply child, once Python was created, a later parent failure reports:

```text
installer_apply_state=unknown_or_partial_if_child_created
```

It never converts uncertain post-child state into a false
`installer_apply_performed=false`.

Only an outer GREEN receipt may state:

```text
privileged_first_entry_authenticated=true
installer_snapshot_sealed=true
python_generation_authenticated=true
```

The inner #3391 receipt alone is not privileged-first-entry authority.

## Focused adversarial proof

The focused proof:
- binds this exact native source Git blob
  `c435762e1fc26beeecfcfef93bf839ba408ea8b3`;
- binds exact merged #3391 blob `383b84e71b371de65579e4113469e86a59b807ab`;
- requires compilation to fail when generation macros are absent;
- compiles a production-shaped static binary and requires no `PT_INTERP` or
  dynamic `NEEDED`;
- runs only the real native source against a disposable root-owned fixture;
- proves caller stdin rejection before child creation;
- proves wrong confirmation rejection before child creation;
- proves prelaunch installer substitution rejection;
- proves Python-policy mismatch rejection before child creation;
- proves hostile loader/Python variables are absent from the child;
- replaces the visible installer after child start and proves the child finishes
  from the sealed snapshot while the parent withholds GREEN;
- proves strict plan and synthetic apply handoff.

The proof never invokes the real #3391 `--apply`, never writes the real
protected `/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1`
root and never executes the accepted dormant-binder launcher/native/binder.

## Lifecycle boundary

This source gate is not enough for Precision apply.

Required later gates remain separate:
1. reproducible static bootstrap candidate derivation;
2. candidate identity acceptance/lock;
3. create-only installation of bootstrap + policy;
4. installed read-only qualification of bootstrap/Python/source bindings;
5. a fresh operation-bound human authorization for #3391 apply through the
   installed qualified bootstrap.

Until all of those are exact-current and separately authorized, #3391 apply is
HOLD.

## Authority

This PR authorizes source/test/CI only.

It performs or authorizes none of:
- Precision filesystem mutation;
- #3391 protected install apply;
- first-entry launcher/native/binder live execution;
- service/systemd mutation;
- credential/private-key access;
- signing;
- RPC or transaction construction/submission/broadcast;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

**PROTECT THE CORE.**
