import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "127.0.0.1",
    proxy: {
      '/__void_helper': {
        target: 'http://127.0.0.1:4312',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__void_helper/, ''),
      },
      // Anything under /workcredits/* goes to the helper on :4312
      "/workcredits": {
        target: "http://127.0.0.1:4312",
        changeOrigin: true,
      },
    },
  },
});
