import "./globals.css"
import type { Metadata } from "next"
import { Exo_2, Fira_Code, Orbitron } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/components/theme-provider"

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
})

const exo2 = Exo_2({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-exo2",
  display: "swap",
})

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fira-code",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Score Cripto — confiança on-chain",
  description:
    "Descubra se uma carteira merece confiança antes da transação. Score de confiabilidade gerado por IA a partir de dados on-chain.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`antialiased ${orbitron.variable} ${exo2.variable} ${firaCode.variable}`}
    >
      <body suppressHydrationWarning>
        <ThemeProvider defaultTheme="dark" enableSystem={false}>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
