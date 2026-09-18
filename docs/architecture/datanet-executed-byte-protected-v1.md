# DataNet executed-byte protected profile v1

This focused source lane implements the missing protected-execution primitive for PR #1464. It is intentionally narrower than the full executed-byte receipt DAG: it proves that transient pathname substitution can be made irrelevant to the exact runtime and launch-artifact bytes used by a child process.

## Protected mechanism

On Linux, the supervisor opens the expected runtime, preload, observer and proof as bounded regular files with no-follow semantics. It copies each exact byte sequence into a fresh `memfd`, verifies the copy, applies `F_SEAL_WRITE | F_SEAL_GROW | F_SEAL_SHRINK | F_SEAL_SEAL`, reopens the sealed object read-only through `/proc/self/fd`, and closes the writable creator FD.

The protected child then:

- executes Node from the retained sealed runtime FD via `/proc/self/fd/<fd>`;
- receives the proof from the retained sealed proof FD as stdin and retains a second reference to the same sealed proof object for identity verification;
- reads and evaluates preload and observer bytes only from retained sealed FDs; and
- hashes `/proc/self/exe` so the executed runtime bytes are directly distinguished from a transient pathname replacement.

Once `F_SEAL_WRITE` is present, a writable shared mapping that could modify the backing object cannot be created. The retained launch FDs are read-only, and the writable creator descriptors are closed before execution. Private copy-on-write executable mappings are not writable aliases to the backing bytes and are outside the `writable_vmas` count used by the #1464 receipt contract.

## False-green control

The focused proof creates equal-length marked replacements for the mutable runtime, observer and proof artifacts. For each artifact it:

1. hashes the expected pathname;
2. transiently replaces that pathname;
3. executes once through the current pathname profile and proves the marked bytes were used;
4. restores the original pathname and proves the post hash equals the pre hash;
5. repeats the same transient replacement while executing through the protected sealed-FD profile; and
6. proves the protected execution still used the original retained runtime/observer/proof bytes.

The runtime marked control is an equal-size copy of the selected Node executable with one final non-loaded byte changed. The proof first verifies that the marked binary still starts and reports the same Node version before using it as a substitution control.

## Scope boundary

A GREEN focused workflow establishes only this primitive and its transient-substitution sensitivity. It does **not** by itself establish:

- the full four-cut × two-termination 144-attack campaign;
- supervisor-crash recovery or the 64-tick bound;
- the exact six-member hosted tier or six-member designated-host tier;
- external machine identity or ext4 generation evidence;
- DataNet peer retention, repair or availability;
- Chain-2050 finality;
- source acceptance, independent review, merge, deployment, runtime activation, wallet/signing, transaction, inventory, liquidity or funds authority.

Those remain later gates. This lane supplies the concrete protected mechanism that the receipt-DAG contract previously described but intentionally did not implement.
