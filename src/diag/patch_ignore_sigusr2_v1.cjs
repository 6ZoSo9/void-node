/* patch_ignore_sigusr2_v1.cjs
 * Prevent SIGUSR2 from terminating the process.
 * Also logs when it happens so we can prove some other PID is spamming it.
 */
try {
  process.on('SIGUSR2', () => {
    try { console.error('[sigusr2.ignore] SIGUSR2 received -> ignored'); } catch {}
  });
} catch {}
