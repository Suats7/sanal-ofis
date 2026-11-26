import { AGENTS, SAURON_AUTO_MISSIONS } from '../constants/agents';
import { ENGINE_META } from '../constants/engines';
import type { AgentId, AgentProgress, AppSettings, EngineId, WorkflowPlan } from '../types';
import {
  buildAgentExperienceContext,
  buildSpecialistPrompt,
  DEFAULT_GEMINI_MODEL,
  formatGeminiError,
  generateContentResilient,
  parseWorkflowPlanText,
} from './geminiService';
import {
  callOpenRouterResilient,
  formatOpenRouterError,
  type OpenRouterFamily,
} from './openRouterService';

export interface ResolvedAgentEngine {
  engineId: EngineId;
  model: string;
  fallbackNote?: string;
}

export function resolveAgentEngine(
  settings: AppSettings,
  agentId: AgentId,
): ResolvedAgentEngine {
  const preferred = settings.agentEngines[agentId] ?? 'gemini';
  const hasGemini = Boolean(settings.apiKey.trim());
  const hasOpenRouter = Boolean(settings.openRouterApiKey.trim());

  if (preferred === 'gemini') {
    if (hasGemini) {
      return { engineId: 'gemini', model: settings.model || DEFAULT_GEMINI_MODEL };
    }
    if (hasOpenRouter) {
      return {
        engineId: 'qwen',
        model: settings.qwenModel,
        fallbackNote:
          'Gemini API anahtarı girilmediği için geçici olarak OpenRouter (Qwen) kullanıldı.',
      };
    }
  } else {
    if (hasOpenRouter) {
      return {
        engineId: preferred,
        model: preferred === 'qwen' ? settings.qwenModel : settings.deepseekModel,
      };
    }
    if (hasGemini) {
      return {
        engineId: 'gemini',
        model: settings.model || DEFAULT_GEMINI_MODEL,
        fallbackNote: `OpenRouter anahtarı girilmediği için ${ENGINE_META[preferred].name} yerine geçici olarak Gemini kullanıldı.`,
      };
    }
  }

  throw new Error('Çalıştırılacak geçerli bir Gemini veya OpenRouter API anahtarı bulunamadı.');
}

export async function planTaskWithAgentEngine(
  settings: AppSettings,
  userPrompt: string,
  chefProgress?: AgentProgress,
): Promise<{
  plan: WorkflowPlan;
  engineUsed: EngineId;
  modelUsed: string;
  fallbackNote?: string;
}> {
  const resolved = resolveAgentEngine(settings, 'sef');
  const promptText = `Kullanıcı Görevi: ${userPrompt}${buildAgentExperienceContext(chefProgress)}`;

  if (resolved.engineId === 'gemini') {
    const { text, usedModel } = await generateContentResilient(
      settings.apiKey.trim(),
      resolved.model,
      promptText,
      {
        systemInstruction: AGENTS.sef.systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.35,
      },
    );
    return {
      plan: parseWorkflowPlanText(text, userPrompt),
      engineUsed: 'gemini',
      modelUsed: usedModel,
      fallbackNote: resolved.fallbackNote,
    };
  }

  const family: OpenRouterFamily = resolved.engineId === 'deepseek' ? 'deepseek' : 'qwen';
  const { text, usedModel } = await callOpenRouterResilient(
    settings.openRouterApiKey.trim(),
    resolved.model,
    family,
    [
      { role: 'system', content: AGENTS.sef.systemPrompt },
      { role: 'user', content: promptText },
    ],
    { temperature: 0.35 },
  );

  return {
    plan: parseWorkflowPlanText(text, userPrompt),
    engineUsed: resolved.engineId,
    modelUsed: usedModel,
    fallbackNote: resolved.fallbackNote,
  };
}

