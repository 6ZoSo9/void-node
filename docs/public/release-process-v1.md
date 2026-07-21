# VOID Public Release Process v1

marker: `VOID_PUBLIC_RELEASE_PROCESS_V1`

This lane publishes a release only from an annotated tag matching
`release-v<package-version>`. Pull requests run the same deterministic builder,
checksum checks, archive traversal checks, installer test, release verification,
and uninstall test used by the tag workflow.

## Merge gate

```bash
make public-release-distribution-v1-proof
```

The proof must establish:

- two fixed-epoch builds produce the same archive SHA-256;
- the outer and inner checksum manifests are valid;
- the archive has one safe top-level directory and no escaping links;
- a user-scoped install creates an atomic `current` pointer;
- `void-node verify` succeeds from the installed release;
- uninstall and purge remove the isolated test installation;
- the service remains disabled and stopped unless explicit flags are supplied.

## Tag and publish

After the wall PR is merged and `main` is clean:

```bash
git tag -a "release-v$(node -p 'require("./package.json").version')" -m "VOID node release"
git push origin "release-v$(node -p 'require("./package.json").version')"
```

The workflow rebuilds the exact tag, verifies checksums, creates GitHub artifact attestations,
and publishes the assets in an immutable GitHub release.

No live deployment, service restart, key generation, validator admission, Buy
VOID fulfillment, treasury action, or Work Credit ledger mutation is part of
this release job. Deployment remains a separate proof-gated operator lane.
