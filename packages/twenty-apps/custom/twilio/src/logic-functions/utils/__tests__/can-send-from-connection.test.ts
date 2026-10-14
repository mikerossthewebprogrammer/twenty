import { describe, expect, it } from 'vitest';

import { canSendFromConnection } from 'src/logic-functions/utils/can-send-from-connection';

const SHARED = {
  visibility: 'workspace' as const,
  userWorkspaceId: 'uw-owner',
};
const PERSONAL = { visibility: 'user' as const, userWorkspaceId: 'uw-owner' };

describe('canSendFromConnection', () => {
  it('lets anyone, including workflows, send from a shared number', () => {
    expect(canSendFromConnection(SHARED, null)).toBe(true);
    expect(canSendFromConnection(SHARED, 'uw-other')).toBe(true);
  });

  it('lets the owner send from their personal number', () => {
    expect(canSendFromConnection(PERSONAL, 'uw-owner')).toBe(true);
  });

  it('blocks other members from a personal number', () => {
    expect(canSendFromConnection(PERSONAL, 'uw-other')).toBe(false);
  });

  it('blocks workflows and agents from a personal number', () => {
    expect(canSendFromConnection(PERSONAL, null)).toBe(false);
  });
});
