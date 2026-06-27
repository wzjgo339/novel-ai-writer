import { toast } from "sonner"

// ─── Generic API helpers with toast notifications ──────────────────────────

async function handleResponse<T>(res: Response, context: string): Promise<T> {
  let data: any
  try {
    data = await res.json()
  } catch {
    data = { error: `服务器错误 (${res.status})` }
  }
  if (!res.ok) {
    const msg = data.error || `请求失败 (${res.status})`
    toast.error(msg, { description: context })
    throw new Error(msg)
  }
  return data as T
}

export async function apiGet<T>(url: string, context?: string): Promise<T> {
  const res = await fetch(url)
  return handleResponse<T>(res, context || `GET ${url}`)
}

export async function apiPost<T>(url: string, body: unknown, context?: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res, context || `POST ${url}`)
}

export async function apiPatch(url: string, body: unknown, context?: string): Promise<void> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  await handleResponse(res, context || `PATCH ${url}`)
}

export async function apiDelete(url: string, context?: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" })
  await handleResponse(res, context || `DELETE ${url}`)
}
