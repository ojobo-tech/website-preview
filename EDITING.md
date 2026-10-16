# Editing the website

The public preview is [ojobo-tech.github.io/website-preview](https://ojobo-tech.github.io/website-preview/). It is separate from ojoboagboeje.com.

## When the editor is connected

Open `/admin/` on the chosen website and sign in. Choose **Pages & sections** to edit a main page's headings, text, images, image descriptions, and search title/description. Choose **Site-wide details** for the header name and footer. Choose **Website content** for articles, projects, research, speaking events, and reading-room entries. Save the entry; the repository change starts an automatic GitHub Pages build. The preview normally updates after the build finishes.

Images can be selected from the media library or uploaded. Add a short image description for people using screen readers. For a new article, upload audio in the optional audio field to add a player beside the written version.

The editor is not yet connected: `admin/config.yml` still contains a placeholder Decap Turbo site ID. It will not accept sign-in or publish until that account and the GitHub repository are connected. Do not enter passwords or tokens into this repository.

## Content boundaries

Page content and images are editable, but layout, navigation destinations, and some paragraphs containing links are still code changes. The project and article lists come from their collections, not from separately editing the homepage. Only published collection entries appear on the website. Draft entries do not appear on the deployed site, but this repository is public, so their source text is still visible on GitHub. Do not put confidential drafts in it.

## Local maintenance

The main-page data is in `content/pages/`, site-wide text is in `content/site-settings.json`, and the collections are in `content/site-content.json`. Run `node scripts/build-content.mjs` and `node --test --test-isolation=none tests/site.test.mjs` to build and check a local copy. The GitHub workflow sets `SITE_PREVIEW=true` so the preview discourages search indexing and does not publish a sitemap for ojoboagboeje.com.
