# Buy VOID V2 protected live-process receipt publisher V1

## Purpose

Close the source-level publication boundary between the accepted locked V2
selector/collection plan and the root-custodied receipt consumed by V7.

The publisher is not a service controller and never chooses MainPID through
systemctl or D-Bus. It consumes the already reviewed V2 collection primitive,
requires the final root-custodied deployment receipt for the exact live source
generation, requalifies live source custody, constructs the content-addressed
V2 receipt, and can publish only the canonical V2 path.

## Production path

Canonical output:

`/var/lib/void-source-finality-v7/live-process-binding-v2.json`

Apply requires the exact confirmation token
`publish-v7-live-process-binding-v2-receipt`.

Before publication the publisher collects the V2 plan twice and requires the
same content-addressed plan and receipt identity. A byte-identical existing V2
receipt is idempotent. A different existing receipt is retired only when it is
itself a canonical, content-address-valid V2 receipt and the two current
collections agree on a different generation. Malformed or uncertain existing
evidence HOLDS and is left untouched.

Stale retirement unlinks the old canonical receipt and fsyncs the root-custodied
parent before the new create-once publication. A crash in that interval leaves
the V2 receipt missing, which is fail-closed and rerunnable rather than
stale-authoritative.

Rotation, publication, and rollback are serialized by a root-owned create-once
`.<receipt>.publish-lock-v1` in the same root-custodied parent. The lock is
opened with `O_EXCL|O_NOFOLLOW`, fsynced with the parent, retained through the
mutation, and identity-rechecked before removal. A concurrent publisher HOLDS
before it can inspect or retire the receipt. A crash may leave the lock in
place; later publication then fails closed for operator review instead of
guessing recovery.

After publication the publisher collects once more. If that post-publication
generation changed and this invocation created the receipt, the exact new file
is removed and the parent directory is fsynced before HOLD. A byte-identical
pre-existing current receipt is never removed.

The V2 runtime verifier independently checks current self/manager generations,
so a stale receipt cannot grant production authority during the bounded
post-link recheck window.

## Trust boundary

This source generation composes the previously accepted protected native-first-entry
pattern directly. The protected launcher now has an explicit `live-process-v2`
allowlist entry for this publisher, while the historical V1 `live-process`
receipt installer is not reachable from that launcher.

The retained non-executable launcher body is exactly **12,644 bytes** with
SHA-256
`88f1ca67563b2b4da7310cf36f0238bfa03fd4f356a7e086ac276273faf8c1fe`.
The native pre-entry embeds that exact size/digest and authenticates the retained
launcher descriptor before Bash evaluation. Immediately before tool execution,
the launcher rechecks the exact repository commit/tree/main/clean state and
selected tool blob, then passes the bounded protected-dispatch binding. The
publisher requires that binding for `--apply` and independently revalidates
the fixed protected root plus its own tracked/visible bytes before publication. The package/runtime proof remains
the byte-identical accepted V2 proof and rederives the audited TSX/esbuild
runtime on Node 22/24/26.

Direct privileged checkout apply remains unsupported; only plan/read-only
inspection may be invoked outside the protected launcher.

It performs:
- V2 native selector execution through the locked collection-plan module;
- read-only live process/source inspection;
- root deployment-receipt verification;
- idempotent create-once publication or validated stale-V2 retirement followed
  by create-once publication on explicit apply.

It does not restart/mutate a service, contact RPC, access credentials, wallets,
signers or private keys, construct/broadcast transactions, activate presale/WC,
or move funds.

No Precision installation or apply is authorized by this PR. A later fresh
whole-enforcement census/candidate/acceptance lock must include this exact
publisher + protected launcher/native generation before deployment receipt and
Precision apply.
