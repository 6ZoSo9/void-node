# Buy VOID operator capability provenance plan V1

Status: **SOURCE-ONLY HOLD**

Base generation:

- repository: `6ZoSo9/void-node`
- head: `47acc1485ab264a1a33d6a8c70072c2c18ce56e4`
- tree: `6f5ff9b2bd081a355186084fab74eeb10322ce6e`
- plan ID: `voidbvcred1_205e49c5ce39c2f8c8e2edb21cf258ecac97ea5e4677c07b1ec20b0de0938479`
- plan Git blob: `9ef24c6c9861f9ff215d900dbcb40bb6fc6cffb5`
- proof Git blob: `f79635c1ddfbe3bdbd9244755fb193ad69156e27`

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
