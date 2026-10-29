import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'
import { LanguageProvider } from '@/context/LanguageContext'

export const metadata: Metadata = { title: 'দৈনিক কল্যাণ | Dainik Kalyan', description: 'বাংলাদেশের নির্ভরযোগ্য অনলাইন সংবাদমাধ্যম', generator: 'v0.app' }
export const viewport: Viewport = { colorScheme: 'light dark', themeColor: '#b91c1c' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="bn" suppressHydrationWarning><body className="antialiased"><ThemeProvider><LanguageProvider>{children}</LanguageProvider></ThemeProvider>{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
