# Apollyon custody host-policy qualification v2

Marker: VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2

Issue: #2900.

This source-only successor preserves the immutable V82/V1 classifier. A V2
success first converts only the marker/version and socket-parent successor fields
back to the historical V1 shape and requires the exact V1 classifier to succeed.
It then requires socket-parent retained ancestor count >= 2, root-owned direct
symlink-free ancestors, no group/other-writable retained ancestor, and training
UID rename/unlink denial through the socket parent's immediate parent.

No V1 source, proof or documentation is repinned. Success remains source-policy
qualification only: live host qualification, independent custody, attempt claim,
training execution, signing, wallet/transaction authority and funds movement
remain false. The next gate is the read-only designated-host V2 collector.
