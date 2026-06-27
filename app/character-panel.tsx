"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Plus,
  User,
  Pencil,
  Trash2,
  Heart,
  Link2,
  X,
} from "lucide-react"
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api"
import { toast } from "sonner"
import type { Character, CharacterRelationship } from "@/lib/types"
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

// ─── Relationship types ─────────────────────────────────────────────────────

const RELATION_TYPES = [
  "盟友", "敌人", "恋人", "夫妻", "家人", "师徒",
  "朋友", "对手", "上下级", "同门", "宿敌", "暗恋", "其他",
]

// ─── Empty character template ───────────────────────────────────────────────

function emptyCharacter(novelId: string): Character {
  return {
    id: "",
    novelId,
    name: "", aliases: "", age: "", gender: "",
    appearance: "", personality: "", background: "",
    motivation: "", arc: "", notes: "",
    sortOrder: 0,
    createdAt: "", updatedAt: "",
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface CharacterPanelProps {
  novelId: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CharacterPanel({ novelId }: CharacterPanelProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editChar, setEditChar] = useState<Character>(emptyCharacter(novelId))
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Add relationship dialog
  const [relOpen, setRelOpen] = useState(false)
  const [relChar2, setRelChar2] = useState("")
  const [relType, setRelType] = useState("")
  const [relDesc, setRelDesc] = useState("")

  const selectedChar = characters.find((c) => c.id === selectedId) ?? null

  // ── Load data ──

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cData, rData] = await Promise.all([
        apiGet<{ characters: Character[] }>(`/api/characters?novelId=${novelId}`),
        apiGet<{ relationships: CharacterRelationship[] }>(
          `/api/relationships?novelId=${novelId}`
        ),
      ])
      setCharacters(cData.characters)
      setRelationships(rData.relationships)
    } catch (err) {
      toast.error("加载角色列表失败")
    } finally {
      setLoading(false)
    }
  }, [novelId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── CRUD ──

  const openCreate = useCallback(() => {
    setEditChar(emptyCharacter(novelId))
    setEditOpen(true)
  }, [novelId])

  const openEdit = useCallback((char: Character) => {
    setEditChar({ ...char })
    setEditOpen(true)
  }, [])

  const saveCharacter = useCallback(async () => {
    setSaving(true)
    try {
      if (editChar.id) {
        // Update existing
        await apiPatch(`/api/characters/${editChar.id}`, {
          name: editChar.name, aliases: editChar.aliases, age: editChar.age,
          gender: editChar.gender, appearance: editChar.appearance,
          personality: editChar.personality, background: editChar.background,
          motivation: editChar.motivation, arc: editChar.arc, notes: editChar.notes,
        })
        setCharacters((prev) =>
          prev.map((c) =>
            c.id === editChar.id ? { ...editChar, updatedAt: new Date().toISOString() } : c
          )
        )
        toast.success("角色已更新")
      } else {
        // Create new
        const data = await apiPost<{ character: Character }>("/api/characters", {
          novelId,
          name: editChar.name, aliases: editChar.aliases, age: editChar.age,
          gender: editChar.gender, appearance: editChar.appearance,
          personality: editChar.personality, background: editChar.background,
          motivation: editChar.motivation, arc: editChar.arc, notes: editChar.notes,
        })
        setCharacters((prev) => [...prev, data.character])
        setSelectedId(data.character.id)
      }
      setEditOpen(false)
    } catch (err) {
      toast.error("保存角色失败")
    } finally {
      setSaving(false)
    }
  }, [editChar, novelId])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await apiDelete(`/api/characters/${deleteTarget}`)
      setCharacters((prev) => prev.filter((c) => c.id !== deleteTarget))
      if (selectedId === deleteTarget) setSelectedId(null)
    } catch (err) {
      toast.error("删除角色失败")
    }
    setDeleteTarget(null)
  }, [deleteTarget, selectedId])

  // ── Relationships ──

  const charRelationships = relationships.filter(
    (r) => r.characterId1 === selectedId || r.characterId2 === selectedId
  )

  const getRelatedCharName = (rel: CharacterRelationship): string => {
    const otherId =
      rel.characterId1 === selectedId ? rel.characterId2 : rel.characterId1
    return characters.find((c) => c.id === otherId)?.name ?? "未知"
  }

  const addRelationship = useCallback(async () => {
    if (!selectedId || !relChar2 || !relType) return
    try {
      const data = await apiPost<{ relationship: CharacterRelationship }>(
        "/api/relationships",
        {
          novelId,
          characterId1: selectedId,
          characterId2: relChar2,
          relationshipType: relType,
          description: relDesc,
        }
      )
      setRelationships((prev) => [...prev, data.relationship])
      setRelOpen(false)
      setRelChar2("")
      setRelType("")
      setRelDesc("")
    } catch (err) {
      toast.error("添加关系失败")
    }
  }, [selectedId, relChar2, relType, relDesc, novelId])

  const removeRelationship = useCallback(async (relId: string) => {
    try {
      await apiDelete(`/api/relationships/${relId}`)
      setRelationships((prev) => prev.filter((r) => r.id !== relId))
    } catch (err) {
      toast.error("删除关系失败")
    }
  }, [])

  // ── Other characters for relationship target ──

  const otherCharacters = characters.filter((c) => c.id !== selectedId)

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
          <User className="size-4 text-primary/60" aria-hidden="true" />
          <h2 className="text-sm font-medium">人物管理</h2>
          <span className="text-xs text-muted-foreground/50">
            {characters.length} 人
          </span>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-3.5" aria-hidden="true" />
          <span>添加人物</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Character list */}
        <div className="w-72 shrink-0 border-r border-border/40 overflow-y-auto">
          {characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-sm text-muted-foreground">
              <User className="size-8 mb-3 opacity-30" aria-hidden="true" />
              <p>暂无人物</p>
              <p className="text-xs mt-1 text-muted-foreground/60">
                点击「添加人物」创建第一个角色
              </p>
            </div>
          ) : (
            <div className="py-1">
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedId(char.id)}
                  data-active={char.id === selectedId}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                    "hover:bg-muted/50",
                    "data-active:bg-muted data-active:font-medium"
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {char.name.charAt(0) || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate">{char.name || "未命名"}</div>
                    {(char.age || char.gender) && (
                      <div className="text-xs text-muted-foreground/60 truncate">
                        {[char.age, char.gender].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Character detail */}
        <div className="flex-1 overflow-y-auto">
          {!selectedChar ? (
            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
              <User className="size-10 mb-3 opacity-20" aria-hidden="true" />
              <p>选择一个角色查看详情</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
              {/* Name and actions */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">{selectedChar.name || "未命名角色"}</h3>
                  {selectedChar.aliases && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      别称：{selectedChar.aliases}
                    </p>
                  )}
                  <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground/60">
                    {selectedChar.age && <span>{selectedChar.age}</span>}
                    {selectedChar.gender && <span>{selectedChar.gender}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openEdit(selectedChar)}
                    aria-label="编辑"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(selectedChar.id)}
                    aria-label="删除"
                    className="text-destructive/70 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Fields */}
              <FieldSection title="外貌" content={selectedChar.appearance} />
              <FieldSection title="性格" content={selectedChar.personality} />
              <FieldSection title="背景故事" content={selectedChar.background} />
              <FieldSection title="动机" content={selectedChar.motivation} />
              <FieldSection title="角色弧光" content={selectedChar.arc} />
              <FieldSection title="备注" content={selectedChar.notes} />

              {/* Relationships */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
                    关系
                  </h4>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setRelOpen(true)}
                    className="gap-1 h-6 text-xs"
                    disabled={otherCharacters.length === 0}
                  >
                    <Plus className="size-3" aria-hidden="true" />
                    添加关系
                  </Button>
                </div>
                {charRelationships.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 italic">暂无关系记录</p>
                ) : (
                  <div className="space-y-1.5">
                    {charRelationships.map((rel) => (
                      <div
                        key={rel.id}
                        className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
                      >
                        <Heart className="size-3 text-primary/40 shrink-0" aria-hidden="true" />
                        <span className="font-medium">{getRelatedCharName(rel)}</span>
                        <span className="text-muted-foreground/50">—</span>
                        <span className="text-xs text-primary/70">{rel.relationshipType}</span>
                        {rel.description && (
                          <span className="text-xs text-muted-foreground/50">· {rel.description}</span>
                        )}
                        <button
                          onClick={() => removeRelationship(rel.id)}
                          className="ml-auto text-muted-foreground/30 hover:text-destructive transition-colors"
                          aria-label="删除关系"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editChar.id ? "编辑人物" : "添加人物"}</DialogTitle>
            <DialogDescription>
              填写角色的基本信息与设定。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FieldInput
                label="姓名"
                value={editChar.name}
                onChange={(v) => setEditChar((p) => ({ ...p, name: v }))}
                placeholder="角色姓名"
              />
              <FieldInput
                label="别称"
                value={editChar.aliases}
                onChange={(v) => setEditChar((p) => ({ ...p, aliases: v }))}
                placeholder="别名、昵称"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldInput
                label="年龄"
                value={editChar.age}
                onChange={(v) => setEditChar((p) => ({ ...p, age: v }))}
                placeholder="如「28岁」"
              />
              <FieldInput
                label="性别"
                value={editChar.gender}
                onChange={(v) => setEditChar((p) => ({ ...p, gender: v }))}
                placeholder="性别"
              />
            </div>
            <FieldTextarea
              label="外貌描写"
              value={editChar.appearance}
              onChange={(v) => setEditChar((p) => ({ ...p, appearance: v }))}
              placeholder="角色的外貌特征…"
            />
            <FieldTextarea
              label="性格"
              value={editChar.personality}
              onChange={(v) => setEditChar((p) => ({ ...p, personality: v }))}
              placeholder="角色的性格特点…"
            />
            <FieldTextarea
              label="背景故事"
              value={editChar.background}
              onChange={(v) => setEditChar((p) => ({ ...p, background: v }))}
              placeholder="角色的过往经历…"
              rows={4}
            />
            <FieldTextarea
              label="动机"
              value={editChar.motivation}
              onChange={(v) => setEditChar((p) => ({ ...p, motivation: v }))}
              placeholder="角色行动的核心动机…"
            />
            <FieldTextarea
              label="角色弧光"
              value={editChar.arc}
              onChange={(v) => setEditChar((p) => ({ ...p, arc: v }))}
              placeholder="角色在故事中的成长变化…"
            />
            <FieldTextarea
              label="备注"
              value={editChar.notes}
              onChange={(v) => setEditChar((p) => ({ ...p, notes: v }))}
              placeholder="其他需要记录的信息…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button onClick={saveCharacter} disabled={saving || !editChar.name.trim()}>
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
            <DialogTitle>删除人物</DialogTitle>
            <DialogDescription>确定要删除此角色吗？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={confirmDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Relationship Dialog ─── */}
      <Dialog open={relOpen} onOpenChange={setRelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>添加关系</DialogTitle>
            <DialogDescription>
              {selectedChar?.name} 与谁有关系？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground/70 block mb-1">
                角色
              </label>
              <select
                value={relChar2}
                onChange={(e) => setRelChar2(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">选择角色…</option>
                {otherCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || "未命名"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/70 block mb-1">
                关系类型
              </label>
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">选择类型…</option>
                {RELATION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/70 block mb-1">
                描述 <span className="text-muted-foreground/50">（可选）</span>
              </label>
              <Input
                value={relDesc}
                onChange={(e) => setRelDesc(e.target.value)}
                placeholder="关系的简要描述…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRelOpen(false)}>取消</Button>
            <Button onClick={addRelationship} disabled={!relChar2 || !relType}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function FieldSection({ title, content }: { title: string; content: string }) {
  if (!content) return null
  return (
    <div>
      <h4 className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-1.5">
        {title}
      </h4>
      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground/70 block mb-1">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground/70 block mb-1">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-none"
      />
    </div>
  )
}
