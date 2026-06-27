/**
 * Writing style analysis and profile generation.
 * Extracts stylistic metrics from existing text to help AI maintain consistency.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StyleProfile {
  /** Average sentence length in characters */
  avgSentenceLen: number
  /** Average paragraph length in characters */
  avgParagraphLen: number
  /** Ratio of dialogue (text in quotes) to total text */
  dialogueRatio: number
  /** Whether the text uses Chinese idioms / classical references frequently */
  usesIdioms: boolean
  /** Common punctuation patterns */
  punctuation: string
  /** A sample passage for the AI to mimic (last ~300 chars of recent text) */
  styleSample: string
  /** Number of samples analyzed */
  sampleCount: number
}

// ─── Text analysis helpers ─────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  // Chinese sentence endings: 。！？… as well as English . ! ?
  return text
    .split(/[。！？\.\!\?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

function extractDialogue(text: string): string {
  // Chinese quotes: 「」『』 "" ''
  const matches = text.match(/[""「」『』][^""「」『』]*[""「」『』]/g)
  return matches ? matches.join("") : ""
}

function hasIdioms(text: string): boolean {
  // Check for common 4-character Chinese idioms (成语 pattern)
  const idiomPattern = /[一-鿿]{4}/g
  const matches = text.match(idiomPattern)
  if (!matches) return false

  // A rough heuristic: if many 4-char sequences appear, it likely uses idioms
  const totalChars = text.replace(/\s/g, "").length
  return matches.length > totalChars * 0.02 // >2% of chars in 4-char clusters
}

function detectPunctuation(text: string): string {
  const patterns: string[] = []
  if (text.includes("……")) patterns.push("省略号")
  if (text.includes("——") || text.includes("—")) patterns.push("破折号")
  if (text.includes("；")) patterns.push("分号")
  if ((text.match(/：/g) || []).length > 5) patterns.push("冒号较多")
  if ((text.match(/[!！]/g) || []).length > 3) patterns.push("感叹号较多")
  if ((text.match(/[?？]/g) || []).length > 3) patterns.push("问句较多")

  // Check dialogue brackets style
  const guillemet = (text.match(/「/g) || []).length
  const quotes = (text.match(/["]/g) || []).length
  if (guillemet > quotes) patterns.push("使用「」引号")
  else if (quotes > 0) patterns.push('使用""引号')

  return patterns.length > 0 ? patterns.join("、") : "常规标点"
}

function extractStyleSample(text: string, maxLen = 300): string {
  // Take the last portion of text that fits within maxLen
  if (text.length <= maxLen) return text
  return "……" + text.slice(-maxLen)
}

// ─── Main analysis function ────────────────────────────────────────────────

export function analyzeStyle(chapterTexts: string[]): StyleProfile {
  const combined = chapterTexts.join("\n\n")

  const sentences = splitSentences(combined)
  const paragraphs = splitParagraphs(combined)
  const dialogueText = extractDialogue(combined)

  const avgSentenceLen =
    sentences.length > 0
      ? Math.round(sentences.reduce((s, sen) => s + sen.length, 0) / sentences.length)
      : 0

  const avgParagraphLen =
    paragraphs.length > 0
      ? Math.round(paragraphs.reduce((s, p) => s + p.length, 0) / paragraphs.length)
      : 0

  const totalChars = combined.length || 1
  const dialogueRatio = Math.round((dialogueText.length / totalChars) * 100)

  // Use the most recent meaningful chapter as the style sample
  const recentText = [...chapterTexts].reverse().find((t) => t.trim().length > 100) || chapterTexts[0] || ""

  return {
    avgSentenceLen,
    avgParagraphLen,
    dialogueRatio,
    usesIdioms: hasIdioms(combined),
    punctuation: detectPunctuation(combined),
    styleSample: extractStyleSample(recentText),
    sampleCount: chapterTexts.length,
  }
}

// ─── Build style guide prompt ──────────────────────────────────────────────

export function buildStyleGuide(profile: StyleProfile): string {
  const parts: string[] = [
    "## 写作风格参考",
    `分析了 ${profile.sampleCount} 章内容的风格特征：`,
    `- 句子平均长度：约 ${profile.avgSentenceLen} 字${profile.avgSentenceLen > 40 ? "（偏长句，文学性强）" : profile.avgSentenceLen > 20 ? "（中等长度）" : "（偏短句，简洁明快）"}`,
    `- 段落平均长度：约 ${profile.avgParagraphLen} 字${profile.avgParagraphLen > 200 ? "（段落较长，描述细腻）" : profile.avgParagraphLen > 80 ? "（段落适中）" : "（段落较短，节奏快）"}`,
    `- 对话占比：约 ${profile.dialogueRatio}%${profile.dialogueRatio > 40 ? "（对话驱动型）" : profile.dialogueRatio > 15 ? "（叙事为主，对话适量）" : "（以叙述为主）"}`,
    `- 标点特征：${profile.punctuation}`,
  ]

  if (profile.usesIdioms) {
    parts.push("- 使用成语/四字词较多（语言偏文学化）")
  } else {
    parts.push("- 用词偏现代白话，语言朴实自然")
  }

  parts.push("")
  parts.push("请严格模仿以下原文片段的语言风格、节奏感和用词习惯：")
  parts.push("")
  parts.push(profile.styleSample)
  parts.push("")
  parts.push("要求：输出内容的风格、句式长度、用词习惯、描写密度需与上述原文高度一致。")

  return parts.join("\n")
}
