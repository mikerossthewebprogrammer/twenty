// The front component sandbox has no crypto.randomUUID; the key only needs to
// be unique per send attempt, not unguessable
export const generateIdempotencyKey = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
