// import { boolean, date, integer, jsonb, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

// export const newsCategories = pgTable('news_categories', { id: serial('id').primaryKey(), slug: text('slug').notNull().unique(), nameBn: text('name_bn').notNull(), nameEn: text('name_en').notNull(), sortOrder: integer('sort_order').notNull().default(0), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() })
// export const newsArticles = pgTable('news_articles', { id: serial('id').primaryKey(), categoryId: integer('category_id'), slug: text('slug'), titleBn: text('title_bn').notNull(), titleEn: text('title_en').notNull(), excerptBn: text('excerpt_bn').notNull().default(''), excerptEn: text('excerpt_en').notNull().default(''), bodyBn: text('body_bn').notNull().default(''), bodyEn: text('body_en').notNull().default(''), imageUrl: text('image_url').notNull().default(''), authorName: text('author_name').notNull().default('নিজস্ব প্রতিবেদক'), status: text('status').notNull().default('draft'), scheduledAt: timestamp('scheduled_at', { withTimezone: true }), isBreaking: boolean('is_breaking').notNull().default(false), publishedAt: timestamp('published_at', { withTimezone: true }), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow() })
// export const newsVideos = pgTable('news_videos', { id: serial('id').primaryKey(), titleBn: text('title_bn').notNull(), titleEn: text('title_en').notNull(), youtubeUrl: text('youtube_url').notNull(), thumbnailUrl: text('thumbnail_url').notNull().default(''), status: text('status').notNull().default('published'), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() })
// export const breakingTickers = pgTable('breaking_tickers', { id: serial('id').primaryKey(), textBn: text('text_bn').notNull(), textEn: text('text_en').notNull(), newsUrl: text('news_url').notNull().default('#'), isActive: boolean('is_active').notNull().default(true), sortOrder: integer('sort_order').notNull().default(0), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() })
// export const epaperEditions = pgTable('epaper_editions', { id: serial('id').primaryKey(), editionDate: date('edition_date').notNull().unique(), title: text('title').notNull().default('দৈনিক কল্যাণ'), status: text('status').notNull().default('draft'), pdfPath: text('pdf_path'), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow() })
// export const epaperPages = pgTable('epaper_pages', { id: serial('id').primaryKey(), editionId: integer('edition_id').notNull(), pageNumber: integer('page_number').notNull(), imagePath: text('image_path').notNull(), width: integer('width').notNull(), height: integer('height').notNull() })
// export const epaperRegions = pgTable('epaper_regions', { id: serial('id').primaryKey(), pageId: integer('page_id').notNull(), shapeType: text('shape_type').notNull().default('rect'), points: jsonb('points').$type<Array<{ x: number; y: number }>>().notNull().default([]), x: numeric('x', { precision: 8, scale: 5 }).notNull(), y: numeric('y', { precision: 8, scale: 5 }).notNull(), width: numeric('width', { precision: 8, scale: 5 }).notNull(), height: numeric('height', { precision: 8, scale: 5 }).notNull(), articleId: integer('article_id'), targetPageNumber: integer('target_page_number'), targetUrl: text('target_url'), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() })

// export const adminUsers = pgTable('admin_users', { id: serial('id').primaryKey(), userId: text('user_id').notNull().unique(), passwordHash: text('password_hash').notNull(), role: text('role').notNull().default('moderator'), status: text('status').notNull().default('active'), mustChangePassword: boolean('must_change_password').notNull().default(true), permissions: jsonb('permissions').$type<string[]>().notNull().default(['news:read']), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), lastLoginAt: timestamp('last_login_at', { withTimezone: true }) })
// export const adminAuditLogs = pgTable('admin_audit_logs', { id: serial('id').primaryKey(), actorUserId: text('actor_user_id').notNull(), action: text('action').notNull(), resourceType: text('resource_type').notNull(), resourceId: text('resource_id'), metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() })
// export const articleCategories = pgTable('article_categories', { articleId: integer('article_id').notNull(), categoryId: integer('category_id').notNull() })
// export const mediaAssets = pgTable('media_assets', { id: serial('id').primaryKey(), url: text('url').notNull(), filename: text('filename').notNull(), mimeType: text('mime_type').notNull(), sizeBytes: integer('size_bytes').notNull().default(0), altText: text('alt_text').notNull().default(''), createdBy: text('created_by'), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() })
// export const siteSettings = pgTable('site_settings', { key: text('key').primaryKey(), value: text('value').notNull().default(''), updatedBy: text('updated_by'), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow() })
// export const advertisements = pgTable('advertisements', { id: serial('id').primaryKey(), title: text('title').notNull(), placement: text('placement').notNull().default('sidebar'), imageUrl: text('image_url').notNull().default(''), targetUrl: text('target_url').notNull().default(''), altText: text('alt_text').notNull().default(''), startsAt: timestamp('starts_at', { withTimezone: true }), endsAt: timestamp('ends_at', { withTimezone: true }), isActive: boolean('is_active').notNull().default(false), createdBy: text('created_by'), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow() })
// export const schema = { newsCategories, newsArticles, newsVideos, breakingTickers, epaperEditions, epaperPages, epaperRegions, adminUsers, adminAuditLogs, articleCategories, mediaAssets, siteSettings, advertisements }



