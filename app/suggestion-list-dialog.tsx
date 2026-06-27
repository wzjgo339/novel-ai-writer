"use client"

import { useCallback, useState } from "react"
import {
  Sparkles,
  Loader2,
  Check,
  Plus,
  X,
  Trash2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SuggestionItem {
  id: string
  title: string
  description: string
}

interface SuggestionListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSuggestions: SuggestionItem[]
  chapterContent: string
  onApplied: (rewrittenText: string) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SuggestionListDialog({
  open,
  onOpenChange,
  initialSuggestions,
  chapterContent,
  onApplied,
}: SuggestionListDialogProps) {
  const [items, setItems] = useState<SuggestionItem[]>(initialSuggestions)
  const [checked, setChecked] = useState<Set<string>>(
    new Set(initialSuggestions.map((s) => s.id))
  )
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState("")
  const [customMode, setCustomMode] = useState(false)
  const [customTitle, setCustomTitle] = useState("")
  const [customDesc, setCustomDesc] = useState("")

  // Reset when dialog opens with new suggestions
  const [prevSnapshot, setPrevSnapshot] = useState("")
  const snapshotKey = JSON.stringify(initialSuggestions.map((s) => s.id))
  if (open && snapshotKey !== prevSnapshot) {
    setPrevSnapshot(snapshotKey)
    setItems(initialSuggestions)
    setChecked(new Set(initialSuggestions.map((s) => s.id)))
    setError("")
    setCustomMode(false)
    setCustomTitle("")
    setCustomDesc("")
  }

  // ── Toggle checkbox ──

  const toggleItem = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ── Remove a suggestion ──

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((s) => s.id !== id))
    setChecked((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  // ── Add custom suggestion ──

  const addCustom = useCallback(() => {
    if (!customTitle.trim()) return
    const id = `custom-${Date.now()}`
    setItems((prev) => [
      ...prev,
      { id, title: customTitle.trim(), description: customDesc.trim() },
    ])
    setChecked((prev) => new Set(prev).add(id))
    setCustomTitle("")
    setCustomDesc("")
    setCustomMode(false)
  }, [customTitle, customDesc])

  // ── Apply selected ──

  const applySelected = useCallback(async () => {
    const selected = items.filter((s) => checked.has(s.id))
    if (selected.length === 0) {
      setError("请至少选择一条建议")
      return
    }

    setApplying(true)
    setError("")

    try {
      const res = await fetch("/api/ai-apply-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: chapterContent,
          suggestions: selected.map((s) => ({
            title: s.title,
            description: s.description,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "改写失败")
      if (!data.text) throw new Error("AI 返回内容为空")

      onApplied(data.text)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "应用失败")
    } finally {
      setApplying(false)
    }
  }, [items, checked, chapterContent, onApplied, onOpenChange])

  // ── Count ──

  const selectedCount = checked.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            修改建议清单
          </DialogTitle>
          <DialogDescription>
            勾选你希望采纳的建议，也可以自行添加新的修改要求，AI 将据此进行精准改写。
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 py-2 space-y-2">
          {items.length === 0 && !customMode && (
            <p className="text-sm text-muted-foreground/60 italic py-8 text-center">
              暂无建议，可以手动添加
            </p>
          )}

          {items.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                checked.has(s.id)
                  ? "border-primary/30 bg-primary/[0.02]"
                  : "border-border/60 bg-transparent"
              )}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleItem(s.id)}
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded border transition-colors mt-0.5",
                  checked.has(s.id)
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border bg-transparent"
                )}
                aria-label={checked.has(s.id) ? "取消选择" : "选择"}
              >
                {checked.has(s.id) && <Check className="size-3" />}
              </button>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{s.title}</div>
                {s.description && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {s.description}
                  </p>
                )}
              </div>

              {/* Remove button (only for custom items) */}
              {s.id.startsWith("custom-") && (
                <button
                  onClick={() => removeItem(s.id)}
                  className="shrink-0 p-1 text-muted-foreground/30 hover:text-destructive transition-colors mt-0.5"
                  aria-label={`删除「${s.title}」`}
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add custom suggestion form */}
          {customMode ? (
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.02] px-3 py-3 space-y-2">
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="建议标题（如：增加心理描写）"
                className="h-8 text-sm"
                autoFocus
              />
              <Input
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="具体说明（可选，如：在主角犹豫时增加内心独白）"
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button size="xs" onClick={addCustom} disabled={!customTitle.trim()}>
                  <Check className="size-3 mr-1" />
                  添加
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setCustomMode(false)
                    setCustomTitle("")
                    setCustomDesc("")
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCustomMode(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-2.5 text-sm text-muted-foreground/60 hover:text-foreground/80 hover:border-border/80 transition-colors"
            >
              <Plus className="size-4" />
              <span>添加自定义建议</span>
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-2">
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-3" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="border-t border-border/60 pt-4 mt-2">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground/60">
              {selectedCount > 0
                ? `已选择 ${selectedCount} 条建议`
                : "未选择任何建议"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={applySelected}
                disabled={applying || selectedCount === 0}
                className="gap-1.5"
              >
                {applying ? (
                  <Loader2 className="size-3.5 motion-safe:animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                <span>AI 改写{selectedCount > 0 ? ` (${selectedCount})` : ""}</span>
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
