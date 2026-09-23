# Saathi implementation handoff

## Implemented

- Figma-aligned Saathi foundations: color tokens, typography, spacing, radii, focus treatment, light-first theme, deep-green navigation, and responsive shell.
- Today workspace backed by account-scoped conversations, follow-ups, members, and won deals, including loading, empty, offline, and migration-error states.
- Internal follow-ups with a dedicated list, create dialog from Inbox/customer context, owner assignment, due date/time, completion/reopen, and clear separation from WhatsApp customer messages.
- English/Hindi switching stored in both the staff profile and a locale cookie. Existing Korean, Portuguese, and Spanish catalogues remain supported and have parity for the new surfaces.
- Account-scoped Postgres schema, indexes, validation trigger, and row-level security in migration `043_saathi_followups_and_locale.sql`.
- Development-only visual fixture at `/dev/saathi-preview`. It is labeled, contains no real customer data, cannot send messages, and resolves to 404 in production.

Existing WACRM Inbox, Customers, pipelines, broadcasts, automations, settings, authentication, WhatsApp integration, and account roles remain intact beneath the Saathi shell. Their underlying workflows were reused rather than replaced with mock behavior.

## Screen status

| Figma area                            | Status                         | Notes                                                                                                                                               |
| ------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundations and application shell     | Implemented                    | Tokens, typography, navigation, responsive header/sidebar, and language control.                                                                    |
| Today — desktop/mobile and states     | Implemented                    | Uses live WACRM data; loading, empty, error, and offline states included.                                                                           |
| Inbox — desktop/mobile                | Implemented through adaptation | Existing realtime inbox, reply composer, eligibility checks, and contact panel retained; Saathi follow-up entry added on desktop and mobile.        |
| Customers                             | Implemented through adaptation | Existing account-scoped customer CRUD/import remains functional under Saathi navigation and styling.                                                |
| Follow-ups list and create modal      | Implemented                    | Persistent internal reminders, assignment, timezone-aware grouping, completion/reopen, and RLS.                                                     |
| Settings                              | Partially implemented          | Existing WACRM settings remain functional; staff language preference and Saathi appearance are wired. Figma-specific restructuring is not complete. |
| Campaign review/results               | Partially implemented          | Existing broadcasts workflow is retained; Figma-specific review/results composition is not rebuilt pixel-for-pixel.                                 |
| Automations and automation detail     | Partially implemented          | Existing builder, logs, permissions, and engine remain; Saathi shell/tokens apply, but the Figma layout is not fully reconstructed.                 |
| Onboarding                            | Partially implemented          | Existing authentication and WhatsApp setup paths remain; the supplied multi-step onboarding frames are not implemented as a new wizard.             |
| Payment concept / appointment concept | Not implemented                | Concept frames require product and provider decisions beyond the verified WACRM feature set.                                                        |

## Not included

- No deployment or hosting changes were made.
- No real Supabase, Meta, WhatsApp, AI-provider, or deployment credentials were added.
- The persistence path and row-level policies are implemented and build-tested, but live reload, role, WhatsApp reply, and realtime verification remain blocked until valid Supabase/Meta staging credentials are supplied.
- The Figma presentation boards and alternate concept frames are reference material; not every board is a separate route. Existing WACRM campaign, automation, and settings screens inherit the Saathi foundation, but their internal layouts were not rebuilt pixel-for-pixel where the repository already had a working equivalent.
- Customer-message scheduling is intentionally separate from internal follow-ups and continues to use the existing reviewed WhatsApp sending paths.

## Local startup

1. Copy `.env.local.example` to `.env.local` and fill the required values.
2. Apply all Supabase migrations through `043_saathi_followups_and_locale.sql` using your normal Supabase workflow.
3. Run `npm ci`.
4. Run `npm run dev` and open `http://localhost:3000`.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` (64 hexadecimal characters)
- `META_APP_SECRET`

Recommended: `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_LOCALE=en`. Never expose the service-role key, encryption key, or Meta app secret in browser code.

## Verification

- `npm test` — 87 files, 1,017 tests passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed with the repository's pre-existing warning backlog and no errors.
- `npm run build` — passed with placeholder build-time environment variables.

Responsive screenshots are in `artifacts/saathi-today-desktop.jpg` and `artifacts/saathi-today-mobile.jpg`.

## Git remote handoff

The working branch is `codex/saathi-figma`, created from WACRM commit `aee1b01f4b557870f1bbf9e7f566a2759e8f20f3`. The current `origin` still points to the upstream WACRM repository. To connect your own repository without losing that reference:

```bash
git remote rename origin upstream
git remote add origin <your-repository-url>
git push -u origin codex/saathi-figma
```

Only run the push after replacing the placeholder with the repository you control.
