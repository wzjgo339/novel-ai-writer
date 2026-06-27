import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"

// GET /api/characters/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const character = db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, id))
      .get()
    if (!character) {
      return Response.json({ error: "人物不存在" }, { status: 404 })
    }
    return Response.json({ character })
  } catch (err) {
    console.error("GET /api/characters/[id] error:", err)
    return Response.json({ error: "获取人物失败" }, { status: 500 })
  }
}

// PATCH /api/characters/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, id))
      .get()
    if (!existing) {
      return Response.json({ error: "人物不存在" }, { status: 404 })
    }

    const body = await request.json()
    const allowedFields = [
      "name", "aliases", "age", "gender", "appearance",
      "personality", "background", "motivation", "arc", "notes", "sortOrder",
    ]
    const updates: Record<string, string | number> = { updatedAt: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    db.update(schema.characters).set(updates).where(eq(schema.characters.id, id)).run()
    const updated = db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, id))
      .get()
    return Response.json({ character: updated })
  } catch (err) {
    console.error("PATCH /api/characters/[id] error:", err)
    return Response.json({ error: "更新人物失败" }, { status: 500 })
  }
}

// DELETE /api/characters/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, id))
      .get()
    if (!existing) {
      return Response.json({ error: "人物不存在" }, { status: 404 })
    }
    db.delete(schema.characters).where(eq(schema.characters.id, id)).run()
    return Response.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/characters/[id] error:", err)
    return Response.json({ error: "删除人物失败" }, { status: 500 })
  }
}
