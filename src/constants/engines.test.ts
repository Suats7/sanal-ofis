import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DEEPSEEK_MODEL,
  DEFAULT_QWEN_MODEL,
  isFreeOpenRouterModelId,
  normalizeAppSettings,
  normalizeOpenRouterModel,
} from './engines';

describe('engines & OpenRouter model normalization', () => {
  it('identifies free OpenRouter model IDs correctly', () => {
    expect(isFreeOpenRouterModelId('openrouter/free')).toBe(true);
    expect(isFreeOpenRouterModelId(' google/gemma-4-31b-it:free ')).toBe(true);
    expect(isFreeOpenRouterModelId('qwen/qwen3.7-flash')).toBe(false);
    expect(isFreeOpenRouterModelId('deepseek/deepseek-v4.1-flash')).toBe(false);
  });

  it('migrates retired OpenRouter slugs to live defaults and preserves active models', () => {
    expect(normalizeOpenRouterModel('qwen/qwen3-235b-a22b:free', 'qwen')).toBe(
      DEFAULT_QWEN_MODEL,
    );
    expect(normalizeOpenRouterModel('deepseek/deepseek-chat-v3-0324:free', 'deepseek')).toBe(
      DEFAULT_DEEPSEEK_MODEL,
    );
    expect(normalizeOpenRouterModel('   ', 'qwen')).toBe(DEFAULT_QWEN_MODEL);
    expect(normalizeOpenRouterModel('qwen/qwen3.7-flash', 'qwen')).toBe('qwen/qwen3.7-flash');
    expect(normalizeOpenRouterModel('deepseek/deepseek-v4.1-flash', 'deepseek')).toBe(
      'deepseek/deepseek-v4.1-flash',
    );
  });

  it('normalizes legacy localStorage settings safely with backward compatibility', () => {
    const normalized = normalizeAppSettings(
      {
        apiKey: 'AIzaTestKey',
        qwenModel: 'qwen/qwen3-235b-a22b:free',
        deepseekModel: 'deepseek/deepseek-chat-v3-0324:free',
        sceneTheme: 'invalid-theme' as unknown as 'day',
        agentEngines: {
          sef: 'gemini',
          arastirmaci: 'qwen',
          icerikci: 'gemini',
          yazilimci: 'deepseek',
        } as unknown as Record<'sef' | 'arastirmaci' | 'icerikci' | 'yazilimci' | 'siberci', 'gemini' | 'qwen' | 'deepseek'>,
      },
      'gemini-4-hydrogen',
    );

    expect(normalized.model).toBe('gemini-4-hydrogen');
    expect(normalized.qwenModel).toBe(DEFAULT_QWEN_MODEL);
    expect(normalized.deepseekModel).toBe(DEFAULT_DEEPSEEK_MODEL);
    expect(normalized.sceneTheme).toBe('day');
    expect(normalized.agentEngines.siberci).toBe('deepseek');
    expect(normalized.parallelMode).toBe(true);
    expect(normalized.soundEnabled).toBe(true);
  });
});
