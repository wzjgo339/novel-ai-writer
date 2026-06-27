"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Sparkles,
  X,
  Loader2,
  Send,
  Bot,
  User,
  BookOpen,
  Plus,
  MessageSquare,
  Trash2,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { streamAI } from "@/lib/stream"
import type { Character, WorldTerm, PlotEvent, Conversation, ConversationMessage } from "@/lib/types"
import { SuggestionListDialog } from "./suggestion-list-dialog"
import type { SuggestionItem } from "./suggestion-list-dialog"

// ─── Types ──────────────────────────────────────────────────────────────────

interface AiAssistantPanelProps {
  open: boolean
  onClose: () => void
  novelId: string
  chapterTitle: string
  chapterContent: string
  onRewriteApplied?: (newContent: string) => void
}

// ─── Suggested prompts ──────────────────────────────────────────────────────

const SUGGESTIONS = [
  "帮我分析这一段写得怎么样",
  "我卡文了，给点建议",
  "这个角色接下来该怎么发展",
  "检查情节逻辑问题",
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + "…"
}

function timeLabel(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "刚刚"
  if (min < 60) return `${min}分钟前`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}小时前`
  return d.toLocaleDateString("zh-CN")
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AiAssistantPanel({
  open,
  onClose,
  novelId,
  chapterTitle,
  chapterContent,
  onRewriteApplied,
}: AiAssistantPanelProps) {
  // ── State: conversations ──
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [convLoading, setConvLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // ── State: messages ──
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [messagesLoading, setMessagesLoading] = useState(false)

  // Lazy-loaded context data
  const contextRef = useRef<{
    characters?: Character[]
    terms?: WorldTerm[]
    plotEvents?: PlotEvent[]
  }>({})
  const [contextLoaded, setContextLoaded] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ── State: suggestion list ──
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false)
  const [extractingSuggestions, setExtractingSuggestions] = useState(false)
  const [pendingSuggestions, setPendingSuggestions] = useState<SuggestionItem[]>([])
  const [suggestionError, setSuggestionError] = useState("")

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // ── Focus input when panel opens ──
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  // ── Click outside dropdown to close ──
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [dropdownOpen])

  // ── Fetch context data when panel opens ──
  useEffect(() => {
    if (!open || contextLoaded) return
    setContextLoaded(true)

    const fetchContext = async () => {
      try {
        const [charRes, termRes, plotRes] = await Promise.all([
          fetch(`/api/characters?novelId=${novelId}`),
          fetch(`/api/world-terms?novelId=${novelId}`),
          fetch(`/api/plot-events?novelId=${novelId}`),
        ])
        const [charData, termData, plotData] = await Promise.all([
          charRes.json(),
          termRes.json(),
          plotRes.json(),
        ])
        contextRef.current = {
          characters: charData.characters ?? [],
          terms: termData.terms ?? [],
          plotEvents: plotData.events ?? [],
        }
      } catch {
        // Non-critical
      }
    }
    fetchContext()
  }, [open, novelId, contextLoaded])

  // ── Load conversations when panel opens / novelId changes ──
  useEffect(() => {
    if (!open || !novelId) return

    const loadConversations = async () => {
      setConvLoading(true)
      try {
        const res = await fetch(`/api/conversations?novelId=${novelId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        const list: Conversation[] = data.conversations ?? []

        setConversations(list)

        if (list.length > 0) {
          // Restore last active, or pick first
          setActiveId((prev) => {
            if (prev && list.some((c) => c.id === prev)) return prev
            return list[0].id
          })
        } else {
          // Create default conversation
          const createRes = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ novelId }),
          })
          const createData = await createRes.json()
          if (createRes.ok && createData.conversation) {
            setConversations([createData.conversation])
            setActiveId(createData.conversation.id)
          }
        }
      } catch (err) {
        console.error("Load conversations failed:", err)
      } finally {
        setConvLoading(false)
      }
    }

    loadConversations()
  }, [open, novelId])

  // ── Load messages when activeId changes ──
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      setMessagesLoading(true)
      try {
        const res = await fetch(`/api/conversations/${activeId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        const msgs: ConversationMessage[] = data.messages ?? []

        if (msgs.length === 0) {
          // Add welcome message (not persisted)
          setMessages([
            {
              id: "welcome",
              conversationId: activeId,
              role: "assistant",
              content:
                "你好！我是你的 AI 写作助手 👋 我可以帮你分析文笔、提供创作建议、帮你理清情节思路。有什么想问的尽管说～",
              createdAt: new Date().toISOString(),
            },
          ])
        } else {
          setMessages(msgs)
        }
      } catch (err) {
        console.error("Load messages failed:", err)
      } finally {
        setMessagesLoading(false)
      }
    }

    loadMessages()
  }, [activeId])

  // ── Notify when chapter changes ──
  const prevChapterRef = useRef(chapterTitle)
  useEffect(() => {
    if (
      open &&
      chapterTitle &&
      prevChapterRef.current &&
      prevChapterRef.current !== chapterTitle
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: `chapter-${Date.now()}`,
          conversationId: activeId ?? "",
          role: "assistant",
          content: `📖 已切换到「${chapterTitle}」，我的建议将基于当前章节内容。`,
          createdAt: new Date().toISOString(),
        },
      ])
    }
    prevChapterRef.current = chapterTitle
  }, [chapterTitle, open, activeId])

  // ── Start new conversation ──
  const startNewConversation = useCallback(async () => {
    if (!novelId) return
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const conv: Conversation = data.conversation

      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.id)
      setDropdownOpen(false)
      setError("")
    } catch (err) {
      console.error("Create conversation failed:", err)
    }
  }, [novelId])

  // ── Delete conversation ──
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" })
        setConversations((prev) => {
          const next = prev.filter((c) => c.id !== id)
          if (id === activeId) {
            setActiveId(next.length > 0 ? next[0].id : null)
          }
          return next
        })
      } catch (err) {
        console.error("Delete conversation failed:", err)
      }
    },
    [activeId]
  )

  // ── Save messages to DB ──
  const persistMessages = useCallback(
    async (convId: string, newMsgs: { role: "user" | "assistant"; content: string }[]) => {
      if (!convId) return
      try {
        // Auto-title: use first user message as title
        const firstUser = newMsgs.find((m) => m.role === "user")
        const body: Record<string, unknown> = { messages: newMsgs }
        if (firstUser) {
          body.title = truncate(firstUser.content, 30)
        }
        await fetch(`/api/conversations/${convId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        // Refresh conversation list to update title / timestamp
        const convRes = await fetch(`/api/conversations?novelId=${novelId}`)
        const convData = await convRes.json()
        if (convRes.ok) {
          setConversations(convData.conversations ?? [])
        }
      } catch (err) {
        console.error("Persist messages failed:", err)
      }
    },
    [novelId]
  )

  // ── Send message ──
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading || !activeId) return

    setInput("")
    setError("")

    const userMsg: ConversationMessage = {
      id: `user-${Date.now()}`,
      conversationId: activeId,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => {
      // Remove welcome message if present
      const filtered = prev.filter((m) => m.id !== "welcome")
      return [...filtered, userMsg]
    })
    setLoading(true)

    try {
      // Build context
      const ctx = contextRef.current
      const ctxPayload = {
        chapterTitle,
        chapterContent,
  onRewriteApplied,
        characters: ctx.characters?.map((c) => ({
          name: c.name,
          appearance: c.appearance,
          personality: c.personality,
          background: c.background,
          motivation: c.motivation,
          arc: c.arc,
        })),
        terms: ctx.terms?.map((t) => ({
          term: t.term,
          type: t.type,
          definition: t.definition,
        })),
        plotEvents: ctx.plotEvents?.map((e) => ({
          title: e.title,
          description: e.description,
        })),
      }

      // Build recent messages for AI (excluding welcome, including new user message)
      const currentMessages = [...messages.filter((m) => m.id !== "welcome"), userMsg]
      const recentMessages = currentMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Stream the response — first chunk triggers bubble, rest update it
      const assistantId = `assistant-${Date.now()}`
      let fullContent = ""
      let bubbleAdded = false
      for await (const chunk of streamAI("/api/ai-assistant", {
        messages: recentMessages,
        context: ctxPayload,
      })) {
        fullContent += chunk
        if (!bubbleAdded) {
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              conversationId: activeId,
              role: "assistant" as const,
              content: fullContent,
              createdAt: new Date().toISOString(),
            },
          ])
          bubbleAdded = true
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
          )
        }
      }

      if (!fullContent) throw new Error("AI 返回内容为空")

      // Persist both user and assistant messages
      persistMessages(activeId, [
        { role: "user", content: text },
        { role: "assistant", content: fullContent },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败")
    } finally {
      setLoading(false)
    }
  }, [input, loading, activeId, messages, chapterTitle, chapterContent,
  onRewriteApplied, persistMessages])

  // ── Extract suggestions from AI response and open dialog ──
  const handleExtractSuggestions = useCallback(
    async (aiResponse: string) => {
      setExtractingSuggestions(true)
      setSuggestionError("")

      try {
        const res = await fetch("/api/ai-extract-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aiResponse,
            chapterContent,
  onRewriteApplied,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "提取失败")

        const raw = (data.suggestions ?? []) as Array<{ title: string; description: string }>
        const items: SuggestionItem[] = raw.map((s, i) => ({
          id: `sug-${i}-${Date.now()}`,
          title: s.title,
          description: s.description,
        }))

        if (items.length === 0) {
          setSuggestionError("AI 回复中未检测到具体的修改建议")
          return
        }

        setPendingSuggestions(items)
        setSuggestionDialogOpen(true)
      } catch (err) {
        setSuggestionError(err instanceof Error ? err.message : "提取建议失败")
      } finally {
        setExtractingSuggestions(false)
      }
    },
    [chapterContent]
  )

  // ── Apply rewrite from suggestions ──
  const handleSuggestionRewrite = useCallback(
    (newContent: string) => {
      onRewriteApplied?.(newContent)
    },
    [onRewriteApplied]
  )

  // ── Keyboard: Enter to send, Shift+Enter for newline ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage]
  )

  // ── Insert suggestion ──
  const insertSuggestion = useCallback((suggestion: string) => {
    setInput(suggestion)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // ── Error retry ──
  const retry = useCallback(() => {
    setError("")
    sendMessage()
  }, [sendMessage])

  if (!open) return null

  const activeConv = conversations.find((c) => c.id === activeId)
  const showSuggestions = messages.length <= 1 && !loading

  return (
    <div className="h-full border-l border-border/60 bg-card/95 backdrop-blur-md flex flex-col min-h-0 overflow-hidden animate-fade-in">
      {/* ══════════════════════════════════════════════════════════════════
          Header with conversation manager
          ══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 shrink-0 gap-2">
        {/* Left: AI badge + conversation selector */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          </div>

          {/* Conversation dropdown */}
          <div className="relative min-w-0 flex-1" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              disabled={convLoading}
              className="flex items-center gap-1.5 w-full text-sm font-medium text-foreground/80 hover:text-foreground transition-colors truncate disabled:opacity-50"
            >
              <span className="truncate">
                {convLoading ? "加载中…" : activeConv?.title ?? "AI 助手"}
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 text-muted-foreground/60 shrink-0 transition-transform",
                  dropdownOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-border/60 bg-popover shadow-lg z-50 max-h-64 overflow-y-auto animate-fade-in">
                <div className="p-1">
                  {conversations.map((c) => {
                    const isActive = c.id === activeId
                    return (
                      <div key={c.id} className="flex items-center group">
                        <button
                          onClick={() => {
                            setActiveId(c.id)
                            setDropdownOpen(false)
                            setError("")
                          }}
                          className={cn(
                            "flex-1 flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-left transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/50 text-foreground/80"
                          )}
                        >
                          <MessageSquare
                            className={cn(
                              "size-3.5 shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground/50"
                            )}
                          />
                          <span className="truncate flex-1">{c.title}</span>
                          <span className="text-[10px] text-muted-foreground/50 shrink-0">
                            {timeLabel(c.updatedAt)}
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteConversation(c.id)
                          }}
                          className="shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded transition-all"
                          aria-label={`删除会话「${c.title}」`}
                        >
                          <Trash2 className="size-3 text-muted-foreground/50 hover:text-destructive transition-colors" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {loading && (
            <Loader2
              className="size-3 motion-safe:animate-spin text-primary/50 mr-1"
              aria-hidden="true"
            />
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={startNewConversation}
            aria-label="新建会话"
            className="text-muted-foreground/50 hover:text-primary hover:bg-primary/5"
            title="新建会话"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            aria-label="关闭 AI 助手"
            className="text-muted-foreground/50 hover:text-muted-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Context indicator
          ══════════════════════════════════════════════════════════════════ */}
      {chapterTitle && (
        <div className="px-4 py-1.5 bg-primary/[0.03] border-b border-border/40 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
            <BookOpen className="size-3" aria-hidden="true" />
            <span className="truncate">当前章节：{chapterTitle}</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Messages
          ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 motion-safe:animate-spin text-muted-foreground/40" />
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-1.5">
              <div
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full mt-0.5",
                    msg.role === "user" ? "bg-primary/10" : "bg-amber-500/10"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="size-3.5 text-primary/60" aria-hidden="true" />
                  ) : (
                    <Bot className="size-3.5 text-amber-600/60 dark:text-amber-400/60" aria-hidden="true" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[calc(100%-40px)] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-[4px]"
                      : "bg-muted/60 text-foreground/85 rounded-tl-[4px]"
                  )}
                >
                  {msg.content}
                </div>
              </div>

              {msg.role === "assistant" && !msg.id.startsWith("welcome") && !msg.id.startsWith("chapter-") && (
                <div className="flex justify-start ml-9">
                  <button
                    onClick={() => handleExtractSuggestions(msg.content)}
                    disabled={extractingSuggestions}
                    className="group flex items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1 text-[11px] text-muted-foreground/60 hover:text-primary/70 hover:border-primary/30 hover:bg-primary/[0.03] transition-all disabled:opacity-50"
                  >
                    {extractingSuggestions ? (
                      <Loader2 className="size-3 motion-safe:animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    <span>{extractingSuggestions ? "提取中…" : "生成建议清单"}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2.5 flex-row">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 mt-0.5">
              <Bot className="size-3.5 text-amber-600/60" aria-hidden="true" />
            </div>
            <div className="rounded-xl rounded-tl-[4px] bg-muted/60 px-4 py-3">
              <div className="flex gap-1">
                <span
                  className="size-1.5 rounded-full bg-muted-foreground/40 motion-safe:animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="size-1.5 rounded-full bg-muted-foreground/40 motion-safe:animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="size-1.5 rounded-full bg-muted-foreground/40 motion-safe:animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive px-1">
            <span>发送失败：{error}</span>
            <button
              onClick={retry}
              className="underline hover:no-underline font-medium"
            >
              重试
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Suggestions
          ══════════════════════════════════════════════════════════════════ */}
      {showSuggestions && (
        <div className="px-4 pb-2 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => insertSuggestion(s)}
                className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground/80 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Input
          ══════════════════════════════════════════════════════════════════ */}
      <div className="px-4 py-3 border-t border-border/60 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题…"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/40 min-h-[36px] max-h-[120px] leading-relaxed"
            disabled={loading || !activeId}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || loading || !activeId}
            className="shrink-0 size-9"
            aria-label="发送"
          >
            {loading ? (
              <Loader2 className="size-4 motion-safe:animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-center">
          Enter 发送 · Shift+Enter 换行
        </p>
      </div>

      {suggestionError && (
        <div className="px-4 py-2 shrink-0 border-t border-border/40">
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <span>{suggestionError}</span>
            <button
              onClick={() => setSuggestionError("")}
              className="underline hover:no-underline font-medium"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <SuggestionListDialog
        open={suggestionDialogOpen}
        onOpenChange={setSuggestionDialogOpen}
        initialSuggestions={pendingSuggestions}
        chapterContent={chapterContent}
        onApplied={handleSuggestionRewrite}
      />
    </div>
  )
}
