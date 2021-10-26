import { defineConfig } from "vite";

export default defineConfig({
  plugins: [],
  resolve: {
    alias: [
      {
        find: "stream",
        replacement: "stream-browserify",
      },
      {
        find: "process",
        replacement: "process/browser",
      },
      {
        find: "zlib",
        replacement: "browserify-zlib",
      },
      {
        find: "util",
        replacement: "util",
      },
    ],
  },
  define: {
    global: {},
  },
  build: {
    rollupOptions: {
      plugins: [],
    },
  },
});
