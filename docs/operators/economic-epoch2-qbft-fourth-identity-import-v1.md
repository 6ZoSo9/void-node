# Epoch-2 QBFT fourth identity import v1

Status: **superseded for the current production topology**.

This tool is retained for historical continuity and possible future topology
expansion only.

The canonical production topology now contains three validators:

```text
precision
nimo
xiphos
```

and explicitly records:

```text
fourth_validator_required_for_launch=false
```

Therefore this importer is not part of the active launch path and there is no
pending fourth-machine operator task.

If a fourth validator is added in the future, that change requires a separately
reviewed topology update before this historical importer or a successor tool is
used.

No authority is granted by this retained source.
