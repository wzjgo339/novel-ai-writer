// ─── Phase 2: Novel / Volume / Chapter data model ──────────────────────────

export interface Novel {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface Volume {
  id: string
  novelId: string
  title: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: string
  volumeId: string
  title: string
  content: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ─── Phase 3: Characters, World-building, Plot ─────────────────────────────

export interface Character {
  id: string
  novelId: string
  name: string
  aliases: string
  age: string
  gender: string
  appearance: string
  personality: string
  background: string
  motivation: string
  arc: string
  notes: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CharacterRelationship {
  id: string
  novelId: string
  characterId1: string
  characterId2: string
  relationshipType: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface WorldTerm {
  id: string
  novelId: string
  term: string
  type: string
  definition: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface PlotEvent {
  id: string
  novelId: string
  chapterId: string | null
  title: string
  description: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type ViewMode = "write" | "characters" | "world" | "outline"

// ─── AI Assistant Conversations ──────────────────────────────────────────────

export interface Conversation {
  id: string
  novelId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}
