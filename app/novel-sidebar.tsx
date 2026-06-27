"use client"

import { useState, useCallback, useRef } from "react"
import {
  ChevronRight,
  Plus,
  FileText,
  Pencil,
  Trash2,
  BookOpen,
  Library,
  User,
  Globe,
  GitBranch,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Novel, Volume, Chapter, ViewMode } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
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

// ─── Props ──────────────────────────────────────────────────────────────────

interface NovelSidebarProps {
  novels: Novel[]
  volumes: Volume[]
  chapters: Chapter[]
  selectedNovelId: string | null
  selectedChapterId: string | null
  expandedVolumeIds: Set<string>
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onSelectNovel: (id: string) => void
  onSelectChapter: (id: string) => void
  onToggleVolume: (id: string) => void
  onCreateNovel: (title: string, description: string) => void
  onCreateVolume: (novelId: string, title: string) => void
  onCreateChapter: (volumeId: string, title: string) => void
  onRenameNovel: (id: string, title: string) => void
  onRenameVolume: (id: string, title: string) => void
  onRenameChapter: (id: string, title: string) => void
  onDeleteNovel: (id: string) => void
  onDeleteVolume: (id: string) => void
  onDeleteChapter: (id: string) => void
  onReorderVolumes?: (volumeIds: string[]) => void
  onReorderChapters?: (chapterIds: string[]) => void
  onMoveChapter?: (chapterId: string, targetVolumeId: string) => void
  onBatchMoveChapters?: (chapterIds: string[], targetVolumeId: string) => void
  onBatchReorderChapters?: (chapterIds: string[]) => void
}

// ─── Dialog helpers ─────────────────────────────────────────────────────────

type EntityKind = "novel" | "volume" | "chapter"
const entityLabel: Record<EntityKind, string> = {
  novel: "作品",
  volume: "卷",
  chapter: "章节",
}

interface RenameTarget {
  kind: EntityKind
  id: string
  title: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NovelSidebar({
  novels,
  volumes,
  chapters,
  selectedNovelId,
  selectedChapterId,
  expandedVolumeIds,
  viewMode,
  onViewModeChange,
  onSelectNovel,
  onSelectChapter,
  onToggleVolume,
  onCreateNovel,
  onCreateVolume,
  onCreateChapter,
  onRenameNovel,
  onRenameVolume,
  onRenameChapter,
  onDeleteNovel,
  onDeleteVolume,
  onDeleteChapter,
  onReorderVolumes,
  onReorderChapters,
  onMoveChapter,
  onBatchMoveChapters,
  onBatchReorderChapters,
}: NovelSidebarProps) {
  const currentNovel = novels.find((n) => n.id === selectedNovelId) ?? null
  const currentVolumes = volumes
    .filter((v) => v.novelId === selectedNovelId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const chaptersByVolume = (volumeId: string) =>
    chapters
      .filter((c) => c.volumeId === volumeId)
      .sort((a, b) => a.sortOrder - b.sortOrder)

  // ── Dialog state ──

  const [createNovelOpen, setCreateNovelOpen] = useState(false)
  const [newNovelTitle, setNewNovelTitle] = useState("")
  const [newNovelDesc, setNewNovelDesc] = useState("")

  const [createVolOpen, setCreateVolOpen] = useState(false)
  const [newVolTitle, setNewVolTitle] = useState("")

  const [createChOpen, setCreateChOpen] = useState(false)
  const [newChTitle, setNewChTitle] = useState("")
  const [createChVolumeId, setCreateChVolumeId] = useState<string | null>(null)

  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)
  const [renameVal, setRenameVal] = useState("")

  // ── Multi-select state ──
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set())

