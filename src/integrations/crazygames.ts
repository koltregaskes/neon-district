/**
 * CrazyGames SDK wrapper for Neon District.
 *
 * The CrazyGames SDK v3 script is loaded via `index.html`. When the game runs
 * outside the CrazyGames iframe (local dev, GitHub Pages, etc.) calls here
 * should stay as safe no-ops even if the SDK script creates a partial global.
 *
 * Lifecycle contract:
 *   - call `crazyGameplayStart()` when an actual contract begins
 *   - call `crazyGameplayStop()` when the contract ends, pauses, or returns to menu
 */

interface CrazyGamesGameModule {
  gameplayStart?: () => void;
  gameplayStop?: () => void;
  happytime?: () => void;
}

interface CrazyGamesSDK {
  game?: CrazyGamesGameModule;
}

interface CrazyGamesGlobal {
  SDK?: CrazyGamesSDK;
}

declare global {
  interface Window {
    CrazyGames?: CrazyGamesGlobal;
  }
}

let gameplayActive = false;

function isLikelyCrazyGamesEmbed(): boolean {
  if (typeof window === "undefined") return false;

  const referrer = document.referrer.toLowerCase();
  const ancestorOrigins = Array.from(window.location.ancestorOrigins ?? []).map((origin) =>
    origin.toLowerCase(),
  );

  return (
    referrer.includes("crazygames") ||
    ancestorOrigins.some((origin) => origin.includes("crazygames"))
  );
}

function getSdk(): CrazyGamesSDK | null {
  if (typeof window === "undefined") return null;
  if (!isLikelyCrazyGamesEmbed()) return null;
  return window.CrazyGames?.SDK ?? null;
}

export function crazyGameplayStart(): void {
  if (gameplayActive) return;
  gameplayActive = true;
  try {
    getSdk()?.game?.gameplayStart?.();
  } catch (error) {
    console.warn("[crazygames] gameplayStart failed:", error);
  }
}

export function crazyGameplayStop(): void {
  if (!gameplayActive) return;
  gameplayActive = false;
  try {
    getSdk()?.game?.gameplayStop?.();
  } catch (error) {
    console.warn("[crazygames] gameplayStop failed:", error);
  }
}

export function crazyHappytime(): void {
  try {
    getSdk()?.game?.happytime?.();
  } catch (error) {
    console.warn("[crazygames] happytime failed:", error);
  }
}

export function isCrazyGamesEnvironment(): boolean {
  return getSdk() !== null;
}
