import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"
import { UpdateNovelSchema } from "@/lib/validation"

// GET /api/novels/[id] — get a single novel
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const novel = db
      .select()
      .from(schema.novels)
      .where(eq(schema.novels.id, id))
      .get()

    if (!novel) {
      return Response.json({ error: "作品不存在" }, { status: 404 })
    }

    return Response.json({ novel })
  } catch (err) {
    console.error("GET /api/novels/[id] error:", err)
    return Response.json({ error: "获取作品失败" }, { status: 500 })
  }
}

// PATCH /api/novels/[id] — update title and/or description
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = db
      .select()
      .from(schema.novels)
      .where(eq(schema.novels.id, id))
      .get()

    if (!existing) {
      return Response.json({ error: "作品不存在" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = UpdateNovelSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0]?.message || "参数错误" }, { status: 400 })
    }

    const updates: Record<string, string> = { updatedAt: new Date().toISOString() }
    if (parsed.data.title) updates.title = parsed.data.title
    if (parsed.data.description !== undefined) updates.description = parsed.data.description

    db.update(schema.novels).set(updates).where(eq(schema.novels.id, id)).run()

    const updated = db
      .select()
      .from(schema.novels)
      .where(eq(schema.novels.id, id))
      .get()

    return Response.json({ novel: updated })
  } catch (err) {
    console.error("PATCH /api/novels/[id] error:", err)
    return Response.json({ error: "更新作品失败" }, { status: 500 })
  }
}

// DELETE /api/novels/[id] — delete a novel (cascades to volumes and chapters)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = db
      .select()
      .from(schema.novels)
      .where(eq(schema.novels.id, id))
      .get()

    if (!existing) {
      return Response.json({ error: "作品不存在" }, { status: 404 })
    }

    db.delete(schema.novels).where(eq(schema.novels.id, id)).run()

    return Response.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/novels/[id] error:", err)
    return Response.json({ error: "删除作品失败" }, { status: 500 })
  }
}
