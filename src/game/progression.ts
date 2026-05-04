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

  const candidate: CampaignState = {
    bankCredits: typeof value.bankCredits === 'number' ? Math.max(0, Math.round(value.bankCredits)) : defaults.bankCredits,
    runs: typeof value.runs === 'number' ? Math.max(0, Math.round(value.runs)) : defaults.runs,
    victories: typeof value.victories === 'number' ? Math.max(0, Math.round(value.victories)) : defaults.victories,
    highestScore: typeof value.highestScore === 'number' ? Math.max(0, Math.round(value.highestScore)) : defaults.highestScore,
    completedContracts,
    ownedWeaponUpgrades,
    selectedContractId,
    selectedWeapon: sanitizeWeapon(value.selectedWeapon),
    selectedCyberwareId,
    factions,
    lastResult: null,
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
    if (!raw) return createDefaultCampaignState();
    return sanitizeCampaignState(JSON.parse(raw));
  } catch {
    return createDefaultCampaignState();
  }
}

export function saveCampaignState(state: CampaignState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
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
