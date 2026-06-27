import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"

// PATCH /api/chapters/reorder — batch update chapter sort order
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "Missing ids array" }, { status: 400 })
    }

    const now = new Date().toISOString()

    db.transaction((tx) => {
      ids.forEach((id, index) => {
        tx
          .update(schema.chapters)
          .set({ sortOrder: index, updatedAt: now })
          .where(eq(schema.chapters.id, id))
          .run()
      })
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error("PATCH /api/chapters/reorder error:", err)
    return Response.json({ error: "重排序失败" }, { status: 500 })
  }
}
