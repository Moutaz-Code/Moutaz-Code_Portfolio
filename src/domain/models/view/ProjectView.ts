import type { ProjectStatus } from "../Project";
import type { Link } from "../Link";
import type { Media } from "../Media";
import type { RenderedContent } from "./RenderedContent";

export type ProjectSummary = {
  title: string;
  slug: string;
  summary: string;
  status: ProjectStatus;
  featured: boolean;
  tags: string[];
  primaryImage?: { src: string; alt?: string };
  dateStart?: Date;
  dateEnd?: Date;
  category: "Games" | "Graphics" | "Software";
  kind?: string;
  award?: string;
  accent?: string;
  team?: string;
  role?: string;
  highlights: string[];
  order: number;
  /** Human-readable range derived from dateStart/dateEnd, e.g. "May 2024 – Present". */
  timeframe?: string;
  stack: string[];
  links: Link[];
};

export type ProjectDetail = ProjectSummary & {
  media: Media[];
  content: RenderedContent;
  githubRepo?: string;
  itchEmbedUrl?: string;
  shaderToyId?: string;
};
