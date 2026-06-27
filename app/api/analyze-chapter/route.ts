import { NextRequest } from "next/server"
import { callAI } from "@/lib/ai-config"

interface ExistingCharacter {
  id: string
  name: string
  aliases: string
  appearance: string
  personality: string
  background: string
  motivation: string
  arc: string
  notes: string
}

interface ExistingTerm {
  id: string
  term: string
}

export async function POST(request: NextRequest) {
  try {
    const { content, chapterTitle, characters, terms } = await request.json()

    if (!content || typeof content !== "string") {
      return Response.json({ error: "Missing content" }, { status: 400 })
    }

    // Truncate content to avoid exceeding token limits
    const maxContentLen = 8000
    const truncatedContent =
      content.length > maxContentLen
        ? content.slice(0, maxContentLen) + "\n\n……（章节过长已截断）"
        : content

    const existingChars = (characters as ExistingCharacter[] | undefined) ?? []
    const existingTerms = (terms as ExistingTerm[] | undefined) ?? []

    const charContext =
      existingChars.length > 0
        ? existingChars
            .map(
              (c) =>
                `- ${c.name}${c.aliases ? `（别称：${c.aliases}）` : ""}
  已记录——外貌：「${c.appearance || "无"}」 性格：「${c.personality || "无"}」 背景：「${c.background || "无"}」 动机：「${c.motivation || "无"}」 弧光：「${c.arc || "无"}」 备注：「${c.notes || "无"}」`
            )
            .join("\n")
        : "暂无"

    const systemPrompt = `你是一个专业的文学分析助手。你的任务是分析小说章节内容，提取三类信息并以 JSON 格式返回。

## 已有角色的当前档案
${charContext}

## 已有世界观设定
${existingTerms.length > 0 ? existingTerms.map((t) => `- ${t.term}`).join("\n") : "暂无"}

请分析该章节，并返回以下 JSON 结构（不要加 markdown 代码块标记）：

{
  "characterUpdates": [
    {
      "name": "角色名称",
      "changes": "本章中该角色发生了什么、有何新的展现",
      "appearance": "如果出现了新的外貌描写则填写，否则填空字符串",
      "personality": "如果展现了新的性格特征则填写，否则填空字符串",
      "background": "如果揭示了新的背景信息则填写，否则填空字符串",
      "motivation": "如果出现了新的动机则填写，否则填空字符串",
      "arc": "如果角色弧光有进展则填写，否则填空字符串",
      "notes": "针对本章内容的观察笔记，没有则填空字符串"
    }
  ],
  "newTerms": [
    {
      "term": "设定名称",
      "type": "地点|组织|物品|概念|魔法/科技|事件|时间|其他",
      "definition": "该设定的定义和描述",
      "notes": "补充说明"
    }
  ],
  "plotEvent": {
    "title": "本章情节摘要标题（10字以内）",
    "description": "本章主要情节描述（100字以内）"
  }
}

## 规则（重要）
1. characterUpdates：只包括在本章中**实际出场**的角色。
2. 对于**已有角色**：严格对照上面的「当前档案」，只填写**该章节新增**的信息，已经在档案中的内容不要再重复填写。
3. 对于**新角色**（不在档案中的）：所有字段都应该填写。
4. newTerms：只提取在本章中新出现的、不在已有设定列表中的世界观术语。
5. plotEvent：概括本章的核心情节。
6. 如果某类没有任何更新，返回空数组或 null。
7. 不要返回任何除了 JSON 之外的内容。`

    const rawText = await callAI(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `请分析以下章节「${chapterTitle || "未命名章节"}」的内容：\n\n${truncatedContent}`,
        },
      ],
      { max_tokens: 2048, temperature: 0.3, response_format: { type: "json_object" } }
    )

    if (!rawText) {
      return Response.json({ error: "AI 返回内容为空" }, { status: 502 })
    }

    // Parse JSON response
    let parsed: {
      characterUpdates: Array<{
        name: string
        changes: string
        appearance?: string
        personality?: string
        background?: string
        motivation?: string
        arc?: string
        notes?: string
      }>
      newTerms: Array<{
        term: string
        type: string
        definition: string
        notes: string
      }>
      plotEvent: { title: string; description: string } | null
    }

    try {
      parsed = JSON.parse(rawText)
    } catch {
      console.error("Failed to parse AI response as JSON:", rawText.slice(0, 200))
      return Response.json(
        { error: "AI 返回格式异常，请重试" },
        { status: 502 }
      )
    }

    // Validate and sanitize
    const characterUpdates = (parsed.characterUpdates || []).filter(
      (c: any) => c.name && c.name.trim()
    )

    // Dedup newTerms against existing terms (case-insensitive, also check if one contains the other)
    const existingTermNames = new Set(existingTerms.map((t) => t.term.trim().toLowerCase()))
    const newTerms = (parsed.newTerms || []).filter(
      (t: any) =>
        t.term &&
        t.term.trim() &&
        !existingTermNames.has(t.term.trim().toLowerCase())
    )
    const plotEvent = parsed.plotEvent?.title?.trim()
      ? { title: parsed.plotEvent.title.trim(), description: parsed.plotEvent.description?.trim() ?? "" }
      : null

    // Match character names to existing IDs
    const matchedUpdates = characterUpdates.map((cu) => {
      const existing = existingChars.find(
        (ec) =>
          ec.name === cu.name.trim() ||
          ec.aliases?.includes(cu.name.trim()) ||
          cu.name.trim().includes(ec.name)
      )
      return {
        ...cu,
        changes: cu.changes || `本章中「${cu.name}」出场。`,
        characterId: existing?.id ?? null,
        isExisting: !!existing,
      }
    })

    return Response.json({
      characterUpdates: matchedUpdates,
      newTerms,
      plotEvent,
    })
  } catch (err) {
    console.error("Analyze chapter error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "未知错误" },
      { status: 500 }
    )
  }
}
