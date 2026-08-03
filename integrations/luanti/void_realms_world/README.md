# `void_realms_world`

License: `GPL-3.0-or-later`

This Luanti server mod presents the sanitized status of the one canonical VOID
Realms world.

It exposes:

- canonical world ID;
- current region ID;
- current signed-checkpoint references;
- replica-peer and public-object counts;
- authority-server connectivity.

It grants no authority. It does not create a world, assign a region server,
sign a checkpoint, accept a player handoff, start a network listener, contact
a peer, execute a worker, or commit gameplay state.

Command:

- `/voidworld`

A later trusted bridge may call
`void_realms_world.publish_sanitized_status(status)`. The bridge remains
responsible for authenticating the source. The mod stores only bounded,
sanitized, in-memory status.
