# Cloudflare retirement preexec provenance v1

Marker: `VOID_CLOUDFLARE_RETIREMENT_PREEXEC_PROVENANCE_V1`.

Issue: #2984. Parent source generation: Draft #3166 at
`5af492133b6f3078a3c79c0f434e92aab64e1de3`.

## Purpose

The #3166 dynamic retirement query authenticates the user-systemd manager and
the historical Tunnel snapshot, but its V1 sanitizer marker is ordinary
environment data. A direct root caller can set that marker without entering
through the protected static preexec.

This additive V2 candidate closes only that execution-origin gap. It does not
replace or rewrite the parent V1 source or its create-only installer.

## V2 execution boundary

The static V2 preexec:

- runs only as root;
- requires fixed root-owned, non-group/world-writable installed ancestry;
- requires its running `/proc/self/exe` generation to equal the fixed visible
  preexec generation;
- retains and generation-checks the fixed V2 query with `O_NOFOLLOW`;
- creates a close-on-exec pipe and forks;
- remains alive as the query's parent for the complete child lifetime;
- gives only the child pipe-read descriptor inheritance across `fexecve`;
- writes one bounded record binding parent PID, child PID, preexec device/inode
  and query device/inode; and
- constructs the same minimal child environment used by V1.

The dynamic V2 query consumes the inherited proof before the V1 query main is
entered. It requires:

- the record parent PID to equal `getppid()`;
- the record child PID to equal `getpid()`;
- `/proc/<parent>/exe` to be the exact fixed protected V2 preexec pathname;
- `/proc/self/exe` to be the exact fixed protected V2 query pathname;
- both visible installed files to remain root-owned, executable,
  non-group/world-writable single-link generations; and
- record device/inode identities to equal both running and visible generations.

Only after that proof succeeds does the V2 wrapper invoke the unchanged V1
retirement-query logic, which still performs the minimal-loader-environment
check, fixed libsystemd provenance checks, root/kernel-authenticated
user-manager private-peer connection and double retirement snapshot.

## Adversaries

Focused CI must prove:

1. direct query execution with the V1 sanitizer marker but no proof descriptor
   fails;
2. a forged inherited pipe record from a non-preexec parent fails even when
   parent/child PIDs are syntactically correct;
3. a hostile `LD_PRELOAD` constructor fires during direct dynamic execution
   (positive control), while the same caller environment cannot cross the
   static preexec into the query; and
4. the real protected V2 preexec can execute the query self-test successfully.

## Deliberate nonclaims

This is a source/binary-candidate boundary only. It does not yet provide a
reviewed create-only V2 installer or accepted hosted binary identity.

Therefore these remain false:

- production host installation;
- future restart prevention;
- historical user-Tunnel retirement verification;
- service/systemd/Tunnel/network/nftables/DNS mutation;
- credential-content access;
- runtime integration or external acceptance;
- payment/WC/presale/transaction/funds authority.

A later successor may accept byte-identical hosted V2 binaries and define the
protected install/update lineage without changing the V1 historical record.
