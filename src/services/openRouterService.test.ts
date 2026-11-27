import { describe, expect, it } from 'vitest';
import { formatOpenRouterError, stripReasoningTags } from './openRouterService';

describe('openRouterService helpers & error formatting', () => {
  it('strips closed and unclosed <think> reasoning tags cleanly', () => {
    expect(stripReasoningTags('<think>internal thoughts</think>\nSonuç metni')).toBe('Sonuç metni');
    expect(stripReasoningTags('Başlangıç<think>kesilmiş düşünce')).toBe('Başlangıç');
  });

  it('formats 401, 402, privacy policy, 404, 429, and 503 OpenRouter errors clearly', () => {
    expect(formatOpenRouterError(new Error('401 Unauthorized'))).toContain('sk-or-v1');
    expect(formatOpenRouterError(new Error('402 Insufficient credits'), 'qwen/qwen3.7-flash')).toContain(
      'openrouter.ai/settings/credits',
    );
    expect(
      formatOpenRouterError(
        new Error('404 No endpoints found matching your data policy (Free model publication)'),
        'google/gemma-4-31b-it:free',
      ),
    ).toContain('openrouter.ai/settings/privacy');
    expect(formatOpenRouterError(new Error('404 not a valid model ID'), 'bad/model')).toContain(
      'Detay:',
    );
    expect(formatOpenRouterError(new Error('429 Rate limit exceeded'), 'model')).toContain(
      'hız sınırına',
    );
    expect(formatOpenRouterError(new Error('503 Service unavailable'), 'model')).toContain('503');
  });
});
