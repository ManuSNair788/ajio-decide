import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "AJIO Decide",
  description: "A decision agent that resolves the specific doubt blocking each wishlisted item.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <div className="app-header">
            AJIO<span className="app-header-sub"> Decide</span>
          </div>
          {children}
        </div>
      </body>
    </html>
  )
}
