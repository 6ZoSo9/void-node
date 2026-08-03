-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- VOID Work Foundation v1
-- This server-side Luanti mod records in-game intent and displays only
-- sanitized status. It cannot start a worker, access the network, execute
-- programs, access a wallet, or award rewards. It awards no Work Credits.

local storage = core.get_mod_storage()
local snapshots = {}

local VALID_STATUS = {
  idle = true,
  available = true,
  running = true,
  submitted = true,
  verified = true,
  credited = true,
  paused = true,
  error = true,
}

local function valid_player_name(name)
  return type(name) == "string"
    and #name >= 1
    and #name <= 64
    and name:match("^[A-Za-z0-9_-]+$") ~= nil
end

local function consent_key(name)
  return "consent:" .. name
end

local function get_consent(name)
  if not valid_player_name(name) then
    return false
  end
  return storage:get_string(consent_key(name)) == "on"
end

local function set_consent(name, enabled)
  assert(valid_player_name(name), "invalid player name")
  storage:set_string(consent_key(name), enabled and "on" or "off")
end

local function clean_optional_id(value, prefix)
  if value == nil or value == "" then
    return nil
  end
  assert(type(value) == "string", "identifier must be a string")
  assert(#value <= 160, "identifier exceeds bound")
  assert(value:match("^" .. prefix .. "[0-9a-f]+$") ~= nil, "identifier format mismatch")
  return value
end

local function clean_snapshot(value)
  assert(type(value) == "table", "snapshot must be a table")
  assert(VALID_STATUS[value.status] == true, "snapshot status mismatch")
  assert(
    type(value.progress_percent) == "number"
      and value.progress_percent >= 0
      and value.progress_percent <= 100,
    "snapshot progress_percent must be 0..100"
  )
  assert(
    type(value.wc_pending) == "number"
      and value.wc_pending >= 0
      and value.wc_pending <= 1000000,
    "snapshot wc_pending out of bounds"
  )
  assert(
    type(value.wc_credited) == "number"
      and value.wc_credited >= 0
      and value.wc_credited <= 1000000,
    "snapshot wc_credited out of bounds"
  )
  assert(type(value.companion_connected) == "boolean", "companion_connected must be boolean")
  assert(
    type(value.updated_at_utc) == "string"
      and value.updated_at_utc:match("^%d%d%d%d%-%d%d%-%d%dT%d%d:%d%d:%d%dZ$"),
    "updated_at_utc must be canonical UTC"
  )

  return {
    marker = "VOID_LUANTI_SANITIZED_WORKER_STATUS_V1",
    version = 1,
    status = value.status,
    job_id = clean_optional_id(value.job_id, "void"),
    capability_id = (
      type(value.capability_id) == "string"
      and #value.capability_id <= 128
      and value.capability_id:match("^[A-Za-z0-9._:-]+$")
    ) and value.capability_id or nil,
    progress_percent = math.floor(value.progress_percent),
    wc_pending = math.floor(value.wc_pending),
    wc_credited = math.floor(value.wc_credited),
    companion_connected = value.companion_connected,
    updated_at_utc = value.updated_at_utc,
  }
end

void_work = rawget(_G, "void_work") or {}

function void_work.get_consent(name)
  return get_consent(name)
end

function void_work.publish_sanitized_snapshot(name, snapshot)
  assert(valid_player_name(name), "invalid player name")
  snapshots[name] = clean_snapshot(snapshot)
  return true
end

function void_work.clear_sanitized_snapshot(name)
  assert(valid_player_name(name), "invalid player name")
  snapshots[name] = nil
end

function void_work.get_sanitized_snapshot(name)
  assert(valid_player_name(name), "invalid player name")
  local snapshot = snapshots[name]
  if snapshot == nil then
    return nil
  end
  return table.copy(snapshot)
end

local function status_message(name)
  local consent = get_consent(name) and "on" or "off"
  local snapshot = snapshots[name]
  if snapshot == nil then
    return "VOID Work consent=" .. consent
      .. "; companion status unavailable; no work is started by this mod."
  end
  return "VOID Work consent=" .. consent
    .. "; status=" .. snapshot.status
    .. "; progress=" .. tostring(snapshot.progress_percent) .. "%"
    .. "; WC pending=" .. tostring(snapshot.wc_pending)
    .. "; WC credited=" .. tostring(snapshot.wc_credited)
    .. "; companion_connected=" .. tostring(snapshot.companion_connected)
end

core.register_chatcommand("voidwork", {
  description = "Show VOID Worker Companion consent and sanitized status.",
  func = function(name)
    return true, status_message(name)
  end,
})

core.register_chatcommand("voidwork_consent", {
  params = "<on|off>",
  description = "Record in-game intent for the separate VOID Worker Companion.",
  func = function(name, param)
    local requested = tostring(param or ""):lower():match("^%s*(.-)%s*$")
    if requested ~= "on" and requested ~= "off" then
      return false, "Usage: /voidwork_consent <on|off>"
    end
    local enabled = requested == "on"
    set_consent(name, enabled)
    if enabled then
      return true,
        "VOID Work in-game intent is ON. This mod starts no work. "
        .. "The separate Worker Companion still requires its own explicit consent."
    end
    return true,
      "VOID Work in-game intent is OFF. The Worker Companion should remain paused."
  end,
})

core.register_on_joinplayer(function(player)
  local name = player:get_player_name()
  core.after(2, function()
    if core.get_player_by_name(name) then
      core.chat_send_player(name, status_message(name))
    end
  end)
end)
