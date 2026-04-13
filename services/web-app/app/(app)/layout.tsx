import { AppSidebar } from "@/components/app-sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <AppSidebar />
      <main className="ml-60 flex min-h-svh flex-1 flex-col">
        {children}
      </main>
    </div>
  )
}
