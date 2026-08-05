# Clone and run a VOID node v1

Marker: `VOID_NODE_CLONE_AND_RUN_V1`

This is the source-checkout path for a person who wants to clone the public repository and run a local participant node without manually installing the repository's preferred Node.js version or learning the npm build sequence.

## Requirements

- Linux x86-64. Ubuntu 24.04 and newer comparable Ubuntu releases are the primary targets.
- Git, because this path begins with a repository clone.
- Stable network access for the clone and, when needed, the one-time verified runtime download.
- `bash`, `tar`, `gzip`, `sha256sum`, and either `curl` or `wget`.
- A normal unprivileged user account.
- At least 8 GB RAM and persistent disk space.

Host Node.js, npm, and a global package installation are not required. The launcher accepts a compatible host **Node.js 22, 24, or 26** installation when one is already present. Node.js 24 LTS is the repository default. If the host is missing Node.js or has an unsupported major such as 20, 23, or 25, the launcher downloads the pinned official Node.js `v24.18.0` Linux x64 archive into the ignored repository-local `.runtime/` directory and verifies its exact SHA-256 before use.

The launcher does not replace or modify the machine's global Node.js installation.

## Clone and run

```bash
git clone https://github.com/6ZoSo9/void-node.git
cd void-node
./run-void-node.sh
```

Do not use `sudo`.

The first run performs the complete local preparation:

1. Selects a compatible host Node.js 22, 24, or 26 runtime, or obtains the verified repository-local Node.js 24 LTS runtime.
2. Copies `.env.example` to the ignored local `.env` when no local configuration exists.
3. Creates an ignored mode-0600 `.nodekey` when no node identity exists.
4. Installs the exact locked npm dependencies.
5. Builds the TypeScript source.
6. Starts the node with the selected verified runtime.

Later runs reuse the prepared dependencies and build while the checked-out source revision is unchanged. Set `VOID_CLONE_RUN_REBUILD=1` to force a fresh locked install and rebuild.

## Node.js compatibility

The supported host majors are:

```text
22  Maintenance LTS-compatible baseline
24  Current repository default and LTS runtime
26  Current-release compatibility line
```

The root and source package manifests use this explicit engine boundary:

```text
^22.0.0 || ^24.0.0 || ^26.0.0
```

This deliberately excludes unsupported odd-numbered majors and Node.js 20. A host running an excluded major is not modified; the verified repository-local Node.js 24 runtime is used instead.

To see the selected runtime without starting the node:

```bash
./run-void-node.sh doctor
```

Typical results include:

```text
runtime_source=host_node22
runtime_source=host_node24
runtime_source=host_node26
runtime_source=repo_local_node24
```

## Node identity boundary

The generated `.nodekey` is a random Ed25519 seed used only as this node's peer identity. It is not a wallet key, validator key, treasury key, operator-attestation key, payment credential, or constitutional-authority key.

The launcher does not:

- create or access a wallet;
- enroll the node as a validator;
- enable Work Credit issuance or settlement;
- activate Buy VOID fulfillment;
- enable a system service;
- expose the node publicly;
- use `sudo` or modify the global Node.js installation; or
- move funds.

Never publish `.nodekey`, `.env`, wallet material, seed phrases, credentials, or private operator files.

## Readiness

Keep the first terminal open while the node runs. From another terminal:

```bash
curl -fsS http://127.0.0.1:4100/__void/ready.json
```

The endpoint should become reachable after startup. A healthy synchronized node should report:

```text
ready=true
gap=0
txroot_live=1
```

Public discovery is available locally at:

```bash
curl -fsS http://127.0.0.1:4100/.well-known/void-public-node.json
```

Press `Ctrl+C` in the running terminal to stop the process.

## Prepare without starting

```bash
./run-void-node.sh prepare
```

This obtains the runtime when necessary, creates the local configuration and node identity, installs dependencies, and builds the node. It does not start a listener.

## Diagnose

```bash
./run-void-node.sh doctor
```

A prepared checkout reports the selected runtime source, Node.js and npm versions, supported majors, local configuration, mode-0600 node identity, dependency tree, and build state. The report never prints the private key or `.env` contents.

On a computer whose system Node.js is unsupported, a normal result is:

```text
runtime_source=repo_local_node24
node_version=v24.18.0
host_node_required=false
```

That is deliberate. The machine's existing Node.js installation is left untouched.

## Configuration

The launcher creates `.env` only when the file does not already exist. Review it before changing network exposure or bootstrap configuration.

Common fields are:

```text
DATA_DIR
HTTP_PORT
P2P_PORT
BOOTSTRAP_ADDRS
NODE_PRIVKEY_PATH
```

The default `NODE_PRIVKEY_PATH=.nodekey` binds the generated local node identity. A person who supplies a different key path is responsible for providing a readable supported Ed25519 key with restrictive permissions.

## Source updates

Stop the running node, review upstream changes, and then:

```bash
git pull --ff-only
./run-void-node.sh
```

A changed source revision automatically causes a fresh locked dependency install and build before startup.

The verified immutable release installer remains the preferred path for stable release deployment and rollback. Clone-and-run is the direct public source path.
