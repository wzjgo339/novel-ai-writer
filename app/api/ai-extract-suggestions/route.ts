import { NextRequest } from "next/server"
import { callAI } from "@/lib/ai-config"

export async function POST(request: NextRequest) {
  try {
    const { aiResponse, chapterContent } = await request.json() as {
      aiResponse: string
      chapterContent: string
    }

    if (!aiResponse || typeof aiResponse !== "string") {
      return Response.json({ error: "Missing aiResponse" }, { status: 400 })
    }

    const truncatedContent = chapterContent
      ? chapterContent.length > 3000
        ? chapterContent.slice(0, 3000) + "\n\n……（过长已截断）"
        : chapterContent
      : "（无）"

    const rawText = await callAI(
      [
        {
          role: "system",
          content: `你是一个专业的文学编辑助手。你的任务是从 AI 写作助手的回复中，提取出具体的、可操作的修改建议，以 JSON 数组格式返回。

规则：
1. 仔细阅读 AI 助手的回复，找出其中提到的所有**具体修改建议**。
2. 每条建议应是一个独立的、可执行的动作（如"增加环境描写""删减冗余对白"）。
3. 不要提取泛泛的评价（如"写得不错"），只提取 actionable 的建议。
4. 如果 AI 没有给出具体建议，返回空数组。
5. 每个建议对象格式：{"title": "简短标题（6字以内）", "description": "具体说明（30字以内）"}。

返回格式（不要加 markdown 代码块）：
{"suggestions": [{"title": "增加环境描写", "description": "在开头增加秋雨氛围的环境烘托"}, ...]}`,
        },
        {
          role: "user",
          content: `## 章节内容（供参考）\n${truncatedContent}\n\n## AI 助手的回复\n${aiResponse}`,
        },
      ],
      { max_tokens: 1024, temperature: 0.3, response_format: { type: "json_object" } }
    )

    if (!rawText) {
      return Response.json({ error: "AI 返回为空" }, { status: 502 })
    }

    let parsed: { suggestions: Array<{ title: string; description: string }> }
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return Response.json({ error: "AI 返回格式异常" }, { status: 502 })
    }

    const suggestions = (parsed.suggestions || []).filter(
      (s: any) => s.title && s.title.trim()
    )

    return Response.json({ suggestions })
  } catch (err) {
    console.error("Extract suggestions error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "未知错误" },
      { status: 500 }
    )
  }
}
