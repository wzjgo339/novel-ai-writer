import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { desc } from "drizzle-orm"
import { CreateNovelSchema } from "@/lib/validation"

// GET /api/novels — list all novels
export async function GET() {
  try {
    const novels = db
      .select()
      .from(schema.novels)
      .orderBy(desc(schema.novels.updatedAt))
      .all()

    return Response.json({ novels })
  } catch (err) {
    console.error("GET /api/novels error:", err)
    return Response.json({ error: "获取作品列表失败" }, { status: 500 })
  }
}

// POST /api/novels — create a new novel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateNovelSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0]?.message || "参数错误" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const novel = {
      id,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      createdAt: now,
      updatedAt: now,
    }

    db.insert(schema.novels).values(novel).run()

    return Response.json({ novel }, { status: 201 })
  } catch (err) {
    console.error("POST /api/novels error:", err)
    return Response.json({ error: "创建作品失败" }, { status: 500 })
  }
}
