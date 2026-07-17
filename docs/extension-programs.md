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

Only programs explicitly enabled from Rukn with the `رفع لنسك` action are returned. Programs that have not been enabled for Nusuk Assistant upload are hidden from this endpoint.

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

## Program clients and Nusuk upload contract (v2)

The extension loads the execution queue from the existing endpoint:

```http
GET /api/extension/program-clients?programId=<programId>
Authorization: Bearer <accessToken>
```

If the extension already knows the clients selected for the current upload batch, it may pass their IDs as a comma-separated list. The endpoint still resolves companion records from the same single program query:

```http
GET /api/extension/program-clients?programId=<programId>&clientIds=<clientId1>,<clientId2>
```

The server derives the agency from the authenticated user. It never accepts an `agencyId` from the query, and verifies that the program, minor, and companion belong to the authenticated agency and allowed program. When travel groups are assigned, a minor and companion must have the same `travel_group_id`.

Successful response:

```json
{
  "payloadVersion": 2,
  "agencyId": "22222222-2222-2222-2222-222222222222",
  "programId": "33333333-3333-3333-3333-333333333333",
  "executionOrder": ["companion-client-id", "minor-client-id"],
  "clients": [
    {
      "clientId": "companion-client-id",
      "passportNumber": "MA123456",
      "expectedPassportNumber": "MA123456",
      "arabicFirstName": "محمد",
      "arabicLastName": "العلوي",
      "arabicFullName": "محمد العلوي",
      "isMinor": false
    },
    {
      "clientId": "minor-client-id",
      "passportNumber": "MA654321",
      "expectedPassportNumber": "MA654321",
      "arabicFirstName": "أمين",
      "arabicLastName": "العلوي",
      "arabicFullName": "أمين العلوي",
      "isMinor": true,
      "companion": {
        "clientId": "companion-client-id",
        "fullName": "محمد العلوي",
        "passportNumber": "MA123456",
        "nationality": "MAR",
        "relationshipCode": "father",
        "relationshipToMinor": "أب"
      }
    }
  ]
}
```

`passportNumber` is retained for backward compatibility. `expectedPassportNumber`, `isMinor`, `companion`, and `executionOrder` are additive v2 fields. Adults do not contain an empty `companion` property.

The `clients` array is the execution order. Stable dependency ordering moves a minor only when necessary to place an in-batch companion before that minor. If the companion is not selected in the same batch, the companion is not injected into the queue; its verified metadata remains attached to the minor so the extension can search for it in Nusuk.

Rukn does not transport passport `File` objects through this endpoint. Passport files are selected inside the extension. The extension must attach the returned `clientId`/`expectedPassportNumber` to its queue item when it establishes the file-to-client association; Rukn does not guess from a filename or file order.

Invalid batches receive HTTP `422` and are not returned as an executable queue:

```json
{
  "error": "Nusuk upload preflight failed",
  "code": "NUSUK_PREFLIGHT_FAILED",
  "payloadVersion": 2,
  "validationErrors": [
    {
      "code": "RELATIONSHIP_REQUIRED",
      "clientId": "minor-client-id",
      "clientName": "أمين العلوي",
      "message": "يجب تحديد صلة القرابة للقاصر أمين العلوي."
    }
  ]
}
```
