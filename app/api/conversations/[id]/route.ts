import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq, asc } from "drizzle-orm"

// GET /api/conversations/[id] — get a conversation with its messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const conversation = db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id))
      .get()

    if (!conversation) {
      return Response.json({ error: "会话不存在" }, { status: 404 })
    }

    const messages = db
      .select()
      .from(schema.conversationMessages)
      .where(eq(schema.conversationMessages.conversationId, id))
      .orderBy(asc(schema.conversationMessages.createdAt))
      .all()

    return Response.json({ conversation, messages })
  } catch (err) {
    console.error("GET /api/conversations/[id] error:", err)
    return Response.json({ error: "获取会话失败" }, { status: 500 })
  }
}

// PATCH /api/conversations/[id] — update title and/or add messages
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id))
      .get()

    if (!existing) {
      return Response.json({ error: "会话不存在" }, { status: 404 })
    }

    const body = await request.json()
    const now = new Date().toISOString()

    // Update title if provided
    if (typeof body.title === "string" && body.title.trim()) {
      db.update(schema.conversations)
        .set({ title: body.title.trim(), updatedAt: now })
        .where(eq(schema.conversations.id, id))
        .run()
    } else {
      // Always bump updatedAt
      db.update(schema.conversations)
        .set({ updatedAt: now })
        .where(eq(schema.conversations.id, id))
        .run()
    }

    // Add messages if provided
    const messages = Array.isArray(body.messages) ? body.messages : []
    for (const msg of messages) {
      if (
        typeof msg.role === "string" &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        msg.content.trim()
      ) {
        const msgId = crypto.randomUUID()
        db.insert(schema.conversationMessages)
          .values({
            id: msgId,
            conversationId: id,
            role: msg.role,
            content: msg.content,
            createdAt: now,
          })
          .run()
      }
    }

    // Return updated conversation with messages
    const updated = db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id))
      .get()

    const allMessages = db
      .select()
      .from(schema.conversationMessages)
      .where(eq(schema.conversationMessages.conversationId, id))
      .orderBy(asc(schema.conversationMessages.createdAt))
      .all()

    return Response.json({ conversation: updated, messages: allMessages })
  } catch (err) {
    console.error("PATCH /api/conversations/[id] error:", err)
    return Response.json({ error: "更新会话失败" }, { status: 500 })
  }
}

// DELETE /api/conversations/[id] — delete a conversation (cascades messages)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id))
      .get()

    if (!existing) {
      return Response.json({ error: "会话不存在" }, { status: 404 })
    }

    db.delete(schema.conversations).where(eq(schema.conversations.id, id)).run()

    return Response.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/conversations/[id] error:", err)
    return Response.json({ error: "删除会话失败" }, { status: 500 })
  }
}
