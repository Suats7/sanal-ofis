import type { AgentId, OfficeLevel, ProgressionState } from '../types';

export interface AgentLevelInfo {
  level: number;
  title: string;
  minXp: number;
  nextLevelXp: number | null;
  progressPercent: number;
  perk: string;
}

export interface OfficeTierInfo {
  level: OfficeLevel;
  name: string;
  subtitle: string;
  minXp: number;
  nextTierXp: number | null;
  features: string[];
}

export const AGENT_LEVEL_TIERS = [
  { level: 1, title: 'Çaylak', minXp: 0, perk: 'Temel çalışma masası ve standart kurulum' },
  { level: 2, title: 'Uzman', minXp: 90, perk: 'Altın gövde şeridi & güçlendirilmiş masa ışığı' },
  { level: 3, title: 'Kıdemli', minXp: 200, perk: 'Parlayan kıdemli rozeti & geniş ekran kurulumu' },
  { level: 4, title: 'Lider', minXp: 340, perk: 'Dönen enerji halkası & yönetici aksesuarı' },
  { level: 5, title: 'Efsane', minXp: 520, perk: 'Altın hale & maksimum AI uzmanlık seviyesi' },
] as const;

export const OFFICE_TIERS: OfficeTierInfo[] = [
  {
    level: 1,
    name: '3-Kanatlı AI Kampüs',
    subtitle: 'Gemini, Qwen ve DeepSeek ofis kanatları',
    minXp: 0,
    nextTierXp: 200,
    features: [
      '5 AI ajan masası • CEO Sauron & Siberci dahil',
      'Dev dinlenme & kafe alanı',
      'Ortak toplantı köşesi',
    ],
  },
  {
    level: 2,
    name: 'Büyüyen Startup',
    subtitle: 'Genişleyen ekip ve toplantı alanı',
    minXp: 200,
    nextTierXp: 500,
    features: [
      'Genişleyen zemin ve duvarlar',
      'Toplantı masası & renkli tabureler',
      'Büyük duvar analiz ekranı & AI HQ tabelası',
    ],
  },
  {
    level: 3,
    name: '2 Katlı AI Plaza',
    subtitle: 'Çift katlı üst düzey AI merkezi',
    minXp: 500,
    nextTierXp: null,
    features: [
      'Ahşap merdivenli 2. kat cam asma kat',
      'Parlayan AI Sunucu & Süper Bilgisayar odası',
      'Teras bahçesi, altın kupa ve plaza tabelası',
    ],
  },
];

export const XP_REWARDS = {
  sefPlan: 35,
  specialistStep: 60,
  taskCompletionBonus: 40,
};

export function createInitialProgression(): ProgressionState {
  return {
    officeXp: 0,
    totalTasksCompleted: 0,
    agents: {
      sef: { xp: 0, tasksCompleted: 0, memories: [] },
      arastirmaci: { xp: 0, tasksCompleted: 0, memories: [] },
      icerikci: { xp: 0, tasksCompleted: 0, memories: [] },
      yazilimci: { xp: 0, tasksCompleted: 0, memories: [] },
      siberci: { xp: 0, tasksCompleted: 0, memories: [] },
    },
  };
}

export function getAgentLevelInfo(xp: number): AgentLevelInfo {
  let currentIndex = 0;
  for (let i = AGENT_LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (xp >= AGENT_LEVEL_TIERS[i].minXp) {
      currentIndex = i;
      break;
    }
  }
  const current = AGENT_LEVEL_TIERS[currentIndex];
  const next = AGENT_LEVEL_TIERS[currentIndex + 1] ?? null;

  const progressPercent = next
    ? Math.min(
        100,
        Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100),
      )
    : 100;

  return {
    level: current.level,
    title: current.title,
    minXp: current.minXp,
    nextLevelXp: next ? next.minXp : null,
    progressPercent,
    perk: current.perk,
  };
}

export function getOfficeTierInfo(officeXp: number): OfficeTierInfo & {
  progressPercent: number;
} {
  let tier = OFFICE_TIERS[0];
  for (let i = OFFICE_TIERS.length - 1; i >= 0; i--) {
    if (officeXp >= OFFICE_TIERS[i].minXp) {
      tier = OFFICE_TIERS[i];
      break;
    }
  }

  const progressPercent = tier.nextTierXp
    ? Math.min(
        100,
        Math.round(((officeXp - tier.minXp) / (tier.nextTierXp - tier.minXp)) * 100),
      )
    : 100;

  return {
    ...tier,
    progressPercent,
  };
}

export function summarizeMemoryEntry(userPrompt: string, outputTitle?: string): string {
  const cleanPrompt = userPrompt.replace(/\s+/g, ' ').trim();
  const short = cleanPrompt.length > 72 ? `${cleanPrompt.slice(0, 69)}...` : cleanPrompt;
  return outputTitle ? `${outputTitle}: ${short}` : short;
}

export function getAgentXpReward(agentId: AgentId): number {
  return agentId === 'sef' ? XP_REWARDS.sefPlan : XP_REWARDS.specialistStep;
}
