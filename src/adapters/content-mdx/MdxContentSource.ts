import { getCollection } from "astro:content";
import type {
  ContentSource,
  ProjectListFilters,
  PostListFilters,
  TagCounts,
} from "../../domain/ports/ContentSource";
import type {
  ProjectSummary,
  ProjectDetail,
} from "../../domain/models/view/ProjectView";
import type {
  PostSummary,
  PostDetail,
} from "../../domain/models/view/PostView";
import { canonicalizeTagArray, canonicalizeTag, tagLabel } from "../../domain/rules/tags";

/** Strip file extension from Astro v5 entry ID to get a clean slug. */
function toSlug(id: string): string {
  return id.replace(/\.[^.]+$/, "");
}

/** Ensure a file path starts with `/` (CMS may omit the leading slash). Absolute URLs are returned as-is. */
function normalizeSrc(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return src.startsWith("/") ? src : `/${src}`;
}

const monthYear = (d: Date) =>
  d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** "May 2024 – Present", "Oct 2025 – Jan 2026", or "Mar 2026" for single-month projects. */
function formatTimeframe(start?: Date, end?: Date, status?: string): string | undefined {
  if (!start) return end ? monthYear(end) : undefined;
  const from = monthYear(start);
  if (!end) return status === "ongoing" ? `${from} – Present` : from;
  const to = monthYear(end);
  return from === to ? from : `${from} – ${to}`;
}

export class MdxContentSource implements ContentSource {
  // ── Projects ────────────────────────────────────────

