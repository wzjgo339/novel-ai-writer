/**
 * Stream AI response from a POST endpoint.
 * Uses ReadableStream to yield text chunks as they arrive from DeepSeek SSE.
 */
export async function* streamAI(
  url: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    let msg = `请求失败 (${res.status})`
    try {
      const errData = JSON.parse(errText)
      if (errData.error) msg = errData.error
    } catch {}
    throw new Error(msg)
  }

  // If not a stream, fallback to JSON response
  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("text/event-stream") && !contentType.includes("text/plain")) {
    const data = await res.json()
    if (data.text) {
      yield data.text
    } else if (data.error) {
      throw new Error(data.error)
    }
    return
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error("无法读取响应流")

  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith("data: ")) continue
        const data = trimmed.slice(6)
        if (data === "[DONE]") return

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          // Skip unparseable lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
