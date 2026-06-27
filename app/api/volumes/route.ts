import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { asc, eq } from "drizzle-orm"
import { CreateVolumeSchema } from "@/lib/validation"

// GET /api/volumes — list volumes, optional ?novelId filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const novelId = searchParams.get("novelId")

    const query = db
      .select()
      .from(schema.volumes)
      .orderBy(asc(schema.volumes.sortOrder))

    const result = novelId
      ? query.where(eq(schema.volumes.novelId, novelId)).all()
      : query.all()

    return Response.json({ volumes: result })
  } catch (err) {
    console.error("GET /api/volumes error:", err)
    return Response.json({ error: "获取卷列表失败" }, { status: 500 })
  }
}

// POST /api/volumes — create a new volume
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateVolumeSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0]?.message || "参数错误" }, { status: 400 })
    }

    // Verify novel exists
    const novel = db
      .select()
      .from(schema.novels)
      .where(eq(schema.novels.id, parsed.data.novelId))
      .get()

    if (!novel) {
      return Response.json({ error: "所属作品不存在" }, { status: 404 })
    }

    const title = parsed.data.title

    // Determine sort order
    const existingVols = db
      .select()
      .from(schema.volumes)
      .where(eq(schema.volumes.novelId, parsed.data.novelId))
      .all()
    const maxOrder = existingVols.reduce((max, v) => Math.max(max, v.sortOrder), -1)

    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const volume = {
      id,
      novelId: parsed.data.novelId,
      title,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    }

    db.insert(schema.volumes).values(volume).run()

    return Response.json({ volume }, { status: 201 })
  } catch (err) {
    console.error("POST /api/volumes error:", err)
    return Response.json({ error: "创建卷失败" }, { status: 500 })
  }
}
