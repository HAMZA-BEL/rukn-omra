# Rukn Nusuk Assistant extension programs

The Chrome extension should call:

```js
https://ruknomra.com/api/extension/programs
```

For local Netlify development:

```js
http://localhost:8888/api/extension/programs
```

Use the access token returned by `/api/extension/auth/login`:

```http
GET /api/extension/programs
Authorization: Bearer <accessToken>
```

The extension must not send `agencyId`. The endpoint resolves `agencyId` from the authenticated Rukn user profile and ignores any query/body agency value.

## Successful response

```json
{
  "agency": {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "TIZNIT VOYAGES"
  },
  "programs": [
    {
      "programId": "33333333-3333-3333-3333-333333333333",
      "agencyId": "22222222-2222-2222-2222-222222222222",
      "name": "Ramadan Umrah",
      "type": "umrah",
      "startDate": "2026-02-15",
      "endDate": "2026-02-28",
      "status": "active"
    }
  ]
}
```

## No programs response

```json
{
  "agency": {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "TIZNIT VOYAGES"
  },
  "programs": []
}
```

## Unauthorized response

```json
{
  "error": "Missing Authorization bearer token"
}
```
