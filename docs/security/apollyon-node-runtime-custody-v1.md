# Apollyon root-custodied Node runtime v1

Marker: `VOID_APOLLYON_NODE_RUNTIME_CUSTODY_V1`

Status: **source-only create-only runtime contract; no Xiphos mutation by CI**.

The Xiphos runtime census found Node 24.21.0 at:

`/opt/nodejs/node-v24.21.0-linux-x64/bin/node`

with exact identity:

```text
bytes=126595440
sha256=7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c
version=v24.21.0
```

That source binary is owned by UID/GID 1001 and therefore is **not** admitted as
a custody executable. Source ownership is not trusted.

A separate dependency probe copied the exact bytes to an unrelated temporary
path and proved Node version, `process.execPath`, and built-in
`node:crypto` operation without the original distribution path. The binary
uses only the host system dynamic loader/shared libraries.

The accepted installed runtime is therefore a create-only exact copy at:

`/opt/void-apollyon-node-runtime-v1/node`

required to be root:root, mode 0755, single-link, nonsymlink, exact
126,595,440 bytes and exact SHA-256 above.

The installer re-hashes a retained no-follow source descriptor, copies from that
descriptor, rechecks the source generation after the copy, seals the
destination root-owned, and executes the installed copy for version, execPath
and built-in crypto probes.

No package manager, network, systemd, service, training, durable claim, or funds
authority exists in this lane.

The custody unit and live-session process identity chain must use this fixed
path rather than `/usr/bin/node`.
