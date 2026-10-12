# Mainnet-0 Validator Status Record Template

Status: tracked template for validator admission/status lifecycle during Mainnet-0

## Purpose

This template defines the minimum operator-facing record for each validator participating in Mainnet-0.

It is meant to support:
- admission tracking
- warning/pause/removal history
- incident coordination
- canonical recovery communication

---

## Required fields

### Identity
- validator_id
- operator_label
- operator_contact_path
- reward_address
- consensus_key

### Software / config
- expected_branch
- expected_version
- expected_config_identity
- current_reported_version
- current_reported_config_identity

### Current status
- status
  - candidate
  - admitted
  - warned
  - paused
  - removed
- status_reason
- status_last_changed_at

### Health / monitoring
- last_known_head
- last_known_health
- last_known_drift
- checkpoint_awareness_status
- incident_response_readiness

### History
- warning_count
- pause_count
- last_warning_at
- last_pause_at
- last_incident_involved

### Notes
- notes
- operator_comments

---

## Example record

validator_id: validator-01
operator_label: example-operator
operator_contact_path: TBD
reward_address: "0xTBD"
consensus_key: "0xTBD"

expected_branch: main
expected_version: TBD
expected_config_identity: TBD
current_reported_version: TBD
current_reported_config_identity: TBD

status: candidate
status_reason: not yet admitted
status_last_changed_at: TBD

last_known_head: TBD
last_known_health: TBD
last_known_drift: TBD
checkpoint_awareness_status: TBD
incident_response_readiness: TBD

warning_count: 0
pause_count: 0
last_warning_at: null
last_pause_at: null
last_incident_involved: null

notes: []
operator_comments: []
