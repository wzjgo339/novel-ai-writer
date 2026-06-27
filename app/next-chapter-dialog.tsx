"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Sparkles, Loader2, Check, X, FileText, User, Globe, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { streamAI } from "@/lib/stream"
import { apiPost } from "@/lib/api"
import { analyzeStyle, buildStyleGuide } from "@/lib/style-profile"
import { toast } from "sonner"
import type { Chapter, Volume, Character, WorldTerm, PlotEvent, CharacterRelationship } from "@/lib/types"

// ─── Props ──────────────────────────────────────────────────────────────────

interface NextChapterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  novelId: string
  currentVolumeId: string
  currentVolumeTitle: string
  chapters: Chapter[]
  onCreateChapter: (chapter: Chapter) => void
}

type Phase = "input" | "generating" | "done" | "error"

// ─── Helpers ────────────────────────────────────────────────────────────────

function summarizeChapters(chapters: Chapter[], count = 5): string {
  const sorted = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder)
  const recent = sorted.slice(-count)
  if (recent.length === 0) return ""

  return recent
    .map((ch, i) => {
      const header = `【${ch.sortOrder + 1}】《${ch.title}》`
      // Last chapter (most recent): include FULL content for continuity
      if (i === recent.length - 1) {
        const maxChars = 8000
        const content = ch.content.length > maxChars
          ? ch.content.slice(0, maxChars) + "\n\n……（章节过长，后续内容已截断）"
          : ch.content
        return `${header}\n（完整内容）\n${content}`
      }
      // Older chapters: truncated summary
      return `${header}\n${ch.content.slice(0, 500)}${ch.content.length > 500 ? "……" : ""}`
    })
    .join("\n\n---\n\n")
}

function formatCharacters(chars: Character[]): string {
  if (chars.length === 0) return ""
  return chars
    .map(
      (c) =>
        `- ${c.name}${c.age ? `（${c.age}岁）` : ""}${c.gender ? `·${c.gender}` : ""}
  外貌：${c.appearance || "未设定"}
  性格：${c.personality || "未设定"}
  背景：${c.background ? c.background.slice(0, 200) : "未设定"}
  动机：${c.motivation || "未设定"}
  弧光：${c.arc || "未设定"}`
    )
    .join("\n\n")
}

function formatRelationships(rels: CharacterRelationship[], chars: Character[]): string {
  if (rels.length === 0) return ""
  const charMap = new Map(chars.map((c) => [c.id, c.name]))
  return rels
    .map((r) => {
      const name1 = charMap.get(r.characterId1) || "未知"
      const name2 = charMap.get(r.characterId2) || "未知"
      return `- ${name1} → ${name2}：${r.relationshipType}${r.description ? `（${r.description}）` : ""}`
    })
    .join("\n")
}

function formatTerms(terms: WorldTerm[]): string {
  if (terms.length === 0) return ""
  return terms
    .map((t) => `- 【${t.type}】${t.term}：${(t.definition || t.notes || "未定义").slice(0, 150)}`)
    .join("\n")
}

function formatPlotEvents(events: PlotEvent[], chapters: Chapter[]): string {
  if (events.length === 0) return ""
  const chMap = new Map(chapters.map((c) => [c.id, c.title]))
  return [...events]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((e) => {
      const chRef = e.chapterId ? `（关联章节：${chMap.get(e.chapterId) || "未知"}）` : ""
      return `- ${e.title}：${e.description?.slice(0, 150) || "无描述"} ${chRef}`
    })
    .join("\n")
}

// ─── TypeWriter Effect ──────────────────────────────────────────────────────

