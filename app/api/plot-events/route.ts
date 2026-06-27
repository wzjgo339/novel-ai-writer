import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { asc, eq } from "drizzle-orm"

// GET /api/plot-events — list plot events, optional ?novelId filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const novelId = searchParams.get("novelId")

    // Join with chapters to get chapter titles
    const baseQuery = db
      .select()
      .from(schema.plotEvents)
      .orderBy(asc(schema.plotEvents.sortOrder))

    const result = novelId
      ? baseQuery.where(eq(schema.plotEvents.novelId, novelId)).all()
      : baseQuery.all()

    return Response.json({ events: result })
  } catch (err) {
    console.error("GET /api/plot-events error:", err)
    return Response.json({ error: "获取情节列表失败" }, { status: 500 })
  }
}

// POST /api/plot-events — create a new plot event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.novelId) {
      return Response.json({ error: "缺少所属作品 ID" }, { status: 400 })
    }

    const existing = db
      .select()
      .from(schema.plotEvents)
      .where(eq(schema.plotEvents.novelId, body.novelId))
      .all()
    const maxOrder = existing.reduce((max, e) => Math.max(max, e.sortOrder), -1)

    const now = new Date().toISOString()
    const event = {
      id: crypto.randomUUID(),
      novelId: body.novelId,
      chapterId: body.chapterId || null,
      title: body.title || "",
      description: body.description || "",
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    }

    db.insert(schema.plotEvents).values(event).run()
    return Response.json({ event }, { status: 201 })
  } catch (err) {
    console.error("POST /api/plot-events error:", err)
    return Response.json({ error: "创建情节失败" }, { status: 500 })
  }
}
