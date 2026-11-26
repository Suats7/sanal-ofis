import type { AgentId, AppSettings, EngineId, SceneTheme } from '../types';

export interface EngineMeta {
  id: EngineId;
  name: string;
  shortName: string;
  wingName: string;
  badgeSymbol: string;
  color: string;
  accentColor: string;
  lightBg: string;
  borderColor: string;
  providerLabel: string;
}

export interface EngineModelOption {
  id: string;
  label: string;
  isFree?: boolean;
}

export const ENGINE_ORDER: EngineId[] = ['gemini', 'qwen', 'deepseek'];

export const ENGINE_META: Record<EngineId, EngineMeta> = {
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    shortName: 'Gemini',
    wingName: 'Gemini Ofisi',
    badgeSymbol: '✦',
    color: '#4f46e5',
    accentColor: '#4338ca',
    lightBg: '#eef2ff',
    borderColor: '#c7d2fe',
    providerLabel: 'Google AI Studio',
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen',
    shortName: 'Qwen',
    wingName: 'Qwen Stüdyosu',
    badgeSymbol: '◈',
    color: '#7c3aed',
    accentColor: '#6d28d9',
    lightBg: '#f5f3ff',
    borderColor: '#ddd6fe',
    providerLabel: 'OpenRouter',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DeepSeek',
    wingName: 'DeepSeek Lab',
    badgeSymbol: '⌘',
    color: '#0284c7',
    accentColor: '#0369a1',
    lightBg: '#e0f2fe',
    borderColor: '#bae6fd',
    providerLabel: 'OpenRouter',
  },
};

export const DEFAULT_AGENT_ENGINES: Record<AgentId, EngineId> = {
  sef: 'gemini',
  icerikci: 'gemini',
  arastirmaci: 'qwen',
  yazilimci: 'deepseek',
  siberci: 'deepseek',
};

export const DEFAULT_QWEN_MODEL = 'qwen/qwen3-235b-a22b:free';
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek/deepseek-chat-v3-0324:free';

export const QWEN_MODEL_OPTIONS: EngineModelOption[] = [
  {
    id: 'qwen/qwen3-235b-a22b:free',
    label: 'qwen/qwen3-235b-a22b:free • Ücretsiz (Güçlü Flagship)',
    isFree: true,
  },
  {
    id: 'qwen/qwen3-32b:free',
    label: 'qwen/qwen3-32b:free • Ücretsiz (Hızlı & Dengeli)',
    isFree: true,
  },
  {
    id: 'qwen/qwen-2.5-72b-instruct:free',
    label: 'qwen/qwen-2.5-72b-instruct:free • Ücretsiz',
    isFree: true,
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    label: 'qwen/qwen-2.5-coder-32b-instruct:free • Ücretsiz (Kod)',
    isFree: true,
  },
  {
    id: 'qwen/qwen-2.5-72b-instruct',
    label: 'qwen/qwen-2.5-72b-instruct (Ücretli Kredi)',
    isFree: false,
  },
];

export const DEEPSEEK_MODEL_OPTIONS: EngineModelOption[] = [
  {
    id: 'deepseek/deepseek-chat-v3-0324:free',
    label: 'deepseek/deepseek-chat-v3-0324:free • Ücretsiz (V3 Güncel)',
    isFree: true,
  },
  {
    id: 'deepseek/deepseek-r1:free',
    label: 'deepseek/deepseek-r1:free • Ücretsiz (R1 Muhakeme)',
    isFree: true,
  },
  {
    id: 'deepseek/deepseek-r1-0528:free',
    label: 'deepseek/deepseek-r1-0528:free • Ücretsiz (R1 Güncel)',
    isFree: true,
  },
  {
    id: 'deepseek/deepseek-chat',
    label: 'deepseek/deepseek-chat (Ücretli Kredi)',
    isFree: false,
  },
  {
    id: 'deepseek/deepseek-r1',
    label: 'deepseek/deepseek-r1 (Ücretli Kredi)',
    isFree: false,
  },
];

function isValidEngineId(value: unknown): value is EngineId {
  return value === 'gemini' || value === 'qwen' || value === 'deepseek';
}

function isValidSceneTheme(value: unknown): value is SceneTheme {
  return value === 'day' || value === 'sunset' || value === 'night';
}

export function normalizeAppSettings(
  raw: Partial<AppSettings> | null | undefined,
  defaultGeminiModel: string,
): AppSettings {
  const rawEngines = raw?.agentEngines;
  const agentEngines: Record<AgentId, EngineId> = {
    sef: isValidEngineId(rawEngines?.sef) ? rawEngines.sef : DEFAULT_AGENT_ENGINES.sef,
    arastirmaci: isValidEngineId(rawEngines?.arastirmaci)
      ? rawEngines.arastirmaci
      : DEFAULT_AGENT_ENGINES.arastirmaci,
    icerikci: isValidEngineId(rawEngines?.icerikci)
      ? rawEngines.icerikci
      : DEFAULT_AGENT_ENGINES.icerikci,
    yazilimci: isValidEngineId(rawEngines?.yazilimci)
      ? rawEngines.yazilimci
      : DEFAULT_AGENT_ENGINES.yazilimci,
    siberci: isValidEngineId(rawEngines?.siberci)
      ? rawEngines.siberci
      : DEFAULT_AGENT_ENGINES.siberci,
  };

  return {
    apiKey: typeof raw?.apiKey === 'string' ? raw.apiKey : '',
    openRouterApiKey: typeof raw?.openRouterApiKey === 'string' ? raw.openRouterApiKey : '',
    model:
      typeof raw?.model === 'string' && raw.model.trim()
        ? raw.model.trim()
        : defaultGeminiModel,
    qwenModel:
      typeof raw?.qwenModel === 'string' && raw.qwenModel.trim()
        ? raw.qwenModel.trim()
        : DEFAULT_QWEN_MODEL,
    deepseekModel:
      typeof raw?.deepseekModel === 'string' && raw.deepseekModel.trim()
        ? raw.deepseekModel.trim()
        : DEFAULT_DEEPSEEK_MODEL,
    agentEngines,
    parallelMode: typeof raw?.parallelMode === 'boolean' ? raw.parallelMode : true,
    demoMode: typeof raw?.demoMode === 'boolean' ? raw.demoMode : false,
    sceneTheme: isValidSceneTheme(raw?.sceneTheme) ? raw.sceneTheme : 'day',
    soundEnabled: typeof raw?.soundEnabled === 'boolean' ? raw.soundEnabled : true,
  };
}