export async function runSpecialistWithAgentEngine(
  settings: AppSettings,
  agentId: Exclude<AgentId, 'sef'>,
  userPrompt: string,
  subtask: string,
  previousOutputs: { agentId: AgentId; content: string }[],
  agentProgress?: AgentProgress,
): Promise<{
  text: string;
  engineUsed: EngineId;
  modelUsed: string;
  fallbackNote?: string;
}> {
  const agent = AGENTS[agentId];
  const resolved = resolveAgentEngine(settings, agentId);
  const prompt = buildSpecialistPrompt(userPrompt, subtask, previousOutputs, agentProgress);
  const temperature = agentId === 'yazilimci' || agentId === 'siberci' ? 0.3 : 0.75;

  if (resolved.engineId === 'gemini') {
    const { text, usedModel } = await generateContentResilient(
      settings.apiKey.trim(),
      resolved.model,
      prompt,
      {
        systemInstruction: agent.systemPrompt,
        temperature,
      },
    );
    if (!text) {
      throw new Error(`${agent.name} yanıt üretemedi. Lütfen tekrar deneyin.`);
    }
    return {
      text,
      engineUsed: 'gemini',
      modelUsed: usedModel,
      fallbackNote: resolved.fallbackNote,
    };
  }

  const family: OpenRouterFamily = resolved.engineId === 'deepseek' ? 'deepseek' : 'qwen';
  const { text, usedModel } = await callOpenRouterResilient(
    settings.openRouterApiKey.trim(),
    resolved.model,
    family,
    [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: prompt },
    ],
    { temperature },
  );

  if (!text) {
    throw new Error(`${agent.name} yanıt üretemedi. Lütfen tekrar deneyin.`);
  }

  return {
    text,
    engineUsed: resolved.engineId,
    modelUsed: usedModel,
    fallbackNote: resolved.fallbackNote,
  };
}

export async function generateCeoMissionWithSauron(
  settings: AppSettings,
  chefProgress?: AgentProgress,
): Promise<string> {
  const fallback =
    SAURON_AUTO_MISSIONS[Math.floor(Math.random() * SAURON_AUTO_MISSIONS.length)];

  try {
    const resolved = resolveAgentEngine(settings, 'sef');
    const systemPrompt = `Sen AI şirketinin CEO'su "Sauron"sun. Ekibindeki Araştırmacı, İçerikçi, Yazılımcı ve Siberci ajanları aynı anda çalıştırmak için 1 adet net, yaratıcı, gerçekçi ve heyecan verici Türkçe iş görevi üret.
Kurallar:
- Sadece görevin kendisini 1-2 cümle olarak yaz; tırnak, madde işareti, başlık veya kod bloğu ekleme.
- En az 2-3 uzmanlık alanını kapsasın (ör. pazar araştırması + içerik/senaryo + web/kod prototipi + siber güvenlik denetimi).`;
    const userPrompt = `Ofis için yepyeni bir operasyon görevi başlat.${buildAgentExperienceContext(chefProgress)}`;

    let rawText = '';
    if (resolved.engineId === 'gemini') {
      const { text } = await generateContentResilient(
        settings.apiKey.trim(),
        resolved.model,
        userPrompt,
        {
          systemInstruction: systemPrompt,
          temperature: 0.85,
        },
      );
      rawText = text;
    } else {
      const family: OpenRouterFamily = resolved.engineId === 'deepseek' ? 'deepseek' : 'qwen';
      const { text } = await callOpenRouterResilient(
        settings.openRouterApiKey.trim(),
        resolved.model,
        family,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.85 },
      );
      rawText = text;
    }

    const cleaned = rawText
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^["'«»\s]+|["'«»\s]+$/g, '')
      .trim();

    return cleaned || fallback;
  } catch {
    return fallback;
  }
}

export function formatMultiEngineError(
  err: unknown,
  engineId: EngineId,
  model?: string,
): string {
  if (engineId === 'gemini') {
    return formatGeminiError(err, model);
  }
  return formatOpenRouterError(err, model);
}
