import { describe, it, expect, mock, afterEach } from 'bun:test';
import { createAppriseClient } from './apprise-client.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createAppriseClient', () => {
  it('returns no-op client when URL is undefined', async () => {
    const client = createAppriseClient(undefined);

    // Should not throw
    await client.notify('Test Title', 'Test body');
  });

  it('returns no-op client when URL is empty string', async () => {
    const client = createAppriseClient('');

    // Should not throw
    await client.notify('Test Title', 'Test body');
  });

  describe('with URL configured', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('POSTs to the Apprise URL with correct payload', async () => {
      let capturedUrl: string | undefined;
      let capturedInit: RequestInit | undefined;

      globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = url as string;
        capturedInit = init;
        return new Response('', { status: 200 });
      }) as unknown as typeof fetch;

      const client = createAppriseClient('http://apprise:8000/notify');
      await client.notify('Sync Starting', 'Adding 10 tracks');

      expect(capturedUrl).toBe('http://apprise:8000/notify');
      expect(capturedInit?.method).toBe('POST');
      expect(capturedInit?.headers).toEqual({ 'Content-Type': 'application/json' });

      const body = JSON.parse(capturedInit?.body as string);
      expect(body).toEqual({ title: 'Sync Starting', body: 'Adding 10 tracks' });
    });

    it('logs but does not throw on HTTP error', async () => {
      globalThis.fetch = mock(async () => {
        return new Response('Internal Server Error', { status: 500 });
      }) as unknown as typeof fetch;

      const client = createAppriseClient('http://apprise:8000/notify');

      // Should not throw
      await client.notify('Test', 'Body');
    });

    it('logs but does not throw on network error', async () => {
      globalThis.fetch = mock(async () => {
        throw new Error('Connection refused');
      }) as unknown as typeof fetch;

      const client = createAppriseClient('http://apprise:8000/notify');

      // Should not throw
      await client.notify('Test', 'Body');
    });
  });
});
