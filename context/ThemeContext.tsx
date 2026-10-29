'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: 'light', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  useEffect(() => { const saved = window.localStorage.getItem('theme') as Theme | null; const next = saved || 'light'; setTheme(next); document.documentElement.classList.toggle('dark', next === 'dark') }, [])
  const toggleTheme = () => setTheme((current) => { const next = current === 'light' ? 'dark' : 'light'; window.localStorage.setItem('theme', next); document.documentElement.classList.toggle('dark', next === 'dark'); return next })
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)
