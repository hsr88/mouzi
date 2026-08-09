# mouzi.cc

Marketing and documentation website for [Mouzi](https://github.com/hsr88/mouzi), built with Astro, TypeScript and Tailwind CSS. Fully static output, deployed to Vercel.

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static build into dist/ + Pagefind search index
npm run preview    # serve the production build locally
```

Note: docs/blog search (Pagefind) only works in `preview`/production, because the index is generated after the build. In `dev` the search box hides itself.

Optionally set a `GITHUB_TOKEN` environment variable during builds to raise the GitHub API rate limit for the star/fork counts. The token is only used server-side at build time.

## Where things live

| What | Where |
| --- | --- |
| Central config (version, downloads, checksums, sponsor, tiers, links) | `src/config/site.ts` |
| Roadmap items | `src/config/roadmap.ts` |
| Documentation pages (MDX) | `src/content/docs/` |
| Blog posts (MDX) | `src/content/blog/` |
| Changelog entries (MDX) | `src/content/changelog/` |
| Layouts | `src/layouts/` |
| Reusable components | `src/components/` |
| Routes | `src/pages/` |
| Hero video + poster | `public/videos/` |
| Screenshots and logos | `public/screenshots/`, `public/images/` |

## Common edits

**New release:** update `version`, `releaseDate` and the `downloads` arrays in `src/config/site.ts`, then add a changelog entry in `src/content/changelog/`.

**Code signing goes live:** flip `signingStatus` from `'pending'` to `'approved'` in `src/config/site.ts`. All copy updates automatically.

**Activate a sponsor:** set `activeSponsor` in `src/config/site.ts` to `{ name, url, logo }`. The header placement and homepage slot pick it up.

**Replace the hero video:** overwrite `public/videos/mouzi-hero.webm`, `mouzi-hero.mp4` and `mouzi-hero-poster.webp`. The `HeroBackgroundVideo` component needs no changes.

**New blog post:** add an `.mdx` file to `src/content/blog/` with `title`, `description`, `pubDate` frontmatter (see existing posts for the full schema). Set `draft: true` to keep it unpublished.

**New docs page:** add an `.mdx` file to `src/content/docs/` with `title`, `description`, `section` (one of: Start here, Rules, Platforms, Reference) and `order`. The sidebar, search, prev/next links and sitemap update automatically.

## Content style

Copy is written for humans: short sentences, concrete claims, no marketing superlatives, no invented numbers. Metrics either come from the GitHub API at build time or from `src/config/site.ts`; unavailable values render as an em-free dash.
