# Apollyon live-custody reviewed-root v2 upgrade v1

This is the installed-host successor for Xiphos after the initial create-only
custody deployment.

The installed reviewed-v1 source tree is retained unchanged. The successor:

1. verifies every reviewed-v1 source blob and the old fixed launcher;
2. requires both custody and training services inactive;
3. creates the complete reviewed-v2 source tree at
   `/opt/void-apollyon-live-custody-binding-v2-reviewed-v2`;
4. verifies every new source blob;
5. atomically replaces only the fixed Python launcher at the existing pre-entry
   path; and
6. re-verifies both reviewed roots.

The native static pre-entry remains byte-identical. The custody systemd unit,
root-custodied Node runtime, public key, state root, accounts/groups, Polkit
rule and tmpfiles rule remain untouched.

The reviewed-v2 collector admits exactly Noble systemd
`255.4-1ubuntu8.11` and `255.4-1ubuntu8.18`. Other versions remain
fail-closed.

No service start/stop/restart, systemd mutation, training, durable attempt
claim, private-key access, signing, transaction, or funds movement is
authorized by this upgrade.
