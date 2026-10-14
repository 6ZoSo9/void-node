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

Apply is create-once and requires the exact confirmation token
`publish-v7-live-process-binding-v2-receipt`.

Before publication the publisher collects the V2 plan twice and requires the
same content-addressed plan and receipt identity. After publication it collects
once more. If that post-publication generation changed and this invocation
created the receipt, the exact new file is removed and the parent directory is
fsynced before HOLD. A pre-existing byte-identical receipt is never removed.

The V2 runtime verifier independently checks current self/manager generations,
so a stale receipt cannot grant production authority during the bounded
post-link recheck window.

## Trust boundary

The publisher must be invoked only through the protected native-first-entry
launcher generation. Direct privileged checkout execution is not a production
path.

It performs:
- V2 native selector execution through the locked collection-plan module;
- read-only live process/source inspection;
- root deployment-receipt verification;
- create-once V2 receipt publication on explicit apply.

It does not restart/mutate a service, contact RPC, access credentials, wallets,
signers or private keys, construct/broadcast transactions, activate presale/WC,
or move funds.

A later final whole-enforcement candidate/lock must include this publisher and
protected launcher generation before any Precision apply.
