# Moutaz Portfolio

Personal portfolio and blog. Astro 5, TypeScript, Tailwind CSS v4, MDX, deployed on Vercel.

Live site: https://moutaz.vercel.app/

## Local development

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Start local dev server |
| `npm run build` | Build production output (validates all content) |
| `npm run preview` | Preview the production build |
| `npm run check` | Import-discipline checks |

## Adding a project

Copy a template from `docs/templates/` into `src/content/projects/<slug>.mdx`, drop media into
`public/projects/<slug>/`, and build. Only `title` is required. See `CLAUDE.md` for the details.
