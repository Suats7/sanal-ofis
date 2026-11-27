import { describe, expect, it } from 'vitest';
import {
  buildFallbackPlan,
  DEFAULT_GEMINI_MODEL,
  extractJsonObject,
  formatGeminiError,
  isRetiredGeminiModel,
  normalizeGeminiModel,
} from './geminiService';

describe('geminiService helpers & error handling', () => {
  it('flags retired and legacy Gemini model IDs while preserving active ones', () => {
    expect(isRetiredGeminiModel('gemini-3.1-flash-lite-preview')).toBe(true);
    expect(isRetiredGeminiModel('gemini-3-pro-preview')).toBe(true);
    expect(isRetiredGeminiModel('gemini-2.5-flash')).toBe(true);
    expect(isRetiredGeminiModel('models/gemini-2.0-flash')).toBe(true);
    expect(isRetiredGeminiModel('')).toBe(true);

    expect(isRetiredGeminiModel('gemini-4-hydrogen')).toBe(false);
    expect(isRetiredGeminiModel('gemini-3.8-flash')).toBe(false);
  });

  it('normalizes model names by stripping models/ prefix and migrating retired IDs', () => {
    expect(normalizeGeminiModel('models/gemini-3.8-flash')).toBe('gemini-3.8-flash');
    expect(normalizeGeminiModel('gemini-3.1-flash-lite-preview')).toBe(DEFAULT_GEMINI_MODEL);
    expect(normalizeGeminiModel(undefined)).toBe(DEFAULT_GEMINI_MODEL);
  });

  it('extracts JSON objects from fenced blocks or prose output', () => {
    const fenced = 'Açıklama\n```json\n{"summary":"Test","steps":[]}\n```\nSon';
    expect(extractJsonObject(fenced)).toBe('{"summary":"Test","steps":[]}');

    const raw = 'Başlangıç {"ok":true} bitiş';
    expect(extractJsonObject(raw)).toBe('{"ok":true}');
  });

  it('builds fallback workflow plan including siberci audit for coding prompts', () => {
    const codePlan = buildFallbackPlan('Modern bir React TypeScript web uygulaması yaz');
    const agentIds = codePlan.steps.map((s) => s.agentId);
    expect(agentIds).toContain('yazilimci');
    expect(agentIds).toContain('siberci');

    const generalPlan = buildFallbackPlan('Kahve dükkanı için açılış fikri üret');
    expect(generalPlan.steps.length).toBeGreaterThan(0);
  });

  it('formats common Gemini API errors into localized Turkish messages', () => {
    expect(formatGeminiError(new Error('401 API_KEY_INVALID'))).toContain('geçersiz');
    expect(
      formatGeminiError(new Error('429 RESOURCE_EXHAUSTED limit: 0 free_tier'), 'gemini-4-carbon'),
    ).toContain('limit: 0');
    expect(formatGeminiError(new Error('503 UNAVAILABLE'), 'gemini-4-hydrogen')).toContain('503');
    expect(formatGeminiError(new Error('404 NOT_FOUND'), 'gemini-x')).toContain('bulunamadı');
  });
});
