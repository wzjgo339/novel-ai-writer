import { NextRequest } from "next/server"
import { callAI } from "@/lib/ai-config"

export async function POST(request: NextRequest) {
  try {
    const { text, suggestions } = await request.json() as {
      text: string
      suggestions: Array<{ title: string; description: string }>
    }

    if (!text || typeof text !== "string") {
      return Response.json({ error: "Missing text" }, { status: 400 })
    }
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return Response.json({ error: "Missing suggestions" }, { status: 400 })
    }

    const truncatedText =
      text.length > 6000
        ? text.slice(0, 6000) + "\n\n……（过长已截断）"
        : text

    const suggestionsText = suggestions
      .map((s, i) => `${i + 1}. ${s.title}：${s.description}`)
      .join("\n")

    const result = await callAI(
      [
        {
          role: "system",
          content: `你是一个专业的文学改写助手。你的任务是根据用户提供的修改建议清单，对原文进行精准改写。

规则：
1. 严格对照每条建议进行修改，不要遗漏。
2. 保持原文的语气、人称、风格、视角完全一致。
3. 只修改和建议相关的内容，不要改动无关部分。
4. 不要添加 AI 的说明、标记或前缀，直接输出改写后的完整文本。
5. 如果某条建议不适用于原文，可以跳过，但要确保其他建议都得到执行。`,
        },
        {
          role: "user",
          content: `## 修改建议\n${suggestionsText}\n\n## 原文\n${truncatedText}\n\n请根据以上建议对原文进行改写，直接输出改写后的完整内容：`,
        },
      ],
      { max_tokens: 4096, temperature: 0.5 }
    )

    if (!result) {
      return Response.json({ error: "AI 返回内容为空" }, { status: 502 })
    }

    return Response.json({ text: result })
  } catch (err) {
    console.error("Apply suggestions error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "未知错误" },
      { status: 500 }
    )
  }
}
