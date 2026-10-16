# Buy VOID credential-query protected create-only install v2

Marker:
`VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_INSTALL_V2`.

Status: **source/CI installer contract only; no Precision installation
authorized or performed**.

## Accepted generation

Consumes only credential-query V2 lock:

`voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54`.

Exact pair:
- accepted static credential preexec: 706,504 bytes, SHA-256
  `67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c`;
- V2 credential query: 47,160 bytes, SHA-256
  `af02d006176db1a16eee52625751736c63af3bd1b250b46f81f200359fb48718`.

V1 lock remains predecessor history only:

`voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c`.

## Why the fixed V1 pathname remains

The accepted static preexec hardcodes the historical protected root and query
leaf:

`/opt/void-buy-void-user-manager-credential-query-v1`.

Therefore V2 intentionally installs the accepted V2 query bytes at that
historical fixed query pathname.

This installer is **create-only**. It admits only:
- complete protected root absent -> V2 ready;
- exact V2 pair -> already green.

A present V1 pair or any other present generation is not adopted, overwritten,
deleted, repaired, relabeled or silently promoted. It HOLDs and would require a
separately versioned replacement contract.

## V2 credential shape

The accepted V2 query:
- bounds active DropInPaths at 64;
- bounds LoadCredential entries at 32;
- requires unique credential IDs;
- requires exactly one
  `buy-void-epoch2-fulfiller-v1`;
- permits unrelated legitimate credentials;
- retains the complete bounded credential set for same-generation comparison;
- reads no credential contents.

## Publication primitive

V2 preserves the truth-corrected V1 create-only primitive:
- trusted `/` and `/opt`;
- candidate descriptor/size/SHA verification;
- stage directory under `/opt`;
- exclusive `O_NOFOLLOW` file creation;
- exact root ownership/mode;
- file + stage fsync;
- `renameat2(RENAME_NOREPLACE)`;
- parent fsync;
- exact final pair verification;
- bounded truthful `published_needs_inspection` receipts for failures after
  publication;
- best-effort cleanup only before publication.

Apply requires:
- root;
- isolated Python;
- no loader/Python injection environment;
- exact preexec/query candidate paths;
- exact confirmation:
  `INSTALL_ACCEPTED_USER_MANAGER_CREDENTIAL_QUERY_PAIR_CREATE_ONLY_V2`.

## Authority boundary

Source/CI only.

No Precision apply, query execution, service/systemd mutation, credential
contents, signer/private-key access, request/payment contents, payment
acceptance, transaction, public presale/WC activation or funds movement.

A separately authorized host plan remains required after the V2 lock and this
installer merge.

PROTECT THE CORE.
