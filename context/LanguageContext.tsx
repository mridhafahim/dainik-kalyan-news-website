'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Language = 'bn' | 'en'
const LanguageContext = createContext<{ language: Language; toggleLanguage: () => void; t: (bn: string, en: string) => string }>({ language: 'bn', toggleLanguage: () => {}, t: (bn) => bn })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('bn')
  useEffect(() => { const saved = window.localStorage.getItem('language') as Language | null; if (saved) setLanguage(saved) }, [])
  const toggleLanguage = () => setLanguage((current) => { const next = current === 'bn' ? 'en' : 'bn'; window.localStorage.setItem('language', next); document.documentElement.lang = next === 'bn' ? 'bn' : 'en'; return next })
  const t = (bn: string, en: string) => language === 'bn' ? bn : en
  return <LanguageContext.Provider value={{ language, toggleLanguage, t }}>{children}</LanguageContext.Provider>
}
export const useLanguage = () => useContext(LanguageContext)
