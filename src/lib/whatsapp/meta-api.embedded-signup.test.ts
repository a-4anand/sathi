import { afterEach, describe, expect, it, vi } from 'vitest';

import { exchangeEmbeddedSignupCode } from './meta-api';

function response(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

describe('exchangeEmbeddedSignupCode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('exchanges the short-lived browser code on the server', async () => {
    vi.stubEnv('META_APP_ID', '12345');
    vi.stubEnv('META_APP_SECRET', 'server-only-secret');
    const fetch = vi.fn(async () =>
      response({ access_token: 'business-token' })
    );
    vi.stubGlobal('fetch', fetch);

    await expect(
      exchangeEmbeddedSignupCode({ code: 'short-code' })
    ).resolves.toEqual({
      accessToken: 'business-token',
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v21.0/oauth/access_token');
    expect(init.method).toBe('POST');
    expect(String(init.body)).toContain('client_id=12345');
    expect(String(init.body)).toContain('client_secret=server-only-secret');
    expect(String(init.body)).toContain('code=short-code');
  });

  it('rejects a response without a business token', async () => {
    vi.stubEnv('META_APP_ID', '12345');
    vi.stubEnv('META_APP_SECRET', 'server-only-secret');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({}))
    );

    await expect(
      exchangeEmbeddedSignupCode({ code: 'short-code' })
    ).rejects.toThrow(/access token/);
  });
});
