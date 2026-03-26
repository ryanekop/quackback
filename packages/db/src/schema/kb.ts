import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
  jsonb,
  customType,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { typeIdWithDefault, typeIdColumn, typeIdColumnNullable } from '@quackback/ids/drizzle'
import { principal } from './auth'
import type { TiptapContent } from '../types'

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(1536)'
  },
})

// ============================================
// Knowledge Base Categories
// ============================================

export const knowledgebaseCategories = pgTable(
  'kb_categories',
  {
    id: typeIdWithDefault('kb_cat')('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isPublic: boolean('is_public').default(true).notNull(),
    position: integer('position').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('kb_categories_slug_idx').on(table.slug),
    index('kb_categories_position_idx').on(table.position),
    index('kb_categories_deleted_at_idx').on(table.deletedAt),
  ]
)

// ============================================
// Knowledge Base Articles
// ============================================

export const knowledgebaseArticles = pgTable(
  'kb_articles',
  {
    id: typeIdWithDefault('kb_article')('id').primaryKey(),
    categoryId: typeIdColumn('kb_cat')('category_id')
      .notNull()
      .references(() => knowledgebaseCategories.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    contentJson: jsonb('content_json').$type<TiptapContent>(),
    principalId: typeIdColumn('principal')('principal_id')
      .notNull()
      .references(() => principal.id, { onDelete: 'restrict' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    viewCount: integer('view_count').default(0).notNull(),
    helpfulCount: integer('helpful_count').default(0).notNull(),
    notHelpfulCount: integer('not_helpful_count').default(0).notNull(),
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(content, '')), 'B')`
    ),
    embedding: vector('embedding'),
    embeddingModel: text('embedding_model'),
    embeddingUpdatedAt: timestamp('embedding_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('kb_articles_slug_idx').on(table.slug),
    index('kb_articles_category_id_idx').on(table.categoryId),
    index('kb_articles_principal_id_idx').on(table.principalId),
    index('kb_articles_published_at_idx').on(table.publishedAt),
    index('kb_articles_deleted_at_idx').on(table.deletedAt),
    index('kb_articles_category_published_idx').on(table.categoryId, table.publishedAt),
    index('kb_articles_search_vector_idx').using('gin', table.searchVector),
  ]
)

// ============================================
// Article Feedback (helpful/not helpful)
// ============================================

export const knowledgebaseArticleFeedback = pgTable(
  'kb_article_feedback',
  {
    id: typeIdWithDefault('kb_fb')('id').primaryKey(),
    articleId: typeIdColumn('kb_article')('article_id')
      .notNull()
      .references(() => knowledgebaseArticles.id, { onDelete: 'cascade' }),
    principalId: typeIdColumnNullable('principal')('principal_id').references(() => principal.id, {
      onDelete: 'set null',
    }),
    helpful: boolean('helpful').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('kb_article_feedback_article_id_idx').on(table.articleId),
    uniqueIndex('kb_article_feedback_unique_idx').on(table.articleId, table.principalId),
  ]
)

// ============================================
// Relations
// ============================================

export const knowledgebaseCategoriesRelations = relations(knowledgebaseCategories, ({ many }) => ({
  articles: many(knowledgebaseArticles),
}))

export const knowledgebaseArticlesRelations = relations(knowledgebaseArticles, ({ one, many }) => ({
  category: one(knowledgebaseCategories, {
    fields: [knowledgebaseArticles.categoryId],
    references: [knowledgebaseCategories.id],
  }),
  author: one(principal, {
    fields: [knowledgebaseArticles.principalId],
    references: [principal.id],
    relationName: 'knowledgebaseArticleAuthor',
  }),
  feedback: many(knowledgebaseArticleFeedback),
}))

export const knowledgebaseArticleFeedbackRelations = relations(
  knowledgebaseArticleFeedback,
  ({ one }) => ({
    article: one(knowledgebaseArticles, {
      fields: [knowledgebaseArticleFeedback.articleId],
      references: [knowledgebaseArticles.id],
    }),
    principal: one(principal, {
      fields: [knowledgebaseArticleFeedback.principalId],
      references: [principal.id],
      relationName: 'knowledgebaseFeedbackPrincipal',
    }),
  })
)
