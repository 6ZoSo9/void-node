# Buy VOID dispatcher PostgreSQL credential binding v1

Status: source-only systemd credential binding example. No host mutation,
credential content, runtime enablement, database connection, schema action,
signing, broadcast, or funds movement is performed.

This gate defines exactly two systemd credentials for the later dispatcher
PostgreSQL connection factory:

```text
buy-void-dispatcher-postgres-password-v1
buy-void-dispatcher-postgres-ca-v1
```

The example uses only `LoadCredential=` with operator-private source path
placeholders. It does not use `Environment=PGPASSWORD`, `DATABASE_URL`,
`SetCredential=`, `ImportCredential=`, or an environment-defined
`CREDENTIALS_DIRECTORY`.

The credential contents and source files remain outside the repository.
Installing the example is a separate host operation and is not authorized by
this source gate.

The drop-in intentionally contains no `ExecStart*` override and no Buy VOID
runtime/apply enable flags. It therefore cannot start the dispatcher or grant
execution authority.

A later credential reader must consume only the systemd-provided
`CREDENTIALS_DIRECTORY`, open the fixed IDs fail-closed, reject symlinks and
broad permissions, bound file sizes, and avoid returning/logging raw password
or CA material beyond the trusted connection-factory boundary.
