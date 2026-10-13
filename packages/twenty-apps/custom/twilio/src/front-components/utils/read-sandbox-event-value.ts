// The front component sandbox serializes DOM events, so the value can sit on
// detail.value, value, or target.value depending on the element
export const readSandboxEventValue = (event: unknown): string | undefined => {
  const candidate = event as {
    detail?: { value?: unknown };
    value?: unknown;
    target?: { value?: unknown };
  };

  for (const value of [
    candidate.detail?.value,
    candidate.value,
    candidate.target?.value,
  ]) {
    if (typeof value === 'string') {
      return value;
    }
  }

  return undefined;
};
