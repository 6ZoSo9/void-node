# Apollyon live custody dormant qualification v1

This gate is the first live activation of the installed custody service.

It exercises custody only. The training service is never started.

The run performs two complete cycles:

1. verify the activation target is loaded/inactive with
   `UnitFileState=disabled`, the custody service is loaded/inactive with
   `UnitFileState=static`, the socket is absent, and the custody UID owns zero
   live processes;
2. immediately before each cycle, re-require zero custody-UID processes;
3. start only `void-apollyon-authorization-custody-v1.target`;
4. require the dependency-started custody service active;
5. attest the root-custodied Node executable, custody UID/GID slots,
   supplementary IPC group, zero capabilities, NoNewPrivileges, exact launcher
   argv, AF_UNIX socket owner/group/mode/link-count, and a successful AF_UNIX
   connection;
6. require the complete custody-UID process set to be exactly the service
   MainPID and its observed start-ticks generation; any second custody-UID
   process holds closed;
7. stop only the activation target;
8. require target/service inactive, the advertised socket absent after
   `ExecStopPost`, the socket parent empty, and the custody UID process set
   back to zero;
9. repeat the cycle once and require a distinct custody process generation,
   preserving the same zero -> exact-one -> zero custody-UID lifecycle.

The consumed-record directory must be byte-metadata stable across both cycles,
and no process carrying the dedicated training UID may appear before, during or
after qualification. Custody-process census classifies a process as
authority-bearing when any real/effective/saved/filesystem UID slot equals the
custody UID; unreadable or unclassifiable live process state holds closed.

No direct custody-service action, training, durable claim, private-key access,
signing, wallet, transaction or funds movement is authorized.
