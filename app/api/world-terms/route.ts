import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { asc, eq } from "drizzle-orm"

// GET /api/world-terms — list world terms, optional ?novelId filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const novelId = searchParams.get("novelId")

    const baseQuery = db
      .select()
      .from(schema.worldTerms)
      .orderBy(asc(schema.worldTerms.term))

    const result = novelId
      ? baseQuery.where(eq(schema.worldTerms.novelId, novelId)).all()
      : baseQuery.all()

    return Response.json({ terms: result })
  } catch (err) {
    console.error("GET /api/world-terms error:", err)
    return Response.json({ error: "获取设定列表失败" }, { status: 500 })
  }
}

// POST /api/world-terms — create a new world term
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.novelId) {
      return Response.json({ error: "缺少所属作品 ID" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const term = {
      id: crypto.randomUUID(),
      novelId: body.novelId,
      term: body.term || "",
      type: body.type || "其他",
      definition: body.definition || "",
      notes: body.notes || "",
      createdAt: now,
      updatedAt: now,
    }

    db.insert(schema.worldTerms).values(term).run()
    return Response.json({ term }, { status: 201 })
  } catch (err) {
    console.error("POST /api/world-terms error:", err)
    return Response.json({ error: "创建设定失败" }, { status: 500 })
  }
}
