import { describe, expect, it } from 'vitest';
import { normalizeAppSettings } from '../constants/engines';
import { resolveAgentEngine } from './aiService';

describe('aiService.resolveAgentEngine', () => {
  it('selects configured engine when its API key is available', () => {
    const settings = normalizeAppSettings(
      {
        apiKey: 'AIzaGeminiKey',
        openRouterApiKey: 'sk-or-v1-test',
        qwenModel: 'google/gemma-4-31b-it:free',
        deepseekModel: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      },
      'gemini-4-hydrogen',
    );

    expect(resolveAgentEngine(settings, 'sef')).toEqual({
      engineId: 'gemini',
      model: 'gemini-4-hydrogen',
    });
    expect(resolveAgentEngine(settings, 'arastirmaci')).toEqual({
      engineId: 'qwen',
      model: 'google/gemma-4-31b-it:free',
    });
    expect(resolveAgentEngine(settings, 'siberci')).toEqual({
      engineId: 'deepseek',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    });
  });

  it('falls back cross-engine when only one provider API key is present', () => {
    const geminiOnly = normalizeAppSettings(
      { apiKey: 'AIzaGeminiKey', openRouterApiKey: '' },
      'gemini-4-hydrogen',
    );
    const resolvedFromGemini = resolveAgentEngine(geminiOnly, 'yazilimci');
    expect(resolvedFromGemini.engineId).toBe('gemini');
    expect(resolvedFromGemini.model).toBe('gemini-4-hydrogen');
    expect(resolvedFromGemini.fallbackNote).toContain('Gemini');

    const openRouterOnly = normalizeAppSettings(
      { apiKey: '', openRouterApiKey: 'sk-or-v1-test' },
      'gemini-4-hydrogen',
    );
    const resolvedFromOr = resolveAgentEngine(openRouterOnly, 'sef');
    expect(resolvedFromOr.engineId).toBe('qwen');
    expect(resolvedFromOr.fallbackNote).toContain('OpenRouter');
  });

  it('throws clear error when neither Gemini nor OpenRouter key is configured', () => {
    const empty = normalizeAppSettings({ apiKey: '', openRouterApiKey: '' }, 'gemini-4-hydrogen');
    expect(() => resolveAgentEngine(empty, 'sef')).toThrow(/anahtar/i);
  });
});
