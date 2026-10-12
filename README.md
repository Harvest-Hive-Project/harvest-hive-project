# Harvest Hive Project

The HIVE partner waitlist landing page, imported from the provided Claude HTML. No build step or package installation is required.

## Files

- `index.html`: page, responsive styles, embedded illustrations, and waitlist link.
- `.nojekyll`: serves the files directly on GitHub Pages.

## Waitlist

The `FORM_URL` constant near the bottom of `index.html` points to the existing Google Form. Every waitlist button opens that form in a new tab. Responses are collected by the Google Form; this repository does not store submissions.

## Publish on GitHub Pages

Push these files to the root of the intended repository. In Settings > Pages, choose Deploy from a branch, select `main`, and select `/ (root)`.

Use a GitHub organization-owned repository if multiple people need the repository Admin role. Assign the requested accounts under Settings > Collaborators and teams. Invitations must be accepted before access becomes active.

## Editing

Edit `index.html` and push to `main` to update the site. Google Fonts loads the two typefaces from Google's font service; system fonts are available as fallbacks. All other visual assets are embedded.

## Custom signup and analytics preview

Open `/preview/` for the custom signup experience, or `/preview/?view=overview` for the team workspace. The preview includes signup validation, an optional profile, acquisition-link attribution, dashboard filters, partner follow-up editing, CSV export and CSV import with duplicate handling.

All sample people and companies are fictional. Preview changes and imported CSV rows are saved only in the current browser's local storage. This is a public demonstration with no authentication, shared server database, emails or actual waitlist registration. Use test data. The live landing page continues to use the existing Google Form.

CSV import supports the original Google Form's question headings and HIVE export headers, including research answers about volume, rewards, office approval, referral habits and barriers. Invalid rows are reported and skipped, and duplicate emails are skipped. Imports do not include historical form-start events and are excluded from the signup funnel. Google Form device preferences are not migrated because the custom form removes that question. Import creates new pipeline records; it does not restore exported follow-up owners, statuses or notes.

Run the data-model checks with `node --test tests/model.test.mjs`. Production integration should add server-side validation, persistent private storage, spam protection, and verified Microsoft sign-in with explicit access for Bryce, Will and Matthew before real responses are collected or displayed. GitHub repository roles do not grant dashboard access.
