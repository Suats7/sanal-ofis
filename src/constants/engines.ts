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

export const DEFAULT_QWEN_MODEL = 'google/gemma-4-31b-it:free';
export const DEFAULT_DEEPSEEK_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

const RETIRED_OPENROUTER_MODELS = new Set<string>([
  'qwen/qwen3-235b-a22b:free',
  'qwen/qwen3-32b:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-r1:free',
  'deepseek/deepseek-r1-0528:free',
]);

export function isFreeOpenRouterModelId(id: string): boolean {
  const trimmed = id.trim().toLowerCase();
  return trimmed === 'openrouter/free' || trimmed.endsWith(':free');
}

export const OPENROUTER_FREE_MODEL_OPTIONS: EngineModelOption[] = [
  {
    id: 'openrouter/free',
    label: 'openrouter/free — Otomatik Ücretsiz Yönlendirici • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'google/gemma-4-31b-it:free',
    label: 'google/gemma-4-31b-it:free — Google Gemma 4 31B • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    label: 'nvidia/nemotron-3-ultra-550b-a55b:free — NVIDIA Nemotron 3 Ultra • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    label: 'nvidia/nemotron-3.5-lightning:free — NVIDIA Nemotron 3.5 Lightning • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    label:
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free — NVIDIA Nemotron 3 Nano Omni • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'baidu/ernie-5.5-flash-preview:free',
    label: 'baidu/ernie-5.5-flash-preview:free — Baidu ERNIE 5.5 Flash • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'inclusionai/ling-3.2-flash:free',
    label: 'inclusionai/ling-3.2-flash:free — inclusionAI Ling 3.2 Flash • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    label: 'google/gemma-4-26b-a4b-it:free — Google Gemma 4 26B A4B • Ücretsiz (OpenRouter)',
    isFree: true,
  },
];

export const QWEN_MODEL_OPTIONS: EngineModelOption[] = [
  {
    id: 'google/gemma-4-31b-it:free',
    label: 'google/gemma-4-31b-it:free — Gemma 4 31B • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'openrouter/free',
    label: 'openrouter/free — Otomatik Ücretsiz Yönlendirici • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    label: 'nvidia/nemotron-3-ultra-550b-a55b:free — Nemotron 3 Ultra • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    label: 'nvidia/nemotron-3.5-lightning:free — Nemotron 3.5 Lightning • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'qwen/qwen3.7-flash',
    label: 'qwen/qwen3.7-flash — Qwen3.7 Flash • $0.03/M Kredili',
    isFree: false,
  },
  {
    id: 'qwen/qwen3.8-27b',
    label: 'qwen/qwen3.8-27b — Qwen3.8 27B • $0.06/M Kredili',
    isFree: false,
  },
  {
    id: 'qwen/qwen3-coder-30b-a3b-instruct',
    label: 'qwen/qwen3-coder-30b-a3b-instruct — Qwen3 Coder 30B • $0.07/M Kredili',
    isFree: false,
  },
  {
    id: 'qwen/qwen3.8-flash',
    label: 'qwen/qwen3.8-flash — Qwen3.8 Flash • $0.15/M Kredili',
    isFree: false,
  },
  {
    id: 'qwen/qwen4-max',
    label: 'qwen/qwen4-max — Qwen4 Max • $1.43/M Kredili',
    isFree: false,
  },
];

export const DEEPSEEK_MODEL_OPTIONS: EngineModelOption[] = [
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    label: 'nvidia/nemotron-3-ultra-550b-a55b:free — Nemotron 3 Ultra • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'openrouter/free',
    label: 'openrouter/free — Otomatik Ücretsiz Yönlendirici • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    label:
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free — Nemotron 3 Nano Omni • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'google/gemma-4-31b-it:free',
    label: 'google/gemma-4-31b-it:free — Gemma 4 31B • Ücretsiz (OpenRouter)',
    isFree: true,
  },
  {
    id: 'deepseek/deepseek-v4.1-flash',
    label: 'deepseek/deepseek-v4.1-flash — DeepSeek V4.1 Flash • $0.05/M Kredili',
    isFree: false,
  },
  {
    id: 'deepseek/deepseek-v4-pro-0813',
    label: 'deepseek/deepseek-v4-pro-0813 — DeepSeek V4 Pro 0813 • $0.11/M Kredili',
    isFree: false,
  },
  {
    id: 'deepseek/deepseek-v3.2',
    label: 'deepseek/deepseek-v3.2 — DeepSeek V3.2 • $0.26/M Kredili',
    isFree: false,
  },
  {
    id: 'deepseek/deepseek-r1-0528',
    label: 'deepseek/deepseek-r1-0528 — DeepSeek R1 0528 • $0.57/M Kredili',
    isFree: false,
  },
];

export function normalizeOpenRouterModel(
  model: string | undefined | null,
  family: 'qwen' | 'deepseek',
): string {
  const defaultModel = family === 'qwen' ? DEFAULT_QWEN_MODEL : DEFAULT_DEEPSEEK_MODEL;
  const trimmed = typeof model === 'string' ? model.trim() : '';
  if (!trimmed || RETIRED_OPENROUTER_MODELS.has(trimmed.toLowerCase())) {
    return defaultModel;
  }
  return trimmed;
}

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
    qwenModel: normalizeOpenRouterModel(raw?.qwenModel, 'qwen'),
    deepseekModel: normalizeOpenRouterModel(raw?.deepseekModel, 'deepseek'),
    agentEngines,
    parallelMode: typeof raw?.parallelMode === 'boolean' ? raw.parallelMode : true,
    demoMode: typeof raw?.demoMode === 'boolean' ? raw.demoMode : false,
    sceneTheme: isValidSceneTheme(raw?.sceneTheme) ? raw.sceneTheme : 'day',
    soundEnabled: typeof raw?.soundEnabled === 'boolean' ? raw.soundEnabled : true,
  };
}
