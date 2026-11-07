# Moutaz portfolio

Portfolio for a technical artist / graphics programmer (Unity, URP, HLSL/GLSL). Game work leads; graphics and software projects follow.
Static Astro 5 site, deployed to Vercel from `main` (https://moutaz.vercel.app). No CMS, no database:
content is MDX files in the repo.

## Commands

| Command | What it does |
| :-- | :-- |
| `npm run dev` | Dev server on http://localhost:4321 |
| `npm run build` | Production build into `dist/` |
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
- Every non-draft project appears in the home-page deck and on `/projects`, sorted by `order` then newest `dateStart`.
  `category`, `kind`, `award`, `accent` (card frame hex), `team` and `highlights` (3–5 short lines) drive the card and its panel.
  Keep `summary` under ~150 characters so it fits on the card. Quote it if it contains a colon.
- `src/content/posts/` exists but has no routes yet (blog is parked).

When asked to add a project from a description, links and screenshots: create the MDX file, copy the media into
`public/projects/<slug>/`, keep the author's voice in the body (don't pad it into marketing copy), build, and
show the result before committing.

## Layout

```
src/
  content/          MDX content + config.ts (zod schemas)
  pages/            index (intro, deck, shaders, about, contact), projects/index, projects/[slug], 404
  app/              site/profile config, content + media entry points, tag registry
  adapters/         MdxContentSource (the only place, besides config.ts, that imports astro:content)
  domain/           view-model types, tag/slug/url helpers
  ui/
    layouts/BaseLayout.astro   page shell: header, theme toggle (fires a window "themechange" event), footer
    components/                content/ (gallery, prose), home/ShaderRow, integrations/ (itch, ShaderToy)
    three/                     three.js: deck.ts, cardFace.ts (Canvas2D card faces), shaders.ts (live windows), common.ts
  styles/global.css  tokens (dark default, light override), layout primitives, prose styles
public/             static files served as-is
vercel.json         redirects for the old routes (/about, /contact, /tags…)
docs/templates/     copy-paste starters for new content
```

Site-wide text (name, tagline, skills, socials, nav) lives in `src/app/siteConfig.ts` and `src/app/profileConfig.ts`.

## Conventions

- `astro:content` is imported only in `src/content/config.ts` and `src/adapters/content-mdx/MdxContentSource.ts`
  (enforced by `npm run check:coupling`). Pages get data through `contentSource` from `src/app/content.ts`.
- `three` is imported only under `src/ui/three/` (enforced by `npm run check:perf`). Pages load those modules with a
  dynamic `import()` when the element comes near the viewport, so three.js never blocks first paint.
- Every view registers with the shared loop in `three/common.ts` (`watch`) and only renders while on screen.
  Nothing animates by itself under `prefers-reduced-motion`.
- Styling is scoped `<style>` blocks using the tokens in `global.css` (`--text`, `--muted`, `--line`, `--accent`…). Don't hard-code colours.
- Keep project copy factual: what was built and who built it. Credit third-party assets and effects.
- Don't add dependencies, CMS layers or abstractions without asking. This site was deliberately pruned.
- Images are not run through `astro:assets` yet. Keep files reasonably sized by hand.