function TypeWriterText({ text, speed = 25 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("")
  const indexRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed("")
    setDone(false)
    indexRef.current = 0

    timerRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        indexRef.current++
        setDisplayed(text.slice(0, indexRef.current))
      } else {
        if (timerRef.current) clearInterval(timerRef.current)
        setDone(true)
      }
    }, speed)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [text, speed])

  return (
    <span>
      {displayed}
      {!done && (
        <span className="inline-block w-[1.5px] h-[1.1em] bg-primary/60 align-text-bottom ml-0.5 motion-safe:animate-[pulse_0.8s_ease-in-out_infinite]" />
      )}
    </span>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NextChapterDialog({
  open,
  onOpenChange,
  novelId,
  currentVolumeId,
  currentVolumeTitle,
  chapters,
  onCreateChapter,
}: NextChapterDialogProps) {
  const [phase, setPhase] = useState<Phase>("input")
  const [requirements, setRequirements] = useState("")
  const [suggestedTitle, setSuggestedTitle] = useState("")
  const [targetTokens, setTargetTokens] = useState("2000")
  const [generatedContent, setGeneratedContent] = useState("")
  const [error, setError] = useState("")

  // ── Context data (fetched on open) ──
  const [characters, setCharacters] = useState<Character[]>([])
  const [terms, setTerms] = useState<WorldTerm[]>([])
  const [plotEvents, setPlotEvents] = useState<PlotEvent[]>([])
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([])
  const [contextLoading, setContextLoading] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Fetch context data when dialog opens
  useEffect(() => {
    if (!open || !novelId) return
    setContextLoading(true)
    Promise.all([
      fetch(`/api/characters?novelId=${novelId}`).then((r) => r.json()),
      fetch(`/api/world-terms?novelId=${novelId}`).then((r) => r.json()),
      fetch(`/api/plot-events?novelId=${novelId}`).then((r) => r.json()),
      fetch(`/api/relationships?novelId=${novelId}`).then((r) => r.json()),
    ])
      .then(([cData, tData, pData, rData]) => {
        setCharacters(cData.characters || [])
        setTerms(tData.terms || [])
        setPlotEvents(pData.plotEvents || [])
        setRelationships(rData.relationships || [])
      })
      .catch(() => {
        // Silently fail — context is optional for generation
        setCharacters([])
        setTerms([])
        setPlotEvents([])
        setRelationships([])
      })
      .finally(() => setContextLoading(false))
  }, [open, novelId])

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setPhase("input")
      setRequirements("")
      setSuggestedTitle("")
      setGeneratedContent("")
      setError("")
    }
  }, [open])

  // Auto-scroll as content streams
  useEffect(() => {
    if (contentRef.current && phase === "generating") {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [generatedContent, phase])

  // ── Context summary for display ──
  const contextSummary = {
    recentChapters: chapters.filter((c) => c.volumeId === currentVolumeId).length,
    totalChapters: chapters.length,
    characterCount: characters.length,
    termCount: terms.length,
    plotCount: plotEvents.length,
  }

  // Compute the next chapter number
  const volumeChapters = chapters
    .filter((c) => c.volumeId === currentVolumeId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const nextChapterNum = volumeChapters.length > 0
    ? volumeChapters[volumeChapters.length - 1].sortOrder + 1
    : 0

  // ── Generate ──
  const handleGenerate = useCallback(async () => {
    if (!requirements.trim()) {
      toast.error("请描述下一章的写作要求")
      return
    }

    setPhase("generating")
    setGeneratedContent("")
    setError("")

    // Build context text
    const previousChaptersText = summarizeChapters(
      chapters.filter((c) => c.volumeId === currentVolumeId)
    )
    const charactersText = formatCharacters(characters)
    const relationshipsText = formatRelationships(relationships, characters)
    const termsText = formatTerms(terms)
    const plotEventsText = formatPlotEvents(plotEvents, chapters)

    // Generate style profile from existing chapters for style consistency
    const volChapters = chapters
      .filter((c) => c.volumeId === currentVolumeId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const styleProfile = volChapters.length > 0
      ? buildStyleGuide(analyzeStyle(volChapters.map((c) => c.content)))
      : ""

    abortRef.current = new AbortController()

    try {
      let full = ""
      const targetWordCount = parseInt(targetTokens, 10) || 2000
      const maxTokens = Math.round(targetWordCount * 1.5) // Give room beyond target
      for await (const chunk of streamAI(
        "/api/ai-next-chapter",
        {
          novelId,
          currentVolumeId,
          currentVolumeTitle,
          requirements: requirements.trim(),
          suggestedTitle: suggestedTitle.trim() || undefined,
          targetWords: targetWordCount,
          maxTokens,
          styleGuide: styleProfile,
          context: {
            previousChapters: previousChaptersText,
            characters: charactersText,
            relationships: relationshipsText,
            terms: termsText,
            plotEvents: plotEventsText,
          },
        },
        abortRef.current.signal
      )) {
        full += chunk
        setGeneratedContent(full)
      }

      if (!full.trim()) {
        throw new Error("AI 返回内容为空")
      }

      setPhase("done")
      toast.success("章节生成完成")
    } catch (err: any) {
      if (err.name === "AbortError") {
        setPhase("input")
        return
      }
      setError(err.message || "生成失败")
      setPhase("error")
    }
  }, [
    requirements,
    suggestedTitle,
    novelId,
    currentVolumeId,
    currentVolumeTitle,
    chapters,
    characters,
    relationships,
    terms,
    plotEvents,
  ])

  // ── Cancel generation ──
  const handleCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setPhase("input")
  }, [])

  // ── Create chapter ──
  const handleCreateChapter = useCallback(async () => {
    if (!generatedContent.trim()) return

    const title = suggestedTitle.trim() || `第 ${nextChapterNum + 1} 章`

    try {
      const data = await apiPost<{ chapter: Chapter }>("/api/chapters", {
        volumeId: currentVolumeId,
        title,
        content: generatedContent,
      })

      // Auto-set sortOrder to be the last
      onCreateChapter(data.chapter)
      toast.success(`「${title}」已创建`)
      onOpenChange(false)
    } catch (err) {
      toast.error("创建章节失败")
    }
  }, [generatedContent, suggestedTitle, nextChapterNum, currentVolumeId, onCreateChapter, onOpenChange])

  // ── Regenerate ──
  const handleRegenerate = useCallback(() => {
    setPhase("input")
    setGeneratedContent("")
    setError("")
  }, [])

  // ── Render ──

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            AI 生成下一章
          </DialogTitle>
          <DialogDescription>
            填写写作要求，AI 将根据已有故事内容生成情节连贯的下一章。
          </DialogDescription>
        </DialogHeader>

        {phase === "input" && (
          <>
            {/* Requirements input */}
            <div className="flex-1 space-y-4 py-2 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground/70 block mb-1">
                    章节标题 <span className="text-muted-foreground/50">（可选）</span>
                  </label>
                  <Input
                    value={suggestedTitle}
                    onChange={(e) => setSuggestedTitle(e.target.value)}
                    placeholder={`如「第 ${nextChapterNum + 1} 章」`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground/70 block mb-1">
                    目标字数 <span className="text-muted-foreground/50">（约）</span>
                  </label>
                  <select
                    value={targetTokens}
                    onChange={(e) => setTargetTokens(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="1000">~1000 字（短章）</option>
                    <option value="2000">~2000 字（标准）</option>
                    <option value="4000">~4000 字（长章）</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground/70 block mb-1">
                  写作要求 <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder={`描述你希望下一章写什么，例如：

• 主角参加游泳决赛，展现训练成果
• 引入一个新的配角作为对手
• 埋下关于身世的伏笔
• 增加秋季环境的氛围描写`}
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Context summary */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <h4 className="text-xs font-medium text-foreground/70 mb-2 flex items-center gap-1.5">
                  <FileText className="size-3" aria-hidden="true" />
                  当前作品概况
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span>当前卷：{currentVolumeTitle || "未命名"}</span>
                  <span>本卷章节：{contextSummary.recentChapters} 章</span>
                  <span className="flex items-center gap-1">
                    <User className="size-3" aria-hidden="true" />角色：{contextSummary.characterCount} 人
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="size-3" aria-hidden="true" />设定：{contextSummary.termCount} 条
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="size-3" aria-hidden="true" />情节：{contextSummary.plotCount} 个
                  </span>
                  <span>即将创建：第 {nextChapterNum + 1} 章</span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleGenerate} disabled={!requirements.trim()}>
                <Sparkles className="size-3.5 mr-1.5" aria-hidden="true" />
                生成下一章
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "generating" && (
          <>
            <div className="flex-1 flex flex-col min-h-0 space-y-3 py-2">
              {/* Status bar */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 motion-safe:animate-spin text-primary" aria-hidden="true" />
                <span>AI 正在创作第 {nextChapterNum + 1} 章…</span>
              </div>

              {/* Streaming content preview */}
              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto rounded-lg border border-border/60 bg-background p-4 min-h-[200px] max-h-[400px]"
              >
                {generatedContent ? (
                  <div className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
                    {generatedContent}
                    <span className="inline-block w-[1.5px] h-[1.1em] bg-primary/60 align-text-bottom ml-0.5 motion-safe:animate-[pulse_0.8s_ease-in-out_infinite]" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground/50">
                    等待 AI 输出…
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} className="gap-1.5">
                <X className="size-3.5" aria-hidden="true" />
                取消生成
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "done" && (
          <>
            <div className="flex-1 flex flex-col min-h-0 space-y-3 py-2">
              {/* Success indicator */}
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Check className="size-4" aria-hidden="true" />
                <span>生成完成</span>
                <span className="text-muted-foreground/50 ml-auto text-xs">
                  ~{Math.round(generatedContent.length / 100) * 100} 字
                </span>
              </div>

              {/* Editable title */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground/70 shrink-0">标题：</span>
                <Input
                  value={suggestedTitle}
                  onChange={(e) => setSuggestedTitle(e.target.value)}
                  placeholder={`第 ${nextChapterNum + 1} 章`}
                  className="h-8 text-sm"
                />
              </div>

              {/* Content preview */}
              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto rounded-lg border border-border/60 bg-background p-4 max-h-[350px]"
              >
                <div className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
                  {generatedContent}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={handleRegenerate} className="gap-1.5">
                重新生成
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleCreateChapter} className="gap-1.5">
                <Check className="size-3.5" aria-hidden="true" />
                创建章节
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "error" && (
          <>
            <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <X className="size-5 text-destructive" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-destructive">生成失败</p>
              <p className="text-xs text-muted-foreground max-w-sm text-center">{error}</p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
              <Button onClick={handleRegenerate}>
                重试
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
