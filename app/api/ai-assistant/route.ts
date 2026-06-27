import { NextRequest } from "next/server"
import { callAIStream, STREAM_HEADERS } from "@/lib/ai-config"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface AssistantContext {
  chapterTitle?: string
  chapterContent?: string
  characters?: Array<{ name: string; appearance?: string; personality?: string; background?: string; motivation?: string; arc?: string }>
  terms?: Array<{ term: string; type: string; definition: string }>
  plotEvents?: Array<{ title: string; description: string }>
}

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json() as {
      messages: ChatMessage[]
      context?: AssistantContext
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Missing messages" }, { status: 400 })
    }

    // Build context summary (truncate long content)
    let contextBlock = ""
    if (context) {
      const parts: string[] = []

      if (context.chapterTitle) {
        parts.push(`## 当前章节\n标题：${context.chapterTitle}`)
      }

      if (context.chapterContent) {
        const truncated =
          context.chapterContent.length > 4000
            ? context.chapterContent.slice(0, 4000) + "\n\n……（内容过长已截断）"
            : context.chapterContent
        parts.push(`内容：\n${truncated}`)
      }

      if (context.characters && context.characters.length > 0) {
        const charList = context.characters
          .map(
            (c) =>
              `- ${c.name}${c.personality ? `（${c.personality.slice(0, 80)}）` : ""}`
          )
          .join("\n")
        parts.push(`## 已有角色\n${charList}`)
      }

      if (context.terms && context.terms.length > 0) {
        const termList = context.terms
          .map((t) => `- ${t.term}（${t.type}）`)
          .join("\n")
        parts.push(`## 世界观设定\n${termList}`)
      }

      if (context.plotEvents && context.plotEvents.length > 0) {
        const plotList = context.plotEvents
          .map((e) => `- ${e.title}：${e.description?.slice(0, 100)}`)
          .join("\n")
        parts.push(`## 情节大纲\n${plotList}`)
      }

      if (parts.length > 0) {
        contextBlock = `## 以下是你需要了解的写作上下文：\n\n${parts.join("\n\n")}\n\n`
      }
    }

    const systemPrompt = `你是一位资深文学编辑和写作教练，专为长篇小说作者提供创作辅助。你有丰富的文学素养，能够从情节、人物、节奏、文笔等多个维度给出专业建议。

你的工作原则：
1. 回答要**具体、有建设性**，避免空洞的夸奖。
2. 如果作者卡文了，提供3-5个具体的展开方向，而不是笼统地说"加油"。
3. 对文笔的评价要指出具体哪句好、为什么好，哪句可以改进、怎么改。
4. 回答简洁但不失深度，中文表达流畅自然。
5. 除非作者要求，不要替作者直接改写大段文字。
6. 如果作者询问情节建议，结合已有的角色和设定给出针对性建议。

${contextBlock}现在开始和作者对话。作答时保持友好、专业的语气。`

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const response = await callAIStream(
      apiMessages,
      { max_tokens: 2048, temperature: 0.7 }
    )

    return new Response(response.body, { headers: STREAM_HEADERS })
  } catch (err) {
    console.error("AI assistant error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "未知错误" },
      { status: 500 }
    )
  }
}
