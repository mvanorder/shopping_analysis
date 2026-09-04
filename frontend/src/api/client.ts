import { API_BASE_URL } from './config';

/**
 * A failed API call: either a non-2xx response (`status` is the HTTP code) or a
 * transport-level failure with no response at all (`status` is 0).
 *
 * `message` is safe to show to the user — for a non-2xx response it is the
 * API's `{ "detail": ... }` string when present, so callers can surface it
 * directly rather than mapping status codes to copy.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const NETWORK_ERROR_MESSAGE =
  "Couldn't reach the server. Check your connection and try again.";

type JsonRequest = {
  method?: string;
  /** Serialized to JSON; omit for a bodyless request. */
  body?: unknown;
  /** Bearer access token for a protected endpoint. */
  token?: string;
  signal?: AbortSignal;
};

/**
 * Issues a JSON request to `API_BASE_URL + path` and returns the parsed body.
 *
 * Throws {@link ApiError} on a transport failure or any non-2xx response.
 */
export async function apiRequest<T>(path: string, options: JsonRequest = {}): Promise<T> {
  const hasBody = options.body !== undefined;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  const payload = await readJson(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      detailString(payload) ?? `Request failed (${response.status}).`,
    );
  }

  return payload as T;
}

/** Parse the response body as JSON, tolerating an empty or non-JSON body. */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** The FastAPI `detail` field, but only when it is a plain string. */
function detailString(payload: unknown): string | undefined {
  if (payload !== null && typeof payload === 'object' && 'detail' in payload) {
    const { detail } = payload as { detail: unknown };
    if (typeof detail === 'string') {
      return detail;
    }
  }
  return undefined;
}