import { boolean, date, integer, jsonb, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const newsCategories = pgTable('news_categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameBn: text('name_bn').notNull(),
  nameEn: text('name_en').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const newsArticles = pgTable('news_articles', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id'),
  slug: text('slug'),
  titleBn: text('title_bn').notNull(),
  titleEn: text('title_en').notNull(),
  excerptBn: text('excerpt_bn').notNull().default(''),
  excerptEn: text('excerpt_en').notNull().default(''),
  bodyBn: text('body_bn').notNull().default(''),
  bodyEn: text('body_en').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  authorName: text('author_name').notNull().default('নিজস্ব প্রতিবেদক'),
  status: text('status').notNull().default('draft'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  isBreaking: boolean('is_breaking').notNull().default(false),
  viewCount: integer('view_count').notNull().default(0), // ভিউ কাউন্ট
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

export const newsVideos = pgTable('news_videos', {
  id: serial('id').primaryKey(),
  titleBn: text('title_bn').notNull(),
  titleEn: text('title_en').notNull(),
  youtubeUrl: text('youtube_url').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull().default(''),
  status: text('status').notNull().default('published'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const breakingTickers = pgTable('breaking_tickers', {
  id: serial('id').primaryKey(),
  textBn: text('text_bn').notNull(),
  textEn: text('text_en').notNull(),
  newsUrl: text('news_url').notNull().default('#'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const epaperEditions = pgTable('epaper_editions', {
  id: serial('id').primaryKey(),
  editionDate: date('edition_date').notNull().unique(),
  title: text('title').notNull().default('দৈনিক কল্যাণ'),
  status: text('status').notNull().default('draft'),
  pdfPath: text('pdf_path'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

export const epaperPages = pgTable('epaper_pages', {
  id: serial('id').primaryKey(),
  editionId: integer('edition_id').notNull(),
  pageNumber: integer('page_number').notNull(),
  imagePath: text('image_path').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull()
})

export const epaperRegions = pgTable('epaper_regions', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull(),
  shapeType: text('shape_type').notNull().default('rect'),
  points: jsonb('points').$type<Array<{ x: number; y: number }>>().notNull().default([]),
  x: numeric('x', { precision: 8, scale: 5 }).notNull(),
  y: numeric('y', { precision: 8, scale: 5 }).notNull(),
  width: numeric('width', { precision: 8, scale: 5 }).notNull(),
  height: numeric('height', { precision: 8, scale: 5 }).notNull(),
  articleId: integer('article_id'),
  targetPageNumber: integer('target_page_number'),
  targetUrl: text('target_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('moderator'),
  status: text('status').notNull().default('active'),
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  permissions: jsonb('permissions').$type<string[]>().notNull().default(['news:read']),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true })
})

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: serial('id').primaryKey(),
  actorUserId: text('actor_user_id').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const articleCategories = pgTable('article_categories', {
  articleId: integer('article_id').notNull(),
  categoryId: integer('category_id').notNull()
})

export const mediaAssets = pgTable('media_assets', {
  id: serial('id').primaryKey(),
  url: text('url').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  altText: text('alt_text').notNull().default(''),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

export const advertisements = pgTable('advertisements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  placement: text('placement').notNull().default('sidebar'),
  imageUrl: text('image_url').notNull().default(''),
  targetUrl: text('target_url').notNull().default(''),
  altText: text('alt_text').notNull().default(''),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(false),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

export const schema = {
  newsCategories,
  newsArticles,
  newsVideos,
  breakingTickers,
  epaperEditions,
  epaperPages,
  epaperRegions,
  adminUsers,
  adminAuditLogs,
  articleCategories,
  mediaAssets,
  siteSettings,
  advertisements
}