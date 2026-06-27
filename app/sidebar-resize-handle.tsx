"use client"

import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { useSidebar } from "@/components/ui/sidebar"

const MIN_WIDTH = 200 // px
const MAX_WIDTH = 480 // px
const DEFAULT_WIDTH = 256 // = 16rem
const STORAGE_KEY = "sidebar-width"

function readSavedWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v) {
      const n = parseInt(v, 10)
      if (!isNaN(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) return n
    }
  } catch {}
  return DEFAULT_WIDTH
}

export function SidebarResizeHandle() {
  const { state } = useSidebar()

  // Don't show when sidebar is collapsed
  if (state === "collapsed") return null

  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const applyWidth = useCallback((px: number) => {
    const wrapper = document.querySelector<HTMLDivElement>('[data-slot="sidebar-wrapper"]')
    if (wrapper) {
      wrapper.style.setProperty("--sidebar-width", `${px}px`)
    }
  }, [])

  // Re-apply saved width after every render (before paint) to defeat
  // SidebarProvider's inline style which resets --sidebar-width: 16rem
  useLayoutEffect(() => {
    const saved = readSavedWidth()
    const wrapper = document.querySelector<HTMLDivElement>('[data-slot="sidebar-wrapper"]')
    if (wrapper) {
      const current = wrapper.style.getPropertyValue("--sidebar-width")
      if (current !== `${saved}px`) {
        wrapper.style.setProperty("--sidebar-width", `${saved}px`)
      }
    }
  })

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      draggingRef.current = true
      startXRef.current = e.clientX
      const wrapper = document.querySelector<HTMLDivElement>('[data-slot="sidebar-wrapper"]')
      const current = wrapper
        ? parseInt(getComputedStyle(wrapper).getPropertyValue("--sidebar-width").trim(), 10)
        : NaN
      startWidthRef.current = isNaN(current) ? DEFAULT_WIDTH : current

      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    },
    []
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const delta = e.clientX - startXRef.current
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta))
      applyWidth(newWidth)
    }
    const onMouseUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      const wrapper = document.querySelector<HTMLDivElement>('[data-slot="sidebar-wrapper"]')
      if (wrapper) {
        const w = parseInt(getComputedStyle(wrapper).getPropertyValue("--sidebar-width").trim(), 10)
        if (!isNaN(w)) {
          try { localStorage.setItem(STORAGE_KEY, String(w)) } catch {}
        }
      }
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [applyWidth])

  return (
    <div
      onMouseDown={onMouseDown}
      className="relative z-20 shrink-0 cursor-col-resize select-none"
      style={{ width: 6, marginLeft: -3 }}
      aria-label="拖拽调整侧边栏宽度"
    >
      {/* Invisible hit area + visible hover indicator */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] rounded-full transition-colors hover:bg-primary/40 bg-transparent" />
    </div>
  )
}
