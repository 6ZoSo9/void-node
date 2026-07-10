/* patch_ignore_sigusr2_v1.cjs
 * Prevent SIGUSR2 from terminating the process.
 * Also logs when it happens so we can prove some other PID is spamming it.
 */
try {
  process.on('SIGUSR2', () => {
    try { console.error('[sigusr2.ignore] SIGUSR2 received -> ignored'); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_IGNORE_SIGUSR2_V1_CJS_1_1_VISIBLE", __void_diag_pack4_err); }
  });
} catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_IGNORE_SIGUSR2_V1_CJS_1_2_VISIBLE", __void_diag_pack4_err); }
