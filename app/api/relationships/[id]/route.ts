import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"

// GET /api/relationships/[id] — get a single relationship
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const relationship = db
      .select()
      .from(schema.characterRelationships)
      .where(eq(schema.characterRelationships.id, id))
      .get()
    if (!relationship) {
      return Response.json({ error: "关系不存在" }, { status: 404 })
    }
    return Response.json({ relationship })
  } catch (err) {
    console.error("GET /api/relationships/[id] error:", err)
    return Response.json({ error: "获取关系失败" }, { status: 500 })
  }
}

// PATCH /api/relationships/[id] — update a relationship
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const existing = db
      .select()
      .from(schema.characterRelationships)
      .where(eq(schema.characterRelationships.id, id))
      .get()
    if (!existing) {
      return Response.json({ error: "关系不存在" }, { status: 404 })
    }

    // Build update with only allowed fields
    const update: Record<string, string> = { updatedAt: new Date().toISOString() }
    if (typeof body.relationshipType === "string") update.relationshipType = body.relationshipType
    if (typeof body.description === "string") update.description = body.description

    db.update(schema.characterRelationships)
      .set(update)
      .where(eq(schema.characterRelationships.id, id))
      .run()

    const updated = db
      .select()
      .from(schema.characterRelationships)
      .where(eq(schema.characterRelationships.id, id))
      .get()

    return Response.json({ relationship: updated })
  } catch (err) {
    console.error("PATCH /api/relationships/[id] error:", err)
    return Response.json({ error: "更新关系失败" }, { status: 500 })
  }
}

// DELETE /api/relationships/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = db
      .select()
      .from(schema.characterRelationships)
      .where(eq(schema.characterRelationships.id, id))
      .get()
    if (!existing) {
      return Response.json({ error: "关系不存在" }, { status: 404 })
    }
    db.delete(schema.characterRelationships)
      .where(eq(schema.characterRelationships.id, id))
      .run()
    return Response.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/relationships/[id] error:", err)
    return Response.json({ error: "删除关系失败" }, { status: 500 })
  }
}
