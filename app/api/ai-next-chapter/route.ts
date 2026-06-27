import { NextRequest } from "next/server"

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { novelId, currentVolumeId, requirements, suggestedTitle, maxTokens, targetWords, context, styleGuide } = body as any

    if (!novelId || !currentVolumeId) {
      return Response.json({ error: "缺少作品 ID 或卷 ID" }, { status: 400 })
    }
    if (!requirements || typeof requirements !== "string" || !requirements.trim()) {
      return Response.json({ error: "请描述下一章的写作要求" }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey || apiKey === "your-api-key-here") {
      return Response.json({ error: "请先配置 DEEPSEEK_API_KEY" }, { status: 401 })
    }

    // ── Build system prompt ──
    const systemPrompt = `你是一个专业的文学创作助手，擅长长篇小说的连续性创作。

根据用户提供的所有上下文信息，生成小说的下一章内容。确保情节、人物、世界观完全连贯。

## 前情提要
${context?.previousChapters || "（暂无，这是作品的第一章）"}

## 当前角色档案
${context?.characters || "（暂无角色信息）"}

## 角色关系
${context?.relationships || "（暂无关系记录）"}

## 世界观设定
${context?.terms || "（暂无设定信息）"}

## 已完成的情节事件
${context?.plotEvents || "（暂无事件记录）"}

${styleGuide ? `\n${styleGuide}\n` : ""}

## 写作要求
${requirements}

## 输出规则
1. 保持所有人物的性格、语气、行为模式与已有档案完全一致。
2. 情节发展必须与已有的事件时间线连贯，不能出现矛盾。
3. 合理使用已有的世界观设定，新设定应自然引入并补充说明。
4. 章节结尾应自然过渡到后续发展空间。
5. **直接输出章节正文，不要加任何前缀说明、标题、引号或标记。**
6. 正文中不要出现"第X章"之类的章节编号。
7. 目标字数：约 ${targetWords || 2000} 字（请尽量接近这个篇幅，不要过于简短）。`

    const userMsg = suggestedTitle?.trim()
      ? `请根据以上要求，生成标题为「${suggestedTitle.trim()}」的下一章内容。`
      : `请根据以上要求，生成下一章的内容。`

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        max_tokens: Math.min(Math.max(parseInt(maxTokens, 10) || 2000, 500), 8192),
        temperature: 0.75,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return Response.json(
        { error: `DeepSeek API 请求失败 (${response.status})` },
        { status: 502 }
      )
    }

    // Stream the response back to the client
    return new Response(response.body, { headers: STREAM_HEADERS })
  } catch (err) {
    console.error("AI next chapter error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "生成失败" },
      { status: 500 }
    )
  }
}
