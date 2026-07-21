import {
  CONTRACTS,
  CONTRACTS_BY_ID,
  CYBERWARE_BY_ID,
  CYBERWARE_OPTIONS,
  DEFAULT_CONTRACT_ID,
  DEFAULT_CYBERWARE_ID,
  WEAPON_UPGRADES,
  WEAPON_UPGRADES_BY_ID,
} from './content';
import type {
  CampaignRunResult,
  CampaignState,
  ContractDefinition,
  ContractId,
  CyberwareDefinition,
  CyberwareId,
  FactionKey,
  WeaponUpgradeId,
  WeaponType,
} from './types';

const STORAGE_KEY = 'neon-district/campaign-v2';
const STORAGE_VERSION = 1;

export type CampaignLoadInfo = {
  source: 'fresh' | 'storage' | 'recovered';
  detail: string;
  recovered: boolean;
  lastSavedAt: string | null;
};

let campaignLoadInfo: CampaignLoadInfo = {
  source: 'fresh',
  detail: 'Fresh live profile. No stored campaign found yet.',
  recovered: false,
  lastSavedAt: null,
};

type CampaignRunInput = {
  contract: ContractDefinition;
  cyberware: CyberwareDefinition;
  victory: boolean;
  runtimeSeconds: number;
  kills: number;
  score: number;
  scavengedCredits: number;
  stageLabel: string;
  eliteDefeated: boolean;
  optionalObjectiveCompleted: boolean;
  optionalObjectiveLabel: string | null;
  optionalObjectiveRewardCredits: number;
  optionalObjectiveReputationBonus: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampStanding(standing: { reputation: number; heat: number }) {
  return {
    reputation: clamp(Math.round(standing.reputation), -100, 100),
    heat: clamp(Math.round(standing.heat), 0, 100),
  };
}

function createFactionState(): CampaignState['factions'] {
  return {
    morrow: { reputation: 0, heat: 0 },
    helix: { reputation: 0, heat: 0 },
    glasshouse: { reputation: 0, heat: 0 },
  };
}

export function createDefaultCampaignState(): CampaignState {
  return {
    bankCredits: 0,
    runs: 0,
    victories: 0,
    highestScore: 0,
    lastSavedAt: null,
    completedContracts: [],
    ownedWeaponUpgrades: [],
    selectedContractId: DEFAULT_CONTRACT_ID,
    selectedWeapon: 'volley',
    selectedCyberwareId: DEFAULT_CYBERWARE_ID,
    factions: createFactionState(),
    lastResult: null,
  };
}

export function isContractUnlocked(state: CampaignState, contractId: ContractId) {
  return state.victories >= CONTRACTS_BY_ID[contractId].unlockVictories;
}

export function isCyberwareUnlocked(state: CampaignState, cyberwareId: CyberwareId) {
  return state.victories >= CYBERWARE_BY_ID[cyberwareId].unlockVictories;
}

export function getUnlockedContracts(state: CampaignState) {
  return CONTRACTS.filter((contract) => isContractUnlocked(state, contract.id));
}

export function getUnlockedCyberware(state: CampaignState) {
  return CYBERWARE_OPTIONS.filter((option) => isCyberwareUnlocked(state, option.id));
}

export function getOwnedWeaponUpgrades(state: CampaignState) {
  return WEAPON_UPGRADES.filter((upgrade) => state.ownedWeaponUpgrades.includes(upgrade.id));
}

export function hasWeaponUpgrade(state: CampaignState, upgradeId: WeaponUpgradeId) {
  return state.ownedWeaponUpgrades.includes(upgradeId);
}

export function getLockedContracts(state: CampaignState) {
  return CONTRACTS.filter((contract) => !isContractUnlocked(state, contract.id));
}

export function getLockedCyberware(state: CampaignState) {
  return CYBERWARE_OPTIONS.filter((option) => !isCyberwareUnlocked(state, option.id));
}

export function getFallbackContractId(state: CampaignState) {
  return getUnlockedContracts(state)[0]?.id ?? DEFAULT_CONTRACT_ID;
}

export function getFallbackCyberwareId(state: CampaignState) {
  return getUnlockedCyberware(state)[0]?.id ?? DEFAULT_CYBERWARE_ID;
}

function sanitizeWeapon(value: unknown): WeaponType {
  return value === 'scatter' || value === 'rail' ? value : 'volley';
}

function sanitizeWeaponUpgradeId(value: unknown): WeaponUpgradeId | null {
  return typeof value === 'string' && value in WEAPON_UPGRADES_BY_ID
    ? value as WeaponUpgradeId
    : null;
}

function sanitizeFactionKey(value: string): FactionKey | null {
  return value === 'morrow' || value === 'helix' || value === 'glasshouse' ? value : null;
}

function sanitizeCampaignRunResult(value: unknown): CampaignRunResult | null {
  if (!isRecord(value)) return null;
  if (typeof value.contractId !== 'string' || !(value.contractId in CONTRACTS_BY_ID)) return null;
  if (typeof value.contractTitle !== 'string') return null;
  if (typeof value.victory !== 'boolean') return null;
  if (typeof value.timestamp !== 'string') return null;
  if (typeof value.runtimeSeconds !== 'number') return null;
  if (typeof value.kills !== 'number') return null;
  if (typeof value.score !== 'number') return null;
  if (typeof value.stageLabel !== 'string') return null;
  if (typeof value.scavengedCredits !== 'number') return null;
  if (typeof value.payoutCredits !== 'number') return null;
  if (typeof value.totalCreditsAwarded !== 'number') return null;
  if (typeof value.bankCredits !== 'number') return null;
  if (typeof value.reputationDelta !== 'number') return null;
  if (typeof value.hostileHeatDelta !== 'number') return null;
  if (typeof value.clientFaction !== 'string' || !sanitizeFactionKey(value.clientFaction)) return null;
  if (typeof value.hostileFaction !== 'string' || !sanitizeFactionKey(value.hostileFaction)) return null;
  if (typeof value.eliteDefeated !== 'boolean') return null;
  if (typeof value.optionalObjectiveCompleted !== 'boolean') return null;
  if (value.optionalObjectiveLabel !== null && typeof value.optionalObjectiveLabel !== 'string') return null;
  if (typeof value.optionalObjectiveRewardCredits !== 'number') return null;
  if (typeof value.optionalObjectiveReputationBonus !== 'number') return null;

  const unlocks = Array.isArray(value.unlocks)
    ? value.unlocks.filter((unlockId): unlockId is CyberwareId => typeof unlockId === 'string' && unlockId in CYBERWARE_BY_ID)
    : [];
  const contractUnlocks = Array.isArray(value.contractUnlocks)
    ? value.contractUnlocks.filter((unlockId): unlockId is ContractId => typeof unlockId === 'string' && unlockId in CONTRACTS_BY_ID)
    : [];

  return {
    contractId: value.contractId as ContractId,
    contractTitle: value.contractTitle,
    victory: value.victory,
    timestamp: value.timestamp,
    runtimeSeconds: Math.max(0, Math.round(value.runtimeSeconds)),
    kills: Math.max(0, Math.round(value.kills)),
    score: Math.max(0, Math.round(value.score)),
    stageLabel: value.stageLabel,
    scavengedCredits: Math.max(0, Math.round(value.scavengedCredits)),
    payoutCredits: Math.max(0, Math.round(value.payoutCredits)),
    totalCreditsAwarded: Math.max(0, Math.round(value.totalCreditsAwarded)),
    bankCredits: Math.max(0, Math.round(value.bankCredits)),
    reputationDelta: Math.round(value.reputationDelta),
    hostileHeatDelta: Math.max(0, Math.round(value.hostileHeatDelta)),
    clientFaction: value.clientFaction as FactionKey,
    hostileFaction: value.hostileFaction as FactionKey,
    eliteDefeated: value.eliteDefeated,
    optionalObjectiveCompleted: value.optionalObjectiveCompleted,
    optionalObjectiveLabel: value.optionalObjectiveLabel,
    optionalObjectiveRewardCredits: Math.max(0, Math.round(value.optionalObjectiveRewardCredits)),
    optionalObjectiveReputationBonus: Math.round(value.optionalObjectiveReputationBonus),
    unlocks,
    contractUnlocks,
  };
}

function sanitizeCampaignState(value: unknown): CampaignState {
  const defaults = createDefaultCampaignState();
  if (!isRecord(value)) return defaults;

  const factions = createFactionState();
  if (isRecord(value.factions)) {
    Object.entries(value.factions).forEach(([key, standing]) => {
      const factionKey = sanitizeFactionKey(key);
      if (!factionKey || !isRecord(standing)) return;
      const reputation = typeof standing.reputation === 'number' ? standing.reputation : 0;
      const heat = typeof standing.heat === 'number' ? standing.heat : 0;
      factions[factionKey] = clampStanding({ reputation, heat });
    });
  }

  const completedContracts = Array.isArray(value.completedContracts)
    ? value.completedContracts.filter((contractId): contractId is ContractId => typeof contractId === 'string' && contractId in CONTRACTS_BY_ID)
    : [];
  const ownedWeaponUpgrades = Array.isArray(value.ownedWeaponUpgrades)
    ? Array.from(new Set(
      value.ownedWeaponUpgrades
        .map((upgradeId) => sanitizeWeaponUpgradeId(upgradeId))
        .filter((upgradeId): upgradeId is WeaponUpgradeId => upgradeId !== null),
    ))
    : [];

  const selectedContractId = typeof value.selectedContractId === 'string' && value.selectedContractId in CONTRACTS_BY_ID
    ? value.selectedContractId as ContractId
    : defaults.selectedContractId;
  const selectedCyberwareId = typeof value.selectedCyberwareId === 'string' && value.selectedCyberwareId in CYBERWARE_BY_ID
    ? value.selectedCyberwareId as CyberwareId
    : defaults.selectedCyberwareId;
  const lastSavedAt = typeof value.lastSavedAt === 'string' ? value.lastSavedAt : null;
  const lastResult = sanitizeCampaignRunResult(value.lastResult);

  const candidate: CampaignState = {
    bankCredits: typeof value.bankCredits === 'number' ? Math.max(0, Math.round(value.bankCredits)) : defaults.bankCredits,
    runs: typeof value.runs === 'number' ? Math.max(0, Math.round(value.runs)) : defaults.runs,
    victories: typeof value.victories === 'number' ? Math.max(0, Math.round(value.victories)) : defaults.victories,
    highestScore: typeof value.highestScore === 'number' ? Math.max(0, Math.round(value.highestScore)) : defaults.highestScore,
    lastSavedAt,
    completedContracts,
    ownedWeaponUpgrades,
    selectedContractId,
    selectedWeapon: sanitizeWeapon(value.selectedWeapon),
    selectedCyberwareId,
    factions,
    lastResult,
  };

  if (!isContractUnlocked(candidate, candidate.selectedContractId)) {
    candidate.selectedContractId = getFallbackContractId(candidate);
  }

  if (!isCyberwareUnlocked(candidate, candidate.selectedCyberwareId)) {
    candidate.selectedCyberwareId = getFallbackCyberwareId(candidate);
  }

  return candidate;
}

export function loadCampaignState(): CampaignState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createDefaultCampaignState();
      campaignLoadInfo = {
        source: 'fresh',
        detail: 'Fresh live profile. No stored campaign found yet.',
        recovered: false,
        lastSavedAt: fresh.lastSavedAt,
      };
      return fresh;
    }

    const parsed = JSON.parse(raw);
    const sanitized = sanitizeCampaignState(parsed);
    const looksVersioned = isRecord(parsed) && typeof parsed.storageVersion === 'number';
    const recovered = !looksVersioned && sanitized.lastSavedAt === null;
    campaignLoadInfo = {
      source: recovered ? 'recovered' : 'storage',
      detail: recovered
        ? 'Recovered an older or partial local save into the current safe profile format.'
        : 'Loaded the live profile from local browser storage.',
      recovered,
      lastSavedAt: sanitized.lastSavedAt,
    };
    return sanitized;
  } catch {
    const recovered = createDefaultCampaignState();
    campaignLoadInfo = {
      source: 'recovered',
      detail: 'Stored campaign data was unreadable. Neon District fell back to a clean safe profile.',
      recovered: true,
      lastSavedAt: null,
    };
    return recovered;
  }
}

