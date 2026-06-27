"use client"

import { useMemo, useCallback } from "react"
import { diffChars } from "diff"
import { Sparkles, FileText, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// ─── Types ──────────────────────────────────────────────────────────────────

interface DiffReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  originalText: string
  rewrittenText: string
  onAccept: (finalText: string) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DiffReviewDialog({
  open,
  onOpenChange,
  originalText,
  rewrittenText,
  onAccept,
}: DiffReviewDialogProps) {
  // ── Compute diff ──

  const diffParts = useMemo(() => {
    try {
      return diffChars(originalText, rewrittenText)
    } catch {
      return [{ value: rewrittenText, added: false, removed: false }] as ReturnType<typeof diffChars>
    }
  }, [originalText, rewrittenText])

  // ── Stats ──

  const stats = useMemo(() => {
    let added = 0,
      removed = 0
    for (const p of diffParts) {
      if (p.added) added += p.value.length
      else if (p.removed) removed += p.value.length
    }
    const changeSegments = diffParts.filter((p) => p.added || p.removed).length
    return { added, removed, changeSegments }
  }, [diffParts])

  // ── No changes? ──

  const unchanged = rewrittenText === originalText

  // ── Handlers ──

  const handleAccept = useCallback(() => {
    onAccept(rewrittenText)
  }, [rewrittenText, onAccept])

  // ── Render ──

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            修改对比
          </DialogTitle>
          <DialogDescription>
            AI 对原文进行了修改，
            <span className="font-medium text-green-600 dark:text-green-400">
              绿色标注
            </span>
            为新增，
            <span className="font-medium text-red-600 dark:text-red-400 line-through">
              红色标注
            </span>
            为删除。确认无误后点击「接受」。
          </DialogDescription>
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
          {/* ═══ Diff View (read only) ═══ */}
          <div className="rounded-lg border border-border/60 bg-muted/25 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <FileText className="size-3.5 shrink-0" aria-hidden="true" />
              <span>AI 修改对比</span>
              <span className="ml-auto text-green-600/70 tabular-nums">
                +{stats.added}
              </span>
              <span className="text-red-600/70 tabular-nums">
                -{stats.removed}
              </span>
              <span className="text-muted-foreground/50">
                · {stats.changeSegments} 处
              </span>
            </div>

            <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans select-all rounded-sm">
              {unchanged ? (
                <span className="text-muted-foreground/60 italic">AI 未对原文做修改</span>
              ) : (
                diffParts.map((part, i) => {
                  if (part.added) {
                    return (
                      <span
                        key={i}
                        className="bg-green-500/15 text-green-700 dark:text-green-300 rounded-sm px-0.5"
                      >
                        {part.value}
                      </span>
                    )
                  }
                  if (part.removed) {
                    return (
                      <span
                        key={i}
                        className="bg-red-500/15 text-red-700 dark:text-red-300 rounded-sm px-0.5 line-through"
                      >
                        {part.value}
                      </span>
                    )
                  }
                  return <span key={i}>{part.value}</span>
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground/60">
              {unchanged
                ? "无差异"
                : `共 ${stats.changeSegments} 处修改（+${stats.added} / -${stats.removed}）`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                拒绝
              </Button>
              <Button onClick={handleAccept} disabled={unchanged} className="gap-1.5">
                <Check className="size-3.5" aria-hidden="true" />
                接受修改
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
