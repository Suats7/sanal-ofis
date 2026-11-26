import {
  DEEPSEEK_MODEL_OPTIONS,
  isFreeOpenRouterModelId,
  normalizeOpenRouterModel,
  OPENROUTER_FREE_MODEL_OPTIONS,
  QWEN_MODEL_OPTIONS,
} from '../constants/engines';

export interface OpenRouterModelOption {
  id: string;
  label: string;
  isFree: boolean;
}

export interface OpenRouterCatalogResult {
  qwen: OpenRouterModelOption[];
  deepseek: OpenRouterModelOption[];
  freeModels: OpenRouterModelOption[];
  qwenFreeCount: number;
  deepseekFreeCount: number;
  qwenPaidCount: number;
  deepseekPaidCount: number;
}

export type OpenRouterFamily = 'qwen' | 'deepseek';

export interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterModelsApiResponse {
  data?: Array<{
    id?: string;
    name?: string;
    architecture?: {
      modality?: string;
      output_modalities?: string[];
    };
    pricing?: {
      prompt?: string;
      completion?: string;
    };
  }>;
}

interface OpenRouterCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning?: string | null;
    };
  }>;
  error?: {
    message?: string;
    code?: number | string;
    metadata?: {
      raw?: string;
    };
  };
}

const FREE_PRIORITY_ORDER: string[] = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
];

let cachedModelsPromise: Promise<OpenRouterCatalogResult> | null = null;

export function stripReasoningTags(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
}

function formatPaidPriceSuffix(promptPrice?: string): string {
  const num = Number(promptPrice);
  if (Number.isFinite(num) && num > 0) {
    const perMillion = num * 1_000_000;
    const formatted =
      perMillion >= 1
        ? perMillion.toFixed(2)
        : perMillion >= 0.01
          ? perMillion.toFixed(2)
          : perMillion.toFixed(3);
    return ` • $${formatted}/M Kredili`;
  }
  return ' • Kredili';
}

