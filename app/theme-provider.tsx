"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  // On mount, read from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    const initial = stored ?? preferred
    setThemeState(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem("theme", t)
    applyTheme(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: "light", setTheme, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
  // Update color-scheme for native UI elements
  root.style.colorScheme = t
  // Update theme-color meta
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute("content", t === "dark" ? "#1a1a2e" : "#f5f0eb")
  }
}