export function getCampaignLoadInfo() {
  return campaignLoadInfo;
}

export function saveCampaignState(state: CampaignState) {
  const nextState: CampaignState = {
    ...state,
    lastSavedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      storageVersion: STORAGE_VERSION,
      ...nextState,
    }));
    campaignLoadInfo = {
      source: 'storage',
      detail: 'Loaded the live profile from local browser storage.',
      recovered: false,
      lastSavedAt: nextState.lastSavedAt,
    };
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
  return nextState;
}

export function resetCampaignState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function createRunConfig(state: CampaignState, contractId = state.selectedContractId, cyberwareId = state.selectedCyberwareId) {
  const contract = CONTRACTS_BY_ID[contractId];
  const cyberware = CYBERWARE_BY_ID[cyberwareId];
  return {
    contract,
    cyberware,
    hostileHeat: state.factions[contract.hostileFaction].heat,
    ownedWeaponUpgrades: [...state.ownedWeaponUpgrades],
  };
}

export function purchaseWeaponUpgrade(state: CampaignState, upgradeId: WeaponUpgradeId) {
  const upgrade = WEAPON_UPGRADES_BY_ID[upgradeId];
  if (!upgrade) return null;
  if (state.ownedWeaponUpgrades.includes(upgradeId)) return null;
  if (state.bankCredits < upgrade.cost) return null;

  return {
    ...state,
    bankCredits: state.bankCredits - upgrade.cost,
    ownedWeaponUpgrades: [...state.ownedWeaponUpgrades, upgradeId],
  };
}

