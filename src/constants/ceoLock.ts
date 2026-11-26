export const LOCKED_CEO_IDENTITY = Object.freeze({
  id: 'sef' as const,
  name: 'Sauron' as const,
  role: 'CEO & Baş Yönetici' as const,
  shortRole: 'CEO' as const,
  locked: true as const,
  signature: 'SAURON_IMMUTABLE_CEO_V1' as const,
});

export function assertSauronIntegrity(agent: {
  id: string;
  name: string;
  shortRole: string;
}): boolean {
  return (
    agent.id === LOCKED_CEO_IDENTITY.id &&
    agent.name === LOCKED_CEO_IDENTITY.name &&
    agent.shortRole === LOCKED_CEO_IDENTITY.shortRole
  );
}
