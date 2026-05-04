import { defineConfig } from "vite";

// Build target switching:
// - default: GitHub Pages at /neon-district/
// - VITE_TARGET=crazygames: portable iframe build with relative base
const target = process.env.VITE_TARGET ?? "github-pages";
const base = target === "crazygames" ? "./" : "/neon-district/";

export default defineConfig({
  // GitHub Pages serves this project from /neon-district/ rather than the domain root.
  // CrazyGames iframes require a relative base — set VITE_TARGET=crazygames at build time.
  base,
  build: {
    // Keep a real warning budget in place so delivery regressions stay visible during build.
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      checks: {
        // The Phaser chunk warning is gone; keep build output focused on actionable delivery issues.
        pluginTimings: false,
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});
