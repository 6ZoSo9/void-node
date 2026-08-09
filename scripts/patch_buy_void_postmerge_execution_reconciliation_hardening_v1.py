from __future__ import annotations

import subprocess


PINNED_PATCH_COMMIT = "99f179f0a3ffed7c35d4a95e824401da792c8a2e"
PATCH_PATH = "scripts/patch_buy_void_postmerge_execution_reconciliation_hardening_v1.py"


def replace_once(text: str, old: str, new: str, name: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{name}: expected 1 carrier anchor, found {count}")
    return text.replace(old, new, 1)


# Keep the original guarded hardening program immutable and repair only the two
# response-saga anchors that became ambiguous because dry and applied envelopes
# intentionally contain the same expression. Do not relax the original
# one-anchor invariant globally: every semantic mutation must still match one
# exact contextual preimage.
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
