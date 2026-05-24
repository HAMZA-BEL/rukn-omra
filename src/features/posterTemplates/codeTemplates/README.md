# Code-Generated Poster Templates

Code-generated poster templates render program posters from program and agency data without uploaded background images or manual fill-area placement.

Phase 1 registers the official Rukn template. Phase 2 adds DB-backed assignment rows for private templates. Phase 3 adds the first private Signature template, `tiznit_voyages_signature`, without assigning it to any agency in code.

## Contract

Each template module must export:

```js
export const templateMeta = {
  key: "unique_template_key",
  type: "official", // later: "agency_private" or "shared_signature"
  name: { ar: "...", fr: "...", en: "..." },
  supportedProgramTypes: ["umrah", "hajj"],
  maxLevels: 5,
};

export async function renderPoster({
  program,
  agency,
  locale,
  helpers,
}) {
  // Return a PNG Blob.
}
```

## Rules

- Register templates in `registry.js` with lightweight metadata and a lazy `load()` function.
- Do not eagerly import private template modules.
- Do not hardcode agency names, emails, or IDs in Program Actions.
- Do not query Supabase directly inside template modules.
- Do not store generated posters by default.
- Keep assets compressed and template-specific assets isolated.
- Private template assignment will be DB-backed in a later phase; it is not part of Phase 1.
- Private agency templates must still be displayed only from `agency_code_poster_templates` assignment rows.

## Adding A Future Template

1. Add a new module under `official/`, `shared/`, or `agencies/`.
2. Export `templateMeta` and `renderPoster`.
3. Add a lightweight metadata entry and dynamic import loader to `registry.js`.
4. Keep rendering helpers shared where possible.
5. Verify Arabic RTL, dates, prices, levels, missing data, and export quality.

## Agency Assignments

Private/signature templates will be assigned through `public.agency_code_poster_templates`.

- `template_key` must exist in `registry.js`.
- Enabled assignment rows are visible only to the assigned agency through RLS.
- Unknown keys are skipped safely in the frontend and logged only in development.
- Templates are lazy-loaded only when selected.
- The official Rukn template remains available to all agencies without an assignment row.
- Do not hardcode agency checks in Program Actions.

Example manual assignment SQL for a future template:

```sql
insert into public.agency_code_poster_templates (agency_id, template_key, enabled, is_default)
values ('AGENCY_ID_HERE', 'tiznit_voyages_signature', true, true)
on conflict (agency_id, template_key)
do update set enabled = true, is_default = true, updated_at = now();
```

Do not insert this example row until the matching code template is deployed.
