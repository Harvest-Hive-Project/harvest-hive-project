# Harvest Hive Project

The HIVE partner waitlist landing page, imported from the provided Claude HTML. No build step or package installation is required.

## Files

- `index.html`: page, responsive styles, embedded illustrations, and waitlist link.
- `.nojekyll`: serves the files directly on GitHub Pages.

## Waitlist

Every waitlist button opens the custom HTTPS form at https://harvest-hive.bryce19461.chatgpt.site/join. Submissions and optional profiles are stored in shared Cloudflare D1 storage. The form no longer posts to Google Forms. The `ref` query parameter is forwarded for acquisition attribution.

Private analytics: https://harvest-hive.bryce19461.chatgpt.site/admin. GitHub sign-in is active and access is restricted server-side to the verified identities for bryceharvestins, AI4lifegpt3 and mmerriam12. Select Sign in with GitHub, enter the displayed one-time code on GitHub, authorize Harvest Hive Analytics, then return to the dashboard. GitHub handles passwords and two-factor authentication.

The organization-owned OAuth app is https://github.com/organizations/Harvest-Hive-Project/settings/applications/3926904. Its public client ID is deployed through Sites runtime settings. No client secret is needed for the configured flow. Bryce’s actual GitHub sign-in and the shared dashboard were verified after deployment; the service tests cover all three allowed account IDs.

`live/` holds the deployed application source, schema migrations, checks and setup instructions. GitHub Pages hosts the marketing page; the live form and private database need the separate server deployment. No contact records, runtime secrets or credentials are committed here.

## Publish on GitHub Pages

Push these files to the root of the intended repository. In Settings > Pages, choose Deploy from a branch, select `main`, and select `/ (root)`.

Use a GitHub organization-owned repository if multiple people need the repository Admin role. Assign the requested accounts under Settings > Collaborators and teams. Invitations must be accepted before access becomes active.

## Editing

Edit `index.html` and push to `main` to update the site. Google Fonts loads the two typefaces from Google's font service; system fonts are available as fallbacks. All other visual assets are embedded.

## Custom signup and analytics preview

Open `/preview/` for the custom signup experience, or `/preview/?view=overview` for the team workspace. The preview includes signup validation, an optional profile, acquisition-link attribution, dashboard filters, partner follow-up editing, CSV export and CSV import with duplicate handling.

All sample people and companies are fictional. Preview changes and imported CSV rows are saved only in the current browser's local storage. This remains a public demonstration with no authentication or actual waitlist registration. Use test data. The production form and workspace are linked above and use shared storage.

CSV import supports the original Google Form's question headings and HIVE export headers, including research answers about volume, rewards, office approval, referral habits and barriers. Invalid rows are reported and skipped, and duplicate emails are skipped. Imports do not include historical form-start events and are excluded from the signup funnel. Google Form device preferences are not migrated because the custom form removes that question. Import creates new pipeline records; it does not restore exported follow-up owners, statuses or notes.

Run preview checks with `node --test tests/model.test.mjs`, or production service checks with `node --test live/tests/service.test.mjs`. The production service includes server-side validation, origin checks, rate limiting, duplicate protection, one-use profile capabilities and restricted GitHub sign-in. GitHub repository roles do not automatically grant dashboard access.
