import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';

import { canManageConnection } from '@/sdk/logic-function/connections/can-manage-connection';

describe('canManageConnection', () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    process.env.TWENTY_API_URL = 'https://api.test';
    process.env.TWENTY_APP_ACCESS_TOKEN = 'member-token';
    process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN = 'app-only-token';
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    delete process.env.TWENTY_API_URL;
    delete process.env.TWENTY_APP_ACCESS_TOKEN;
    delete process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN;
    fetchSpy.mockRestore();
  });

  it('asks the server whether the requesting member may manage the connection', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ data: { canManageAppConnection: true } }), {
        status: 200,
      }),
    );

    await expect(canManageConnection('connection-1')).resolves.toBe(true);

    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));

    expect(body.query).toContain('canManageAppConnection');
    expect(body.variables).toEqual({ id: 'connection-1' });
  });

  // The app-only token carries no member, so the server could never say yes
  it('asks as the member who triggered the function', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ data: { canManageAppConnection: true } }), {
        status: 200,
      }),
    );

    await canManageConnection('connection-1');

    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
      string,
      string
    >;

    expect(headers.Authorization).toBe('Bearer member-token');
  });

  it('reports a refusal', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ data: { canManageAppConnection: false } }),
        {
          status: 200,
        },
      ),
    );

    await expect(canManageConnection('connection-1')).resolves.toBe(false);
  });
});
