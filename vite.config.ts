import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves this project from /neon-district/ rather than the domain root.
  base: "/neon-district/",
  build: {
    // Phaser is a large runtime dependency for this prototype, so keep it isolated from
    // the game code and raise the warning ceiling to avoid noisy false positives.
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("phaser")) {
            return "phaser";
          }

          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});
