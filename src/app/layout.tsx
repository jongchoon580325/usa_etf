import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import MenuBar from './components/MenuBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '월배당 ETF 포트폴리오',
  description: '미국주식 월배당 ETF 포트폴리오 관리 웹앱',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className + ' bg-neutral-950 text-neutral-100 min-h-screen flex flex-col'}>
        <MenuBar />
        {/* 점선 구분선 */}
        <div className="w-full border-t border-dashed border-neutral-700" />
        {/* 본문 */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-10">{children}</main>
        {/* 점선 구분선 */}
        <div className="w-full border-t border-dashed border-neutral-700 mt-8" />
        {/* 푸터 */}
        <footer className="w-full bg-neutral-900/90 text-center py-4 text-sm text-neutral-400 flex flex-col items-center gap-1">
          <span>Monthly Dividend ETF Portfolio Built with <span className="text-pink-400">❤️</span> by <span className="font-semibold text-amber-300">나 종 춘</span></span>
          <span className="text-xs">© 2024. All rights reserved.</span>
        </footer>
      </body>
    </html>
  )
}
