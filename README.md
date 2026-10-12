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
