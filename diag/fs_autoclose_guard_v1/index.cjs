'use strict';
// no-op shim: exists only so require("../diag/fs_autoclose_guard_v1") succeeds
module.exports = function fs_autoclose_guard_v1() {
  return { ok: true, noop: true, version: 1 };
};
