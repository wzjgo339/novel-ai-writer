"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Sparkles,
  Loader2,
  User,
  Globe,
  GitBranch,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react"
import type { Character, WorldTerm } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────────────────────

interface CharacterUpdate {
  name: string
  changes: string
  appearance?: string
  personality?: string
  background?: string
  motivation?: string
  arc?: string
  notes?: string
  characterId: string | null
  isExisting: boolean
}

interface NewTerm {
  term: string
  type: string
  definition: string
  notes: string
}

interface PlotEventSuggestion {
  title: string
  description: string
}

interface AnalysisResult {
  characterUpdates: CharacterUpdate[]
  newTerms: NewTerm[]
  plotEvent: PlotEventSuggestion | null
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ChapterAnalyzerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  novelId: string
  chapterTitle: string
  chapterContent: string
  onApplied: (summary: { characters: number; terms: number; events: number }) => void
}

type TabId = "characters" | "terms" | "plot"

// ─── Component ──────────────────────────────────────────────────────────────

export function ChapterAnalyzer({
  open,
  onOpenChange,
  novelId,
  chapterTitle,
  chapterContent,
  onApplied,
}: ChapterAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<AnalysisResult | null>(null)

  // Stored existing data for comparison & smart merging
  const [existingChars, setExistingChars] = useState<Map<string, Character>>(new Map())

  // Checked states — all checked by default
  const [checkedChars, setCheckedChars] = useState<Set<number>>(new Set())
  const [checkedTerms, setCheckedTerms] = useState<Set<number>>(new Set())
  const [checkedPlot, setCheckedPlot] = useState(true)

  // Expanded items
  const [expandedChars, setExpandedChars] = useState<Set<number>>(new Set())

  const [activeTab, setActiveTab] = useState<TabId>("characters")
  const [applying, setApplying] = useState(false)

  // ── Run analysis on open — fetches characters & terms internally ──

  useEffect(() => {
    if (!open) {
      setResult(null)
      setError("")
      setAnalyzing(false)
      setExistingChars(new Map())
      setCheckedChars(new Set())
      setCheckedTerms(new Set())
      setCheckedPlot(true)
      setExpandedChars(new Set())
      return
    }

    // Auto-analyze when dialog opens
    setAnalyzing(true)
    setError("")

    const runAnalysis = async () => {
      try {
        // Fetch existing characters and terms for context
        const [charRes, termRes] = await Promise.all([
          fetch(`/api/characters?novelId=${novelId}`),
          fetch(`/api/world-terms?novelId=${novelId}`),
        ])
        const charData = await charRes.json()
        const termData = await termRes.json()
        const fetchedChars: Character[] = charData.characters ?? []
        const existingTerms: WorldTerm[] = termData.terms ?? []

        // Store for merge logic
        setExistingChars(new Map(fetchedChars.map((c) => [c.id, c])))

        const res = await fetch("/api/analyze-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: chapterContent,
            chapterTitle,
            characters: fetchedChars.map((c: Character) => ({
              id: c.id,
              name: c.name,
              aliases: c.aliases,
              appearance: c.appearance,
              personality: c.personality,
              background: c.background,
              motivation: c.motivation,
              arc: c.arc,
              notes: c.notes,
            })),
            terms: existingTerms.map((t: WorldTerm) => ({ id: t.id, term: t.term })),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`)
        setResult(data)
        // Pre-check all items
        setCheckedChars(
          new Set((data.characterUpdates || []).map((_: any, i: number) => i))
        )
        setCheckedTerms(
          new Set((data.newTerms || []).map((_: any, i: number) => i))
        )
        setCheckedPlot(!!data.plotEvent)
        if (data.characterUpdates?.length) setExpandedChars(new Set([0]))
      } catch (err) {
        setError(err instanceof Error ? err.message : "分析失败")
      } finally {
        setAnalyzing(false)
      }
    }

    runAnalysis()
  }, [open, chapterContent, chapterTitle, novelId])

  // ── Apply selected ──

  const applySelected = useCallback(async () => {
    if (!result) return
    setApplying(true)

    let charCount = 0
    let termCount = 0
    let eventCount = 0

    try {
      // Apply character updates
      for (const [i, update] of result.characterUpdates.entries()) {
        if (!checkedChars.has(i)) continue

        if (update.characterId) {
          // ── Update existing character (smart merge) ──
          const body: Record<string, string> = {}
          const existing = existingChars.get(update.characterId)

          // For each field: only include if AI returned non-empty AND it's different from existing
          const fieldChecks: [string, string | undefined][] = [
            ["appearance", update.appearance],
            ["personality", update.personality],
            ["background", update.background],
            ["motivation", update.motivation],
            ["arc", update.arc],
          ]
          for (const [field, val] of fieldChecks) {
            if (val && val !== existing?.[field as keyof Character]) {
              body[field] = val
            }
          }

          // For notes: append with chapter attribution instead of replacing
          if (update.notes) {
            const existingNotes = existing?.notes?.trim() ?? ""
            const noteEntry = `【${chapterTitle}】${update.notes}`
            if (existingNotes) {
              // Only append if not already recorded for this chapter
              if (!existingNotes.includes(`【${chapterTitle}】`)) {
                body.notes = existingNotes + "\n" + noteEntry
              }
              // else skip — already recorded
            } else {
              body.notes = noteEntry
            }
          }

          if (Object.keys(body).length > 0) {
            await apiPatch(`/api/characters/${update.characterId}`, body)
            charCount++
          }
        } else {
          // ── Create new character ──
          const notes = update.notes
            ? `【${chapterTitle}】${update.notes}`
            : ""
          await apiPost("/api/characters", {
            novelId,
            name: update.name,
            aliases: "",
            age: "",
            gender: "",
            appearance: update.appearance || "",
            personality: update.personality || "",
            background: update.background || "",
            motivation: update.motivation || "",
            arc: update.arc || "",
            notes,
          })
          charCount++
        }
      }

      // Apply new terms
      for (const [i, term] of result.newTerms.entries()) {
        if (!checkedTerms.has(i)) continue
        await apiPost("/api/world-terms", {
          novelId,
          term: term.term,
          type: term.type,
          definition: term.definition,
          notes: term.notes,
        })
        termCount++
      }

      // Apply plot event
      if (result.plotEvent && checkedPlot) {
        await apiPost("/api/plot-events", {
          novelId,
          title: result.plotEvent.title,
          description: result.plotEvent.description,
          chapterId: null, // Link to chapter could be added later
        })
        eventCount++
      }

      onApplied({ characters: charCount, terms: termCount, events: eventCount })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "应用失败")
    } finally {
      setApplying(false)
    }
  }, [result, checkedChars, checkedTerms, checkedPlot, novelId, chapterTitle, existingChars, onApplied, onOpenChange])

  // ── Counts ──

  const selectedCount =
    (result?.characterUpdates ?? []).filter((_, i) => checkedChars.has(i)).length +
    (result?.newTerms ?? []).filter((_, i) => checkedTerms.has(i)).length +
    (result?.plotEvent && checkedPlot ? 1 : 0)

  // ── Render tabs ──

  const tabs = [
    { id: "characters" as TabId, label: "人物更新", icon: User, count: result?.characterUpdates.length ?? 0 },
    { id: "terms" as TabId, label: "设定提取", icon: Globe, count: result?.newTerms.length ?? 0 },
    { id: "plot" as TabId, label: "大纲生成", icon: GitBranch, count: result?.plotEvent ? 1 : 0 },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            AI 章节分析
          </DialogTitle>
          <DialogDescription>
            分析「{chapterTitle}」的内容，提取人物、设定和大纲更新建议
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          {analyzing ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="size-8 motion-safe:animate-spin text-primary/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">AI 正在阅读章节内容并提取信息…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <X className="size-8 text-destructive/60" aria-hidden="true" />
              <p className="text-sm font-medium text-destructive">分析失败</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
            </div>
          ) : !result ? null : (
            <div className="py-4 space-y-4">
              {/* Tab bar */}
              <div className="flex gap-1 border-b border-border/60 pb-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    data-active={activeTab === tab.id}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      "hover:bg-muted/50",
                      "data-active:bg-muted data-active:text-foreground",
                      "text-muted-foreground/70"
                    )}
                  >
                    <tab.icon className="size-3.5" aria-hidden="true" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] tabular-nums">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Characters Tab ── */}
              {activeTab === "characters" && (
                <div className="space-y-2">
                  {result.characterUpdates.length === 0 ? (
                    <p className="text-sm text-muted-foreground/60 italic py-8 text-center">
                      未检测到需要更新的人物信息
                    </p>
                  ) : (
                    result.characterUpdates.map((cu, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border/60 overflow-hidden"
                      >
                        {/* Header */}
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20">
                          <button
                            onClick={() => {
                              const next = new Set(checkedChars)
                              if (next.has(i)) next.delete(i)
                              else next.add(i)
                              setCheckedChars(next)
                            }}
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                              checkedChars.has(i)
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border bg-transparent"
                            )}
                            aria-label={checkedChars.has(i) ? "取消选择" : "选择"}
                          >
                            {checkedChars.has(i) && <Check className="size-3" />}
                          </button>
                          <User className="size-4 text-primary/50 shrink-0" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{cu.name}</span>
                              {cu.isExisting ? (
                                <span className="rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 text-[10px] font-medium">
                                  已有角色
                                </span>
                              ) : (
                                <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-medium">
                                  新角色
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">
                              {cu.changes}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const next = new Set(expandedChars)
                              if (next.has(i)) next.delete(i)
                              else next.add(i)
                              setExpandedChars(next)
                            }}
                            className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                            aria-label="展开详情"
                          >
                            {expandedChars.has(i) ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        </div>

                        {/* Expanded detail with diff comparison */}
                        {expandedChars.has(i) && (() => {
                          const existing = cu.characterId ? existingChars.get(cu.characterId) : null
                          const diffFields: { label: string; key: keyof CharacterUpdate; current: string; suggested: string }[] = []
                          const fieldLabels: Record<string, string> = { appearance: "外貌", personality: "性格", background: "背景", motivation: "动机", arc: "弧光" }

                          for (const [key, label] of Object.entries(fieldLabels)) {
                            const suggested = (cu as any)[key] as string | undefined
                            const current = existing ? (existing as any)[key] as string : ""
                            if (suggested) {
                              diffFields.push({ label, key: key as keyof CharacterUpdate, current, suggested })
                            }
                          }

                          const hasAnyField = diffFields.length > 0 || cu.notes

                          return (
                            <div className="px-3 py-2.5 space-y-2 border-t border-border/40">
                              {/* Changed fields */}
                              {diffFields.map((f) => (
                                <div key={f.key}>
                                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                                    {f.label}
                                  </span>
                                  {f.current && f.current !== f.suggested ? (
                                    <div className="mt-0.5 space-y-1">
                                      <p className="text-xs text-muted-foreground/50 line-through">
                                        {f.current}
                                      </p>
                                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                        {f.suggested}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                                      {f.suggested}
                                    </p>
                                  )}
                                </div>
                              ))}

                              {/* Notes */}
                              {cu.notes && (
                                <div>
                                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                                    本章笔记
                                  </span>
                                  <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                                    {cu.notes}
                                  </p>
                                  {existing?.notes && (
                                    <details className="mt-1">
                                      <summary className="text-[10px] text-muted-foreground/50 cursor-pointer hover:text-muted-foreground/80">
                                        查看已有备注
                                      </summary>
                                      <p className="text-xs text-muted-foreground/60 mt-1 whitespace-pre-wrap">
                                        {existing.notes}
                                      </p>
                                    </details>
                                  )}
                                </div>
                              )}

                              {!hasAnyField && (
                                <p className="text-xs text-muted-foreground/50 italic">
                                  仅出场，无新增详细信息
                                </p>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Terms Tab ── */}
              {activeTab === "terms" && (
                <div className="space-y-2">
                  {result.newTerms.length === 0 ? (
                    <p className="text-sm text-muted-foreground/60 italic py-8 text-center">
                      未检测到新的世界观设定
                    </p>
                  ) : (
                    result.newTerms.map((nt, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2.5"
                      >
                        <button
                          onClick={() => {
                            const next = new Set(checkedTerms)
                            if (next.has(i)) next.delete(i)
                            else next.add(i)
                            setCheckedTerms(next)
                          }}
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded border transition-colors mt-0.5",
                            checkedTerms.has(i)
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border bg-transparent"
                          )}
                          aria-label={checkedTerms.has(i) ? "取消选择" : "选择"}
                        >
                          {checkedTerms.has(i) && <Check className="size-3" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-medium">
                              {nt.type}
                            </span>
                            <span className="text-sm font-medium">{nt.term}</span>
                          </div>
                          <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
                            {nt.definition}
                          </p>
                          {nt.notes && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5">
                              {nt.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Plot Tab ── */}
              {activeTab === "plot" && (
                <div className="space-y-2">
                  {!result.plotEvent ? (
                    <p className="text-sm text-muted-foreground/60 italic py-8 text-center">
                      未能生成情节摘要
                    </p>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2.5">
                      <button
                        onClick={() => setCheckedPlot(!checkedPlot)}
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded border transition-colors mt-0.5",
                          checkedPlot
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-transparent"
                        )}
                        aria-label={checkedPlot ? "取消选择" : "选择"}
                      >
                        {checkedPlot && <Check className="size-3" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4 text-primary/50" aria-hidden="true" />
                          <span className="text-sm font-medium">{result.plotEvent.title}</span>
                        </div>
                        <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
                          {result.plotEvent.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border/60 pt-4 mt-2">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground/60">
              {result && `共 ${selectedCount} 项待应用`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={applySelected}
                disabled={analyzing || applying || selectedCount === 0 || !!error}
                className="gap-1.5"
              >
                {applying ? (
                  <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="size-3.5" aria-hidden="true" />
                )}
                <span>应用选中项{selectedCount > 0 ? ` (${selectedCount})` : ""}</span>
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function DetailRow({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
        {label}
      </span>
      <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">{text}</p>
    </div>
  )
}
