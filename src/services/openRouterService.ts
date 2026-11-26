import {
  DEEPSEEK_MODEL_OPTIONS,
  DEFAULT_DEEPSEEK_MODEL,
  DEFAULT_QWEN_MODEL,
  QWEN_MODEL_OPTIONS,
} from '../constants/engines';

export interface OpenRouterModelOption {
  id: string;
  label: string;
  isFree: boolean;
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
  };
}

let cachedModelsPromise: Promise<{
  qwen: OpenRouterModelOption[];
  deepseek: OpenRouterModelOption[];
}> | null = null;

export function stripReasoningTags(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
}

function modelFamilyScore(id: string, isFree: boolean): number {
  const lower = id.toLowerCase();
  let score = isFree ? 0 : 100;
  if (lower.includes('qwen3') || lower.includes('v3')) score += 1;
  else if (lower.includes('r1')) score += 2;
  else if (lower.includes('2.5') || lower.includes('chat')) score += 3;
  else score += 6;
  return score;
}

export async function fetchOpenRouterModelsByFamily(forceRefresh = false): Promise<{
  qwen: OpenRouterModelOption[];
  deepseek: OpenRouterModelOption[];
}> {
  if (!forceRefresh && cachedModelsPromise) {
    return cachedModelsPromise;
  }

  const loader = (async () => {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) {
      throw new Error(`OpenRouter model listesi alınamadı (${res.status}).`);
    }
    const payload = (await res.json()) as OpenRouterModelsApiResponse;
    const list = Array.isArray(payload.data) ? payload.data : [];

    const qwen: OpenRouterModelOption[] = [];
    const deepseek: OpenRouterModelOption[] = [];
    const seen = new Set<string>();

    for (const item of list) {
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      if (!id || seen.has(id)) continue;

      const lower = id.toLowerCase();
      const isQwen = lower.startsWith('qwen/');
      const isDeepseek = lower.startsWith('deepseek/');
      if (!isQwen && !isDeepseek) continue;
      if (lower.includes('embedding') || lower.includes('vl-')) {
        // Keep VL models only if there aren't enough text ones, or keep general chat/coder models
        if (lower.includes('embedding')) continue;
      }

      seen.add(id);
      const isFree =
        lower.endsWith(':free') ||
        (item.pricing?.prompt === '0' && item.pricing?.completion === '0');
      const namePart = item.name && item.name !== id ? ` — ${item.name}` : '';
      const freeBadge = isFree ? ' • Ücretsiz' : '';
      const option: OpenRouterModelOption = {
        id,
        label: `${id}${namePart}${freeBadge}`,
        isFree,
      };

      if (isQwen) qwen.push(option);
      else deepseek.push(option);
    }

    const sorter = (a: OpenRouterModelOption, b: OpenRouterModelOption) =>
      modelFamilyScore(a.id, a.isFree) - modelFamilyScore(b.id, b.isFree) ||
      b.id.localeCompare(a.id);

    qwen.sort(sorter);
    deepseek.sort(sorter);

    return {
      qwen: qwen.slice(0, 30),
      deepseek: deepseek.slice(0, 30),
    };
  })();

  cachedModelsPromise = loader.catch((err) => {
    cachedModelsPromise = null;
    throw err;
  });

  return cachedModelsPromise;
}

export function formatOpenRouterError(err: unknown, model?: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();

  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('invalid api key') || lower.includes('no auth')) {
    return 'OpenRouter API anahtarı geçersiz görünüyor. Lütfen openrouter.ai/keys üzerinden aldığınız sk-or-... anahtarını kontrol edin.';
  }

  if (lower.includes('402') || lower.includes('insufficient credits') || lower.includes('payment required')) {
    return `Seçilen model (${model || 'bu model'}) OpenRouter kredisi gerektiriyor. Ücretsiz (:free) bir Qwen/DeepSeek modeli seçin veya hesabınıza kredi ekleyin.`;
  }

  if (lower.includes('404') || lower.includes('no endpoints found') || lower.includes('data policy')) {
    return `Seçilen model (${model || 'model'}) bulunamadı veya ücretsiz model veri gizliliği izni kapalı. openrouter.ai/settings/privacy ayarını kontrol edip güncel modelleri çekin.`;
  }

  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
    return `OpenRouter (${model || 'ücretsiz model'}) yoğunluk veya hız sınırına ulaştı. Birkaç saniye bekleyin ya da başka bir Qwen/DeepSeek modeli seçin.`;
  }

  if (lower.includes('503') || lower.includes('502') || lower.includes('overloaded') || lower.includes('unavailable')) {
    return `Seçilen OpenRouter modeli (${model || 'model'}) şu an geçici yoğunluk (503) yaşıyor. Biraz sonra tekrar deneyin veya alternatif model seçin.`;
  }

  return raw.length > 260 ? `${raw.slice(0, 260)}...` : raw || 'OpenRouter API bağlantısı kurulamadı.';
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

function isSwitchableOpenRouterError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    isTransientOpenRouterError(err) ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('404') ||
    msg.includes('no endpoints') ||
    msg.includes('402') ||
    msg.includes('insufficient credits') ||
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
  },
): Promise<{ text: string; usedModel: string }> {
  const defaultModel = family === 'qwen' ? DEFAULT_QWEN_MODEL : DEFAULT_DEEPSEEK_MODEL;
  const firstModel = primaryModel.trim() || defaultModel;

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
      throw new Error(`${res.status} ${msg}`);
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
    if (!isSwitchableOpenRouterError(lastError)) {
      throw lastError;
    }
  }

  // 2. Build fallback candidate list (static free options + live fetched family models)
  const staticDefaults = (family === 'qwen' ? QWEN_MODEL_OPTIONS : DEEPSEEK_MODEL_OPTIONS)
    .filter((opt) => opt.isFree !== false)
    .map((opt) => opt.id);

  let liveFreeIds: string[] = [];
  try {
    const live = await fetchOpenRouterModelsByFamily();
    liveFreeIds = (family === 'qwen' ? live.qwen : live.deepseek)
      .filter((m) => m.isFree)
      .slice(0, 6)
      .map((m) => m.id);
  } catch {
    // Ignore live catalog fetch errors during fallback
  }

  const candidatePool = [
    ...(options?.extraFallbacks ?? []),
    ...liveFreeIds,
    ...staticDefaults,
  ].filter((id, idx, arr) => Boolean(id) && id !== firstModel && arr.indexOf(id) === idx);

  for (const fallbackModel of candidatePool.slice(0, 4)) {
    try {
      const text = await tryCall(fallbackModel);
      return { text, usedModel: fallbackModel };
    } catch (err) {
      lastError = err;
      if (!isSwitchableOpenRouterError(err)) {
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
  const { text, usedModel } = await callOpenRouterResilient(
    apiKey,
    model,
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
    },
  );
  return {
    reply: text || 'Bağlantı başarılı!',
    usedModel,
  };
}
