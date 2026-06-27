import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"

// GET /api/chapters/[id] — get a single chapter
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const chapter = db
      .select()
      .from(schema.chapters)
      .where(eq(schema.chapters.id, id))
      .get()

    if (!chapter) {
      return Response.json({ error: "章节不存在" }, { status: 404 })
    }

    return Response.json({ chapter })
  } catch (err) {
    console.error("GET /api/chapters/[id] error:", err)
    return Response.json({ error: "获取章节失败" }, { status: 500 })
  }
}

// PATCH /api/chapters/[id] — update title, content, and/or sortOrder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = db
      .select()
      .from(schema.chapters)
      .where(eq(schema.chapters.id, id))
      .get()

    if (!existing) {
      return Response.json({ error: "章节不存在" }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, string | number> = {
      updatedAt: new Date().toISOString(),
    }

    if (typeof body.title === "string") {
      updates.title = body.title.trim() || "未命名章节"
    }
    if (typeof body.content === "string") {
      updates.content = body.content
    }
    if (typeof body.sortOrder === "number") {
      updates.sortOrder = body.sortOrder
    }
    if (typeof body.volumeId === "string") {
      // Verify target volume exists
      const targetVol = db.select().from(schema.volumes).where(eq(schema.volumes.id, body.volumeId)).get()
      if (!targetVol) {
        return Response.json({ error: "目标卷不存在" }, { status: 404 })
      }
      updates.volumeId = body.volumeId
    }

    db.update(schema.chapters)
      .set(updates)
      .where(eq(schema.chapters.id, id))
      .run()

    const updated = db
      .select()
      .from(schema.chapters)
      .where(eq(schema.chapters.id, id))
      .get()

    return Response.json({ chapter: updated })
  } catch (err) {
    console.error("PATCH /api/chapters/[id] error:", err)
    return Response.json({ error: "更新章节失败" }, { status: 500 })
  }
}

// DELETE /api/chapters/[id] — delete a chapter
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = db
      .select()
      .from(schema.chapters)
      .where(eq(schema.chapters.id, id))
      .get()

    if (!existing) {
      return Response.json({ error: "章节不存在" }, { status: 404 })
    }

    db.delete(schema.chapters).where(eq(schema.chapters.id, id)).run()

    return Response.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/chapters/[id] error:", err)
    return Response.json({ error: "删除章节失败" }, { status: 500 })
  }
}
