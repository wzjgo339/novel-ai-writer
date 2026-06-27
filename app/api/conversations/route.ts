import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { desc, eq } from "drizzle-orm"

// GET /api/conversations?novelId=xxx — list conversations for a novel
export async function GET(request: NextRequest) {
  try {
    const novelId = request.nextUrl.searchParams.get("novelId")
    if (!novelId) {
      return Response.json({ error: "Missing novelId" }, { status: 400 })
    }

    const conversations = db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.novelId, novelId))
      .orderBy(desc(schema.conversations.updatedAt))
      .all()

    return Response.json({ conversations })
  } catch (err) {
    console.error("GET /api/conversations error:", err)
    return Response.json({ error: "获取会话列表失败" }, { status: 500 })
  }
}

// POST /api/conversations — create a new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const novelId = typeof body.novelId === "string" ? body.novelId.trim() : ""
    if (!novelId) {
      return Response.json({ error: "Missing novelId" }, { status: 400 })
    }

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "新对话"

    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const conversation = {
      id,
      novelId,
      title,
      createdAt: now,
      updatedAt: now,
    }

    db.insert(schema.conversations).values(conversation).run()

    return Response.json({ conversation }, { status: 201 })
  } catch (err) {
    console.error("POST /api/conversations error:", err)
    return Response.json({ error: "创建会话失败" }, { status: 500 })
  }
}
