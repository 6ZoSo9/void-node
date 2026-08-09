from __future__ import annotations

import subprocess


PINNED_PATCH_COMMIT = "99f179f0a3ffed7c35d4a95e824401da792c8a2e"
PATCH_PATH = "scripts/patch_buy_void_postmerge_execution_reconciliation_hardening_v1.py"


def replace_once(text: str, old: str, new: str, name: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{name}: expected 1 carrier anchor, found {count}")
    return text.replace(old, new, 1)


# Keep the original guarded hardening program immutable and repair only the
# ambiguous response/decision saga anchors. Dry and applied envelopes
# intentionally contain the same scalar expressions, so each semantic mutation
# binds to an exact contextual preimage instead of relaxing one() globally.
source = subprocess.check_output(
    ["git", "show", f"{PINNED_PATCH_COMMIT}:{PATCH_PATH}"],
    text=True,
)

source = replace_once(
    source,
    """text = one(
    text,
    'text(response.saga_id).toLowerCase() !== sagaId',
    'response.saga_id !== sagaId',
    "reconciliation dry response saga",
)""",
    """text = one(
    text,
    '''    response.applied !== false ||
    text(response.saga_id).toLowerCase() !== sagaId ||
    response.execute_prepared_transaction_mounted !== false''',
    '''    response.applied !== false ||
    response.saga_id !== sagaId ||
    response.execute_prepared_transaction_mounted !== false''',
    "reconciliation dry response saga",
)""",
    "dry response saga carrier repair",
)

source = replace_once(
    source,
    """text = one(
    text,
    'text(decision.saga_id).toLowerCase() !== sagaId',
    'decision.saga_id !== sagaId',
    "reconciliation dry decision saga",
)""",
    """text = one(
    text,
    '''    decision.signed_payload_bytes_returned !== false ||
    decision.money_movement_performed !== false ||
    text(decision.saga_id).toLowerCase() !== sagaId
  ) {''',
    '''    decision.signed_payload_bytes_returned !== false ||
    decision.money_movement_performed !== false ||
    decision.saga_id !== sagaId
  ) {''',
    "reconciliation dry decision saga",
)""",
    "dry decision saga carrier repair",
)

source = replace_once(
    source,
    """text = one(
    text,
    'text(response.saga_id).toLowerCase() !== sagaId',
    'response.saga_id !== sagaId',
    "reconciliation applied response saga",
)""",
    """text = one(
    text,
    '''    response.applied !== true ||
    text(response.saga_id).toLowerCase() !== sagaId ||
    response.execute_prepared_transaction_mounted !== false''',
    '''    response.applied !== true ||
    response.saga_id !== sagaId ||
    response.execute_prepared_transaction_mounted !== false''',
    "reconciliation applied response saga",
)""",
    "applied response saga carrier repair",
)

exec(
    compile(source, PATCH_PATH, "exec"),
    {"__name__": "__main__", "__file__": PATCH_PATH},
)
