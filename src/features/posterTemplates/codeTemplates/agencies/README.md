# Agency Private Code Templates

This folder contains paid Signature Poster Templates assigned to specific agencies.

The first private template is `tiznitVoyages`, registered as `tiznit_voyages_signature`. It is not visible unless the current agency has an enabled row in `public.agency_code_poster_templates`.

Future rules:

- Do not hardcode agency checks in Program Actions.
- Do not expose templates through UI unless the current agency has an assignment row.
- Keep each template module small and use shared helpers.
- Keep assets optimized and isolated.
- Do not query Supabase from template modules.
