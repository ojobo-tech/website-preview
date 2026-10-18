# Edit your website with GitHub

You only need your existing `ojobo-tech` GitHub account. The [website preview](https://ojobo-tech.github.io/website-preview/) is separate from `ojoboagboeje.com` until the domain is switched.

## Change words on an existing page

1. Open the [page-content folder](https://github.com/ojobo-tech/website-preview/tree/main/content/pages) and choose the page, such as `home.json` for the homepage or `about.json` for About.
2. Click the pencil icon (**Edit this file**).
3. Find the current wording you want to replace. Change only the words inside its quotation marks; keep the field names, commas, and quotation marks in place.
4. Click **Commit changes** and save to `main`. GitHub then rebuilds the preview automatically.

The same files hold each page's image choices (`image_001`, etc.), image descriptions (`_alt`), and search title/description. The current values help you identify the right field. For a larger rewrite, describe the change to Codex in ordinary language and let it edit and test the files.

## Change an image

1. In the repository, open [assets](https://github.com/ojobo-tech/website-preview/tree/main/assets) and use **Add file → Upload files** for the new image. Commit the upload.
2. In the relevant `content/pages/*.json` file, replace that image field's path with `assets/your-image-name.jpg` (or `.png`/`.webp`). Update its `_alt` description as well. Commit that edit.

You can reuse an existing image path without uploading anything. Use a web-sized image, and only upload images you have permission to publish. For a new article or project, its cover image field is in the content catalog below.

The personal photos currently appear here:

| Location | File to edit | Field |
| --- | --- | --- |
| Homepage About section | `content/pages/home.json` | `image_009` and `image_009_alt` |
| About page banner | `content/pages/about.json` | `heroImage` |
| Biography page | `content/pages/biography.json` | `image_001` and `image_001_alt` |
| Speaking page theme card | `content/pages/speaking.json` | `image_002` and `image_002_alt` |

The small author portrait at the end of articles is shared by the article template. Ask Codex to change that image across articles; it is not yet a page-content field.

## Publish writing, work, events, and reading notes

Open [content/site-content.json](https://github.com/ojobo-tech/website-preview/blob/main/content/site-content.json). It contains `essays`, `projects`, `research`, `events`, and `reading`. Each entry has a `status`: `draft` keeps it off the website; `published` shows it. New articles can have their own page and an optional audio recording. New project and research entries can have detail pages. If adding a whole new entry, ask Codex to prepare and check it—the structure matters more than an ordinary text replacement.

For reading-room entries, edit the `title`, `author`, and `category` (for example, `Currently reading` or `Recently read`). An optional `summary` is your own reflection; leave it blank until you have one. Put the current book first and give it `"featured": true`. Do not add an invented personal takeaway.

For events, `date` and optional `endDate` use `YYYY-MM-DD`. Set `role` to `Speaker` or `Attending` so the site distinguishes a talk from an event visit. Add the public event `url` and an image path when available; leave them blank if you do not have them. Past events move to the archive automatically after their final day. The homepage carousel shows upcoming events in date order.

### Articles

Each published entry in `essays` uses the same image-led article template. Edit `title`, `category`, `summary` (the short line on the cover), `lead` (the **In brief** introduction), `image` and `imageAlt`, and `body`. Write the body with `## Section heading` lines; these automatically become links in the article contents. Paragraphs, `-` bullet points, links, and simple emphasis are supported.

Optional article fields are `publishedAt` (`YYYY-MM-DD`), `readMinutes` (a number or short text), `location`, `tags` (a list of short labels), and `audio` (an uploaded MP3 path such as `assets/my-article.mp3`). Add `questions` as a list of `{ "question": "...", "answer": "..." }` pairs if the article needs a closing question-and-answer section. Leave any unknown date, location, or recording out; the page will hide that part instead of showing a placeholder. The related-article section fills itself from your other published essays.

For an essay that first appeared on Substack, `sourceUrl` links to the original edition and keeps that edition as the search-engine canonical version. This avoids asking search engines to choose between duplicate copies. If you later decide this website should be the primary home for an essay, have Codex review and change its canonical setting deliberately.

For a new essay, ask Codex to add the entry and check its links. New published essays receive their own page automatically. A draft entry is hidden from the website but, because this repository is public, its text is still visible on GitHub.

The shared header name and footer wording are in [content/site-settings.json](https://github.com/ojobo-tech/website-preview/blob/main/content/site-settings.json). Layout and navigation destinations still need a site-code change.

## Using VS Code or Codex

You can work on the same repository on your computer. Open the local `.website-preview` checkout, make changes, then **commit and push** to `main`; saving locally alone does not publish. Codex can make the edits and run the checks for you from a plain-language request.

The repository is public. Draft text saved in it is visible on GitHub even when it is hidden from the website, so do not put confidential drafts, passwords, or private client material there. The build publishes only the website files, not this editing guide or the source JSON. While this remains a preview, the site also asks search engines not to index it.
