"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Plus,
  Globe,
  Pencil,
  Trash2,
} from "lucide-react"
import type { WorldTerm } from "@/lib/types"
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

// ─── Term types ─────────────────────────────────────────────────────────────

const TERM_TYPES = ["地点", "组织", "物品", "概念", "魔法/科技", "事件", "时间", "其他"]

// ─── Props ──────────────────────────────────────────────────────────────────

interface WorldTermsPanelProps {
  novelId: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WorldTermsPanel({ novelId }: WorldTermsPanelProps) {
  const [terms, setTerms] = useState<WorldTerm[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editTerm, setEditTerm] = useState<WorldTerm>({
    id: "", novelId, term: "", type: "其他", definition: "", notes: "",
    createdAt: "", updatedAt: "",
  })
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const selectedTerm = terms.find((t) => t.id === selectedId) ?? null

  // ── Load ──

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ terms: WorldTerm[] }>(
        `/api/world-terms?novelId=${novelId}`
      )
      setTerms(data.terms)
    } catch (err) {
      toast.error("加载术语失败")
    } finally {
      setLoading(false)
    }
  }, [novelId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── CRUD ──

  const openCreate = useCallback(() => {
    setEditTerm({ id: "", novelId, term: "", type: "其他", definition: "", notes: "", createdAt: "", updatedAt: "" })
    setEditOpen(true)
  }, [novelId])

  const openEdit = useCallback((term: WorldTerm) => {
    setEditTerm({ ...term })
    setEditOpen(true)
  }, [])

  const saveTerm = useCallback(async () => {
    setSaving(true)
    try {
      if (editTerm.id) {
        await apiPatch(`/api/world-terms/${editTerm.id}`, {
          term: editTerm.term, type: editTerm.type,
          definition: editTerm.definition, notes: editTerm.notes,
        })
        setTerms((prev) =>
          prev.map((t) =>
            t.id === editTerm.id
              ? { ...editTerm, updatedAt: new Date().toISOString() }
              : t
          )
        )
      } else {
        const data = await apiPost<{ term: WorldTerm }>("/api/world-terms", {
          novelId, term: editTerm.term, type: editTerm.type,
          definition: editTerm.definition, notes: editTerm.notes,
        })
        setTerms((prev) => [...prev, data.term])
        setSelectedId(data.term.id)
      }
      setEditOpen(false)
    } catch (err) {
      toast.error("保存术语失败")
    } finally {
      setSaving(false)
    }
  }, [editTerm, novelId])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await apiDelete(`/api/world-terms/${deleteTarget}`)
      setTerms((prev) => prev.filter((t) => t.id !== deleteTarget))
      if (selectedId === deleteTarget) setSelectedId(null)
    } catch (err) {
      toast.error("删除术语失败")
    }
    setDeleteTarget(null)
  }, [deleteTarget, selectedId])

  // ── Group terms by type ──

  const groupedTerms = terms.reduce<Record<string, WorldTerm[]>>((acc, t) => {
    const type = t.type || "其他"
    if (!acc[type]) acc[type] = []
    acc[type].push(t)
    return acc
  }, {})

  const sortedGroups = Object.entries(groupedTerms).sort(
    ([a], [b]) => TERM_TYPES.indexOf(a) - TERM_TYPES.indexOf(b)
  )

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
          <Globe className="size-4 text-primary/60" aria-hidden="true" />
          <h2 className="text-sm font-medium">世界观设定</h2>
          <span className="text-xs text-muted-foreground/50">
            {terms.length} 条
          </span>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-3.5" aria-hidden="true" />
          <span>添加设定</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Term list grouped by type */}
        <div className="w-72 shrink-0 border-r border-border/40 overflow-y-auto">
          {terms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-sm text-muted-foreground">
              <Globe className="size-8 mb-3 opacity-30" aria-hidden="true" />
              <p>暂无设定</p>
              <p className="text-xs mt-1 text-muted-foreground/60">
                记录你的世界观设定，防止前后矛盾
              </p>
            </div>
          ) : (
            <div className="py-3 px-3 space-y-4">
              {sortedGroups.map(([type, typeTerms]) => (
                <div key={type}>
                  <h4 className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider mb-1 px-2">
                    {type}
                  </h4>
                  <div className="space-y-0.5">
                    {typeTerms.map((term) => (
                      <button
                        key={term.id}
                        onClick={() => setSelectedId(term.id)}
                        data-active={term.id === selectedId}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          "hover:bg-muted/50",
                          "data-active:bg-muted data-active:font-medium"
                        )}
                      >
                        <span className="truncate">{term.term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Term detail */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTerm ? (
            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
              <Globe className="size-10 mb-3 opacity-20" aria-hidden="true" />
              <p>选择一个设定查看详情</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      {selectedTerm.type}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium mt-1">{selectedTerm.term}</h3>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openEdit(selectedTerm)}
                    aria-label="编辑"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(selectedTerm.id)}
                    aria-label="删除"
                    className="text-destructive/70 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {selectedTerm.definition && (
                <div>
                  <h4 className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-1.5">
                    定义
                  </h4>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {selectedTerm.definition}
                  </p>
                </div>
              )}

              {selectedTerm.notes && (
                <div>
                  <h4 className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-1.5">
                    备注
                  </h4>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {selectedTerm.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTerm.id ? "编辑设定" : "添加设定"}</DialogTitle>
            <DialogDescription>记录世界观设定条目。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground/70 block mb-1">名称</label>
                <Input
                  value={editTerm.term}
                  onChange={(e) => setEditTerm((p) => ({ ...p, term: e.target.value }))}
                  placeholder="设定名称"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/70 block mb-1">类型</label>
                <select
                  value={editTerm.type}
                  onChange={(e) => setEditTerm((p) => ({ ...p, type: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {TERM_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/70 block mb-1">定义</label>
              <Textarea
                value={editTerm.definition}
                onChange={(e) => setEditTerm((p) => ({ ...p, definition: e.target.value }))}
                placeholder="详细的定义说明…"
                rows={4}
                className="resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/70 block mb-1">备注</label>
              <Textarea
                value={editTerm.notes}
                onChange={(e) => setEditTerm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="其他备注…"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={saveTerm} disabled={saving || !editTerm.term.trim()}>
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
            <DialogTitle>删除设定</DialogTitle>
            <DialogDescription>确定要删除此设定条目吗？此操作不可撤销。</DialogDescription>
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
