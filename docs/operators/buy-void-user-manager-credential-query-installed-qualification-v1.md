# Buy VOID installed credential-query qualification v1

Marker: VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V1.

Status: **read-only live qualification source; live execution remains separately
authorized**.

## Dependencies

The qualifier consumes exact reviewed generations:

- credential protected installer source
  e497ee1239865888303db56d0ff0ffeceb583516;
- credential ELF lock
  voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c;
- merged V6 security qualifier source
  83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc.

The credential query is not security-policy authority by itself. It observes
credential-effective metadata and independently kernel-binds MainPID, but the
accepted V6 query remains the authority for NoNewPrivileges, PrivateUsers and
capability state.

## Future read-only composition

A future separately authorized root run requires the exact protected credential
pair at:

/opt/void-buy-void-user-manager-credential-query-v1

It performs this read-only sequence:

1. snapshot and verify the installed credential preexec/query pair;
2. execute the fixed credential preexec once;
3. re-snapshot the credential pair;
4. run the merged V6 read-only security qualification, which itself requires
   exact protected V6/V1/V2 generation and stable double authenticated queries;
5. re-snapshot the credential pair;
6. execute the fixed credential preexec a second time;
7. snapshot the credential pair again.

All four installed-pair snapshots must be identical. Both complete credential
native transcripts must be identical.

The credential and V6 security observations must identify the exact same
runtime UID, authenticated user-manager PID, manager start ticks, service
MainPID and service start ticks. A mismatched generation fails closed.

## Credential metadata

The closed native transcript requires:

- private systemd-manager peer authentication;
- same retained private connection;
- no public user bus;
- loaded/active/running service;
- NeedDaemonReload=no;
- canonical FragmentPath;
- bounded DropInPaths count (at most 32) and canonical bytes (at most 16 KiB);
- exactly one 97-buy-void-epoch2-fulfiller-credential-v1.conf;
- exactly one LoadCredential pair;
- credential ID buy-void-epoch2-fulfiller-v1;
- canonical credential source path;
- retained manager/service pidfds and generation revalidation.

The credential file contents are never opened or read.

## Authority boundary

Even a successful future run remains read-only and keeps
production_host_evidence_authority=false.

It does not read request/payment contents, mutate services/systemd, access
private keys/wallets/signers, accept payment, construct/broadcast
transactions, activate public presale/WC, or move funds.

Hosted CI runs syntax, self-test, proof and inert plan only.

Next gate after a future GREEN live qualification is a versioned Epoch-2
attestation successor that consumes this exact authenticated credential metadata
generation instead of the older public-user-bus property source.

PROTECT THE CORE.
