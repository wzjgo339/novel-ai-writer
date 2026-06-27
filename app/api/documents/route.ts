import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { desc } from "drizzle-orm"

// GET /api/documents — list all documents
export async function GET() {
  try {
    const docs = db
      .select()
      .from(schema.documents)
      .orderBy(desc(schema.documents.updatedAt))
      .all()

    return Response.json({ documents: docs })
  } catch (err) {
    console.error("GET /api/documents error:", err)
    return Response.json({ error: "获取文档列表失败" }, { status: 500 })
  }
}

// POST /api/documents — create a new document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "未命名文档"
    const content = typeof body.content === "string" ? body.content : ""

    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const doc = {
      id,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    }

    db.insert(schema.documents).values(doc).run()

    return Response.json({ document: doc }, { status: 201 })
  } catch (err) {
    console.error("POST /api/documents error:", err)
    return Response.json({ error: "创建文档失败" }, { status: 500 })
  }
}
