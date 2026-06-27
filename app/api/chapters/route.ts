import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { asc, eq } from "drizzle-orm"
import { CreateChapterSchema } from "@/lib/validation"

// GET /api/chapters — list chapters, optional ?volumeId filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const volumeId = searchParams.get("volumeId")

    const baseQuery = db
      .select()
      .from(schema.chapters)
      .orderBy(asc(schema.chapters.sortOrder))

    const result = volumeId
      ? baseQuery.where(eq(schema.chapters.volumeId, volumeId)).all()
      : baseQuery.all()

    return Response.json({ chapters: result })
  } catch (err) {
    console.error("GET /api/chapters error:", err)
    return Response.json({ error: "获取章节列表失败" }, { status: 500 })
  }
}

// POST /api/chapters — create a new chapter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateChapterSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0]?.message || "参数错误" }, { status: 400 })
    }

    // Verify volume exists
    const volume = db
      .select()
      .from(schema.volumes)
      .where(eq(schema.volumes.id, parsed.data.volumeId))
      .get()

    if (!volume) {
      return Response.json({ error: "所属卷不存在" }, { status: 404 })
    }

    const title = parsed.data.title

    // Determine sort order
    const existingChs = db
      .select()
      .from(schema.chapters)
      .where(eq(schema.chapters.volumeId, parsed.data.volumeId))
      .all()
    const maxOrder = existingChs.reduce((max, c) => Math.max(max, c.sortOrder), -1)

    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const chapter = {
      id,
      volumeId: parsed.data.volumeId,
      title,
      content: parsed.data.content,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    }

    db.insert(schema.chapters).values(chapter).run()

    return Response.json({ chapter }, { status: 201 })
  } catch (err) {
    console.error("POST /api/chapters error:", err)
    return Response.json({ error: "创建章节失败" }, { status: 500 })
  }
}
