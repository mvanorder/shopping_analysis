import { ApiError, apiRequest } from '../client';

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  fetchMock.mockReset();
});

function makeResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () =>
      body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body),
  } as Response;
}

describe('apiRequest', () => {
  it('sends a JSON body with the right headers and returns the parsed response', async () => {
    fetchMock.mockResolvedValue(makeResponse(200, { access_token: 'a' }));

    const result = await apiRequest<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: { email: 'a@b.co' },
    });

    expect(result).toEqual({ access_token: 'a' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toEqual(expect.stringContaining('/auth/login'));
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.co' }));
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  });

  it('defaults to a bodyless GET with no content-type', async () => {
    fetchMock.mockResolvedValue(makeResponse(200, {}));

    await apiRequest('/health');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.headers).not.toHaveProperty('Content-Type');
  });

  it('resolves undefined for an empty response body', async () => {
    fetchMock.mockResolvedValue(makeResponse(204));

    await expect(
      apiRequest('/auth/logout', { method: 'POST', body: {} }),
    ).resolves.toBeUndefined();
  });

  it('throws ApiError carrying the API detail string on a non-2xx response', async () => {
    fetchMock.mockResolvedValue(makeResponse(401, { detail: 'Invalid email or password' }));

    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Invalid email or password',
    });
  });

  it('falls back to a status message when detail is not a plain string', async () => {
    fetchMock.mockResolvedValue(makeResponse(422, { detail: [{ msg: 'bad' }] }));

    await expect(apiRequest('/x')).rejects.toMatchObject({
      status: 422,
      message: 'Request failed (422).',
    });
  });

  it('falls back to a status message when the response body is null', async () => {
    fetchMock.mockResolvedValue(makeResponse(400, null));

    await expect(apiRequest('/x')).rejects.toMatchObject({
      status: 400,
      message: 'Request failed (400).',
    });
  });

  it('falls back to a status message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(makeResponse(500, '<html>nope</html>'));

    await expect(apiRequest('/x')).rejects.toMatchObject({
      status: 500,
      message: 'Request failed (500).',
    });
  });

  it('wraps a transport failure as an ApiError with status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    const error = await apiRequest('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0 });
  });
});
