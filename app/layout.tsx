import '../styles/globals.css'
import React from 'react'

export const metadata = {
  title: 'Tour de Callisto'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page text-primaryText">{children}</body>
    </html>
  )
}
