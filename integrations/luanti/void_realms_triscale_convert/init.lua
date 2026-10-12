-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- VOID Realms Tri-Scale Conversion Preview v1
--
-- Read-only arithmetic and UI preview. No world, inventory, metadata,
-- entity, file, network, worker, payment or gameplay-state action occurs.

local edges = {
  small = 1,
  medium = 2,
  standard = 4,
}

local material_units = {
  small = 1,
  medium = 8,
  standard = 64,
}

local function known_scale(value)
  return type(value) == "string" and edges[value] ~= nil
end

local function conversion_preview(operation, source_scale, target_scale)
  assert(operation == "subdivide" or operation == "merge", "invalid operation")
  assert(known_scale(source_scale), "invalid source scale")
  assert(known_scale(target_scale), "invalid target scale")

  local source_edge = edges[source_scale]
  local target_edge = edges[target_scale]
  local count

  if operation == "subdivide" then
    assert(target_edge < source_edge, "subdivide target must be smaller")
    assert(source_edge % target_edge == 0, "non-integral edge ratio")
    local ratio = source_edge / target_edge
    count = ratio * ratio * ratio
    assert(
      material_units[source_scale] == material_units[target_scale] * count,
      "subdivision material mismatch"
    )
  else
    assert(target_edge > source_edge, "merge target must be larger")
    assert(target_edge % source_edge == 0, "non-integral edge ratio")
    local ratio = target_edge / source_edge
    count = ratio * ratio * ratio
    assert(
      material_units[source_scale] * count == material_units[target_scale],
      "merge material mismatch"
    )
  end

  return {
    marker = "VOID_REALMS_TRISCALE_CONVERSION_PREVIEW_V1",
    version = 1,
    operation = operation,
    source_scale = source_scale,
    target_scale = target_scale,
    source_edge_microcells = source_edge,
    target_edge_microcells = target_edge,
    piece_count = count,
    material_units_delta = 0,
    occupancy_root_must_remain_equal = true,
    atomic_single_revision_transition = true,
    transient_overlap = false,
    world_mutation = false,
    inventory_mutation = false,
    gameplay_state_committed = false,
  }
end

void_realms_triscale_convert =
  rawget(_G, "void_realms_triscale_convert") or {}

function void_realms_triscale_convert.preview(
  operation,
  source_scale,
  target_scale
)
  return conversion_preview(operation, source_scale, target_scale)
end

core.register_chatcommand("voidbuildconvert", {
  params = "<subdivide|merge> <small|medium|standard> <small|medium|standard>",
  description = "Preview exact tri-scale conversion arithmetic.",
  func = function(_, param)
    local operation, source_scale, target_scale =
      param:match("^%s*(%S+)%s+(%S+)%s+(%S+)%s*$")

    if operation == nil then
      return false,
        "Usage: /voidbuildconvert <subdivide|merge> <source> <target>"
    end

    local ok, result = pcall(
      conversion_preview,
      operation,
      source_scale,
      target_scale
    )
    if not ok then
      return false, tostring(result)
    end

    local direction =
      operation == "subdivide" and "replacement pieces" or "source pieces"

    return true,
      operation .. " " .. source_scale .. " -> " .. target_scale
        .. " requires " .. tostring(result.piece_count) .. " " .. direction
        .. "; material delta 0; occupancy unchanged; preview only."
  end,
})
