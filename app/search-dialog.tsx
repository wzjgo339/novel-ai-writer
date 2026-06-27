"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Search,
  FileText,
  User,
  Globe,
  GitBranch,
  Loader2,
  CornerDownLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  type: "chapter" | "character" | "world_term" | "plot_event"
  id: string
  title?: string
  name?: string
  term?: string
  snippet?: string
  matchField?: string
  volumeTitle?: string
}

interface SearchDialogProps {
  open: boolean
  onClose: () => void
  novelId: string | null
  onNavigateToChapter: (chapterId: string) => void
  onNavigateToView: (view: "characters" | "world" | "outline", highlightId?: string) => void
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  chapter: "章节",
  character: "角色",
  world_term: "世界观",
  plot_event: "情节",
}

const TYPE_ICONS: Record<SearchResult["type"], typeof FileText> = {
  chapter: FileText,
  character: User,
  world_term: Globe,
  plot_event: GitBranch,
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SearchDialog({
  open,
  onClose,
  novelId,
  onNavigateToChapter,
  onNavigateToView,
}: SearchDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Focus input on open ──
  useEffect(() => {
    if (open) {
      setQuery("")
      setResults([])
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // ── Debounced search ──
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ q: query.trim() })
        if (novelId) params.set("novelId", novelId)
        const res = await fetch(`/api/search?${params.toString()}`)
        const data = await res.json()
        if (res.ok) {
          setResults(data.results ?? [])
          setSelectedIdx(0)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, novelId])

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIdx((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (results[selectedIdx]) {
          handleSelect(results[selectedIdx])
        }
      } else if (e.key === "Escape") {
        onClose()
      }
    },
    [results, selectedIdx, onClose]
  )

  // ── Select result ──
  const handleSelect = useCallback(
    (r: SearchResult) => {
      onClose()
      switch (r.type) {
        case "chapter":
          onNavigateToChapter(r.id)
          break
        case "character":
          onNavigateToView("characters", r.id)
          break
        case "world_term":
          onNavigateToView("world", r.id)
          break
        case "plot_event":
          onNavigateToView("outline", r.id)
          break
      }
    },
    [onClose, onNavigateToChapter, onNavigateToView]
  )

  if (!open) return null

  // Group results by type
  const grouped = new Map<string, SearchResult[]>()
  for (const r of results) {
    const key = r.type
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-xl bg-popover border border-border/60 rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        role="dialog"
        aria-label="全局搜索"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          {loading ? (
            <Loader2 className="size-4 text-muted-foreground/60 motion-safe:animate-spin shrink-0" />
          ) : (
            <Search className="size-4 text-muted-foreground/50 shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索章节、角色、设定、情节…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 text-foreground"
          />
          <kbd className="text-[10px] text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded font-mono border border-border/40">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.trim() && !loading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground/50">
              未找到结果
            </div>
          )}

          {results.length === 0 && !query.trim() && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground/40">
              输入关键词开始搜索
            </div>
          )}

          {Array.from(grouped.entries()).map(([type, items]) => {
            const Icon = TYPE_ICONS[type as SearchResult["type"]] ?? FileText
            return (
              <div key={type}>
                <div className="px-4 py-1.5 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider bg-muted/30">
                  {TYPE_LABELS[type as SearchResult["type"]]} ({items.length})
                </div>
                {items.map((r, i) => {
                  const globalIdx = results.indexOf(r)
                  const isSelected = globalIdx === selectedIdx
                  return (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => handleSelect(r)}
                      onMouseEnter={() => setSelectedIdx(globalIdx)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors text-sm",
                        isSelected
                          ? "bg-primary/10"
                          : "hover:bg-muted/30"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 mt-0.5 shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground/50"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground/85 truncate">
                          {r.title ?? r.name ?? r.term}
                          {r.volumeTitle && (
                            <span className="text-muted-foreground/40 ml-1.5 font-normal">
                              {r.volumeTitle}
                            </span>
                          )}
                        </div>
                        {r.snippet && r.matchField !== "title" && r.matchField !== "name" && r.matchField !== "term" && (
                          <div className="text-xs text-muted-foreground/60 truncate mt-0.5">
                            {r.snippet}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/40 shrink-0 mt-0.5">
                        <CornerDownLeft className="size-3" />
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border/40 bg-muted/20">
          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
            <kbd className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono border border-border/40">↑↓</kbd>
            导航
          </span>
          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
            <kbd className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono border border-border/40">Enter</kbd>
            选择
          </span>
        </div>
      </div>
    </div>
  )
}