  async listProjects(filters?: ProjectListFilters): Promise<ProjectSummary[]> {
    const entries = await getCollection("projects");

    let summaries: ProjectSummary[] = entries.map((e) => {
      const firstImage = e.data.media.find(
        (m) => m.type === "image" || m.type === "gif",
      );
      return {
        title: e.data.title,
        slug: toSlug(e.id),
        summary: e.data.summary,
        status: e.data.status,
        featured: e.data.featured,
        tags: canonicalizeTagArray(e.data.tags ?? []),
        primaryImage: firstImage
          ? { src: normalizeSrc(firstImage.src), alt: firstImage.alt }
          : undefined,
        dateStart: e.data.dateStart,
        dateEnd: e.data.dateEnd,
      };
    });

    // Apply filters
    if (filters?.featuredOnly) {
      summaries = summaries.filter((p) => p.featured);
    }
    if (filters?.status) {
      summaries = summaries.filter((p) => p.status === filters.status);
    }
    if (filters?.tag) {
      summaries = summaries.filter((p) => p.tags.includes(filters.tag!));
    }

    // Sort: featured first, ongoing before completed, newest dateStart first
    summaries.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.status !== b.status) return a.status === "ongoing" ? -1 : 1;
      const da = a.dateStart ? a.dateStart.getTime() : 0;
      const db = b.dateStart ? b.dateStart.getTime() : 0;
      return db - da;
    });

    // Pagination
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit;
    if (limit != null) {
      summaries = summaries.slice(offset, offset + limit);
    } else if (offset > 0) {
      summaries = summaries.slice(offset);
    }

    return summaries;
  }

  async getProjectBySlug(slug: string): Promise<ProjectDetail | null> {
    const entries = await getCollection("projects");
    const entry = entries.find((e) => toSlug(e.id) === slug);
    if (!entry) return null;

    const rendered = await entry.render();
    const firstImage = entry.data.media.find(
      (m) => m.type === "image" || m.type === "gif",
    );

    return {
      title: entry.data.title,
      slug: toSlug(entry.id),
      summary: entry.data.summary,
      status: entry.data.status,
      featured: entry.data.featured,
      tags: canonicalizeTagArray(entry.data.tags ?? []),
      primaryImage: firstImage
        ? { src: normalizeSrc(firstImage.src), alt: firstImage.alt }
        : undefined,
      dateStart: entry.data.dateStart,
      dateEnd: entry.data.dateEnd,
      links: entry.data.links ?? [],
      media: (entry.data.media ?? []).map((m) => ({
        ...m,
        src: normalizeSrc(m.src),
      })),
      content: {
        Content: rendered.Content,
        headings: rendered.headings,
      },
      role: entry.data.role,
      timeframe: formatTimeframe(entry.data.dateStart, entry.data.dateEnd, entry.data.status),
      stack: entry.data.stack,
      githubRepo: entry.data.githubRepo,
      itchEmbedUrl: entry.data.itchEmbedUrl,
      shaderToyId: entry.data.shaderToyId,
    };
  }

  // ── Posts ────────────────────────────────────────────

  async listPosts(filters?: PostListFilters): Promise<PostSummary[]> {
    const entries = await getCollection("posts");

    let summaries: PostSummary[] = entries.map((e) => ({
      title: e.data.title,
      slug: toSlug(e.id),
      excerpt: e.data.excerpt,
      tags: canonicalizeTagArray(e.data.tags ?? []),
      publishedAt: e.data.publishedAt,
      coverImage: e.data.coverImage ? normalizeSrc(e.data.coverImage) : undefined,
    }));

    // Filter by tag
    if (filters?.tag) {
      summaries = summaries.filter((p) => p.tags.includes(filters.tag!));
    }

    // Sort newest first (posts without a date go last)
    summaries.sort((a, b) => {
      const ta = a.publishedAt ? a.publishedAt.getTime() : 0;
      const tb = b.publishedAt ? b.publishedAt.getTime() : 0;
      return tb - ta;
    });

    // Pagination
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit;
    if (limit != null) {
      summaries = summaries.slice(offset, offset + limit);
    } else if (offset > 0) {
      summaries = summaries.slice(offset);
    }

    return summaries;
  }

  async getPostBySlug(slug: string): Promise<PostDetail | null> {
    const entries = await getCollection("posts");
    const entry = entries.find((e) => toSlug(e.id) === slug);
    if (!entry) return null;

    const rendered = await entry.render();

    return {
      title: entry.data.title,
      slug: toSlug(entry.id),
      excerpt: entry.data.excerpt,
      tags: canonicalizeTagArray(entry.data.tags ?? []),
      publishedAt: entry.data.publishedAt,
      coverImage: entry.data.coverImage ? normalizeSrc(entry.data.coverImage) : undefined,
      content: {
        Content: rendered.Content,
        headings: rendered.headings,
      },
    };
  }

  // ── Tags ────────────────────────────────────────────

  async listTags(): Promise<TagCounts[]> {
    const [projects, posts] = await Promise.all([
      getCollection("projects"),
      getCollection("posts"),
    ]);

    const map = new Map<
      string,
      { countProjects: number; countPosts: number }
    >();

    for (const p of projects) {
      for (const rawTag of p.data.tags) {
        const slug = canonicalizeTag(rawTag);
        if (!slug) continue;
        const existing = map.get(slug) ?? { countProjects: 0, countPosts: 0 };
        existing.countProjects++;
        map.set(slug, existing);
      }
    }

    for (const p of posts) {
      for (const rawTag of p.data.tags) {
        const slug = canonicalizeTag(rawTag);
        if (!slug) continue;
        const existing = map.get(slug) ?? { countProjects: 0, countPosts: 0 };
        existing.countPosts++;
        map.set(slug, existing);
      }
    }

    const tags: TagCounts[] = [...map.entries()].map(([slug, counts]) => ({
      slug,
      label: tagLabel(slug),
      countProjects: counts.countProjects,
      countPosts: counts.countPosts,
      countTotal: counts.countProjects + counts.countPosts,
    }));

    // Sort by total count desc, then alphabetically
    tags.sort((a, b) => b.countTotal - a.countTotal || a.slug.localeCompare(b.slug));

    return tags;
  }
}
