# VOID First Official Release Rehearsal v1

`VOID_PUBLIC_FIRST_OFFICIAL_RELEASE_REHEARSAL_V1` exercises the complete public-release control plane without creating a Git tag, GitHub Release, stable public channel, live deployment, service restart, or economic mutation.

The rehearsal uses a private local rehearsal namespace:

```text
rehearsal/release-v<semver>/<source-commit-prefix>
```

It builds the release twice, verifies deterministic checksums, binds every asset by SHA-256 and byte length, and records a hash-chained sequence covering:

1. immutable-publication requirements;
2. candidate promotion;
3. the complete qualification matrix;
4. independent approval;
5. canary verification;
6. stable promotion;
7. freeze and revocation;
8. rollback and state recovery.

Every receipt states that release publication, deployment, restart, wallet changes, Work Credit writes, Buy VOID fulfillment, validator admission, treasury movement, authority transfer, and guarded-lane activation did not occur.

Run locally:

```bash
make public-python-bytecode-hygiene-v1-proof
make public-first-official-release-rehearsal-v1-proof
```

A green rehearsal proves the control plane and its failure handling. It is not an official release and does not substitute for real external qualification evidence or protected operator approval.
