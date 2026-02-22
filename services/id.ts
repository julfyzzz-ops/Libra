export const createClientId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to non-crypto fallback
  }

  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 12);
  return `id-${ts}-${rnd}`;
};

