# Buy VOID credential-query protected create-only install v1

Marker:
`VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_INSTALL_V1`.

Status: **source/CI installer contract only; no Precision installation
authorized or performed**.

## Accepted pair

The installer consumes only credential lock:

`voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c`.

Exact pair:

- static credential preexec: 706,504 bytes, SHA-256
  `67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c`;
- credential query: 43,064 bytes, SHA-256
  `7b968a20f1507215477f43a59c5d82b9e9adca918ce5f2df566292d8380b4cb1`.

The final fixed trust root is distinct from the ordinary authenticated query:

`/opt/void-buy-void-user-manager-credential-query-v1`.

## Atomic create-only publication

A future separately authorized apply requires exact confirmation:

`INSTALL_ACCEPTED_USER_MANAGER_CREDENTIAL_QUERY_PAIR_CREATE_ONLY_V1`.

It also requires root, Python isolated mode, and absence of reviewed loader/Python
injection variables.

The final protected root must either be absent or already contain the exact
accepted pair. Unknown/partial/extraneous state fails closed.

When absent, apply:

1. verifies both supplied candidate files by metadata + descriptor-stable
   SHA-256 reads;
2. creates root-owned mode-0755 staging root
   `/opt/.void-buy-void-user-manager-credential-query-v1.stage`;
3. creates both accepted files there with O_EXCL/O_NOFOLLOW, root ownership,
   mode 0555, fsync and exact digest re-verification;
4. requires the staging root to contain exactly those two entries;
5. atomically publishes the complete directory with
   `renameat2(RENAME_NOREPLACE)`;
6. fsyncs `/opt` and re-verifies the final exact pair.

The final fixed path is therefore never intentionally published with only one
member of the pair.

A pre-publication failure attempts bounded staging cleanup. After publication,
unexpected privileged interference fails closed rather than deleting the final
root.

## Authority boundary

The installer source and hosted CI do not authorize or perform apply.

Still false:

- query execution;
- credential-content access;
- service/systemd mutation;
- wallet/signer or private-key access;
- payment acceptance;
- transaction construction/broadcast;
- public presale/WC activation;
- production-host evidence authority;
- funds movement.

Hosted CI runs syntax, self-test, source proof, inert source-plan and
missing-confirmation refusal only.

After a future separately authorized create-only installation, the next gate is
a separate installed/read-only authenticated credential-query qualification.

PROTECT THE CORE.
