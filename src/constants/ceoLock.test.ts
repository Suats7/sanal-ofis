import { describe, expect, it } from 'vitest';
import { AGENTS } from './agents';
import { assertSauronIntegrity, LOCKED_CEO_IDENTITY } from './ceoLock';

describe('CEO Sauron immutability & integrity', () => {
  it('freezes LOCKED_CEO_IDENTITY with expected immutable fields', () => {
    expect(Object.isFrozen(LOCKED_CEO_IDENTITY)).toBe(true);
    expect(LOCKED_CEO_IDENTITY.id).toBe('sef');
    expect(LOCKED_CEO_IDENTITY.name).toBe('Sauron');
    expect(LOCKED_CEO_IDENTITY.shortRole).toBe('CEO');
    expect(LOCKED_CEO_IDENTITY.locked).toBe(true);
    expect(LOCKED_CEO_IDENTITY.signature).toBe('SAURON_IMMUTABLE_CEO_V1');
  });

  it('freezes AGENTS registry and AGENTS.sef matching LOCKED_CEO_IDENTITY', () => {
    expect(Object.isFrozen(AGENTS)).toBe(true);
    expect(Object.isFrozen(AGENTS.sef)).toBe(true);
    expect(AGENTS.sef.id).toBe(LOCKED_CEO_IDENTITY.id);
    expect(AGENTS.sef.name).toBe(LOCKED_CEO_IDENTITY.name);
    expect(AGENTS.sef.shortRole).toBe(LOCKED_CEO_IDENTITY.shortRole);
    expect(AGENTS.sef.locked).toBe(true);
  });

  it('validates authentic CEO Sauron and rejects spoofed identities', () => {
    expect(assertSauronIntegrity(AGENTS.sef)).toBe(true);
    expect(
      assertSauronIntegrity({ id: 'sef', name: 'BaşkaBiri', shortRole: 'CEO' }),
    ).toBe(false);
    expect(
      assertSauronIntegrity({ id: 'other', name: 'Sauron', shortRole: 'CEO' }),
    ).toBe(false);
    expect(
      assertSauronIntegrity({ id: 'sef', name: 'Sauron', shortRole: 'Müdür' }),
    ).toBe(false);
  });
});
