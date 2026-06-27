import { z } from "zod"

// ─── Common primitives ────────────────────────────────────────────────────

export const NonEmptyString = z.string().min(1, "不能为空").max(2000, "内容过长")
export const Title = z.string().min(1, "标题不能为空").max(200, "标题过长").trim()
export const Description = z.string().max(5000, "描述过长").default("")
export const UUID = z.string().uuid("无效的 ID")

// ─── Novel ────────────────────────────────────────────────────────────────

export const CreateNovelSchema = z.object({
  title: Title,
  description: Description.optional(),
})

export const UpdateNovelSchema = z.object({
  title: Title.optional(),
  description: Description.optional(),
})

// ─── Volume ───────────────────────────────────────────────────────────────

export const CreateVolumeSchema = z.object({
  novelId: z.string().min(1, "缺少作品 ID"),
  title: Title,
})

export const UpdateVolumeSchema = z.object({
  title: Title.optional(),
  sortOrder: z.number().int().min(0).optional(),
})

// ─── Chapter ──────────────────────────────────────────────────────────────

export const CreateChapterSchema = z.object({
  volumeId: z.string().min(1, "缺少卷 ID"),
  title: Title,
  content: z.string().max(1_000_000, "内容过长").default(""),
})

export const UpdateChapterSchema = z.object({
  title: Title.optional(),
  content: z.string().max(1_000_000, "内容过长").optional(),
  sortOrder: z.number().int().min(0).optional(),
  volumeId: z.string().min(1, "缺少卷 ID").optional(),
})

// ─── Character ────────────────────────────────────────────────────────────

export const CreateCharacterSchema = z.object({
  novelId: z.string().min(1, "缺少作品 ID"),
  name: z.string().min(1, "姓名不能为空").max(100).trim(),
  aliases: Description.optional(),
  age: z.string().max(50).optional(),
  gender: z.string().max(50).optional(),
  appearance: Description.optional(),
  personality: Description.optional(),
  background: Description.optional(),
  motivation: Description.optional(),
  arc: Description.optional(),
  notes: Description.optional(),
})

export const UpdateCharacterSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  aliases: Description.optional(),
  age: z.string().max(50).optional(),
  gender: z.string().max(50).optional(),
  appearance: Description.optional(),
  personality: Description.optional(),
  background: Description.optional(),
  motivation: Description.optional(),
  arc: Description.optional(),
  notes: Description.optional(),
})

// ─── Relationship ─────────────────────────────────────────────────────────

export const CreateRelationshipSchema = z.object({
  novelId: z.string().min(1),
  characterId1: z.string().min(1),
  characterId2: z.string().min(1),
  relationshipType: z.string().max(50).default(""),
  description: Description.optional(),
}).refine((data) => data.characterId1 !== data.characterId2, {
  message: "不能与自己建立关系",
})

export const UpdateRelationshipSchema = z.object({
  relationshipType: z.string().max(50).optional(),
  description: Description.optional(),
})

// ─── World Term ───────────────────────────────────────────────────────────

export const CreateWorldTermSchema = z.object({
  novelId: z.string().min(1),
  term: z.string().min(1, "名称不能为空").max(200).trim(),
  type: z.string().max(50).default("其他"),
  definition: Description.optional(),
  notes: Description.optional(),
})

export const UpdateWorldTermSchema = z.object({
  term: z.string().min(1).max(200).trim().optional(),
  type: z.string().max(50).optional(),
  definition: Description.optional(),
  notes: Description.optional(),
})

// ─── Plot Event ───────────────────────────────────────────────────────────

export const CreatePlotEventSchema = z.object({
  novelId: z.string().min(1),
  title: z.string().min(1, "标题不能为空").max(200).trim(),
  description: Description.optional(),
  chapterId: z.string().optional().nullable(),
})

export const UpdatePlotEventSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: Description.optional(),
  chapterId: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
})

// ─── Reorder ──────────────────────────────────────────────────────────────

export const ReorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "ID 列表不能为空"),
})

// ─── AI request validation ────────────────────────────────────────────────

export const AIWriteSchema = z.object({
  content: z.string().min(1, "内容不能为空").max(100_000),
})

export const AIRewriteSchema = z.object({
  text: z.string().min(1, "文本不能为空").max(50_000),
  mode: z.enum(["expand", "condense"]),
})
