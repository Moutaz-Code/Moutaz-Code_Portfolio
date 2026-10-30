# Moutaz portfolio

Personal portfolio and blog for a game developer / technical artist (Unity, URP, HLSL/GLSL).
Static Astro 5 site, deployed to Vercel from `main` (https://moutaz.vercel.app). No CMS, no database:
content is MDX files in the repo.

## Commands

| Command | What it does |
| :-- | :-- |
| `npm run dev` | Dev server on http://localhost:4321 |
| `npm run build` | Production build into `dist/` (also builds the Pagefind search index) |
| `npm run check` | Import-discipline lint (`scripts/`) |

Always run `npm run build` before committing. It validates every content file against the schema.

## Adding content (the most common task)

**A jam game or small project:** copy `docs/templates/jam-game.mdx` to `src/content/projects/<slug>.mdx`.
**A bigger piece worth a write-up:** copy `docs/templates/case-study.mdx`.

- The filename is the URL: `src/content/projects/frost-shader.mdx` → `/projects/frost-shader`. Use kebab-case.
- Only `title` is required. Don't add fields that aren't in `src/content/config.ts`. Unknown keys are silently dropped.
- Write the story as Markdown in the body (`## The problem`, `## Approach`…), not as frontmatter lists.
- `timeframe` is derived from `dateStart`/`dateEnd`. No end date and `status: ongoing` gives "… – Present".
- Images and videos go in `public/projects/<slug>/` and are referenced as `/projects/<slug>/file.webp`.
  Prefer `.webp` for stills (≤ ~300 KB, ~1600 px wide) and short muted `.mp4` (H.264) or `.webm` loops for motion.
  The first image in `media` is the card thumbnail. Use `type: video` for clips. They autoplay muted and loop.
- Tags are free text. `src/app/tagsRegistry.ts` maps aliases ("C#", "csharp") to one slug and gives nice labels.
  Add a registry entry only if a tag displays badly. Unknown tags still work.
- `featured: true` puts a project on the home page.
- Blog posts live in `src/content/posts/` (title, excerpt, tags, publishedAt, coverImage).

When asked to add a project from a description, links and screenshots: create the MDX file, copy the media into
`public/projects/<slug>/`, keep the author's voice in the body (don't pad it into marketing copy), build, and
show the result before committing.

## Layout

```
src/
  content/          MDX content + config.ts (zod schemas)
  pages/            routes (projects/[slug], blog/[slug], tags/[tag], search, rss.xml…)
  app/              site/profile config, content + media entry points, tag registry, theme prefs
  adapters/         MdxContentSource (the only place, besides config.ts, that imports astro:content)
  domain/           view-model types, tag/slug/url helpers
  ui/
    layouts/BaseLayout.astro   page shell; motion features are opt-in per page via props
    components/                primitives/, content/, home/, projects/, integrations/ (itch, ShaderToy)
    motion/, anime/, scroll/   client-side effects (constellation, magnetic, anime.js, Lenis)
  styles/           Tailwind v4 + theme tokens (CSS custom properties, light/dark)
public/             static files served as-is
docs/templates/     copy-paste starters for new content
```

Site-wide text (name, tagline, skills, socials, nav) lives in `src/app/siteConfig.ts` and `src/app/profileConfig.ts`.

## Conventions

- `astro:content` is imported only in `src/content/config.ts` and `src/adapters/content-mdx/MdxContentSource.ts`
  (enforced by `npm run check:coupling`). Pages get data through `contentSource` from `src/app/content.ts`.
- Heavy client libraries stay in their folders (enforced by `npm run check:perf`; see `docs/perf.md`).
  Every animation must respect `prefers-reduced-motion` via `src/ui/runtime/prefs.ts`.
- Styling is Tailwind utility classes with theme tokens, e.g. `text-(--color-text-muted)`. Don't hard-code colours.
- Don't add dependencies, CMS layers or abstractions without asking. This site was deliberately pruned.
- Images are not run through `astro:assets` yet. Keep files reasonably sized by hand.
