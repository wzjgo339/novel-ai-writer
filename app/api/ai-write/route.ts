import { NextRequest } from "next/server"
import { callAIStream, STREAM_HEADERS } from "@/lib/ai-config"

export async function POST(request: NextRequest) {
  try {
    const { content, styleGuide } = await request.json()

    if (!content || typeof content !== "string") {
      return Response.json({ error: "Missing content" }, { status: 400 })
    }

    const systemMsg = styleGuide
      ? `你是一个专业的写作助手。请根据用户提供的上下文，续写后面的内容。\n\n${styleGuide}\n\n直接返回续写内容，不要加任何前缀说明或引号。`
      : "你是一个专业的写作助手。请根据用户提供的上下文，续写后面的内容。保持语气和风格一致，语言流畅自然。直接返回续写内容，不要加任何前缀说明或引号。"

    const response = await callAIStream(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: `请续写以下内容：\n\n${content}` },
      ],
      { max_tokens: 1024, temperature: 0.8 }
    )

    // Stream the response back to the client
    return new Response(response.body, { headers: STREAM_HEADERS })
  } catch (err) {
    console.error("AI write error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "未知错误" },
      { status: 500 }
    )
  }
}
