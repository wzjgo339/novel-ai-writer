import { NextRequest } from "next/server"
import { db, schema } from "@/db"
import { eq, or, and, like } from "drizzle-orm"

interface SearchResult {
  type: "chapter" | "character" | "world_term" | "plot_event"
  id: string
  title?: string
  name?: string
  term?: string
  snippet?: string
  matchField?: string
  volumeTitle?: string
}

function extractSnippet(text: string, keyword: string, contextLen = 30): string {
  const lowerText = text.toLowerCase()
  const lowerKw = keyword.toLowerCase()
  const idx = lowerText.indexOf(lowerKw)
  if (idx === -1) return text.slice(0, contextLen * 2)
  const start = Math.max(0, idx - contextLen)
  const end = Math.min(text.length, idx + keyword.length + contextLen)
  let snippet = text.slice(start, end)
  if (start > 0) snippet = "…" + snippet
  if (end < text.length) snippet += "…"
  return snippet
}

function matchField(value: string | null | undefined, keyword: string): string | null {
  if (!value) return null
  if (value.toLowerCase().includes(keyword.toLowerCase())) return value
  return null
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim()
    const novelId = request.nextUrl.searchParams.get("novelId")?.trim()

    if (!q || q.length < 1) {
      return Response.json({ results: [] })
    }

    const results: SearchResult[] = []

    // ── Search chapters ──
    let chapterQuery = db
      .select({
        id: schema.chapters.id,
        title: schema.chapters.title,
        content: schema.chapters.content,
        volumeId: schema.chapters.volumeId,
      })
      .from(schema.chapters)

    if (novelId) {
      // Only search chapters belonging to the given novel
      const volumeIds = db
        .select({ id: schema.volumes.id })
        .from(schema.volumes)
        .where(eq(schema.volumes.novelId, novelId))
        .all()
        .map((v) => v.id)

      if (volumeIds.length === 0) {
        // No volumes for this novel — skip chapter search
        // (but continue with other entities)
      } else {
        // Search within these volumes
        const chapters = db
          .select({
            id: schema.chapters.id,
            title: schema.chapters.title,
            content: schema.chapters.content,
            volumeId: schema.chapters.volumeId,
          })
          .from(schema.chapters)
          .all()
          .filter(
            (c) =>
              volumeIds.includes(c.volumeId) &&
              (c.title.toLowerCase().includes(q.toLowerCase()) ||
                c.content.toLowerCase().includes(q.toLowerCase()))
          )

        for (const ch of chapters.slice(0, 5)) {
          const vol = db
            .select({ title: schema.volumes.title })
            .from(schema.volumes)
            .where(eq(schema.volumes.id, ch.volumeId))
            .get()

          const matchedInTitle = ch.title.toLowerCase().includes(q.toLowerCase())
          results.push({
            type: "chapter",
            id: ch.id,
            title: ch.title,
            snippet: matchedInTitle ? ch.title : extractSnippet(ch.content, q),
            matchField: matchedInTitle ? "title" : "content",
            volumeTitle: vol?.title ?? "",
          })
        }
      }
    } else {
      // Global search across all chapters
      const pattern = `%${q}%`
      const chapters = db
        .select({
          id: schema.chapters.id,
          title: schema.chapters.title,
          content: schema.chapters.content,
          volumeId: schema.chapters.volumeId,
        })
        .from(schema.chapters)
        .where(
          or(
            like(schema.chapters.title, pattern),
            like(schema.chapters.content, pattern)
          )
        )
        .all()
        .slice(0, 5)

      for (const ch of chapters) {
        const vol = db
          .select({ title: schema.volumes.title })
          .from(schema.volumes)
          .where(eq(schema.volumes.id, ch.volumeId))
          .get()

        const matchedInTitle = ch.title.toLowerCase().includes(q.toLowerCase())
        results.push({
          type: "chapter",
          id: ch.id,
          title: ch.title,
          snippet: matchedInTitle ? ch.title : extractSnippet(ch.content, q),
          matchField: matchedInTitle ? "title" : "content",
          volumeTitle: vol?.title ?? "",
        })
      }
    }

    // ── Search characters ──
    const charPattern = `%${q}%`
    const charConditions: any[] = [
      or(
        like(schema.characters.name, charPattern),
        like(schema.characters.aliases, charPattern),
        like(schema.characters.personality, charPattern),
        like(schema.characters.background, charPattern)
      ),
    ]

    if (novelId) {
      charConditions.push(eq(schema.characters.novelId, novelId))
    }

    const chars = db
      .select()
      .from(schema.characters)
      .where(and(...charConditions))
      .all()
      .slice(0, 5)
    for (const c of chars) {
      const fields = [
        { key: "name", val: c.name },
        { key: "aliases", val: c.aliases },
        { key: "personality", val: c.personality },
        { key: "background", val: c.background },
      ]
      for (const f of fields) {
        if (f.val && f.val.toLowerCase().includes(q.toLowerCase())) {
          results.push({
            type: "character",
            id: c.id,
            name: c.name,
            matchField: f.key,
            snippet: f.val.length > 100 ? f.val.slice(0, 100) + "…" : f.val,
          })
          break // One result per character
        }
      }
    }

    // ── Search world terms ──
    const termConditions: any[] = [
      or(
        like(schema.worldTerms.term, charPattern),
        like(schema.worldTerms.definition, charPattern)
      ),
    ]

    if (novelId) {
      termConditions.push(eq(schema.worldTerms.novelId, novelId))
    }

    const terms = db
      .select()
      .from(schema.worldTerms)
      .where(and(...termConditions))
      .all()
      .slice(0, 5)
    for (const t of terms) {
      const matchedInDef = t.definition.toLowerCase().includes(q.toLowerCase())
      results.push({
        type: "world_term",
        id: t.id,
        term: t.term,
        matchField: matchedInDef ? "definition" : "term",
        snippet: matchedInDef ? extractSnippet(t.definition, q, 40) : t.term,
      })
    }

    // ── Search plot events ──
    const plotConditions: any[] = [
      or(
        like(schema.plotEvents.title, charPattern),
        like(schema.plotEvents.description, charPattern)
      ),
    ]

    if (novelId) {
      plotConditions.push(eq(schema.plotEvents.novelId, novelId))
    }

    const plots = db
      .select()
      .from(schema.plotEvents)
      .where(and(...plotConditions))
      .all()
      .slice(0, 5)
    for (const p of plots) {
      const matchedInDesc = p.description.toLowerCase().includes(q.toLowerCase())
      results.push({
        type: "plot_event",
        id: p.id,
        title: p.title,
        matchField: matchedInDesc ? "description" : "title",
        snippet: matchedInDesc ? extractSnippet(p.description, q, 40) : p.title,
      })
    }

    return Response.json({ results })
  } catch (err) {
    console.error("GET /api/search error:", err)
    return Response.json({ error: "搜索失败" }, { status: 500 })
  }
}