export function resolveCampaignRun(state: CampaignState, input: CampaignRunInput) {
  const nextVictories = state.victories + (input.victory ? 1 : 0);
  const keptScavenge = input.victory
    ? Math.max(0, Math.round(input.scavengedCredits))
    : Math.max(0, Math.round(input.scavengedCredits * 0.45));
  const payoutCredits = input.victory
    ? input.contract.basePayout
      + (input.cyberware.modifiers.contractPayoutBonus ?? 0)
      + (input.eliteDefeated ? input.contract.elite?.bonusPayout ?? 0 : 0)
      + (input.optionalObjectiveCompleted ? input.optionalObjectiveRewardCredits : 0)
    : 0;
  const totalCreditsAwarded = keptScavenge + payoutCredits;
  const reputationDelta = input.victory
    ? input.contract.reputationOnSuccess + (input.optionalObjectiveCompleted ? input.optionalObjectiveReputationBonus : 0)
    : -Math.max(4, Math.round(input.contract.reputationOnSuccess * 0.35));
  const hostileHeatDelta = input.victory ? input.contract.hostileHeatOnSuccess : input.contract.hostileHeatOnFailure;

  const nextState: CampaignState = {
    ...state,
    bankCredits: state.bankCredits + totalCreditsAwarded,
    runs: state.runs + 1,
    victories: nextVictories,
    highestScore: Math.max(state.highestScore, input.score),
    completedContracts: input.victory && !state.completedContracts.includes(input.contract.id)
      ? [...state.completedContracts, input.contract.id]
      : [...state.completedContracts],
    factions: {
      ...state.factions,
      [input.contract.clientFaction]: clampStanding({
        reputation: state.factions[input.contract.clientFaction].reputation + reputationDelta,
        heat: state.factions[input.contract.clientFaction].heat,
      }),
      [input.contract.hostileFaction]: clampStanding({
        reputation: state.factions[input.contract.hostileFaction].reputation - (input.victory ? Math.max(2, Math.round(reputationDelta * 0.35)) : 0),
        heat: state.factions[input.contract.hostileFaction].heat + hostileHeatDelta,
      }),
    },
    lastResult: null,
  };

  const unlockedCyberwareBefore = new Set(getUnlockedCyberware(state).map((option) => option.id));
  const unlockedCyberwareAfter = getUnlockedCyberware(nextState)
    .map((option) => option.id)
    .filter((optionId) => !unlockedCyberwareBefore.has(optionId));
  const unlockedContractsBefore = new Set(getUnlockedContracts(state).map((contract) => contract.id));
  const unlockedContractsAfter = getUnlockedContracts(nextState)
    .map((contract) => contract.id)
    .filter((contractId) => !unlockedContractsBefore.has(contractId));

  if (!isContractUnlocked(nextState, nextState.selectedContractId)) {
    nextState.selectedContractId = getFallbackContractId(nextState);
  }

  if (!isCyberwareUnlocked(nextState, nextState.selectedCyberwareId)) {
    nextState.selectedCyberwareId = getFallbackCyberwareId(nextState);
  }

  const result: CampaignRunResult = {
    contractId: input.contract.id,
    contractTitle: input.contract.title,
    victory: input.victory,
    timestamp: new Date().toISOString(),
    runtimeSeconds: input.runtimeSeconds,
    kills: input.kills,
    score: input.score,
    stageLabel: input.stageLabel,
    scavengedCredits: keptScavenge,
    payoutCredits,
    totalCreditsAwarded,
    bankCredits: nextState.bankCredits,
    reputationDelta,
    hostileHeatDelta,
    clientFaction: input.contract.clientFaction,
    hostileFaction: input.contract.hostileFaction,
    eliteDefeated: input.eliteDefeated,
    optionalObjectiveCompleted: input.optionalObjectiveCompleted,
    optionalObjectiveLabel: input.optionalObjectiveLabel,
    optionalObjectiveRewardCredits: input.optionalObjectiveCompleted ? input.optionalObjectiveRewardCredits : 0,
    optionalObjectiveReputationBonus: input.optionalObjectiveCompleted ? input.optionalObjectiveReputationBonus : 0,
    unlocks: unlockedCyberwareAfter,
    contractUnlocks: unlockedContractsAfter,
  };

  nextState.lastResult = result;
  return { nextState, result };
}
