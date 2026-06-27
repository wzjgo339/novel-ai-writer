import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq, or } from "drizzle-orm"

// GET /api/relationships — list relationships, optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const novelId = searchParams.get("novelId")
    const characterId = searchParams.get("characterId")

    let query = db.select().from(schema.characterRelationships)

    if (novelId) {
      query = query.where(eq(schema.characterRelationships.novelId, novelId)) as typeof query
    }
    if (characterId) {
      query = query.where(
        or(
          eq(schema.characterRelationships.characterId1, characterId),
          eq(schema.characterRelationships.characterId2, characterId)
        )
      ) as typeof query
    }

    const result = query.all()
    return Response.json({ relationships: result })
  } catch (err) {
    console.error("GET /api/relationships error:", err)
    return Response.json({ error: "获取关系列表失败" }, { status: 500 })
  }
}

// POST /api/relationships — create a relationship
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.novelId || !body.characterId1 || !body.characterId2) {
      return Response.json({ error: "缺少必要字段" }, { status: 400 })
    }
    // Avoid self-relationship
    if (body.characterId1 === body.characterId2) {
      return Response.json({ error: "不能与自己建立关系" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const relationship = {
      id: crypto.randomUUID(),
      novelId: body.novelId,
      characterId1: body.characterId1,
      characterId2: body.characterId2,
      relationshipType: body.relationshipType || "",
      description: body.description || "",
      createdAt: now,
      updatedAt: now,
    }

    db.insert(schema.characterRelationships).values(relationship).run()
    return Response.json({ relationship }, { status: 201 })
  } catch (err) {
    console.error("POST /api/relationships error:", err)
    return Response.json({ error: "创建关系失败" }, { status: 500 })
  }
}
