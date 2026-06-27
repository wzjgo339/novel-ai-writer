import { NextRequest } from "next/server"
import { callAI } from "@/lib/ai-config"

const PROMPTS: Record<string, string> = {
  expand:
    "你是一个专业的文学写作助手。请将用户选中的内容进行扩写，增加细节描写、感官体验、心理活动、环境氛围等。保持原有的语气、人称和风格一致。直接返回扩写后的内容，不要加任何前缀说明、引号或标记。不要解释你做了什么。",
  condense:
    "你是一个专业的文学编辑助手。请将用户选中的内容进行缩写，保留核心信息和关键情节，删除冗余修饰和重复描述，使文字更简洁有力。保持原有的语气、人称和风格一致。直接返回缩写后的内容，不要加任何前缀说明、引号或标记。不要解释你做了什么。",
}

export async function POST(request: NextRequest) {
  try {
    const { text, mode, customInstruction } = await request.json()

    if (!text || typeof text !== "string") {
      return Response.json({ error: "Missing text" }, { status: 400 })
    }
    if (!mode || !["expand", "condense"].includes(mode)) {
      return Response.json({ error: "Invalid mode, use 'expand' or 'condense'" }, { status: 400 })
    }

    // Append custom instruction to expand prompt if provided
    const systemContent = mode === "expand" && customInstruction
      ? `${PROMPTS[mode]}\n\n额外要求：${customInstruction}`
      : PROMPTS[mode]

    const max_tokens = mode === "expand" ? 2048 : 1024
    const result = await callAI(
      [
        { role: "system", content: systemContent },
        {
          role: "user",
          content: mode === "expand"
            ? `请扩写以下内容：\n\n${text}`
            : `请缩写以下内容：\n\n${text}`,
        },
      ],
      { max_tokens, temperature: 0.7 }
    )

    if (!result) {
      return Response.json({ error: "AI 返回内容为空" }, { status: 502 })
    }

    return Response.json({ text: result })
  } catch (err) {
    console.error("AI rewrite error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "未知错误" },
      { status: 500 }
    )
  }
}
