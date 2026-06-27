import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { asc, eq } from "drizzle-orm"

// GET /api/characters — list characters, optional ?novelId filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const novelId = searchParams.get("novelId")

    const baseQuery = db
      .select()
      .from(schema.characters)
      .orderBy(asc(schema.characters.sortOrder))

    const result = novelId
      ? baseQuery.where(eq(schema.characters.novelId, novelId)).all()
      : baseQuery.all()

    return Response.json({ characters: result })
  } catch (err) {
    console.error("GET /api/characters error:", err)
    return Response.json({ error: "获取人物列表失败" }, { status: 500 })
  }
}

// POST /api/characters — create a new character
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.novelId) {
      return Response.json({ error: "缺少所属作品 ID" }, { status: 400 })
    }

    const existing = db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.novelId, body.novelId))
      .all()
    const maxOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1)

    const now = new Date().toISOString()
    const character = {
      id: crypto.randomUUID(),
      novelId: body.novelId,
      name: body.name || "",
      aliases: body.aliases || "",
      age: body.age || "",
      gender: body.gender || "",
      appearance: body.appearance || "",
      personality: body.personality || "",
      background: body.background || "",
      motivation: body.motivation || "",
      arc: body.arc || "",
      notes: body.notes || "",
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    }

    db.insert(schema.characters).values(character).run()
    return Response.json({ character }, { status: 201 })
  } catch (err) {
    console.error("POST /api/characters error:", err)
    return Response.json({ error: "创建人物失败" }, { status: 500 })
  }
}
