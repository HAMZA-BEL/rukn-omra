# Rukn Nusuk Assistant extension login

The Chrome extension should use this value for `RUKN_AUTH_CONFIG.loginUrl`:

```js
https://ruknomra.com/api/extension/auth/login
```

For local Netlify development, use the local site origin instead:

```js
http://localhost:8888/api/extension/auth/login
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
    "expiresAt": "2026-06-25T12:30:00.000Z"
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
