# `void_realms_triscale_convert`

License: `GPL-3.0-or-later`

This source-only Luanti mod previews the exact atomic conversion arithmetic for
VOID Realms tri-scale building pieces.

Supported subdivision previews:

- standard → medium: 8 replacement pieces;
- standard → small: 64 replacement pieces;
- medium → small: 8 replacement pieces.

Supported merge previews:

- 8 small → medium;
- 64 small → standard;
- 8 medium → standard.

Command:

```text
/voidbuildconvert <subdivide|merge> <source> <target>
```

The adapter performs arithmetic and displays a message only. It does not change
world nodes, inventories, metadata, entities, files, networking, workers,
payments or gameplay state.

A trusted server bridge must later bind a requested conversion to the exact
world, region, owner, source placement set, expected revision and nonce, then
apply removal and replacement as one authoritative compare-and-swap transition.
