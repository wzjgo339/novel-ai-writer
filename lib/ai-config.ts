/**
 * Shared AI configuration for DeepSeek API.
 * All AI route files import from here to avoid duplication.
 */

// ─── API endpoint ──────────────────────────────────────────────────────────
export const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions"

// ─── Model ─────────────────────────────────────────────────────────────────
export const DEEPSEEK_MODEL = "deepseek-chat"

// ─── Helper: get API key with validation ──────────────────────────────────
export function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key || key === "your-api-key-here") {
    throw new Error("请先在 .env.local 中配置 DEEPSEEK_API_KEY")
  }
  return key
}

// ─── Shared response headers for streaming ────────────────────────────────
export const STREAM_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
}

// ─── Helper: build the fetch POST body (streaming or not) ────────────────
export function buildBody(
  messages: { role: string; content: string }[],
  opts?: {
    max_tokens?: number
    temperature?: number
    stream?: boolean
    response_format?: { type: "json_object" }
  }
) {
  const body: Record<string, any> = {
    model: DEEPSEEK_MODEL,
    messages,
    max_tokens: opts?.max_tokens ?? 1024,
    temperature: opts?.temperature ?? 0.7,
    stream: opts?.stream ?? false,
  }
  if (opts?.response_format) {
    body.response_format = opts.response_format
  }
  return body
}

// ─── Helper: execute a non-streaming AI call ──────────────────────────────
export async function callAI(
  messages: { role: string; content: string }[],
  opts?: {
    max_tokens?: number
    temperature?: number
    response_format?: { type: "json_object" }
  }
): Promise<string> {
  const apiKey = getApiKey()
  const response = await fetch(DEEPSEEK_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildBody(messages, { ...opts, stream: false })),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error("DeepSeek API error:", response.status, err)
    throw new Error(`DeepSeek API 请求失败 (${response.status})`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ""
}

// ─── Helper: execute a streaming AI call, returns a ReadableStream body ──
export async function callAIStream(
  messages: { role: string; content: string }[],
  opts?: { max_tokens?: number; temperature?: number }
): Promise<Response> {
  const apiKey = getApiKey()
  const response = await fetch(DEEPSEEK_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildBody(messages, { ...opts, stream: true })),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error("DeepSeek API error:", response.status, err)
    throw new Error(`DeepSeek API 请求失败 (${response.status})`)
  }

  return response
}
