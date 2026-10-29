import { defineCollection, z } from "astro:content";

const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

const mediaSchema = z.object({
  type: z.enum(["image", "gif", "video"]).default("image"),
  src: z.string().min(1),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

/** Treat "" (left blank in frontmatter) as "not set". */
const blankToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

/**
 * Projects. Only `title` is required; everything else is optional.
 * Write the case study itself as Markdown in the body, not in frontmatter.
 * See docs/templates/ for copy-paste starters.
 */
const projects = defineCollection({
  type: "content",
  schema: z
    .object({
      title: z.string().min(1),
      summary: z.string().default(""),
      tags: z.array(z.string().min(1)).default([]),
      status: z.enum(["ongoing", "completed", "coming-soon"]).default("completed"),
      featured: z.boolean().default(false),

      dateStart: z.coerce.date().optional(),
      dateEnd: z.coerce.date().optional(),

      role: z.preprocess(blankToUndefined, z.string().optional()),
      stack: z.array(z.string()).default([]),

      links: z.array(linkSchema).default([]),
      media: z.array(mediaSchema).default([]),

      /** iframe src from itch.io (Edit game → Distribute → Embed game), e.g. https://itch.io/embed/12345 */
      itchEmbedUrl: z.preprocess(blankToUndefined, z.string().url().optional()),
      /** ShaderToy shader ID, e.g. "XsXXDn" from shadertoy.com/view/XsXXDn */
      shaderToyId: z.preprocess(blankToUndefined, z.string().min(1).optional()),
      /** "owner/repo" — renders a "View on GitHub" link */
      githubRepo: z.preprocess(blankToUndefined, z.string().optional()),
    })
    .refine(
      (d) => !(d.dateStart && d.dateEnd) || d.dateEnd >= d.dateStart,
      { message: "dateEnd must be >= dateStart", path: ["dateEnd"] },
    ),
});


const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().min(1),
    excerpt: z.string().default(""),
    tags: z.array(z.string().min(1)).default([]),
    publishedAt: z.coerce.date().optional(),
    slug: z.string().min(1).optional(),
    coverImage: z.string().min(1).optional(),
    status: z.enum(["coming-soon"]).optional(),
  }),
});

export const collections = { projects, posts };
