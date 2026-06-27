import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"

// GET /api/world-terms/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const term = db
      .select()
      .from(schema.worldTerms)
      .where(eq(schema.worldTerms.id, id))
      .get()
    if (!term) return Response.json({ error: "设定不存在" }, { status: 404 })
    return Response.json({ term })
  } catch (err) {
    console.error("GET /api/world-terms/[id] error:", err)
    return Response.json({ error: "获取设定失败" }, { status: 500 })
  }
}

// PATCH /api/world-terms/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = db
      .select()
      .from(schema.worldTerms)
      .where(eq(schema.worldTerms.id, id))
      .get()
    if (!existing) return Response.json({ error: "设定不存在" }, { status: 404 })

    const body = await request.json()
    const allowed = ["term", "type", "definition", "notes"]
    const updates: Record<string, string | number> = { updatedAt: new Date().toISOString() }
    for (const field of allowed) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    db.update(schema.worldTerms).set(updates).where(eq(schema.worldTerms.id, id)).run()
    const updated = db
      .select()
      .from(schema.worldTerms)
      .where(eq(schema.worldTerms.id, id))
      .get()
    return Response.json({ term: updated })
  } catch (err) {
    console.error("PATCH /api/world-terms/[id] error:", err)
    return Response.json({ error: "更新设定失败" }, { status: 500 })
  }
}

// DELETE /api/world-terms/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = db
      .select()
      .from(schema.worldTerms)
      .where(eq(schema.worldTerms.id, id))
      .get()
    if (!existing) return Response.json({ error: "设定不存在" }, { status: 404 })
    db.delete(schema.worldTerms).where(eq(schema.worldTerms.id, id)).run()
    return Response.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/world-terms/[id] error:", err)
    return Response.json({ error: "删除设定失败" }, { status: 500 })
  }
}