  const handleChapterClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.stopPropagation()
        setSelectedChapterIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
          return next
        })
        return
      }
      // Single click: clear selection and select chapter
      if (selectedChapterIds.size > 0) {
        setSelectedChapterIds(new Set())
      }
      onSelectChapter(id)
    },
    [selectedChapterIds, onSelectChapter]
  )

  // Clear selection on Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSelectedChapterIds(new Set())
    }
  }, [])

  // ── Drag-and-drop state ──

  const draggedItem = useRef<{
    kind: "volume" | "chapter"
    id: string
    volumeId?: string
  } | null>(null)

  const [dropTarget, setDropTarget] = useState<{
    kind: "volume" | "chapter"
    id: string
    position: "before" | "after"
  } | null>(null)

  // ── Drag handlers ──

  const handleDragStart = useCallback(
    (kind: "volume" | "chapter", id: string, volumeId?: string) =>
      (e: React.DragEvent) => {
        draggedItem.current = { kind, id, volumeId }

        // For chapter drags with multi-selection, include all selected IDs
        if (kind === "chapter" && selectedChapterIds.size > 0 && selectedChapterIds.has(id)) {
          e.dataTransfer.setData("text/plain", Array.from(selectedChapterIds).join(","))
        } else {
          e.dataTransfer.setData("text/plain", id)
        }

        e.dataTransfer.effectAllowed = "move"
        requestAnimationFrame(() => {
          if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "0.4"
          }
        })
      },
    [selectedChapterIds]
  )

  const handleDragOver = useCallback(
    (kind: "volume" | "chapter", id: string) => (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      if (!draggedItem.current) return
      if (draggedItem.current.id === id) return
      // Allow: volume → volume, chapter → chapter, OR chapter → volume (cross-volume move)
      if (kind === "chapter" && draggedItem.current.kind !== "chapter") return
      if (kind === "volume" && draggedItem.current.kind !== "volume" && draggedItem.current.kind !== "chapter") return

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const y = e.clientY - rect.top
      setDropTarget({
        kind,
        id,
        position: y < rect.height / 2 ? "before" : "after",
      })
    },
    []
  )

  const handleDragLeave = useCallback(
    (kind: "volume" | "chapter", id: string) => (e: React.DragEvent) => {
      // Only clear if leaving the actual target (not bubbling from child)
      if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
        if (dropTarget?.kind === kind && dropTarget?.id === id) {
          setDropTarget(null)
        }
      }
    },
    [dropTarget]
  )

  const handleDropVolume = useCallback(
    (targetId: string) => (e: React.DragEvent) => {
      e.preventDefault()
      const item = draggedItem.current
      if (!item || !dropTarget) return
      if (item.kind === "volume" && item.id === targetId) { setDropTarget(null); draggedItem.current = null; return }

      // Handle chapter(s) dropped on volume → move to this volume
      if (item.kind === "chapter" && item.volumeId && item.volumeId !== targetId) {
        const ids = e.dataTransfer.getData("text/plain").split(",").filter(Boolean)
        if (ids.length > 1) {
          onBatchMoveChapters?.(ids, targetId)
        } else {
          onMoveChapter?.(item.id, targetId)
        }
        setDropTarget(null)
        draggedItem.current = null
        return
      }

      // Handle volume reorder
      const allIds = currentVolumes.map((v) => v.id)
      const targetIndex = allIds.indexOf(targetId)
      const insertAt =
        dropTarget.position === "before" ? targetIndex : targetIndex + 1

      const newOrder = allIds.filter((id) => id !== item.id)
      newOrder.splice(insertAt, 0, item.id)

      if (newOrder.join(",") !== allIds.join(",")) {
        onReorderVolumes?.(newOrder)
      }

      setDropTarget(null)
      draggedItem.current = null
    },
    [currentVolumes, dropTarget, onReorderVolumes, onMoveChapter, onBatchMoveChapters]
  )

  const handleDropChapter = useCallback(
    (targetId: string) => (e: React.DragEvent) => {
      e.preventDefault()
      const item = draggedItem.current
      if (!item || !dropTarget) return
      if (item.id === targetId) return
      if (item.kind !== "chapter") return

      const draggedVolumeId = item.volumeId
      if (!draggedVolumeId) return

      const volChapters = chaptersByVolume(draggedVolumeId)
      const allIds = volChapters.map((c) => c.id)

      // Get the actual set of dragged IDs (multi-selection or single)
      const dataIds = e.dataTransfer.getData("text/plain").split(",").filter(Boolean)
      const draggedIds = dataIds.length > 1
        ? dataIds.filter((id) => allIds.includes(id))
        : [item.id]

      const targetIndex = allIds.indexOf(targetId)
      const insertAt =
        dropTarget.position === "before" ? targetIndex : targetIndex + 1

      // Remove all dragged items, then insert them at the target position
      const remaining = allIds.filter((id) => !draggedIds.includes(id))
      remaining.splice(insertAt, 0, ...draggedIds)

      if (remaining.join(",") !== allIds.join(",")) {
        if (draggedIds.length > 1) {
          onBatchReorderChapters?.(remaining)
        } else {
          onReorderChapters?.(remaining)
        }
      }

      setDropTarget(null)
      draggedItem.current = null
      setSelectedChapterIds(new Set())
    },
    [chaptersByVolume, dropTarget, onReorderChapters, onBatchReorderChapters]
  )

  const handleDragEnd = useCallback(() => {
    setDropTarget(null)
    draggedItem.current = null
  }, [])

  // ── Dialog handlers ──

  const openCreateNovel = useCallback(() => {
    setNewNovelTitle("")
    setNewNovelDesc("")
    setCreateNovelOpen(true)
  }, [])

  const confirmCreateNovel = useCallback(() => {
    if (newNovelTitle.trim()) {
      onCreateNovel(newNovelTitle.trim(), newNovelDesc.trim())
    }
    setCreateNovelOpen(false)
  }, [newNovelTitle, newNovelDesc, onCreateNovel])

  const openCreateVolume = useCallback(() => {
    setNewVolTitle("")
    setCreateVolOpen(true)
  }, [])

  const confirmCreateVolume = useCallback(() => {
    if (selectedNovelId && newVolTitle.trim()) {
      onCreateVolume(selectedNovelId, newVolTitle.trim())
    }
    setCreateVolOpen(false)
  }, [selectedNovelId, newVolTitle, onCreateVolume])

  const openCreateChapter = useCallback((volumeId: string) => {
    setNewChTitle("")
    setCreateChVolumeId(volumeId)
    setCreateChOpen(true)
  }, [])

  const confirmCreateChapter = useCallback(() => {
    if (createChVolumeId && newChTitle.trim()) {
      onCreateChapter(createChVolumeId, newChTitle.trim())
    }
    setCreateChOpen(false)
    setCreateChVolumeId(null)
  }, [createChVolumeId, newChTitle, onCreateChapter])

  const openRename = useCallback(
    (kind: EntityKind, id: string, title: string) => {
      setRenameTarget({ kind, id, title })
      setRenameVal(title)
    },
    []
  )

  const confirmRename = useCallback(() => {
    if (!renameTarget || !renameVal.trim()) return
    const newTitle = renameVal.trim()
    switch (renameTarget.kind) {
      case "novel":
        onRenameNovel(renameTarget.id, newTitle)
        break
      case "volume":
        onRenameVolume(renameTarget.id, newTitle)
        break
      case "chapter":
        onRenameChapter(renameTarget.id, newTitle)
        break
    }
    setRenameTarget(null)
  }, [renameTarget, renameVal, onRenameNovel, onRenameVolume, onRenameChapter])

  const renameTitle =
    renameTarget?.kind === "novel"
      ? "重命名作品"
      : renameTarget?.kind === "volume"
        ? "重命名卷"
        : "重命名章节"
  const renameDesc = renameTarget
    ? `输入新的${entityLabel[renameTarget.kind]}名称。`
    : ""

  // ── Drop indicator line ──

  const DropLine = ({
    kind,
    id,
    position,
  }: {
    kind: "volume" | "chapter"
    id: string
    position: "before" | "after"
  }) => {
    if (
      dropTarget?.kind === kind &&
      dropTarget?.id === id &&
      dropTarget?.position === position
    ) {
      return (
        <div className="h-0.5 rounded-full bg-primary/70 mx-2 my-0" />
      )
    }
    return null
  }

  // ── Render ──

  return (
    <>
      <SidebarHeader className="p-3">
        {/* Novel selector */}
        <div className="flex items-center gap-1.5 mb-2">
          <button
            onClick={() => {
              if (novels.length === 0) {
                openCreateNovel()
              }
            }}
            className="flex-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <BookOpen className="size-4 text-primary/70" aria-hidden="true" />
            <span className="truncate">
              {currentNovel?.title ?? "选择作品"}
            </span>
            {novels.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground/50">
                {novels.length} 部
              </span>
            )}
          </button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={openCreateNovel}
            className="shrink-0"
            aria-label="新建作品"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Novel list */}
        {novels.length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {novels.map((novel) => (
              <button
                key={novel.id}
                onClick={() => onSelectNovel(novel.id)}
                data-active={novel.id === selectedNovelId}
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 text-xs transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:font-medium"
                )}
              >
                {novel.title}
              </button>
            ))}
          </div>
        )}

        {/* View mode tabs */}
        <div className="flex gap-0.5 border border-sidebar-border/50 rounded-md p-0.5 bg-sidebar-accent/20">
          <ModeTab
            active={viewMode === "write"}
            onClick={() => onViewModeChange("write")}
            icon={<Pencil className="size-3" />}
            label="写作"
          />
          <ModeTab
            active={viewMode === "characters"}
            onClick={() => onViewModeChange("characters")}
            icon={<User className="size-3" />}
            label="人物"
          />
          <ModeTab
            active={viewMode === "world"}
            onClick={() => onViewModeChange("world")}
            icon={<Globe className="size-3" />}
            label="设定"
          />
          <ModeTab
            active={viewMode === "outline"}
            onClick={() => onViewModeChange("outline")}
            icon={<GitBranch className="size-3" />}
            label="大纲"
          />
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent onClick={(e) => { if (e.target === e.currentTarget) setSelectedChapterIds(new Set()) }}>
        <SidebarGroup>
          <SidebarGroupContent>
            {!selectedNovelId ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-sm text-muted-foreground">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                  <Library className="size-5 opacity-40" aria-hidden="true" />
                </div>
                <p>暂无作品</p>
                <p className="text-xs mt-1.5 text-muted-foreground/70">
                  点击上方按钮创建
                </p>
              </div>
            ) : currentVolumes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-sm text-muted-foreground">
                <p>暂无卷</p>
                <p className="text-xs mt-1.5 text-muted-foreground/70">
                  点击下方按钮添加第一卷
                </p>
              </div>
            ) : (
              <div className="px-2 space-y-0.5">
                {currentVolumes.map((vol, volIdx) => {
                  const isExpanded = expandedVolumeIds.has(vol.id)
                  const volChapters = chaptersByVolume(vol.id)
                  return (
                    <div key={vol.id} className="space-y-0.5">
                      {/* ── Drop indicator before volume ── */}
                      <DropLine kind="volume" id={vol.id} position="before" />

                      {/* ── Volume header ── */}
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <div
                            draggable
                            onDragStart={handleDragStart("volume", vol.id)}
                            onDragOver={handleDragOver("volume", vol.id)}
                            onDragLeave={handleDragLeave("volume", vol.id)}
                            onDrop={handleDropVolume(vol.id)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-all",
                              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                              "cursor-default",
                              dropTarget?.kind === "volume" &&
                                dropTarget?.id === vol.id &&
                                "bg-sidebar-accent/40"
                            )}
                          >
                            <GripVertical className="size-3 shrink-0 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors cursor-grab active:cursor-grabbing" />
                            <ChevronRight
                              className={cn(
                                "size-3.5 shrink-0 text-muted-foreground/50 transition-transform",
                                isExpanded && "rotate-90"
                              )}
                              aria-hidden="true"
                              onClick={(e) => {
                                e.stopPropagation()
                                onToggleVolume(vol.id)
                              }}
                            />
                            <span
                              className="truncate flex-1"
                              onClick={() => onToggleVolume(vol.id)}
                            >
                              {vol.title}
                            </span>
                            <span className="text-xs tabular-nums text-muted-foreground/40">
                              {volChapters.length}
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                openCreateChapter(vol.id)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation()
                                  openCreateChapter(vol.id)
                                }
                              }}
                              className="ml-1 flex size-5 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity hover:bg-sidebar-accent group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                              aria-label="添加章节"
                            >
                              <Plus className="size-3" aria-hidden="true" />
                            </span>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-40">
                          <ContextMenuItem
                            onClick={() =>
                              openRename("volume", vol.id, vol.title)
                            }
                          >
                            <Pencil className="size-3.5 mr-2" aria-hidden="true" />
                            重命名
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            variant="destructive"
                            onClick={() => onDeleteVolume(vol.id)}
                          >
                            <Trash2 className="size-3.5 mr-2" aria-hidden="true" />
                            删除卷
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>

                      {/* ── Drop indicator after volume ── */}
                      <DropLine kind="volume" id={vol.id} position="after" />

                      {/* ── Chapters list ── */}
                      {isExpanded && (
                        <div className="ml-2 border-l border-sidebar-border/50 pl-1 space-y-0.5">
                          {volChapters.map((ch) => (
                            <div key={ch.id}>
                              {/* ── Drop indicator before chapter ── */}
                              <DropLine
                                kind="chapter"
                                id={ch.id}
                                position="before"
                              />

                              {/* ── Chapter item ── */}
                              <ContextMenu>
                                <ContextMenuTrigger asChild>
                                  <div
                                    draggable
                                    onDragStart={handleDragStart(
                                      "chapter",
                                      ch.id,
                                      vol.id
                                    )}
                                    onDragOver={handleDragOver(
                                      "chapter",
                                      ch.id
                                    )}
                                    onDragLeave={handleDragLeave(
                                      "chapter",
                                      ch.id
                                    )}
                                    onDrop={handleDropChapter(ch.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={(e) => handleChapterClick(ch.id, e)}
                                    onKeyDown={handleKeyDown}
                                    data-active={ch.id === selectedChapterId}
                                    data-selected={selectedChapterIds.has(ch.id)}
                                    className={cn(
                                      "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all",
                                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                      "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:font-medium",
                                      "data-selected:bg-primary/10 data-selected:ring-1 data-selected:ring-primary/30",
                                      "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                                      "relative cursor-default",
                                      "before:absolute before:left-0 before:top-1/2 before:h-0 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary before:transition-all",
                                      "data-active:before:h-4/5",
                                      dropTarget?.kind === "chapter" &&
                                        dropTarget?.id === ch.id &&
                                        "bg-sidebar-accent/40"
                                    )}
                                  >
                                    <GripVertical className="size-3 shrink-0 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors cursor-grab active:cursor-grabbing" />
                                    <FileText
                                      className={cn(
                                        "size-3.5 shrink-0",
                                        ch.id === selectedChapterId
                                          ? "text-primary/60"
                                          : "text-muted-foreground/40"
                                      )}
                                      aria-hidden="true"
                                    />
                                    <span className="truncate">{ch.title}</span>
                                  </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent className="w-40">
                                  <ContextMenuItem
                                    onClick={() =>
                                      openRename("chapter", ch.id, ch.title)
                                    }
                                  >
                                    <Pencil className="size-3.5 mr-2" aria-hidden="true" />
                                    重命名
                                  </ContextMenuItem>
                                  <ContextMenuSeparator />
                                  <ContextMenuItem
                                    variant="destructive"
                                    onClick={() => onDeleteChapter(ch.id)}
                                  >
                                    <Trash2 className="size-3.5 mr-2" aria-hidden="true" />
                                    删除章节
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>

                              {/* ── Drop indicator after chapter ── */}
                              <DropLine
                                kind="chapter"
                                id={ch.id}
                                position="after"
                              />
                            </div>
                          ))}
                          {volChapters.length === 0 && (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground/40 italic">
                              暂无章节
                            </p>
                          )}
                          <button
                            onClick={() => openCreateChapter(vol.id)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          >
                            <Plus className="size-3" aria-hidden="true" />
                            <span>添加章节</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add volume button */}
            {selectedNovelId && (
              <div className="px-2 mt-2">
                <button
                  onClick={openCreateVolume}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>添加卷</span>
                </button>
              </div>
            )}
            {selectedChapterIds.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-t border-sidebar-border/50 mt-2">
                <span className="text-xs font-medium text-primary/70">
                  {selectedChapterIds.size} 个章节已选
                </span>
                <span className="text-[10px] text-muted-foreground/40">
                  Ctrl+点击切换 · 拖拽移动/排序
                </span>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ─── Create Novel Dialog ─── */}
      <Dialog open={createNovelOpen} onOpenChange={setCreateNovelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>新建作品</DialogTitle>
            <DialogDescription>创建一个新的长篇小说作品。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="novel-title"
                className="text-xs font-medium text-foreground/70 block mb-1"
              >
                作品名称
              </label>
              <Input
                id="novel-title"
                value={newNovelTitle}
                onChange={(e) => setNewNovelTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newNovelTitle.trim())
                    confirmCreateNovel()
                }}
                placeholder="输入作品名称…"
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="novel-desc"
                className="text-xs font-medium text-foreground/70 block mb-1"
              >
                简介{" "}
                <span className="text-muted-foreground/50">（可选）</span>
              </label>
              <Textarea
                id="novel-desc"
                value={newNovelDesc}
                onChange={(e) => setNewNovelDesc(e.target.value)}
                placeholder="作品的简短描述…"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateNovelOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmCreateNovel} disabled={!newNovelTitle.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Volume Dialog ─── */}
      <Dialog open={createVolOpen} onOpenChange={setCreateVolOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>添加卷</DialogTitle>
            <DialogDescription>为当前作品添加新的卷。</DialogDescription>
          </DialogHeader>
          <Input
            value={newVolTitle}
            onChange={(e) => setNewVolTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newVolTitle.trim()) confirmCreateVolume()
            }}
            placeholder="卷名称，如「第一卷」…"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateVolOpen(false)}>
              取消
            </Button>
            <Button
              onClick={confirmCreateVolume}
              disabled={!newVolTitle.trim()}
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Chapter Dialog ─── */}
      <Dialog open={createChOpen} onOpenChange={setCreateChOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>添加章节</DialogTitle>
            <DialogDescription>为当前卷添加新的章节。</DialogDescription>
          </DialogHeader>
          <Input
            value={newChTitle}
            onChange={(e) => setNewChTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newChTitle.trim()) confirmCreateChapter()
            }}
            placeholder="章节名称…"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateChOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmCreateChapter} disabled={!newChTitle.trim()}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Rename Dialog ─── */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{renameTitle}</DialogTitle>
            <DialogDescription>{renameDesc}</DialogDescription>
          </DialogHeader>
          <Input
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmRename()
            }}
            placeholder={`输入${renameTarget?.kind ? entityLabel[renameTarget.kind] : ""}名称…`}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              取消
            </Button>
            <Button onClick={confirmRename}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      data-active={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded-[3px] px-2 py-1 text-xs transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:font-medium",
        "text-muted-foreground/60"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
