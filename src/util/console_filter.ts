// Console error filter (module form). Safe to import multiple times.
(() => {
  try {
    const g = globalThis as any;
    if (g.__void_console_filter_v0) return;
    g.__void_console_filter_v0 = true;

    const _err = console.error.bind(console);
    console.error = function (...args: any[]) {
      const s = args && args[0] ? String(args[0]) : "";
      // Silence legacy v1 shims
      if (s.startsWith("[fs-autoclose] failed")) return;
      if (s.startsWith("[http-autodrain] failed")) return;
      return _err(...args);
    };
  } catch {}
})();
