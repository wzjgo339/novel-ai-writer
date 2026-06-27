import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"

// GET /api/plot-events/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const event = db
      .select()
      .from(schema.plotEvents)
      .where(eq(schema.plotEvents.id, id))
      .get()
    if (!event) return Response.json({ error: "情节不存在" }, { status: 404 })
    return Response.json({ event })
  } catch (err) {
    console.error("GET /api/plot-events/[id] error:", err)
    return Response.json({ error: "获取情节失败" }, { status: 500 })
  }
}

// PATCH /api/plot-events/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = db
      .select()
      .from(schema.plotEvents)
      .where(eq(schema.plotEvents.id, id))
      .get()
    if (!existing) return Response.json({ error: "情节不存在" }, { status: 404 })

    const body = await request.json()
    const allowed = ["title", "description", "chapterId", "sortOrder"]
    const updates: Record<string, string | number | null> = {
      updatedAt: new Date().toISOString(),
    }
    for (const field of allowed) {
      if (body[field] !== undefined) updates[field] = body[field]
    }
    if (body.chapterId === "") updates.chapterId = null

    db.update(schema.plotEvents).set(updates).where(eq(schema.plotEvents.id, id)).run()
    const updated = db
      .select()
      .from(schema.plotEvents)
      .where(eq(schema.plotEvents.id, id))
      .get()
    return Response.json({ event: updated })
  } catch (err) {
    console.error("PATCH /api/plot-events/[id] error:", err)
    return Response.json({ error: "更新情节失败" }, { status: 500 })
  }
}

// DELETE /api/plot-events/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = db
      .select()
      .from(schema.plotEvents)
      .where(eq(schema.plotEvents.id, id))
      .get()
    if (!existing) return Response.json({ error: "情节不存在" }, { status: 404 })
    db.delete(schema.plotEvents).where(eq(schema.plotEvents.id, id)).run()
    return Response.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/plot-events/[id] error:", err)
    return Response.json({ error: "删除情节失败" }, { status: 500 })
  }
}
