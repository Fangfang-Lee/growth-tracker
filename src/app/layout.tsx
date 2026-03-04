import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Growth Tracker',
  description: '个人成长追踪工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <footer className="py-6 text-center text-sm text-muted-foreground border-t mt-auto">
          <Link
            href="https://github.com/Fangfang-Lee/growth-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </Link>
        </footer>
      </body>
    </html>
  )
}
