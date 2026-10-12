# `void_realms_triscale_build`

License: `GPL-3.0-or-later`

This source-only Luanti mod provides the three-stop VOID Realms building-scale
selector:

```text
SMALL 25%        MEDIUM 50%        STANDARD 100%
    |----------------|----------------|
```

Canonical profiles:

- small: edge 1 microcell, volume/cost 1;
- medium: edge 2 microcells, volume/cost 8;
- standard: edge 4 microcells, volume/cost 64.

Use `/voidbuildscale` or the preview selector's secondary-use action.

The current adapter is deliberately preview-only. Its placement action reports
the selected profile and pointed face but returns the unchanged item stack. It
does not modify nodes, metadata, inventories, entities, files, networking,
workers, Work Credits, wallets, payments or gameplay state.

A later trusted server bridge must translate the preview into the canonical
TypeScript request, verify the current region and revision, derive the cost on
the server, reject overlap and cross-region pieces, and commit the accepted
operation atomically.
