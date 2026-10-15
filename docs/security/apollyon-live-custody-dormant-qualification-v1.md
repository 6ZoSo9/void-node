# Apollyon live custody dormant qualification v1

This gate is the first live activation of the installed custody service.

It exercises custody only. The training service is never started.

The run performs two complete cycles:

1. verify target/service dormant and socket absent;
2. start only `void-apollyon-authorization-custody-v1.target`;
3. require the dependency-started custody service active;
4. attest the root-custodied Node executable, custody UID/GID slots,
   supplementary IPC group, zero capabilities, NoNewPrivileges, exact launcher
   argv, AF_UNIX socket owner/group/mode/link-count, and a successful AF_UNIX
   connection;
5. stop only the activation target;
6. require target/service inactive and the advertised socket absent after
   `ExecStopPost`;
7. repeat the cycle once and require a new custody process generation.

The consumed-record directory must be byte-metadata stable across both cycles,
and no process carrying the dedicated training UID may appear before, during or
after qualification.

No direct custody-service action, training, durable claim, private-key access,
signing, wallet, transaction or funds movement is authorized.
