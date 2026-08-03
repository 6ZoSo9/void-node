-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- VOID Realms World Status v1
--
-- This server-side mod exposes a sanitized status surface only. It does not
-- create worlds, assign region authority, sign checkpoints, accept handoffs,
-- start listeners, contact peers, or commit gameplay state.

local WORLD_ID = "^voidrw1_[0-9a-f]+$"
local REGION_ID = "^voidrr1_[0-9a-f]+$"
local CHECKPOINT_ID = "^voidrcp1_[0-9a-f]+$"
local WORLD_CHECKPOINT_ID = "^voidrwc1_[0-9a-f]+$"
local UTC = "^%d%d%d%d%-%d%d%-%d%dT%d%d:%d%d:%d%dZ$"

local status = nil

local function bounded_integer(value, minimum, maximum, label)
  assert(type(value) == "number", label .. " must be a number")
  assert(value == math.floor(value), label .. " must be an integer")
  assert(value >= minimum and value <= maximum, label .. " out of bounds")
  return value
end

local function clean_status(value)
  assert(type(value) == "table", "status must be a table")
  assert(type(value.world_id) == "string" and value.world_id:match(WORLD_ID), "invalid world_id")
  assert(type(value.region_id) == "string" and value.region_id:match(REGION_ID), "invalid region_id")
  assert(
    type(value.region_checkpoint_id) == "string"
      and value.region_checkpoint_id:match(CHECKPOINT_ID),
    "invalid region_checkpoint_id"
  )
  assert(
    type(value.world_checkpoint_id) == "string"
      and value.world_checkpoint_id:match(WORLD_CHECKPOINT_ID),
    "invalid world_checkpoint_id"
  )
  assert(type(value.authority_server_connected) == "boolean", "invalid authority status")
  assert(type(value.updated_at_utc) == "string" and value.updated_at_utc:match(UTC), "invalid timestamp")

  return {
    marker = "VOID_REALMS_LUANTI_SANITIZED_WORLD_STATUS_V1",
    version = 1,
    world_name = "VOID Realms",
    single_world_identity = true,
    world_id = value.world_id,
    region_id = value.region_id,
    region_checkpoint_id = value.region_checkpoint_id,
    world_checkpoint_id = value.world_checkpoint_id,
    authority_server_connected = value.authority_server_connected,
    replica_peer_count = bounded_integer(value.replica_peer_count, 0, 1000000, "replica_peer_count"),
    public_objects_available = bounded_integer(
      value.public_objects_available,
      0,
      1000000000,
      "public_objects_available"
    ),
    updated_at_utc = value.updated_at_utc,
    gameplay_authority = false,
    checkpoint_signing_authority = false,
    handoff_acceptance_authority = false,
  }
end

void_realms_world = rawget(_G, "void_realms_world") or {}

function void_realms_world.publish_sanitized_status(value)
  status = clean_status(value)
  return true
end

function void_realms_world.clear_sanitized_status()
  status = nil
end

function void_realms_world.get_sanitized_status()
  if status == nil then
    return nil
  end
  return table.copy(status)
end

local function status_message()
  if status == nil then
    return "VOID Realms: one canonical world; region status unavailable."
  end
  return "VOID Realms world=" .. status.world_id
    .. " region=" .. status.region_id
    .. " checkpoint=" .. status.region_checkpoint_id
    .. " world_checkpoint=" .. status.world_checkpoint_id
    .. " replicas=" .. tostring(status.replica_peer_count)
    .. " objects=" .. tostring(status.public_objects_available)
    .. " authority_connected=" .. tostring(status.authority_server_connected)
end

core.register_chatcommand("voidworld", {
  description = "Show sanitized VOID Realms canonical-world and region status.",
  func = function()
    return true, status_message()
  end,
})
