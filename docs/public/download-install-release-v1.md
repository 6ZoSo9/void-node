# VOID Node Verified Release Install v1

marker: `VOID_PUBLIC_RELEASE_INSTALL_DOC_V1`

The preferred public download lane is a versioned Linux x64 release archive,
not a blind pipe into a shell and not a requirement to clone the development
repository. Every release carries an outer `SHA256SUMS`, an internal
`RELEASE-CONTENTS-SHA256`, deterministic build metadata, an SPDX SBOM, a
stable JSON manifest, and a verified bundled Node.js 22 runtime.

## Requirements

- Linux x86-64.
- An unprivileged user account.
- `bash`, `python3`, `tar`, `gzip`, `sha256sum`, and `curl`.

Host Node.js, npm, and Git are not required for release installation, updates,
diagnostics, or runtime. A source checkout remains a separate developer
workflow with its own pinned toolchain.

See [portable runtime install v1](portable-runtime-install-v1.md) for the exact
host-independence and Ubuntu qualification boundary.

## Verify before install

Download these release assets from the same immutable GitHub release:

```text
install-void-node-v1.sh
void-node-release-manifest.json
SHA256SUMS
void-node-<version>-linux-x64.tar.gz
```

Verify the outer manifest before executing the installer:

```bash
sha256sum --check SHA256SUMS
bash install-void-node-v1.sh self-test
```

Optional GitHub attestation verification is available through:

```bash
gh attestation verify void-node-<version>-linux-x64.tar.gz --repo 6ZoSo9/void-node
```

## Install

```bash
bash install-void-node-v1.sh install --yes
```

The installer verifies both the archive and the bundled runtime. The default is
deliberately conservative: the service is not enabled or started. No private
key is generated, and guarded validator, treasury, Buy VOID, authority, and
economic execution lanes remain unchanged.

Inspect the installation:

```bash
~/.local/bin/void-node version
~/.local/bin/void-node verify
~/.local/bin/void-node doctor
```

A healthy portable-runtime doctor report includes:

```text
bundled_node=true
bundled_node22=true
host_node_required=false
checksums=true
```

After configuring an existing node key or an explicitly approved key lane:

```bash
~/.local/bin/void-node enable
~/.local/bin/void-node start
~/.local/bin/void-node status
```

## Atomic update and rollback

Run the same installer against a newer immutable release. The previous release
is preserved behind the `previous` pointer. The updater and release manager use
the bundled runtime and do not depend on a system Node.js installation.

Roll back with:

```bash
void-node rollback
```

## Uninstall

```bash
void-node uninstall --yes
```

Add `--purge` only when config and state should also be removed.
