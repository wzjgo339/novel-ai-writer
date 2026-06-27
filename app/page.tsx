"use client"

import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  Download,
  Sparkles,
  Loader2,
  FileDown,
  BookOpen,
  Library,
  User,
  Globe,
  GitBranch,
  Moon,
  Sun,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { streamAI } from "@/lib/stream"
import { analyzeStyle, buildStyleGuide } from "@/lib/style-profile"
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api"
import { toast } from "sonner"
import type { Novel, Volume, Chapter, ViewMode } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { NovelSidebar } from "./novel-sidebar"
import { CharacterPanel } from "./character-panel"
import { WorldTermsPanel } from "./world-terms-panel"
import { PlotOutlinePanel } from "./plot-outline-panel"
import { ChapterAnalyzer } from "./chapter-analyzer"
import { AiAssistantPanel } from "./ai-assistant-panel"
import { ThemeProvider, useTheme } from "./theme-provider"
import { SearchDialog } from "./search-dialog"
import { DiffReviewDialog } from "./diff-review-dialog"
import { NextChapterDialog } from "./next-chapter-dialog"

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(iso).toLocaleDateString("zh-CN")
}

function countWords(text: string): number {
  const chinese = (text.match(/[一-鿿㐀-䶿豈-﫿]/g) || []).length
  const english = text
    .replace(/[一-鿿㐀-䶿豈-﫿]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length
  return chinese + english
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

// ─── TypeWriter Effect ─────────────────────────────────────────────────────

function TypeWriterText({ text, speed = 45 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const indexRef = useRef(0)
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
        timerRef.current && clearInterval(timerRef.current)
        setDone(true)
      }
    }, speed)

    return () => {
      timerRef.current && clearInterval(timerRef.current)
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

// ─── Main Component ────────────────────────────────────────────────────────

export default function AIWriter() {
  // ── State: data ──
  const [novels, setNovels] = useState<Novel[]>([])
  const [volumes, setVolumes] = useState<Volume[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedNovelId, setSelectedNovelId] = useState<string | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [expandedVolumeIds, setExpandedVolumeIds] = useState<Set<string>>(new Set())

  // ── State: UI ──
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("write")
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiText, setAiText] = useState("")
  const [aiFullText, setAiFullText] = useState("")
  const [aiError, setAiError] = useState("")

  // ── State: chapter analyzer ──
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [analyzerSuccess, setAnalyzerSuccess] = useState<string | null>(null)

  // ── State: AI assistant ──
  const [assistantOpen, setAssistantOpen] = useState(false)

  // ── State: diff review dialog ──
  const [diffDialogOpen, setDiffDialogOpen] = useState(false)
  const [diffOriginal, setDiffOriginal] = useState("")
  const [diffRewritten, setDiffRewritten] = useState("")

  // ── State: next chapter dialog ──
  const [nextChapterOpen, setNextChapterOpen] = useState(false)

  // ── State: search ──
  const [searchOpen, setSearchOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | undefined>(undefined)

  // ── State: rename dialog ──
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{
    kind: "novel" | "volume" | "chapter"
    id: string
    title: string
  } | null>(null)
  const [renameVal, setRenameVal] = useState("")

  // ── State: unsaved changes tracking ──
  const [isDirty, setIsDirty] = useState(false)

  // ── State: delete dialog ──
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "novel" | "volume" | "chapter"
    id: string
    label: string
  } | null>(null)

  const aiOuterRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  // Snapshot for undoing programmatic changes (AI insert, rewrite)
  const undoSnapshotRef = useRef<string | null>(null)

  // ── State: selection & rewrite ──
  const [selectionRange, setSelectionRange] = useState<{
    start: number
    end: number
    text: string
    top: number
    left: number
  } | null>(null)
  const [rewriting, setRewriting] = useState(false)
  const [rewriteError, setRewriteError] = useState("")
  const [rewriteInstructionOpen, setRewriteInstructionOpen] = useState(false)
  const [rewriteInstruction, setRewriteInstruction] = useState("")

  // ── Computed values ──

  const currentNovel = novels.find((n) => n.id === selectedNovelId) ?? null
  const currentVolumes = useMemo(
    () =>
      volumes
        .filter((v) => v.novelId === selectedNovelId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [volumes, selectedNovelId]
  )

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) ?? null

  const currentVolumeId = selectedChapter?.volumeId ?? null
  const currentVolume = currentVolumeId
    ? volumes.find((v) => v.id === currentVolumeId)
    : null

  // Total novel word count
  const novelChapters = useMemo(
    () => chapters.filter((c) => currentVolumes.some((v) => v.id === c.volumeId)),
    [chapters, currentVolumes]
  )
  const novelWordCount = useMemo(
    () => novelChapters.reduce((sum, c) => sum + countWords(c.content), 0),
    [novelChapters]
  )

  // Stats for selected chapter
  const stats = useMemo(
    () => ({
      words: selectedChapter ? countWords(selectedChapter.content) : 0,
      chapterTitle: selectedChapter?.title ?? "",
      volumeTitle: currentVolume?.title ?? "",
    }),
    [selectedChapter, currentVolume]
  )

  // ── Load data from API on mount ──

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError("")

    Promise.all([
      apiGet<{ novels: Novel[] }>("/api/novels"),
      apiGet<{ volumes: Volume[] }>("/api/volumes"),
      apiGet<{ chapters: Chapter[] }>("/api/chapters"),
    ])
      .then(([nData, vData, cData]) => {
        if (cancelled) return
        setNovels(nData.novels)
        setVolumes(vData.volumes)
        setChapters(cData.chapters)

        if (nData.novels.length > 0) {
          setSelectedNovelId(nData.novels[0].id)
          // Auto-select first chapter
          const firstVol = vData.volumes.find((v) => v.novelId === nData.novels[0].id)
          if (firstVol) {
            const firstCh = cData.chapters.find((c) => c.volumeId === firstVol.id)
            if (firstCh) setSelectedChapterId(firstCh.id)
          }
          // Expand first volume
          const novelVols = vData.volumes.filter((v) => v.novelId === nData.novels[0].id)
          if (novelVols.length > 0) {
            setExpandedVolumeIds(new Set([novelVols[0].id]))
          }
        }
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // ── CRUD: Novel ──

  const handleCreateNovel = useCallback(async (title: string, description: string) => {
    try {
      const data = await apiPost<{ novel: Novel }>("/api/novels", { title, description })
      // Also create a default volume
      const volData = await apiPost<{ volume: Volume }>("/api/volumes", {
        novelId: data.novel.id,
        title: "第一卷",
      })
      setNovels((prev) => [...prev, data.novel])
      setVolumes((prev) => [...prev, volData.volume])
      setSelectedNovelId(data.novel.id)
      setExpandedVolumeIds(new Set([volData.volume.id]))
      setSelectedChapterId(null)
      toast.success("作品已创建")
    } catch (err) {
      toast.error("创建作品失败")
    }
  }, [])

  const handleSelectNovel = useCallback(
    (id: string) => {
      if (isDirty && !window.confirm("当前章节有未保存的修改，切换作品将丢失这些修改。是否继续？")) {
        return
      }
      setSelectedNovelId(id)
      setSelectedChapterId(null)
      setExpandedVolumeIds(new Set())
      // Auto-select first chapter
      const firstVol = volumes.find((v) => v.novelId === id)
      if (firstVol) {
        const firstCh = chapters
          .filter((c) => c.volumeId === firstVol.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)[0]
        if (firstCh) {
          setSelectedChapterId(firstCh.id)
        }
      }
    },
    [volumes, chapters, isDirty]
  )

  // ── CRUD: Volume ──

  const handleCreateVolume = useCallback(
    async (novelId: string, title: string) => {
      try {
        const data = await apiPost<{ volume: Volume }>("/api/volumes", { novelId, title })
        setVolumes((prev) => [...prev, data.volume])
        setExpandedVolumeIds((prev) => new Set(prev).add(data.volume.id))
        toast.success("卷已创建")
      } catch (err) {
        toast.error("创建卷失败")
      }
    },
    []
  )

  const handleToggleVolume = useCallback((id: string) => {
    setExpandedVolumeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleReorderVolumes = useCallback(
    async (volumeIds: string[]) => {
      // Optimistic update: reassign sortOrder based on new order
      setVolumes((prev) =>
        prev.map((v) => {
          const idx = volumeIds.indexOf(v.id)
          return idx >= 0 ? { ...v, sortOrder: idx, updatedAt: new Date().toISOString() } : v
        })
      )
      try {
        await apiPatch("/api/volumes/reorder", { ids: volumeIds })
      } catch (err) {
        toast.error("调整排序失败")
      }
    },
    []
  )

  const handleReorderChapters = useCallback(
    async (chapterIds: string[]) => {
      // Optimistic update: reassign sortOrder based on new order
      setChapters((prev) =>
        prev.map((c) => {
          const idx = chapterIds.indexOf(c.id)
          return idx >= 0 ? { ...c, sortOrder: idx, updatedAt: new Date().toISOString() } : c
        })
      )
      try {
        await apiPatch("/api/chapters/reorder", { ids: chapterIds })
      } catch (err) {
        toast.error("调整章节排序失败")
      }
    },
    []
  )

  const handleBatchMoveChapters = useCallback(
    async (chapterIds: string[], targetVolumeId: string) => {
      // Calculate new sortOrders
      const targetChapters = chapters
        .filter((c) => c.volumeId === targetVolumeId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      let nextSortOrder = targetChapters.length > 0
        ? targetChapters[targetChapters.length - 1].sortOrder + 1
        : 0

      // Optimistic update
      setChapters((prev) =>
        prev.map((c) => {
          if (chapterIds.includes(c.id)) {
            return { ...c, volumeId: targetVolumeId, sortOrder: nextSortOrder++, updatedAt: new Date().toISOString() }
          }
          return c
        })
      )

      try {
        await Promise.all(
          chapterIds.map((id, i) =>
            apiPatch(`/api/chapters/${id}`, { volumeId: targetVolumeId, sortOrder: nextSortOrder - chapterIds.length + i })
          )
        )
        toast.success(`已将 ${chapterIds.length} 个章节移动到新卷`)
      } catch (err) {
        toast.error("批量移动失败")
        // Reload on error
        try { const data = await apiGet<{ chapters: Chapter[] }>("/api/chapters"); setChapters(data.chapters) } catch {}
      }
    },
    [chapters]
  )

  const handleMoveChapter = useCallback(
    async (chapterId: string, targetVolumeId: string) => {
      // Calculate new sortOrder (end of target volume)
      const targetChapters = chapters
        .filter((c) => c.volumeId === targetVolumeId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const newSortOrder = targetChapters.length > 0
        ? targetChapters[targetChapters.length - 1].sortOrder + 1
        : 0

      // Optimistic update
      setChapters((prev) =>
        prev.map((c) =>
          c.id === chapterId
            ? { ...c, volumeId: targetVolumeId, sortOrder: newSortOrder, updatedAt: new Date().toISOString() }
            : c
        )
      )
      try {
        await apiPatch(`/api/chapters/${chapterId}`, { volumeId: targetVolumeId, sortOrder: newSortOrder })
        toast.success("章节已移动到新卷")
      } catch (err) {
        toast.error("移动章节失败")
        // Reload chapters on error
        try {
          const data = await apiGet<{ chapters: Chapter[] }>("/api/chapters")
          setChapters(data.chapters)
        } catch {}
      }
    },
    [chapters]
  )

  // ── CRUD: Chapter ──

  const handleCreateChapter = useCallback(
    async (volumeId: string, title: string) => {
      try {
        const data = await apiPost<{ chapter: Chapter }>("/api/chapters", { volumeId, title })
        setChapters((prev) => [...prev, data.chapter])
        setSelectedChapterId(data.chapter.id)
        toast.success("章节已创建")
      } catch (err) {
        toast.error("创建章节失败")
      }
    },
    []
  )

  const handleSelectChapter = useCallback((id: string) => {
    if (isDirty && !window.confirm("当前章节有未保存的修改，切换章节将丢失这些修改。是否继续？")) {
      return
    }
    setSelectedChapterId(id)
    setViewMode("write")
    setIsDirty(false)
    // Dismiss any pending AI output when switching chapters
    setAiText("")
    setAiFullText("")
    setAiError("")
    setSelectionRange(null)
    setRewriteError("")
  }, [isDirty])

  // ── Content editing & auto-save ──

  const scheduleSave = useCallback(
    (chapterId: string, title: string, content: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        setSaving(true)
        try {
          await apiPatch(`/api/chapters/${chapterId}`, { title, content })
          setChapters((prev) =>
            prev.map((c) =>
              c.id === chapterId
                ? { ...c, title, content, updatedAt: new Date().toISOString() }
                : c
            )
          )
          setNovels((prev) =>
            prev.map((n) =>
              n.id === selectedNovelId ? { ...n, updatedAt: new Date().toISOString() } : n
            )
          )
          setIsDirty(false)
        } catch (err) {
          toast.error("自动保存失败", { duration: 3000 })
        } finally {
          setSaving(false)
        }
      }, 1200)
    },
    [selectedNovelId]
  )

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!selectedChapterId || !selectedChapter) return
      const newContent = e.target.value
      setIsDirty(true)
      // Optimistic update
      setChapters((prev) =>
        prev.map((c) => (c.id === selectedChapterId ? { ...c, content: newContent } : c))
      )
      scheduleSave(selectedChapterId, selectedChapter.title, newContent)
    },
    [selectedChapterId, selectedChapter, scheduleSave]
  )

  // ── Undo snapshot for programmatic changes ──
  const setUndoSnapshot = useCallback(() => {
    const ta = editorRef.current
    if (ta) undoSnapshotRef.current = ta.value
  }, [])

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+Z with a snapshot → undo programmatic change
    if ((e.metaKey || e.ctrlKey) && e.key === "z" && undoSnapshotRef.current !== null) {
      const ta = editorRef.current
      if (!ta) return
      const snapshot = undoSnapshotRef.current
      if (ta.value === snapshot) return
      e.preventDefault()
      undoSnapshotRef.current = null
      ta.focus()
      ta.select()
      ta.setRangeText(snapshot, 0, ta.value.length, "end")
      ta.dispatchEvent(new Event("input", { bubbles: true }))
    }
  }, [])

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedChapterId || !selectedChapter) return
      const newTitle = e.target.value
      setIsDirty(true)
      // Optimistic update
      setChapters((prev) =>
        prev.map((c) => (c.id === selectedChapterId ? { ...c, title: newTitle } : c))
      )
      scheduleSave(selectedChapterId, newTitle, selectedChapter.content)
    },
    [selectedChapterId, selectedChapter, scheduleSave]
  )

  // ── Rename ──

  const openRename = useCallback(
    (kind: "novel" | "volume" | "chapter", id: string, title: string) => {
      setRenameTarget({ kind, id, title })
      setRenameVal(title)
      setRenameOpen(true)
    },
    []
  )

  const confirmRename = useCallback(async () => {
    if (!renameTarget || !renameVal.trim()) return
    const newTitle = renameVal.trim()
    const { kind, id } = renameTarget
    try {
      const endpoint =
        kind === "novel"
          ? `/api/novels/${id}`
          : kind === "volume"
            ? `/api/volumes/${id}`
            : `/api/chapters/${id}`
      await apiPatch(endpoint, { title: newTitle })
      switch (kind) {
        case "novel":
          setNovels((prev) =>
            prev.map((n) =>
              n.id === id ? { ...n, title: newTitle, updatedAt: new Date().toISOString() } : n
            )
          )
          break
        case "volume":
          setVolumes((prev) =>
            prev.map((v) =>
              v.id === id ? { ...v, title: newTitle, updatedAt: new Date().toISOString() } : v
            )
          )
          break
        case "chapter":
          setChapters((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c
            )
          )
          break
      }
      toast.success("已重命名")
    } catch (err) {
      toast.error("重命名失败")
    }
    setRenameOpen(false)
    setRenameTarget(null)
  }, [renameTarget, renameVal])

  // ── Delete ──

  const openDelete = useCallback(
    (kind: "novel" | "volume" | "chapter", id: string) => {
      const label =
        kind === "novel" ? "作品" : kind === "volume" ? "卷" : "章节"
      setDeleteTarget({ kind, id, label })
      setDeleteOpen(true)
    },
    []
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const { kind, id } = deleteTarget
    try {
      const endpoint =
        kind === "novel"
          ? `/api/novels/${id}`
          : kind === "volume"
            ? `/api/volumes/${id}`
            : `/api/chapters/${id}`
      await apiDelete(endpoint)
      switch (kind) {
        case "novel": {
          setNovels((prev) => prev.filter((n) => n.id !== id))
          setVolumes((prev) => prev.filter((v) => v.novelId !== id))
          setChapters((prev) =>
            prev.filter((c) => {
              const vol = volumes.find((v) => v.id === c.volumeId)
              return vol && vol.novelId !== id
            })
          )
          if (selectedNovelId === id) {
            const remaining = novels.filter((n) => n.id !== id)
            setSelectedNovelId(remaining.length > 0 ? remaining[0].id : null)
            setSelectedChapterId(null)
          }
          break
        }
        case "volume": {
          setVolumes((prev) => prev.filter((v) => v.id !== id))
          setChapters((prev) => prev.filter((c) => c.volumeId !== id))
          if (
            selectedChapter &&
            chapters.find((c) => c.id === selectedChapter.id)?.volumeId === id
          ) {
            setSelectedChapterId(null)
          }
          break
        }
        case "chapter": {
          setChapters((prev) => prev.filter((c) => c.id !== id))
          if (selectedChapterId === id) {
            setSelectedChapterId(null)
          }
          break
        }
      }
      toast.success("删除成功")
    } catch (err) {
      toast.error("删除失败")
    }
    setDeleteOpen(false)
    setDeleteTarget(null)
  }, [deleteTarget, selectedNovelId, selectedChapterId, selectedChapter, novels, volumes, chapters])

  // ── AI generation (stream → typewriter) ──

  const handleAI = useCallback(async () => {
    if (generating || !selectedChapter) return
    setGenerating(true)
    setAiText("")
    setAiFullText("")
    setAiError("")

    try {
      // Build style guide from recent chapters for consistency
      const volChapters = chapters
        .filter((c) => c.volumeId === selectedChapter.volumeId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const styleProfile = volChapters.length > 1
        ? buildStyleGuide(analyzeStyle(volChapters.map((c) => c.content)))
        : ""

      // Stream to get the full text quickly, then hand off to TypeWriterText
      let full = ""
      for await (const chunk of streamAI("/api/ai-write", {
        content: selectedChapter.content,
        styleGuide: styleProfile || undefined,
      })) {
        full += chunk
      }
      if (!full) throw new Error("AI 返回内容为空")
      // Set both at once — TypeWriterText takes over the pacing
      setAiFullText(full)
      setAiText(full)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "未知错误")
    } finally {
      setGenerating(false)
    }
  }, [generating, selectedChapter])

  const acceptAI = useCallback(() => {
    if (!selectedChapter || !aiFullText) return
    const ta = editorRef.current
    if (!ta) return

    setUndoSnapshot()

    const separator = selectedChapter.content.endsWith("\n") ? "" : "\n\n"
    const insert = separator + aiFullText
    const insertPos = ta.value.length

    ta.focus()
    ta.setRangeText(insert, insertPos, insertPos, "end")
    ta.dispatchEvent(new Event("input", { bubbles: true }))

    setAiText("")
    setAiFullText("")
  }, [selectedChapter, aiFullText, setUndoSnapshot])

  const dismissAI = useCallback(() => {
    setAiText("")
    setAiFullText("")
    setAiError("")
  }, [])

  // ── Chapter analyzer success ──

  const handleAnalyzerApplied = useCallback(
    (summary: { characters: number; terms: number; events: number }) => {
      const parts: string[] = []
      if (summary.characters > 0) parts.push(`人物 ${summary.characters}`)
      if (summary.terms > 0) parts.push(`设定 ${summary.terms}`)
      if (summary.events > 0) parts.push(`大纲 ${summary.events}`)
      setAnalyzerSuccess(`✓ 已更新${parts.join("、")}`)
      setTimeout(() => setAnalyzerSuccess(null), 3000)
    },
    []
  )

  // ── Selection tracking ──

  const handleEditorSelect = useCallback(() => {
    const ta = editorRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    if (start === end || !ta.value.substring(start, end).trim()) {
      setSelectionRange(null)
      return
    }
    const text = ta.value.substring(start, end)

    // Calculate pixel position near the selection start
    // Use mirror div for accurate position, accounting for scroll
    const taStyle = window.getComputedStyle(ta)
    const paddingTop = parseInt(taStyle.paddingTop) || 0
    const paddingLeft = parseInt(taStyle.paddingLeft) || 0
    const paddingBottom = parseInt(taStyle.paddingBottom) || 0
    const mirror = document.createElement("div")
    mirror.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      visibility: hidden;
      pointer-events: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      width: ${ta.clientWidth}px;
      font-family: ${taStyle.fontFamily};
      font-size: ${taStyle.fontSize};
      line-height: ${taStyle.lineHeight};
      letter-spacing: ${taStyle.letterSpacing};
      padding: ${taStyle.padding};
    `
    mirror.textContent = ta.value.substring(0, start)
    document.body.appendChild(mirror)
    const mirrorRect = mirror.getBoundingClientRect()
    document.body.removeChild(mirror)

    // mirrorRect.height = total height of text before selection (incl. padding)
    // In viewport coords: textarea top + padding-top + text height - scroll offset
    const taRect = ta.getBoundingClientRect()
    const textEndY = mirrorRect.height - paddingBottom
    const topInViewport = taRect.top + paddingTop + textEndY - ta.scrollTop
    const leftInViewport = taRect.left + paddingLeft

    // Clamp to stay within viewport
    const toolbarHeight = 36
    const clampedTop = Math.max(
      taRect.top + 4,
      Math.min(topInViewport - toolbarHeight - 4, window.innerHeight - toolbarHeight - 16)
    )

    setSelectionRange({
      start,
      end,
      text,
      top: clampedTop,
      left: Math.max(taRect.left + paddingLeft, 16),
    })
  }, [])

  // ── Rewrite: expand / condense ──

  const handleRewrite = useCallback(
    async (mode: "expand" | "condense", customInstruction?: string) => {
      if (!selectionRange || !selectedChapter || !selectedChapterId) return
      const ta = editorRef.current
      if (!ta) return

      setRewriting(true)
      setRewriteError("")

      try {
        const res = await fetch("/api/ai-rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: selectionRange.text, mode, customInstruction }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`)
        if (!data.text) throw new Error("AI 返回内容为空")

        const { start, end } = selectionRange
        const oldContent = selectedChapter.content
        const newContent =
          oldContent.substring(0, start) +
          data.text +
          oldContent.substring(end)

        setUndoSnapshot()
        ta.focus()
        ta.setRangeText(data.text, start, end, "end")
        ta.dispatchEvent(new Event("input", { bubbles: true }))

        // Update React state to match (handleContentChange will also fire,
        // but the old closure might reference stale selectedChapter)
        setChapters((prev) =>
          prev.map((c) =>
            c.id === selectedChapterId
              ? { ...c, content: newContent, updatedAt: new Date().toISOString() }
              : c
          )
        )
        setSelectionRange(null)

        // Schedule save with the correct new content
        scheduleSave(selectedChapterId, selectedChapter.title, newContent)
      } catch (err) {
        setRewriteError(err instanceof Error ? err.message : "改写失败")
      } finally {
        setRewriting(false)
      }
    },
    [selectionRange, selectedChapter, selectedChapterId, scheduleSave, setUndoSnapshot]
  )

  const confirmRewriteWithInstruction = useCallback(() => {
    handleRewrite("expand", rewriteInstruction.trim() || undefined)
    setRewriteInstructionOpen(false)
  }, [handleRewrite, rewriteInstruction])

  // ── Diff review: accept rewritten text ──

  const handleDiffAccept = useCallback(
    (finalText: string) => {
      if (!selectedChapterId || !selectedChapter) return
      const ta = editorRef.current
      if (ta) {
        ta.focus()
        ta.setRangeText(finalText, 0, selectedChapter.content.length, "end")
        ta.dispatchEvent(new Event("input", { bubbles: true }))
      }
      setChapters((prev) =>
        prev.map((c) =>
          c.id === selectedChapterId
            ? { ...c, content: finalText, updatedAt: new Date().toISOString() }
            : c
        )
      )
      scheduleSave(selectedChapterId, selectedChapter.title, finalText)
      setDiffDialogOpen(false)
    },
    [selectedChapterId, selectedChapter, scheduleSave]
  )

  // ── Export ──

  const exportAs = useCallback(
    (format: "txt" | "md") => {
      if (!selectedChapter) return
      const content =
        format === "md"
          ? `# ${selectedChapter.title}\n\n${selectedChapter.content}`
          : selectedChapter.content
      const mime = format === "md" ? "text/markdown" : "text/plain"
      const ext = format === "md" ? "md" : "txt"
      const blob = new Blob([content], { type: `${mime};charset=utf-8` })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${selectedChapter.title}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    },
    [selectedChapter]
  )

  const exportAllAs = useCallback(
    (format: "txt" | "md") => {
      if (!currentNovel) return
      let content = ""
      if (format === "md") {
        content += `# ${currentNovel.title}\n\n`
        if (currentNovel.description) content += `> ${currentNovel.description}\n\n`
      } else {
        content += `${currentNovel.title}\n${"=".repeat(currentNovel.title.length)}\n\n`
      }

      for (const vol of currentVolumes) {
        const volChapters = chapters
          .filter((c) => c.volumeId === vol.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        if (format === "md") {
          content += `## ${vol.title}\n\n`
        } else {
          content += `${vol.title}\n${"-".repeat(vol.title.length)}\n\n`
        }
        for (const ch of volChapters) {
          if (format === "md") {
            content += `### ${ch.title}\n\n${ch.content}\n\n`
          } else {
            content += `${ch.title}\n\n${ch.content}\n\n`
          }
        }
      }

      const mime = format === "md" ? "text/markdown" : "text/plain"
      const ext = format === "md" ? "md" : "txt"
      const blob = new Blob([content], { type: `${mime};charset=utf-8` })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${currentNovel.title}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    },
    [currentNovel, currentVolumes, chapters]
  )

  // ── Sidebar entity callbacks (bridging to dialog system) ──

  const handleSidebarRenameNovel = useCallback(
    (id: string, title: string) => openRename("novel", id, title),
    [openRename]
  )
  const handleSidebarRenameVolume = useCallback(
    (id: string, title: string) => openRename("volume", id, title),
    [openRename]
  )
  const handleSidebarRenameChapter = useCallback(
    (id: string, title: string) => openRename("chapter", id, title),
    [openRename]
  )
  const handleSidebarDeleteNovel = useCallback(
    (id: string) => openDelete("novel", id),
    [openDelete]
  )
  const handleSidebarDeleteVolume = useCallback(
    (id: string) => openDelete("volume", id),
    [openDelete]
  )
  const handleSidebarDeleteChapter = useCallback(
    (id: string) => openDelete("chapter", id),
    [openDelete]
  )

  // ── Scroll to AI output ──

  useEffect(() => {
    if (aiText && aiOuterRef.current) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      aiOuterRef.current.scrollIntoView({
        behavior: prefersReduced ? "instant" : "smooth",
        block: "nearest",
      })
    }
  }, [aiText])

  // ── Keyboard shortcut: Ctrl+K / Cmd+K → search ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ── Warn before leaving page with unsaved changes ──
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  // ── Navigate to a specific view + highlight item ──
  const handleNavigateToView = useCallback(
    (view: "characters" | "world" | "outline", highlightId?: string) => {
      setViewMode(view)
      setHighlightId(highlightId)
    },
    []
  )

  // ── Handle create chapter from AI next-chapter dialog ──
  const handleCreateChapterFromAI = useCallback(
    (chapter: Chapter) => {
      setChapters((prev) => [...prev, chapter])
      setSelectedChapterId(chapter.id)
      setViewMode("write")
    },
    []
  )

  // ── Render ──

  return (
    <SidebarProvider defaultOpen={true} className="flex-1 min-h-0">
      {/* ======================== SIDEBAR ======================== */}
      <Sidebar collapsible="offcanvas" side="left">
        <NovelSidebar
          novels={novels}
          volumes={volumes}
          chapters={chapters}
          selectedNovelId={selectedNovelId}
          selectedChapterId={selectedChapterId}
          expandedVolumeIds={expandedVolumeIds}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onSelectNovel={handleSelectNovel}
          onSelectChapter={handleSelectChapter}
          onToggleVolume={handleToggleVolume}
          onCreateNovel={handleCreateNovel}
          onCreateVolume={handleCreateVolume}
          onCreateChapter={handleCreateChapter}
          onRenameNovel={handleSidebarRenameNovel}
          onRenameVolume={handleSidebarRenameVolume}
          onRenameChapter={handleSidebarRenameChapter}
          onDeleteNovel={handleSidebarDeleteNovel}
          onDeleteVolume={handleSidebarDeleteVolume}
          onDeleteChapter={handleSidebarDeleteChapter}
          onReorderVolumes={handleReorderVolumes}
          onReorderChapters={handleReorderChapters}
          onMoveChapter={handleMoveChapter}
          onBatchMoveChapters={handleBatchMoveChapters}
          onBatchReorderChapters={handleReorderChapters}
        />
      </Sidebar>

      {/* ======================== MAIN ======================== */}
      <SidebarInset className="flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="size-8 motion-safe:animate-spin text-muted-foreground/40" aria-hidden="true" />
          </div>
        ) : loadError ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-xs text-destructive">
              <p className="font-medium">加载失败</p>
              <p className="text-sm mt-2 text-muted-foreground">{loadError}</p>
            </div>
          </div>
        ) : viewMode !== "write" && selectedNovelId ? (
          viewMode === "characters" ? (
            <CharacterPanel novelId={selectedNovelId} />
          ) : viewMode === "world" ? (
            <WorldTermsPanel novelId={selectedNovelId} />
          ) : (
            <PlotOutlinePanel novelId={selectedNovelId} onNavigateToChapter={handleSelectChapter} />
          )
        ) : !selectedNovelId ? (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-transparent via-background to-background">
            <div className="text-center max-w-xs">
              <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
                <Library className="size-8 text-muted-foreground/40" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-foreground/70">选择或创建一个作品</p>
              <p className="text-sm mt-2 text-muted-foreground leading-relaxed">
                从左侧侧边栏选择已有作品，<br />
                或点击「新建作品」开始创作长篇
              </p>
            </div>
          </div>
        ) : !selectedChapter ? (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-transparent via-background to-background">
            <div className="text-center max-w-xs">
              <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
                <FileText className="size-8 text-muted-foreground/40" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-foreground/70">选择或创建一个章节</p>
              <p className="text-sm mt-2 text-muted-foreground leading-relaxed">
                从左侧侧边栏选择一个章节，<br />
                或点击「添加章节」开始写作
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-2 px-4 py-2 border-b border-border/80 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60 sticky top-0 z-10 shrink-0">
              <SidebarTrigger />

              <Separator orientation="vertical" className="h-5 mx-0.5" />

              {/* Breadcrumb: Volume / Chapter */}
              <div className="flex items-center gap-1.5 min-w-0">
                {currentVolume && (
                  <span className="text-xs text-muted-foreground/50 whitespace-nowrap truncate max-w-[120px]">
                    {currentVolume.title}
                  </span>
                )}
                {currentVolume && (
                  <ChevronRightIcon className="size-3 text-muted-foreground/30 shrink-0" aria-hidden="true" />
                )}
                <Input
                  value={selectedChapter.title}
                  onChange={handleTitleChange}
                  className="h-7 border-none bg-transparent px-1.5 text-base font-medium focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:rounded-sm shadow-none min-w-[120px] w-auto"
                  placeholder="输入章节标题…"
                  name="chapter-title"
                  aria-label="章节标题"
                />
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                {/* Saving indicator */}
                {saving && (
                  <span className="text-xs text-muted-foreground/50 motion-safe:animate-pulse">保存中…</span>
                )}

                {/* Analyze success toast */}
                {analyzerSuccess && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 animate-fade-in-slow">
                    {analyzerSuccess}
                  </span>
                )}

                {/* Word count */}
                <span className="text-xs text-muted-foreground/70 whitespace-nowrap tabular-nums">
                  {stats.words} 字
                  <span className="text-muted-foreground/40 ml-1">
                    / {novelWordCount} 字总计
                  </span>
                </span>

                <span className="size-1 rounded-full bg-border" />

                {/* Search */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSearchOpen(true)}
                  aria-label="全局搜索"
                  className="text-muted-foreground/70 hover:text-foreground"
                  title="搜索 (Ctrl+K)"
                >
                  <Search className="size-4" aria-hidden="true" />
                </Button>

                {/* AI Write */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAI}
                  disabled={generating}
                  className="gap-1.5 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                >
                  {generating ? (
                    <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="size-3.5" aria-hidden="true" />
                  )}
                  <span>AI 续写</span>
                </Button>

                {/* AI Next Chapter */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNextChapterOpen(true)}
                  disabled={!selectedNovelId}
                  className="gap-1.5 border-emerald-200/50 dark:border-emerald-800/30 hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                >
                  <FileText className="size-3.5" aria-hidden="true" />
                  <span>AI 下一章</span>
                </Button>

                {/* AI Analyze */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnalyzerOpen(true)}
                  className="gap-1.5 border-amber-200/50 dark:border-amber-800/30 hover:border-amber-400/60 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  <span>AI 分析</span>
                </Button>

                {/* AI Assistant */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssistantOpen((v) => !v)}
                  data-active={assistantOpen}
                  className="gap-1.5 data-active:bg-primary/10 data-active:border-primary/40 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  <span>AI 助手</span>
                </Button>

                {/* Theme toggle */}
                <ThemeToggle />

                {/* Export */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="导出"
                      className="text-muted-foreground/70"
                    >
                      <Download className="size-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => exportAs("txt")}>
                      <FileDown className="size-3.5 mr-2" aria-hidden="true" />
                      导出本章 (TXT)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAs("md")}>
                      <FileDown className="size-3.5 mr-2" aria-hidden="true" />
                      导出本章 (Markdown)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => exportAllAs("txt")}>
                      <FileDown className="size-3.5 mr-2" aria-hidden="true" />
                      导出全书 (TXT)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAllAs("md")}>
                      <FileDown className="size-3.5 mr-2" aria-hidden="true" />
                      导出全书 (Markdown)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* ── Editor + AI Assistant ── */}
            <div className="flex-1 flex min-h-0">
              {/* ═══ Editor Area ═══ */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                {/* ── Textarea (scrollable) ── */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="mx-auto w-full max-w-3xl px-6 py-8 md:py-12 md:px-8">
                    <textarea
                      ref={editorRef}
                      value={selectedChapter.content}
                      onChange={handleContentChange}
                      onSelect={handleEditorSelect}
                      onMouseUp={handleEditorSelect}
                      onKeyDown={handleEditorKeyDown}
                      onKeyUp={(e) => {
                        if (e.key === "Escape") setSelectionRange(null)
                        else handleEditorSelect()
                      }}
                      onBlur={() => setTimeout(() => setSelectionRange(null), 200)}
                      className="w-full min-h-[calc(100vh-12rem)] resize-none bg-transparent text-base leading-[1.85] outline-none focus-visible:ring-0 placeholder:text-muted-foreground/25 font-sans"
                      placeholder="开始写作，或点击右上角的「AI 续写」获取灵感……"
                      name="editor-content"
                      aria-label="编辑区域"
                    />

                    {/* ── Floating rewrite toolbar ── */}
                    {selectionRange && !rewriting && (
                      <div
                        className="fixed z-50 flex items-center gap-1 rounded-lg border border-border/60 bg-background/95 backdrop-blur-md px-2 py-1.5 shadow-lg animate-fade-in"
                        style={{ top: selectionRange.top, left: selectionRange.left }}
                      >
                        <button
                          onClick={() => {
                            setRewriteInstruction("")
                            setRewriteInstructionOpen(true)
                          }}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          扩写
                        </button>
                        <span className="size-3 rounded-full bg-border/60" />
                        <button
                          onClick={() => handleRewrite("condense")}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-foreground/80 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        >
                          缩写
                        </button>
                      </div>
                    )}

                    {/* ── Rewrite loading ── */}
                    {rewriting && (
                      <div
                        className="fixed z-50 flex items-center gap-2 rounded-lg border border-border/60 bg-background/95 backdrop-blur-md px-3 py-2 shadow-lg"
                        style={{ top: selectionRange?.top ?? 0, left: selectionRange?.left ?? 0 }}
                      >
                        <Loader2 className="size-3.5 motion-safe:animate-spin text-primary/60" aria-hidden="true" />
                        <span className="text-xs text-muted-foreground">AI 改写中…</span>
                      </div>
                    )}

                    {/* ── Rewrite error ── */}
                    {rewriteError && !rewriting && (
                      <div className="mt-2 text-xs text-destructive flex items-center gap-1.5">
                        <span>改写失败：{rewriteError}</span>
                        <button
                          onClick={() => setRewriteError("")}
                          className="underline hover:no-underline"
                        >
                          关闭
                        </button>
                      </div>
                    )}

                    {/* ── Rewrite instruction dialog ── */}
                    {rewriteInstructionOpen && (
                      <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
                        onClick={() => setRewriteInstructionOpen(false)}
                      >
                        <div
                          className="w-full max-w-md rounded-lg border border-border/60 bg-background p-5 shadow-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h4 className="text-sm font-medium mb-1">扩写要求</h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            指定希望如何扩写选中内容，例如：
                            <br />「增加环境描写」「加入心理活动」「补充对话细节」
                          </p>
                          <textarea
                            value={rewriteInstruction}
                            onChange={(e) => setRewriteInstruction(e.target.value)}
                            placeholder="例：增加秋季氛围的环境描写，加入主角的内心感受"
                            rows={4}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-3">
                            <button
                              onClick={() => setRewriteInstructionOpen(false)}
                              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              取消
                            </button>
                            <button
                              onClick={confirmRewriteWithInstruction}
                              className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              确认扩写
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* ── AI output / loading / error ── */}
                {(aiText || generating || aiError) && (
                  <div className="shrink-0 max-h-[40vh] overflow-y-auto border-t border-border/60 bg-gradient-to-r from-primary/[0.04] to-transparent">
                    {/* Loading */}
                    {generating && (
                      <div className="mx-auto max-w-3xl px-6 py-5 md:px-8" aria-live="polite">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10">
                            <Sparkles className="size-3 text-primary" aria-hidden="true" />
                          </span>
                          <span className="font-medium text-foreground">AI 正在思考…</span>
                        </div>
                        <div className="flex gap-1.5 pl-7">
                          <span className="size-1.5 rounded-full bg-primary/50 motion-safe:animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="size-1.5 rounded-full bg-primary/50 motion-safe:animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="size-1.5 rounded-full bg-primary/50 motion-safe:animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {aiError && !generating && (
                      <div className="mx-auto max-w-3xl px-6 py-5">
                        <div className="flex items-start gap-3 text-sm">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
                            <svg className="size-3 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                          </span>
                          <div>
                            <p className="font-medium text-destructive">生成失败</p>
                            <p className="mt-1 text-muted-foreground">{aiError}</p>
                            <Button size="xs" variant="outline" onClick={dismissAI} className="mt-2 h-7 text-xs">关闭</Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Output */}
                    {aiText && !generating && !aiError && (
                      <div ref={aiOuterRef} className="mx-auto max-w-3xl px-6 py-5 md:px-8" aria-live="polite" aria-atomic="true">
                        <div className="relative pl-5 border-l-2 border-primary/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10">
                              <Sparkles className="size-3 text-primary" aria-hidden="true" />
                            </span>
                            <span className="font-medium text-foreground/80">AI 建议</span>
                          </div>
                          <div className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
                            <TypeWriterText text={aiFullText} speed={35} />
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            <Button size="xs" variant="default" onClick={acceptAI} className="h-7 rounded-md px-3 text-xs">采纳</Button>
                            <Button size="xs" variant="ghost" onClick={dismissAI} className="h-7 rounded-md px-3 text-xs text-muted-foreground">忽略</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ═══ AI Assistant Panel ═══ */}
              {assistantOpen && (
                <div className="w-[400px] shrink-0 border-l border-border/60">
                  <AiAssistantPanel
                    open={assistantOpen}
                    onClose={() => setAssistantOpen(false)}
                    novelId={selectedNovelId!}
                    chapterTitle={selectedChapter.title}
                    chapterContent={selectedChapter.content}
                    onRewriteApplied={(newContent) => {
                      if (!selectedChapter?.content) return
                      setDiffOriginal(selectedChapter.content)
                      setDiffRewritten(newContent)
                      setDiffDialogOpen(true)
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </SidebarInset>

      {/* ─── Rename Dialog ─── */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {renameTarget?.kind === "novel"
                ? "重命名作品"
                : renameTarget?.kind === "volume"
                  ? "重命名卷"
                  : "重命名章节"}
            </DialogTitle>
            <DialogDescription>
              输入新的
              {renameTarget?.kind === "novel"
                ? "作品"
                : renameTarget?.kind === "volume"
                  ? "卷"
                  : "章节"}{" "}
              名称。
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmRename()
            }}
            placeholder="输入新名称…"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmRename}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ─── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>删除{deleteTarget?.label ?? ""}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.kind === "novel"
                ? "确定要删除此作品吗？作品内的所有卷和章节也将被删除。此操作不可撤销。"
                : deleteTarget?.kind === "volume"
                  ? "确定要删除此卷吗？卷内的所有章节也将被删除。此操作不可撤销。"
                  : "确定要删除此章节吗？此操作不可撤销。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Chapter Analyzer ─── */}
      {selectedChapter && (
        <ChapterAnalyzer
          open={analyzerOpen}
          onOpenChange={setAnalyzerOpen}
          novelId={selectedNovelId!}
          chapterTitle={selectedChapter.title}
          chapterContent={selectedChapter.content}
          onApplied={handleAnalyzerApplied}
        />
      )}

      {/* ─── Search Dialog ─── */}
      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        novelId={selectedNovelId}
        onNavigateToChapter={handleSelectChapter}
        onNavigateToView={handleNavigateToView}
      />

      {/* ─── Diff Review Dialog ─── */}
      <DiffReviewDialog
        open={diffDialogOpen}
        onOpenChange={setDiffDialogOpen}
        originalText={diffOriginal}
        rewrittenText={diffRewritten}
        onAccept={handleDiffAccept}
      />

      {/* ─── AI Next Chapter Dialog ─── */}
      <NextChapterDialog
        open={nextChapterOpen}
        onOpenChange={setNextChapterOpen}
        novelId={selectedNovelId!}
        currentVolumeId={currentVolume?.id ?? ""}
        currentVolumeTitle={currentVolume?.title ?? ""}
        chapters={chapters}
        onCreateChapter={handleCreateChapterFromAI}
      />
    </SidebarProvider>
  )
}

// ─── Theme toggle ───────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
      className="text-muted-foreground/70 hover:text-foreground"
      title={theme === "dark" ? "浅色模式" : "深色模式"}
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  )
}

// ─── Small inline icon component ───────────────────────────────────────────

function ChevronRightIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
