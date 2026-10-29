import type { ProjectStatus } from "../models/Project";
import type { ProjectSummary, ProjectDetail } from "../models/view/ProjectView";
import type { PostSummary, PostDetail } from "../models/view/PostView";

export type ProjectListFilters = {
  tag?: string;
  status?: ProjectStatus;
  featuredOnly?: boolean;
  limit?: number;
  offset?: number;
};

export type PostListFilters = {
  tag?: string;
  limit?: number;
  offset?: number;
};

export type TagCounts = {
  slug: string;
  label: string;
  countProjects: number;
  countPosts: number;
  countTotal: number;
};

export interface ContentSource {
  listProjects(filters?: ProjectListFilters): Promise<ProjectSummary[]>;
  getProjectBySlug(slug: string): Promise<ProjectDetail | null>;
  listPosts(filters?: PostListFilters): Promise<PostSummary[]>;
  getPostBySlug(slug: string): Promise<PostDetail | null>;
  listTags(): Promise<TagCounts[]>;
}