function dedupeOptions(items: OpenRouterModelOption[]): OpenRouterModelOption[] {
  const seen = new Set<string>();
  const out: OpenRouterModelOption[] = [];
  for (const item of items) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function prioritizeFreeOptions(
  options: OpenRouterModelOption[],
  preferredOrder: string[],
): OpenRouterModelOption[] {
  const rank = (id: string): number => {
    const idx = preferredOrder.indexOf(id);
    if (idx !== -1) return idx;
    const fallbackIdx = FREE_PRIORITY_ORDER.indexOf(id);
    if (fallbackIdx !== -1) return preferredOrder.length + fallbackIdx;
    return 100;
  };

  return [...options].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

function sortPaidOptions(
  entries: Array<{ option: OpenRouterModelOption; promptPrice: number }>,
): OpenRouterModelOption[] {
  return [...entries]
    .sort(
      (a, b) =>
        a.promptPrice - b.promptPrice || b.option.id.localeCompare(a.option.id),
    )
    .map((entry) => entry.option);
}

export async function fetchOpenRouterModelsByFamily(
  forceRefresh = false,
): Promise<OpenRouterCatalogResult> {
  if (!forceRefresh && cachedModelsPromise) {
    return cachedModelsPromise;
  }

  const loader = (async (): Promise<OpenRouterCatalogResult> => {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) {
      throw new Error(`OpenRouter model listesi alınamadı (${res.status}).`);
    }
    const payload = (await res.json()) as OpenRouterModelsApiResponse;
    const list = Array.isArray(payload.data) ? payload.data : [];

    const qwenFree: OpenRouterModelOption[] = [];
    const qwenPaidEntries: Array<{ option: OpenRouterModelOption; promptPrice: number }> = [];
    const deepseekFree: OpenRouterModelOption[] = [];
    const deepseekPaidEntries: Array<{ option: OpenRouterModelOption; promptPrice: number }> = [];
    const generalFree: OpenRouterModelOption[] = [];
    const seen = new Set<string>();

    for (const item of list) {
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      if (!id || seen.has(id)) continue;

      const lower = id.toLowerCase();
      if (
        lower.endsWith(':batch') ||
        lower.includes('embedding') ||
        lower.includes('lyria')
      ) {
        continue;
      }

      const outputModalities = item.architecture?.output_modalities;
      if (Array.isArray(outputModalities) && !outputModalities.includes('text')) {
        continue;
      }

      const isQwen = lower.startsWith('qwen/');
      const isDeepseek = lower.startsWith('deepseek/');
      const isFree =
        lower === 'openrouter/free' ||
        lower.endsWith(':free') ||
        (item.pricing?.prompt === '0' && item.pricing?.completion === '0');

      if (!isQwen && !isDeepseek && !isFree) continue;

      seen.add(id);
      const namePart = item.name && item.name !== id ? ` — ${item.name}` : '';
      const suffix = isFree ? ' • Ücretsiz' : formatPaidPriceSuffix(item.pricing?.prompt);
      const option: OpenRouterModelOption = {
        id,
        label: `${id}${namePart}${suffix}`,
        isFree,
      };

      const parsedPrice = Number(item.pricing?.prompt);
      const promptPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 999;

      if (isQwen) {
        if (isFree) qwenFree.push(option);
        else qwenPaidEntries.push({ option, promptPrice });
      } else if (isDeepseek) {
        if (isFree) deepseekFree.push(option);
        else deepseekPaidEntries.push({ option, promptPrice });
      } else if (isFree) {
        generalFree.push(option);
      }
    }

    const qwenPaid = sortPaidOptions(qwenPaidEntries);
    const deepseekPaid = sortPaidOptions(deepseekPaidEntries);

    const orderedGeneralFreeForQwen = prioritizeFreeOptions(generalFree, [
      'google/gemma-4-31b-it:free',
      'openrouter/free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'nvidia/nemotron-3.5-lightning:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    ]);

    const orderedGeneralFreeForDeepseek = prioritizeFreeOptions(generalFree, [
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'openrouter/free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3.5-lightning:free',
    ]);

    const qwen = dedupeOptions([
      ...qwenFree,
      ...orderedGeneralFreeForQwen,
      ...qwenPaid.slice(0, 24),
    ]);

    const deepseek = dedupeOptions([
      ...deepseekFree,
      ...orderedGeneralFreeForDeepseek,
      ...deepseekPaid.slice(0, 24),
    ]);

    const freeModels = dedupeOptions([
      ...qwenFree,
      ...deepseekFree,
      ...prioritizeFreeOptions(generalFree, FREE_PRIORITY_ORDER),
    ]);

    return {
      qwen,
      deepseek,
      freeModels,
      qwenFreeCount: qwenFree.length,
      deepseekFreeCount: deepseekFree.length,
      qwenPaidCount: qwenPaid.length,
      deepseekPaidCount: deepseekPaid.length,
    };
  })();

  cachedModelsPromise = loader.catch((err) => {
    cachedModelsPromise = null;
    throw err;
  });

  return cachedModelsPromise;
}

function compactRawSnippet(raw: string, maxLen = 140): string {
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean;
}

export function formatOpenRouterError(err: unknown, model?: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();

  if (
    lower.includes('401') ||
    lower.includes('unauthorized') ||
    lower.includes('invalid api key') ||
    lower.includes('no auth') ||
    lower.includes('user not found')
  ) {
    return 'OpenRouter API anahtarı geçersiz görünüyor. Lütfen openrouter.ai/keys üzerinden aldığınız sk-or-v1-... anahtarını kontrol edin.';
  }

  if (
    lower.includes('data policy') ||
    lower.includes('privacy') ||
    lower.includes('free model publication')
  ) {
    return `Ücretsiz (:free) modeller için OpenRouter veri gizliliği izni kapalı (${model || 'model'}). https://openrouter.ai/settings/privacy sayfasından "Enable free endpoints" / veri yayınlama ayarını açıp tekrar deneyin.`;
  }

  if (
    lower.includes('402') ||
    lower.includes('insufficient credits') ||
    lower.includes('payment required') ||
    lower.includes('more credits')
  ) {
    return `Seçilen model (${model || 'bu model'}) OpenRouter kredisi gerektiriyor. Üstteki "• Ücretsiz (:free)" modellerden veya openrouter/free seçeneğinden birini seçin ya da https://openrouter.ai/settings/credits üzerinden bakiye ekleyin.`;
  }

  if (
    lower.includes('404') ||
    lower.includes('no endpoints') ||
    lower.includes('not a valid model')
  ) {
    const detail = compactRawSnippet(raw);
    return `Seçilen model (${model || 'model'}) OpenRouter üzerinde bulunamadı veya etkin uç noktası yok. "OpenRouter Modellerini Çek" ile güncel bir model seçin.${detail ? ` (Detay: ${detail})` : ''}`;
  }

  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
    return `OpenRouter (${model || 'ücretsiz model'}) hız sınırına ulaştı. Birkaç saniye bekleyin ya da listedeki başka bir ücretsiz/kredili modeli seçin.`;
  }

  if (
    lower.includes('503') ||
    lower.includes('502') ||
    lower.includes('overloaded') ||
    lower.includes('unavailable')
  ) {
    return `Seçilen OpenRouter modeli (${model || 'model'}) şu an geçici yoğunluk (503) yaşıyor. Biraz sonra tekrar deneyin veya alternatif model seçin.`;
  }

  return compactRawSnippet(raw, 240) || 'OpenRouter API bağlantısı kurulamadı.';
}

function isPrivacyPolicyError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('data policy') ||
    msg.includes('privacy') ||
    msg.includes('free model publication')
  );
}

function isCreditError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('402') ||
    msg.includes('insufficient credits') ||
    msg.includes('payment required') ||
    msg.includes('more credits')
  );
}

function isTransientOpenRouterError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('overloaded') ||
    msg.includes('unavailable')
  );
}

