import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"

// GET /api/volumes/[id] — get a single volume
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const volume = db
      .select()
      .from(schema.volumes)
      .where(eq(schema.volumes.id, id))
      .get()

    if (!volume) {
      return Response.json({ error: "卷不存在" }, { status: 404 })
    }

    return Response.json({ volume })
  } catch (err) {
    console.error("GET /api/volumes/[id] error:", err)
    return Response.json({ error: "获取卷失败" }, { status: 500 })
  }
}

// PATCH /api/volumes/[id] — update title and/or sortOrder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = db
      .select()
      .from(schema.volumes)
      .where(eq(schema.volumes.id, id))
      .get()

    if (!existing) {
      return Response.json({ error: "卷不存在" }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, string | number> = {
      updatedAt: new Date().toISOString(),
    }

    if (typeof body.title === "string") {
      updates.title = body.title.trim() || "未命名卷"
    }
    if (typeof body.sortOrder === "number") {
      updates.sortOrder = body.sortOrder
    }

    db.update(schema.volumes).set(updates).where(eq(schema.volumes.id, id)).run()

    const updated = db
      .select()
      .from(schema.volumes)
      .where(eq(schema.volumes.id, id))
      .get()

    return Response.json({ volume: updated })
  } catch (err) {
    console.error("PATCH /api/volumes/[id] error:", err)
    return Response.json({ error: "更新卷失败" }, { status: 500 })
  }
}

// DELETE /api/volumes/[id] — delete a volume (cascades to chapters)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = db
      .select()
      .from(schema.volumes)
      .where(eq(schema.volumes.id, id))
      .get()

    if (!existing) {
      return Response.json({ error: "卷不存在" }, { status: 404 })
    }

    db.delete(schema.volumes).where(eq(schema.volumes.id, id)).run()

    return Response.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/volumes/[id] error:", err)
    return Response.json({ error: "删除卷失败" }, { status: 500 })
  }
}
