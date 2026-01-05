'use strict';
// no-op shim: exists only so require("../diag/fs_autoclose_guard_v2") succeeds
module.exports = function fs_autoclose_guard_v2() {
  return { ok: true, noop: true, version: 2 };
};
