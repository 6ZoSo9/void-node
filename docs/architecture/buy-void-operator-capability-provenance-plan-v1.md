# Buy VOID operator capability provenance plan V1

Status: **SOURCE-ONLY HOLD**

Base generation:

- repository: `6ZoSo9/void-node`
- head: `1c7ea1484537ec3259f1833b68fbcb64b130744b`
- tree: `fad8a97255783832962174bb2d439fc64af8ecc8`
- plan ID: `voidbvcred1_accffa0b50b6b682716f3cc943ff5207d6565e71ad0f631718fa1677afbc322e`
- plan Git blob: `d408edbf750f53ba37a6ad7d7e820b80ad61ff8b`
- proof Git blob: `263b5e0b62a36d7b48b1ba03e3978dccddc37547`

## Purpose

The current Buy VOID local operator authorization source consumes a private
bearer capability named:

`buy-void-operator-capability-v1`

through the service's `CREDENTIALS_DIRECTORY`. Its at-use reader is
fail-closed and descriptor-bound, but the bound current repository generation
contains no matching credential-provisioning generation and the current
`void-node-live.service` installer does not configure this credential.

This plan closes the **source design** of that missing provenance boundary. It
does not generate, read, install, rotate, or reveal a credential.

## Current consumer contract

The bound local-intent source requires:

- canonical absolute `CREDENTIALS_DIRECTORY`;
- direct non-symlink directory opened with `O_NOFOLLOW|O_DIRECTORY`;
- directory not group/world writable;
- descriptor-relative credential lookup;
- direct regular, non-symlink, single-link credential file;
- credential size from 1 through 256 bytes;
- no group/world permissions on the credential file;
- pre/open/post file-generation equality;
- pre/open/post directory-generation equality;
- credential format `voidbvo1.<base64url>` with 43 through 128 payload
  characters;
- bearer comparison via `crypto.timingSafeEqual`.

The current consumer proves secure **use** of an available credential. It does
not prove where that credential came from, which deployed service generation
supplied it, whether it was rotated, or whether an old live process still holds
an older generation.

## Current provisioning gap

On the exact bound base:

- Git contains no
  `LoadCredential=buy-void-operator-capability-v1:...` directive;
- the literal credential ID occurs only in the local-intent consumer source;
- `ops/install-void-node-live-user-service-v1.sh` neither configures the
  operator capability nor `CREDENTIALS_DIRECTORY`;
- the user-runtime hardening candidate is separately source-only and not
  installed.

Therefore the existence of the consumer must not be treated as proof of an
authenticated operator principal.

## Required future credential generation

A separately reviewed generation must satisfy all machine requirements in the
plan. In particular:

1. generate exactly 32 random bytes using an operating-system CSPRNG;
2. encode those bytes as exactly 43 unpadded base64url characters and prefix
   `voidbvo1.`;
3. keep raw token bytes outside Git, logs, receipts, command arguments and
   browser storage;
4. retain the source secret at an operator-private canonical path outside the
   repository with direct regular-file/private-mode custody;
5. inject the exact fixed credential ID through `LoadCredential=` or an
   equivalently closed credential namespace compatible with
   `CREDENTIALS_DIRECTORY`;
6. bind the exact service/drop-in generation supplying the credential;
7. bind the at-use credential's SHA-256, metadata, ancestry and credentials
   directory identity **without recording raw token bytes**;
8. bind the live process/service generation that consumes that exact
   credentials directory;
9. require a new deployed service generation plus restart evidence for
   rotation;
10. prove the old credential is rejected after rotation;
11. treat revocation as mutation HOLD until a newly accepted credential
    generation exists; and
12. compose this evidence later with the independently reviewed
    operator-principal authentication plan.

The separate user-runtime hardening gate must still prove
`NoNewPrivileges=yes` and empty capability sets; credential provenance does
not replace process hardening.

## Authority

This plan does not create a credential and does not authenticate an operator.

The following remain false:

- credential generated/read/installed;
- service mutation or restart;
- operator-principal authentication;
- mounted verified-allocation route;
- payment acceptance;
- presale activation;
- signing or transaction broadcast; and
- funds movement.

PROTECT THE CORE.
