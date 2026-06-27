import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"

// PATCH /api/volumes/reorder — batch update volume sort order
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "Missing ids array" }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Use a transaction to update all volumes efficiently
    db.transaction((tx) => {
      ids.forEach((id, index) => {
        tx
          .update(schema.volumes)
          .set({ sortOrder: index, updatedAt: now })
          .where(eq(schema.volumes.id, id))
          .run()
      })
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error("PATCH /api/volumes/reorder error:", err)
    return Response.json({ error: "重排序失败" }, { status: 500 })
  }
}
