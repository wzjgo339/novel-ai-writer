"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  GitBranch,
  BookOpen,
} from "lucide-react"
import type { PlotEvent, Chapter, Volume } from "@/lib/types"
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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api"
import { toast } from "sonner"

// ─── Props ──────────────────────────────────────────────────────────────────

interface PlotOutlinePanelProps {
  novelId: string
  onNavigateToChapter?: (chapterId: string) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PlotOutlinePanel({ novelId, onNavigateToChapter }: PlotOutlinePanelProps) {
  const [events, setEvents] = useState<PlotEvent[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [volumes, setVolumes] = useState<Volume[]>([])
  const [loading, setLoading] = useState(true)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<PlotEvent>({
    id: "", novelId, chapterId: null, title: "", description: "",
    sortOrder: 0, createdAt: "", updatedAt: "",
  })
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // ── Load ──

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [eData, chData, vData] = await Promise.all([
        apiGet<{ events: PlotEvent[] }>(`/api/plot-events?novelId=${novelId}`),
        apiGet<{ chapters: Chapter[] }>(`/api/chapters`),
        apiGet<{ volumes: Volume[] }>(`/api/volumes?novelId=${novelId}`),
      ])
      setEvents(eData.events)
      setChapters(chData.chapters)
      setVolumes(vData.volumes)
    } catch (err) {
      toast.error("加载情节事件失败")
    } finally {
      setLoading(false)
    }
  }, [novelId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Helpers ──

  const getChapterTitle = (chapterId: string | null): string => {
    if (!chapterId) return ""
    const ch = chapters.find((c) => c.id === chapterId)
    if (!ch) return ""
    const vol = volumes.find((v) => v.id === ch.volumeId)
    return vol ? `${vol.title} / ${ch.title}` : ch.title
  }

  // ── CRUD ──

  const openCreate = useCallback(() => {
    const maxOrder = events.reduce((max, e) => Math.max(max, e.sortOrder), -1)
    setEditEvent({
      id: "", novelId, chapterId: null, title: "", description: "",
      sortOrder: maxOrder + 1, createdAt: "", updatedAt: "",
    })
    setEditOpen(true)
  }, [novelId, events])

  const openEdit = useCallback((event: PlotEvent) => {
    setEditEvent({ ...event })
    setEditOpen(true)
  }, [])

  const saveEvent = useCallback(async () => {
    setSaving(true)
    try {
      if (editEvent.id) {
        await apiPatch(`/api/plot-events/${editEvent.id}`, {
          title: editEvent.title,
          description: editEvent.description,
          chapterId: editEvent.chapterId,
          sortOrder: editEvent.sortOrder,
        })
        setEvents((prev) =>
          prev.map((e) =>
            e.id === editEvent.id
              ? { ...editEvent, updatedAt: new Date().toISOString() }
              : e
          )
        )
      } else {
        const data = await apiPost<{ event: PlotEvent }>("/api/plot-events", {
          novelId,
          title: editEvent.title,
          description: editEvent.description,
          chapterId: editEvent.chapterId || null,
        })
        setEvents((prev) => [...prev, data.event])
      }
      setEditOpen(false)
    } catch (err) {
      toast.error("保存事件失败")
    } finally {
      setSaving(false)
    }
  }, [editEvent, novelId])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await apiDelete(`/api/plot-events/${deleteTarget}`)
      setEvents((prev) => prev.filter((e) => e.id !== deleteTarget))
    } catch (err) {
      toast.error("删除事件失败")
    }
    setDeleteTarget(null)
  }, [deleteTarget])

  // ── Chapter options for dropdown ──

  const chapterOptions = volumes
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((vol) => {
      const volChs = chapters
        .filter((c) => c.volumeId === vol.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      return volChs.map((ch) => ({
        id: ch.id,
        label: `${vol.title} / ${ch.title}`,
      }))
    })

  // ── Render ──

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground/50">加载中…</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-primary/60" aria-hidden="true" />
          <h2 className="text-sm font-medium">情节大纲</h2>
          <span className="text-xs text-muted-foreground/50">
            {events.length} 个节点
          </span>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-3.5" aria-hidden="true" />
          <span>添加事件</span>
        </Button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
            <GitBranch className="size-10 mb-3 opacity-20" aria-hidden="true" />
            <p>暂无情节节点</p>
            <p className="text-xs mt-1 text-muted-foreground/60">
              规划你的故事走向，确保情节连贯
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-8">
            <div className="relative">
              {/* Timeline vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border/60" />

              <div className="space-y-6">
                {events
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((event, idx) => (
                    <div key={event.id} className="relative pl-10">
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 top-1.5 size-3 rounded-full border-2 border-primary/40 bg-background" />

                      {/* Card */}
                      <div className="group rounded-lg border border-border/60 bg-card/50 p-4 transition-colors hover:border-border/80">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground/40 tabular-nums">
                                #{idx + 1}
                              </span>
                              <h4 className="text-sm font-medium">
                                {event.title || "未命名事件"}
                              </h4>
                            </div>
                            {event.chapterId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onNavigateToChapter?.(event.chapterId!)
                                }}
                                className="flex items-center gap-1 mt-1 text-xs text-primary/60 hover:text-primary transition-colors group/link"
                              >
                                <BookOpen className="size-3 shrink-0" aria-hidden="true" />
                                <span className="border-b border-transparent group-hover/link:border-primary/40">{getChapterTitle(event.chapterId)}</span>
                                <span className="ml-0.5 opacity-0 group-hover/link:opacity-60 transition-opacity text-[10px]">→</span>
                              </button>
                            )}
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => openEdit(event)}
                              aria-label="编辑"
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => setDeleteTarget(event.id)}
                              aria-label="删除"
                              className="text-destructive/70 hover:text-destructive"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                        {event.description && (
                          <p className="mt-2 text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editEvent.id ? "编辑事件" : "添加事件"}</DialogTitle>
            <DialogDescription>记录故事中的一个情节节点。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground/70 block mb-1">标题</label>
              <Input
                value={editEvent.title}
                onChange={(e) => setEditEvent((p) => ({ ...p, title: e.target.value }))}
                placeholder="事件标题"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/70 block mb-1">
                关联章节 <span className="text-muted-foreground/50">（可选）</span>
              </label>
              <select
                value={editEvent.chapterId || ""}
                onChange={(e) =>
                  setEditEvent((p) => ({ ...p, chapterId: e.target.value || null }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">不关联</option>
                {chapterOptions.map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/70 block mb-1">描述</label>
              <Textarea
                value={editEvent.description}
                onChange={(e) =>
                  setEditEvent((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="事件的具体描述…"
                rows={5}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={saveEvent} disabled={saving || !editEvent.title.trim()}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>删除事件</DialogTitle>
            <DialogDescription>确定要删除此情节节点吗？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={confirmDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
