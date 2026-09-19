BEGIN;

CREATE TABLE void_buy_void_payment_keyed_dispatcher_jobs_v1 (
  attempt_id TEXT PRIMARY KEY
    CHECK (attempt_id ~ '^[0-9a-f]{64}$'),
  request_fingerprint_sha256 TEXT NOT NULL
    CHECK (request_fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  submitted_at_us BIGINT NOT NULL
    CHECK (submitted_at_us > 0),
  result_fingerprint_sha256 TEXT
    CHECK (
      result_fingerprint_sha256 IS NULL OR
      result_fingerprint_sha256 ~ '^[0-9a-f]{64}$'
    ),
  published BOOLEAN NOT NULL,
  published_gen BIGINT
    CHECK (published_gen IS NULL OR published_gen > 0),
  lease_gen BIGINT NOT NULL
    CHECK (lease_gen >= 0),
  lease_token TEXT
    CHECK (lease_token IS NULL OR lease_token ~ '^[0-9a-f]{32}$'),
  lease_owner TEXT
    CHECK (
      lease_owner IS NULL OR
      lease_owner ~ '^[A-Za-z0-9._:@/-]{1,160}$'
    ),
  lease_expires_us BIGINT
    CHECK (lease_expires_us IS NULL OR lease_expires_us > 0),
  version BIGINT NOT NULL
    CHECK (version >= 0),

  CHECK (
    (
      lease_token IS NULL AND
      lease_owner IS NULL AND
      lease_expires_us IS NULL
    ) OR (
      lease_token IS NOT NULL AND
      lease_owner IS NOT NULL AND
      lease_expires_us IS NOT NULL AND
      lease_gen > 0
    )
  ),

  CHECK (
    (
      published = TRUE AND
      result_fingerprint_sha256 IS NOT NULL AND
      published_gen = lease_gen AND
      lease_token IS NULL AND
      lease_owner IS NULL AND
      lease_expires_us IS NULL
    ) OR (
      published = FALSE AND
      result_fingerprint_sha256 IS NULL AND
      published_gen IS NULL
    )
  )
);

CREATE TABLE void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 (
  attempt_id TEXT PRIMARY KEY
    CHECK (attempt_id ~ '^[0-9a-f]{64}$'),
  last_decision_seq BIGINT NOT NULL
    CHECK (last_decision_seq > 0)
);

CREATE TABLE void_buy_void_payment_keyed_dispatcher_audit_v1 (
  attempt_id TEXT NOT NULL
    CHECK (attempt_id ~ '^[0-9a-f]{64}$'),
  decision_seq BIGINT NOT NULL
    CHECK (decision_seq > 0),
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'SUBMIT',
      'SUBMIT_REPLAY',
      'PAYLOAD_CONFLICT',
      'CLAIM',
      'CLAIM_REJECT_NOT_FOUND',
      'CLAIM_REJECT_PUBLISHED',
      'CLAIM_REJECT_ACTIVE',
      'LEASE_EXPIRED_RECLAIM',
      'LEASE_RENEW',
      'RENEW_REJECT_NOT_FOUND',
      'RENEW_REJECT_PUBLISHED',
      'RENEW_REJECT_STALE',
      'RENEW_REJECT_UNAUTHORIZED',
      'RENEW_REJECT_EXPIRED',
      'PUBLISH',
      'PUBLISH_REPLAY',
      'PUBLISH_REJECT_NOT_FOUND',
      'PUBLISH_REJECT_STALE',
      'PUBLISH_REJECT_UNAUTHORIZED',
      'PUBLISH_REJECT_EXPIRED'
    )),
  outcome TEXT NOT NULL
    CHECK (outcome IN ('SUCCESS', 'IDEMPOTENT', 'REJECTED', 'OBSERVED')),
  actor_id TEXT
    CHECK (
      actor_id IS NULL OR
      actor_id ~ '^[A-Za-z0-9._:@/-]{1,160}$'
    ),
  lease_gen BIGINT NOT NULL
    CHECK (lease_gen >= 0),
  created_at_us BIGINT NOT NULL
    CHECK (created_at_us > 0),
  detail JSONB NOT NULL
    CHECK (jsonb_typeof(detail) = 'object'),

  PRIMARY KEY (attempt_id, decision_seq)
);

-- Deliberately no foreign key from audit/cursor rows to jobs:
-- *_REJECT_NOT_FOUND decisions are durable before any canonical job row exists.

COMMIT;
