import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { blogComments, blogPosts } from "@/db/schema";
import {
  safeJson,
  type BlogBlock,
  type BlogCard,
  type BlogComment,
  type BlogPostDetail,
  type BlogSidebarData,
} from "@/lib/blog";

type Row = typeof blogPosts.$inferSelect;

function card(row: Row): BlogCard {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    author: row.author,
    readMinutes: row.readMinutes,
    coverImage: row.coverImage,
    publishedAt: row.publishedAt.toISOString(),
  };
}

const published = eq(blogPosts.status, "published");
const newestFirst = [desc(blogPosts.publishedAt), asc(blogPosts.id)];

export type BlogFilter = { category?: string; tag?: string; q?: string };

function filterClause(filter: BlogFilter) {
  const parts = [published];
  if (filter.category) parts.push(sql`lower(${blogPosts.category}) = lower(${filter.category})`);
  if (filter.tag) parts.push(like(blogPosts.tags, `%"${filter.tag.replace(/["%_\\]/g, "")}"%`));
  const q = filter.q?.trim().replace(/[%_\\]/g, "");
  if (q) {
    parts.push(
      or(
        like(blogPosts.title, `%${q}%`),
        like(blogPosts.excerpt, `%${q}%`),
        like(blogPosts.category, `%${q}%`),
      )!,
    );
  }
  return and(...parts);
}

export function listPosts(
  db: Db,
  filter: BlogFilter,
  page: number,
  pageSize: number,
): { posts: BlogCard[]; total: number; pages: number; page: number } {
  const where = filterClause(filter);
  const total =
    db
      .select({ n: sql<number>`count(*)` })
      .from(blogPosts)
      .where(where)
      .get()?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const rows = db
    .select()
    .from(blogPosts)
    .where(where)
    .orderBy(...newestFirst)
    .limit(pageSize)
    .offset((current - 1) * pageSize)
    .all();
  return { posts: rows.map(card), total, pages, page: current };
}

/** Sidebar widgets: categories with counts, the newest posts (not the open one) and the tag cloud. */
export function sidebarData(db: Db, excludeSlug?: string): BlogSidebarData {
  const categories = db
    .select({ name: blogPosts.category, count: sql<number>`count(*)` })
    .from(blogPosts)
    .where(published)
    .groupBy(blogPosts.category)
    .orderBy(desc(sql`count(*)`), asc(blogPosts.category))
    .limit(6)
    .all();
  const recent = db
    .select()
    .from(blogPosts)
    .where(excludeSlug ? and(published, sql`${blogPosts.slug} <> ${excludeSlug}`) : published)
    .orderBy(...newestFirst)
    .limit(3)
    .all()
    .map(card);
  const tagSet = new Set<string>();
  for (const { tags } of db
    .select({ tags: blogPosts.tags })
    .from(blogPosts)
    .where(published)
    .all()) {
    for (const tag of safeJson<string[]>(tags, [])) tagSet.add(tag);
  }
  return { categories, recent, tags: [...tagSet].sort((a, b) => a.localeCompare(b)).slice(0, 9) };
}

export function getPost(db: Db, slug: string): BlogPostDetail | null {
  const row = db
    .select()
    .from(blogPosts)
    .where(and(published, eq(blogPosts.slug, slug)))
    .get();
  if (!row) return null;
  return {
    ...card(row),
    authorImage: row.authorImage,
    tags: safeJson<string[]>(row.tags, []),
    blocks: safeJson<BlogBlock[]>(row.content, []),
  };
}

/** Neighbours in list order; the ends wrap around so both links always exist (Assumption, D-041). */
export function neighbours(
  db: Db,
  slug: string,
): { previous: BlogCard | null; next: BlogCard | null } {
  const all = db
    .select()
    .from(blogPosts)
    .where(published)
    .orderBy(...newestFirst)
    .all();
  const i = all.findIndex((p) => p.slug === slug);
  if (i < 0 || all.length < 2) return { previous: null, next: null };
  return {
    previous: card(all[(i - 1 + all.length) % all.length]!),
    next: card(all[(i + 1) % all.length]!),
  };
}

export function postIdFor(db: Db, slug: string): number | null {
  return (
    db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(and(published, eq(blogPosts.slug, slug)))
      .get()?.id ?? null
  );
}

export function approvedComments(db: Db, postId: number): BlogComment[] {
  return db
    .select()
    .from(blogComments)
    .where(and(eq(blogComments.postId, postId), eq(blogComments.status, "approved")))
    .orderBy(asc(blogComments.createdAt), asc(blogComments.id))
    .all()
    .map((c) => ({
      id: c.id,
      parentId: c.parentId,
      name: c.name,
      avatar: c.avatar,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    }));
}
