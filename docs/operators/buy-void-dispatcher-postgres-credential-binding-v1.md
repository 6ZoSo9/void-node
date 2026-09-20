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

The active drop-in directive set is closed: exactly one `[Service]` section
plus the two fixed `LoadCredential=` bindings above. Comments and blank lines
carry no authority. No other active systemd directive is accepted by the proof.

The drop-in intentionally contains no `ExecStart*` override and no Buy VOID
runtime/apply enable flags. It therefore cannot start the dispatcher or grant
execution authority.

A later credential reader must consume only the systemd-provided
`CREDENTIALS_DIRECTORY`, open the fixed IDs fail-closed, reject symlinks and
broad permissions, bound file sizes, and avoid returning/logging raw password
or CA material beyond the trusted connection-factory boundary.


The focused workflow executes the same proof plus repository typecheck/build on
Node.js 22, 24, and 26. Its concurrency key shares one cancelable group only
between heads of the same pull request; non-PR runs use unique `github.run_id`
groups and cannot supersede one another.
