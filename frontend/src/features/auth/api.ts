import { apiRequest } from '@/api/client';

/** The access/refresh pair returned by `POST /auth/login` (uac-design.md §1). */
export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
};

/**
 * Exchanges an email + password for a token pair.
 *
 * Rejects with {@link ApiError}: `status` 401 for a bad credential (the API
 * returns one generic message for every failure — unknown email, wrong
 * password, disabled account), `status` 0 if the server was unreachable.
 */
export function login(credentials: { email: string; password: string }): Promise<TokenPair> {
  return apiRequest<TokenPair>('/auth/login', {
    method: 'POST',
    body: { email: credentials.email, password: credentials.password },
  });
}
