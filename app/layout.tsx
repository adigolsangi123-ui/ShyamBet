import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'ShyamBet',
  description: 'Prediction markets for a one-night event',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
          {children}
        </main>
      </body>
    </html>
  )
}
