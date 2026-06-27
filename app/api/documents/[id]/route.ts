import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"

// GET /api/documents/[id] — get a single document
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const doc = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, id))
      .get()

    if (!doc) {
      return Response.json({ error: "文档不存在" }, { status: 404 })
    }

    return Response.json({ document: doc })
  } catch (err) {
    console.error("GET /api/documents/[id] error:", err)
    return Response.json({ error: "获取文档失败" }, { status: 500 })
  }
}

// PATCH /api/documents/[id] — update title and/or content
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check existence
    const existing = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, id))
      .get()

    if (!existing) {
      return Response.json({ error: "文档不存在" }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, string> = { updatedAt: new Date().toISOString() }

    if (typeof body.title === "string") {
      updates.title = body.title.trim() || "未命名文档"
    }
    if (typeof body.content === "string") {
      updates.content = body.content
    }

    db.update(schema.documents)
      .set(updates)
      .where(eq(schema.documents.id, id))
      .run()

    const updated = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, id))
      .get()

    return Response.json({ document: updated })
  } catch (err) {
    console.error("PATCH /api/documents/[id] error:", err)
    return Response.json({ error: "更新文档失败" }, { status: 500 })
  }
}

// DELETE /api/documents/[id] — delete a document
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, id))
      .get()

    if (!existing) {
      return Response.json({ error: "文档不存在" }, { status: 404 })
    }

    db.delete(schema.documents).where(eq(schema.documents.id, id)).run()

    return Response.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/documents/[id] error:", err)
    return Response.json({ error: "删除文档失败" }, { status: 500 })
  }
}
