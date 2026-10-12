-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- VOID Realms Tri-Scale Build Selector v1
--
-- Preview-only. This mod never calls set_node, add_node, swap_node,
-- remove_node, bulk_set_node, voxel-manipulator writes, inventory mutation,
-- network APIs, filesystem APIs, or worker APIs.

local FORMNAME = "void_realms_triscale_build:selector"
local DEFAULT_INDEX = 2
local profiles = {
  [0] = {
    name = "small",
    edge_microcells = 1,
    material_units = 1,
    edge_label = "25%",
  },
  [1] = {
    name = "medium",
    edge_microcells = 2,
    material_units = 8,
    edge_label = "50%",
  },
  [2] = {
    name = "standard",
    edge_microcells = 4,
    material_units = 64,
    edge_label = "100%",
  },
}

local selected_by_player = {}

local function normalize_index(value)
  assert(type(value) == "number", "selector index must be numeric")
  local rounded = math.floor(value + 0.5)
  if rounded < 0 then
    return 0
  end
  if rounded > 2 then
    return 2
  end
  return rounded
end

local function selected_index(player_name)
  local value = selected_by_player[player_name]
  if value == nil then
    return DEFAULT_INDEX
  end
  return normalize_index(value)
end

local function formspec(player_name)
  local index = selected_index(player_name)
  local profile = profiles[index]
  return table.concat({
    "formspec_version[8]",
    "size[9,4.2]",
    "no_prepend[]",
    "label[0.5,0.5;VOID Realms block size]",
    "label[0.5,1.0;Select before placement:  |---|---|]",
    "scrollbaroptions[min=0;max=2;smallstep=1;largestep=1;thumbsize=1;arrows=hide]",
    "scrollbar[1.0,1.65;7.0,0.55;horizontal;build_scale;",
      tostring(index), "]",
    "label[0.8,2.55;SMALL 25%]",
    "label[3.55,2.55;MEDIUM 50%]",
    "label[6.65,2.55;STANDARD 100%]",
    "label[0.5,3.25;Selected: ",
      core.formspec_escape(profile.name),
      " · edge ",
      tostring(profile.edge_microcells),
      " microcell(s) · cost ",
      tostring(profile.material_units),
      "]",
    "button_exit[6.7,3.35;1.8,0.65;done;Done]",
  })
end

local function show_selector(player_name)
  core.show_formspec(player_name, FORMNAME, formspec(player_name))
end

local function set_selected(player_name, value)
  local index = normalize_index(value)
  selected_by_player[player_name] = index
  return index, profiles[index]
end

void_realms_triscale_build =
  rawget(_G, "void_realms_triscale_build") or {}

function void_realms_triscale_build.get_selected_scale(player_name)
  local index = selected_index(player_name)
  local profile = profiles[index]
  return {
    selector_index = index,
    name = profile.name,
    edge_microcells = profile.edge_microcells,
    material_units = profile.material_units,
  }
end

function void_realms_triscale_build.set_selected_scale(player_name, value)
  local index, profile = set_selected(player_name, value)
  return {
    selector_index = index,
    name = profile.name,
    edge_microcells = profile.edge_microcells,
    material_units = profile.material_units,
  }
end

function void_realms_triscale_build.preview(pointed_thing, player_name)
  assert(type(pointed_thing) == "table", "pointed_thing required")
  assert(type(player_name) == "string" and player_name ~= "", "player name required")
  local index = selected_index(player_name)
  local profile = profiles[index]
  local face_position = nil
  if pointed_thing.type == "node" then
    local player = core.get_player_by_name(player_name)
    if player ~= nil then
      face_position = core.pointed_thing_to_face_pos(player, pointed_thing)
    end
  end
  return {
    marker = "VOID_REALMS_TRISCALE_LUANTI_PREVIEW_V1",
    version = 1,
    selector_index = index,
    scale = profile.name,
    edge_microcells = profile.edge_microcells,
    material_units = profile.material_units,
    face_position = face_position,
    world_mutation = false,
    inventory_mutation = false,
    gameplay_state_committed = false,
  }
end

core.register_chatcommand("voidbuildscale", {
  description = "Open the three-stop VOID Realms block-size selector.",
  func = function(player_name)
    show_selector(player_name)
    return true, "VOID Realms build-scale selector opened."
  end,
})

core.register_craftitem("void_realms_triscale_build:selector", {
  description = "VOID Realms Tri-Scale Selector (Preview Only)",
  stack_max = 1,
  on_place = function(itemstack, placer, pointed_thing)
    if placer == nil or not placer:is_player() then
      return itemstack
    end
    local player_name = placer:get_player_name()
    local preview = void_realms_triscale_build.preview(
      pointed_thing,
      player_name
    )
    local position_text = "unavailable"
    if preview.face_position ~= nil then
      position_text = core.pos_to_string(preview.face_position, 3)
    end
    core.chat_send_player(
      player_name,
      "Preview only: " .. preview.scale
        .. " block · edge " .. tostring(preview.edge_microcells)
        .. " microcell(s) · cost " .. tostring(preview.material_units)
        .. " · face " .. position_text
        .. ". No world or inventory mutation occurred."
    )
    return itemstack
  end,
  on_secondary_use = function(itemstack, user)
    if user ~= nil and user:is_player() then
      show_selector(user:get_player_name())
    end
    return itemstack
  end,
})

core.register_on_player_receive_fields(function(player, formname, fields)
  if formname ~= FORMNAME then
    return false
  end
  local player_name = player:get_player_name()
  if fields.build_scale ~= nil then
    local event = core.explode_scrollbar_event(fields.build_scale)
    if event.type == "CHG" or event.type == "VAL" then
      set_selected(player_name, event.value)
      if fields.quit ~= "true" then
        show_selector(player_name)
      end
    end
  end
  return true
end)

core.register_on_leaveplayer(function(player)
  selected_by_player[player:get_player_name()] = nil
end)
