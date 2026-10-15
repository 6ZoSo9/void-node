# Buy VOID Epoch-2 authenticated credential public evidence v2

Marker: `VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_PUBLIC_EVIDENCE_V2`.

Status: **source-only public-evidence composition; no live credential access or
runtime authority**.

## Purpose

The historical sealed Epoch-2 signing probe produces a cryptographically
verifiable public record, but its systemd property observation was obtained via
the same-UID public user bus. That record is still valuable for proof of key
control and the signed challenge, but the user bus must not remain sufficient
authority for the installed credential binding.

V2 composes that sealed public record with the merged read-only authenticated
credential/V6 qualification:

`VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V1`.

The V2 composer does not execute either live path. It accepts their JSON
evidence only after independent validation.

## Exact authenticated cross-check

The sealed public record must first pass the existing V1 cryptographic
classifier, including public-signature verification and immutable fulfiller
address derivation.

The credential/V6 qualification must prove:
- exact accepted credential-query lock;
- exact installed credential-query pair;
- stable double authenticated credential query;
- same credential metadata generation as V6 security evidence;
- V6 authenticated private-manager composition;
- no credential-content read;
- no host/service/systemd/economic authority;
- exact stable native transcript hashes.

V2 then requires:
1. sealed `systemd.main_pid` equals authenticated qualification `main_pid`;
2. sealed credential ID equals authenticated `load_credential_id`;
3. SHA-256 of
   `<credential_id>:<authenticated credential_source>`
   equals the signed sealed `loadcredential_binding_sha256`;
4. SHA-256 of the exact authenticated user-service cgroup line derived from
   `runtime_uid` equals the signed sealed `main_pid_cgroup_sha256`.

The credential source path is used in-memory only for the hash cross-check and
is not emitted by the V2 result.

The sealed credentials-directory field remains process metadata bound by the
signed challenge. V2 does not misrepresent it as private-manager evidence.

## Authority boundary

A GREEN V2 result proves stronger evidence composition only.

It does not authorize:
- live payment signing;
- transaction construction, submission or broadcast;
- public payment acceptance;
- public presale activation;
- WC/VOID market activation;
- runtime/service/systemd mutation;
- credential installation or credential-content access by the composer;
- funds movement.

A later operator runner may compose a fresh live read-only credential/V6
qualification with a fresh sealed signing record. That runtime operation
remains separately authorized.

PROTECT THE CORE.
