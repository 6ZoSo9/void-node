# Buy VOID V7 deployment receipt — current enforcement custody V2

## Purpose

Compose the root-custody/crash-consistency hardening from #2945 with the
current recursion-free V7 enforcement lock from #2948/#2949.

The installer source is reused byte-for-byte from reviewed #2945 head
`823357d3cfd08f0eb0f59ffe40dedef2a621c593`.

Its lock parser is intentionally content-addressed rather than tied to the
historical enforcement schema. This successor proves that exact installer
against current lock:

`ops/security/buy-void-enforcement-post2933-lock-v2.json`

and requires enforcement set:

`f1f3fbdd0a015fdabf8da924a53a87174663d38cdde182cdc036cf0f9a3407bd`.

## Retained custody guarantees

The exact #2945 installer:

- retains the trusted grandparent with `O_DIRECTORY|O_NOFOLLOW`;
- creates an absent receipt parent descriptor-relative;
- never chmods or chowns a pre-existing parent;
- preserves restrictive pre-existing safe parent modes;
- fsyncs a newly created parent and retained grandparent before publication;
- captures the exact temporary receipt device/inode immediately after create;
- performs temp chown/write/fsync/chmod through the retained descriptor;
- removes only the exact temporary inode it created after a failure;
- preserves a substituted foreign inode rather than deleting it;
- hard-links the final receipt create-once and fsyncs the retained parent; and
- re-verifies the installed root:root mode-0444 single-link receipt bytes.

## Current-generation proof

Node 22/24/26 run the source proof against the current accepted V2 lock.
A separate disposable root fixture exercises the real create-once custody path
and all #2945 crash/substitution adversaries.

The deployment receipt can therefore bind the current accepted enforcement set
without losing the reviewed parent/temp custody guarantees.

## Authority boundary

Source/CI only. No Precision apply, protected source-tree installation,
service/config mutation, RPC, credential/key/wallet/signer access, payment,
transaction, Chain-2050/WC mutation, inventory/treasury/liquidity action,
presale activation or funds movement occurs.

The separately reviewed root-owned privileged launcher/source-tree boundary
remains the next operator gate.

PROTECT THE CORE.