function isSwitchableOpenRouterError(
  err: unknown,
  allowFreeFallbackOnCreditError: boolean,
): boolean {
  if (isPrivacyPolicyError(err)) {
    return false;
  }
  if (isCreditError(err)) {
    return allowFreeFallbackOnCreditError;
  }
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    isTransientOpenRouterError(err) ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('404') ||
    msg.includes('no endpoints') ||
    msg.includes('not a valid model') ||
    msg.includes('boş yanıt')
  );
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callOpenRouterResilient(
  apiKey: string,
  primaryModel: string,
  family: OpenRouterFamily,
  messages: OpenRouterChatMessage[],
  options?: {
    temperature?: number;
    extraFallbacks?: string[];
    allowFreeFallbackOnCreditError?: boolean;
  },
): Promise<{ text: string; usedModel: string }> {
  const firstModel = normalizeOpenRouterModel(primaryModel, family);
  const allowFreeFallbackOnCreditError = options?.allowFreeFallbackOnCreditError ?? true;

  const tryCall = async (targetModel: string): Promise<string> => {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
        'X-Title': 'Sanal AI Ajan Ofisi',
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        ...(typeof options?.temperature === 'number'
          ? { temperature: options.temperature }
          : {}),
      }),
    });

    const data = (await res.json().catch(() => ({}))) as OpenRouterCompletionResponse;
    if (!res.ok) {
      const msg = data.error?.message || res.statusText || 'İstek başarısız';
      const rawMeta = data.error?.metadata?.raw;
      const detail = rawMeta && rawMeta !== msg ? ` — ${rawMeta}` : '';
      throw new Error(`${res.status} ${msg}${detail}`);
    }

    const rawContent = data.choices?.[0]?.message?.content ?? '';
    const cleaned = stripReasoningTags(rawContent);
    if (!cleaned) {
      throw new Error('Model boş yanıt döndürdü.');
    }
    return cleaned;
  };

  let lastError: unknown;

  // 1. Primary model (with 1 short retry on transient 502/503)
  try {
    const text = await tryCall(firstModel);
    return { text, usedModel: firstModel };
  } catch (err) {
    lastError = err;
    if (isTransientOpenRouterError(err)) {
      await sleep(1100);
      try {
        const text = await tryCall(firstModel);
        return { text, usedModel: firstModel };
      } catch (retryErr) {
        lastError = retryErr;
      }
    }
    if (!isSwitchableOpenRouterError(lastError, allowFreeFallbackOnCreditError)) {
      throw lastError;
    }
  }

  // 2. Build live free fallback candidate list (same-family free -> openrouter/free -> live free models -> static free defaults)
  const staticFamilyFree = (family === 'qwen' ? QWEN_MODEL_OPTIONS : DEEPSEEK_MODEL_OPTIONS)
    .filter((opt) => opt.isFree === true)
    .map((opt) => opt.id);
  const staticGeneralFree = OPENROUTER_FREE_MODEL_OPTIONS.map((opt) => opt.id);

  let liveFreeIds: string[] = [];
  let sameFamilyLiveFreeIds: string[] = [];
  try {
    const live = await fetchOpenRouterModelsByFamily();
    const familyList = family === 'qwen' ? live.qwen : live.deepseek;
    sameFamilyLiveFreeIds = familyList
      .filter((m) => m.isFree && m.id.toLowerCase().startsWith(`${family}/`))
      .map((m) => m.id);
    liveFreeIds = live.freeModels.map((m) => m.id);
  } catch {
    // Ignore live catalog fetch errors during fallback
  }

  const candidatePool = [
    ...sameFamilyLiveFreeIds,
    'openrouter/free',
    ...(options?.extraFallbacks ?? []).filter((id) => isFreeOpenRouterModelId(id)),
    ...liveFreeIds,
    ...staticFamilyFree,
    ...staticGeneralFree,
  ].filter((id, idx, arr) => Boolean(id) && id !== firstModel && arr.indexOf(id) === idx);

  for (const fallbackModel of candidatePool.slice(0, 5)) {
    await sleep(350);
    try {
      const text = await tryCall(fallbackModel);
      return { text, usedModel: fallbackModel };
    } catch (err) {
      lastError = err;
      if (!isSwitchableOpenRouterError(err, allowFreeFallbackOnCreditError)) {
        throw err;
      }
    }
  }

  throw lastError;
}

export async function testOpenRouterConnection(
  apiKey: string,
  model: string,
  family: OpenRouterFamily,
  fallbackModels: string[] = [],
): Promise<{ reply: string; usedModel: string }> {
  const normalizedModel = normalizeOpenRouterModel(model, family);
  const { text, usedModel } = await callOpenRouterResilient(
    apiKey,
    normalizedModel,
    family,
    [
      {
        role: 'user',
        content: 'Sadece tek cümleyle Türkçe olarak bağlantının başarılı olduğunu yaz.',
      },
    ],
    {
      temperature: 0.3,
      extraFallbacks: fallbackModels,
      allowFreeFallbackOnCreditError: isFreeOpenRouterModelId(normalizedModel),
    },
  );
  return {
    reply: text || 'Bağlantı başarılı!',
    usedModel,
  };
}
