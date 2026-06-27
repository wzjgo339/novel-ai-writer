import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

// ─── Novels (作品) ──────────────────────────────────────────────────────────

export const novels = sqliteTable("novels", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("未命名作品"),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// ─── Volumes (卷) ───────────────────────────────────────────────────────────

export const volumes = sqliteTable("volumes", {
  id: text("id").primaryKey(),
  novelId: text("novel_id")
    .notNull()
    .references(() => novels.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("未命名卷"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// ─── Chapters (章节) ────────────────────────────────────────────────────────

export const chapters = sqliteTable("chapters", {
  id: text("id").primaryKey(),
  volumeId: text("volume_id")
    .notNull()
    .references(() => volumes.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("未命名章节"),
  content: text("content").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// ─── Characters (人物) ──────────────────────────────────────────────────────

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  novelId: text("novel_id")
    .notNull()
    .references(() => novels.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  aliases: text("aliases").notNull().default(""),
  age: text("age").notNull().default(""),
  gender: text("gender").notNull().default(""),
  appearance: text("appearance").notNull().default(""),
  personality: text("personality").notNull().default(""),
  background: text("background").notNull().default(""),
  motivation: text("motivation").notNull().default(""),
  arc: text("arc").notNull().default(""),
  notes: text("notes").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// ─── Character Relationships (人物关系) ─────────────────────────────────────

export const characterRelationships = sqliteTable("character_relationships", {
  id: text("id").primaryKey(),
  novelId: text("novel_id")
    .notNull()
    .references(() => novels.id, { onDelete: "cascade" }),
  characterId1: text("character_id_1")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  characterId2: text("character_id_2")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull().default(""),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// ─── World Terms (世界观设定) ────────────────────────────────────────────────

export const worldTerms = sqliteTable("world_terms", {
  id: text("id").primaryKey(),
  novelId: text("novel_id")
    .notNull()
    .references(() => novels.id, { onDelete: "cascade" }),
  term: text("term").notNull().default(""),
  type: text("type").notNull().default("其他"),
  definition: text("definition").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// ─── Plot Events (情节大纲) ─────────────────────────────────────────────────

export const plotEvents = sqliteTable("plot_events", {
  id: text("id").primaryKey(),
  novelId: text("novel_id")
    .notNull()
    .references(() => novels.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id"),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// ─── Legacy (kept for reference, not used by new code) ─────────────────────

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("未命名文档"),
  content: text("content").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// ─── Conversations (AI 助手会话) ─────────────────────────────────────────────

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  novelId: text("novel_id")
    .notNull()
    .references(() => novels.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("新对话"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// ─── Conversation Messages (会话消息) ────────────────────────────────────────

export const conversationMessages = sqliteTable("conversation_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull().default(""),
  createdAt: text("created_at").notNull(),
})
