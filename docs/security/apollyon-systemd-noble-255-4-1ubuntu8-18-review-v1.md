# Apollyon systemd Noble 255.4-1ubuntu8.18 review v1

Status: source-review note for the designated-host custody collector.

The Xiphos host reports systemd `255.4-1ubuntu8.18`. The existing collector
was intentionally exact and admitted only the previously reviewed Noble package
`255.4-1ubuntu8.11`, so live custody qualification would fail closed after the
host security update.

This successor keeps the exact-major and exact-package allowlist model. It adds
only:

`255.4-1ubuntu8.18`

while retaining `255.4-1ubuntu8.11` and continuing to reject other versions.

Review scope:

- Ubuntu Noble security publishes 255.4-1ubuntu8.18 as the current amd64
  systemd package.
- 8.18 changes the built-in systemd-resolved DNSSEC root trust anchor.
- 8.17 addresses systemd-homed/systemd-oomd security issues.
- 8.16 addresses systemd-nspawn security behavior.
- 8.15 contains network/timer fixes.
- None of those reviewed changes alter the systemd manager D-Bus ownership,
  systemctl unit-control action IDs, or Polkit action IDs used by this custody
  evidence collector.

The collector still requires the running PID1 manager version to equal the
installed systemd package version. It still binds PID1 as the
org.freedesktop.systemd1 system-bus owner and proves explicit denial of all
reviewed systemd control actions for the training identity.

This review does not authorize a service start, training execution, durable
attempt claim, signing, transaction, or funds movement.
