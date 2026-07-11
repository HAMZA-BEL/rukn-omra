# Rukn Nusuk Assistant extension login

The Chrome extension should use this value for `RUKN_AUTH_CONFIG.loginUrl`:

```js
https://ruknomra.com/api/extension/auth/login
```

For local Netlify development, use the local site origin instead:

```js
http://localhost:8888/api/extension/auth/login
```

The refresh endpoint is:

```js
https://ruknomra.com/api/extension/auth/refresh
```

For local Netlify development:

```js
http://localhost:8888/api/extension/auth/refresh
```

Production CORS is exact-origin only. Configure the extension origin with `RUKN_EXTENSION_ALLOWED_ORIGINS`, for example:

```txt
chrome-extension://<extension-id>
```

Multiple origins can be comma-separated. During Netlify/local development, `chrome-extension://...` origins are allowed automatically.

## Request

```http
POST /api/extension/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

The extension must not send `agencyId`. The endpoint resolves `agencyId` from the authenticated Rukn user profile only.

## Successful response

```json
{
  "session": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "refresh-token-from-supabase",
    "expiresAt": "2026-06-25T12:30:00.000Z",
    "expiresIn": 3600
  },
  "user": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "user@example.com"
  },
  "profile": {
    "userId": "11111111-1111-1111-1111-111111111111",
    "agencyId": "22222222-2222-2222-2222-222222222222",
    "role": "manager"
  },
  "agency": {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "Tiznit Voyages"
  }
}
```

The extension must store the full `session` object atomically after login. Supabase may rotate refresh tokens, so the stored `refreshToken` must always be replaced with the latest value returned by Rukn.

## Refresh request

```http
POST /api/extension/auth/refresh
Content-Type: application/json

{
  "refreshToken": "stored-refresh-token"
}
```

Do not send the refresh token as a Bearer token. Send it only in the JSON body over HTTPS.

## Refresh success response

The refresh endpoint returns the same response shape as login:

```json
{
  "session": {
    "accessToken": "new-eyJhbGciOi...",
    "refreshToken": "new-refresh-token-from-supabase",
    "expiresAt": "2026-06-25T13:30:00.000Z",
    "expiresIn": 3600
  },
  "user": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "user@example.com"
  },
  "profile": {
    "userId": "11111111-1111-1111-1111-111111111111",
    "agencyId": "22222222-2222-2222-2222-222222222222",
    "role": "manager"
  },
  "agency": {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "Tiznit Voyages"
  }
}
```

The extension must replace the stored session atomically with the refreshed session. Do not keep using the old refresh token after a successful refresh.

## Failure response examples

Invalid credentials:

```json
{
  "error": "Invalid email or password"
}
```

Missing agency:

```json
{
  "error": "Authenticated user profile is not linked to an agency"
}
```

Expired or invalid refresh token:

```json
{
  "error": "Invalid or expired refresh token"
}
```

The refresh endpoint returns `401` when the refresh token is missing, invalid, expired, or revoked. It returns `403` when the Supabase user can be authenticated but the Rukn profile or agency is missing, inactive, or disabled.

On `401`, the extension should clear the stored session and ask the user to sign in again. On `403`, the extension should also clear the stored session and stop silent refresh. To avoid refresh loops, retry a failed data request after at most one successful refresh attempt.
