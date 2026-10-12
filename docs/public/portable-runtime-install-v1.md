# VOID node portable runtime install v1

marker: `VOID_PUBLIC_RELEASE_PORTABLE_RUNTIME_INSTALL_DOC_V1`

The public Linux x64 release carries its own verified Node.js 22 runtime.
**Host Node.js, npm, and Git are not required** to install, update, diagnose, or
run the packaged VOID node.

This lane directly addresses the failure mode where a capable machine cannot
run VOID because its Linux distribution provides a newer system Node.js than
the development repository accepts.

## Target systems

The release target is Linux x86-64. Qualification includes:

- Ubuntu 24.04 LTS;
- Ubuntu 26.04 LTS; and
- comparable modern x86-64 Linux distributions with glibc and standard command-line tools.

The machine still needs `bash`, `python3`, `tar`, `gzip`, `sha256sum`, and
`curl`. A normal Ubuntu installation already provides most of these, and the
installer reports any missing command plainly.

## Verify before installation

Download these files from the same immutable VOID GitHub release:

```text
install-void-node-v1.sh
void-node-release-manifest.json
SHA256SUMS
void-node-<version>-linux-x64.tar.gz
```

Verify the release assets before execution:

```bash
sha256sum --check SHA256SUMS
bash install-void-node-v1.sh self-test
```

Optional GitHub artifact-attestation verification:

```bash
gh attestation verify void-node-<version>-linux-x64.tar.gz --repo 6ZoSo9/void-node
```

## Install

```bash
bash install-void-node-v1.sh install --yes
```

The installer verifies the outer archive digest, rejects traversal and unsafe
archive entries, verifies every extracted file, verifies the bundled Node.js
binary against the release manifest, and binds the runtime metadata to
`BUILD-INFO.json`.

After installation:

```bash
~/.local/bin/void-node version
~/.local/bin/void-node verify
~/.local/bin/void-node doctor
```

A healthy doctor report includes:

```text
bundled_node=true
bundled_node22=true
host_node_required=false
checksums=true
```

## Start explicitly

The service remains disabled and stopped after a normal installation. Start it
only after reviewing the generated configuration:

```bash
~/.local/bin/void-node enable
~/.local/bin/void-node start
~/.local/bin/void-node status
```

Installation does not generate a wallet key, validator key, treasury key, or
operator credential. It does not activate Buy VOID fulfillment, validator
admission, Work Credit mutation, treasury authority, or any other guarded lane.

## Update, rollback, and uninstall

The release manager invokes the updater through the bundled runtime, so future
updates also do not depend on a host Node.js installation.

```bash
void-node update check --channel https://github.com/6ZoSo9/void-node/releases/latest/download/stable-v1.json
void-node rollback
void-node uninstall --yes
```

Use `--purge` only when configuration and node state should also be deleted.

## Development checkout boundary

A source checkout remains a developer workflow and still uses the repository's
pinned Node.js toolchain. Ordinary node operators should use the verified
portable release instead of `git clone`, `npm ci`, and a local TypeScript build.

Merging this source lane does not publish a release, start a service, deploy a
node, generate keys, activate authority, or move funds. An immutable release and
its Ubuntu qualification results remain separate explicit gates.
